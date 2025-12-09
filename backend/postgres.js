const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Client } = require("pg");
const path = require("path");
const multer = require("multer");
const { Parser } = require("json2csv");
const emailService = require("./emailService");
const chatService = require("./chatService");
const {
  startChainEventsIndexer,
  fetchChainEvents,
} = require("./services/chainEventsIndexer");
const http = require("http");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");
const Joi = require("joi");
const geoip = require("geoip-lite");
require("dotenv").config();

const sanitizeThreshold = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const RECONCILIATION_TOLERANCE_SECONDS = parseInt(
  process.env.INVENTORY_RECONCILIATION_TOLERANCE_SECONDS || "600",
  10
);

const INVENTORY_LOW_STOCK_THRESHOLDS = {
  manufacturer: sanitizeThreshold(
    process.env.INVENTORY_LOW_STOCK_MANUFACTURER,
    50
  ),
  supplier: sanitizeThreshold(process.env.INVENTORY_LOW_STOCK_SUPPLIER, 20),
  retailer: sanitizeThreshold(process.env.INVENTORY_LOW_STOCK_RETAILER, 10),
};

let chainEventsAvailabilityCache = {
  value: null,
  checkedAt: 0,
};

let regionDisplayNames = null;
try {
  if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
    regionDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });
  }
} catch (err) {
  console.warn("Intl.DisplayNames unavailable:", err?.message || err);
}

const PRIVATE_NETWORK_GEO = {
  country: "Local/Test Environment",
  city: "Internal Network",
};

const nowMs = () => Date.now();

const isChainEventsAvailable = async () => {
  const now = nowMs();
  if (
    chainEventsAvailabilityCache.value !== null &&
    now - chainEventsAvailabilityCache.checkedAt < 60 * 1000
  ) {
    return chainEventsAvailabilityCache.value;
  }
  try {
    const reg = await client.query(
      "SELECT to_regclass('public.chain_events') AS reg"
    );
    const available = Boolean(reg.rows?.[0]?.reg);
    chainEventsAvailabilityCache = { value: available, checkedAt: now };
    return available;
  } catch (err) {
    console.warn(
      "[inventory] Failed to check chain_events availability:",
      err?.message || err
    );
    chainEventsAvailabilityCache = { value: false, checkedAt: now };
    return false;
  }
};

const buildReconciliationFragments = (tableAlias = "i", joinAlias = "rec") => {
  const tolerance = Number.isFinite(RECONCILIATION_TOLERANCE_SECONDS)
    ? RECONCILIATION_TOLERANCE_SECONDS
    : 600;
  return {
    select: `${joinAlias}.reconciliation_status, ${joinAlias}.last_chain_event_at`,
    join: `LEFT JOIN LATERAL (
        SELECT
          CASE
            WHEN latest_event.ts_epoch IS NULL THEN 'missing'
            WHEN latest_event.ts_epoch >= EXTRACT(EPOCH FROM ${tableAlias}.updated_at) - ${tolerance}
              THEN 'synced'
            ELSE 'stale'
          END AS reconciliation_status,
          TO_TIMESTAMP(latest_event.ts_epoch) AS last_chain_event_at
        FROM (
          SELECT
            COALESCE(
              NULLIF(ce.payload->>'timestampUnix','')::bigint,
              EXTRACT(EPOCH FROM ce.emitted_at),
              EXTRACT(EPOCH FROM ce.created_at)
            ) AS ts_epoch
          FROM chain_events ce
          WHERE ce.serial_number = ${tableAlias}.serial_number
            AND ce.event_name IN ('ProductHistoryAdded','ProductRegistered')
          ORDER BY ce.emitted_at DESC NULLS LAST, ce.created_at DESC NULLS LAST
          LIMIT 1
        ) latest_event
      ) ${joinAlias} ON true`,
  };
};

const app = express();
app.use(bodyParser.json());

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Configure CORS from env
const corsOrigins = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim());
app.use(
  cors({
    origin: corsOrigins.includes("*") ? true : corsOrigins,
    credentials: true,
  })
);

// We'll initialize Socket.IO after setting up the DB client below

const port = process.env.PORT || 5000;

// JWT Configuration
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Rate limiting configuration
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const client = new Client({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  port: Number(process.env.PGPORT || 5432),
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "postgres",
});
const connectionPromise = client.connect();
let chainIndexerController = null;
let shuttingDown = false;
let activeServer = null;

async function gracefulShutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  const timeout = setTimeout(() => {
    console.error("[shutdown] Forced exit after timeout");
    process.exit(1);
  }, 10000);
  timeout.unref();

  console.log(`[shutdown] ${signal} received. Tearing down services...`);

  try {
    if (chainIndexerController?.stop) {
      chainIndexerController.stop();
      console.log("[shutdown] Chain indexer stopped");
    }
  } catch (err) {
    console.error("[shutdown] Failed to stop chain indexer:", err.message);
  }

  const tasks = [];

  if (io?.close) {
    tasks.push(
      new Promise((resolve) => {
        io.close(() => {
          console.log("[shutdown] Socket.IO server closed");
          resolve();
        });
      })
    );
  }

  if (activeServer?.close) {
    tasks.push(
      new Promise((resolve) => {
        activeServer.close((err) => {
          if (err) {
            console.error("[shutdown] HTTP server close error:", err.message);
          } else {
            console.log("[shutdown] HTTP server closed");
          }
          resolve();
        });
      })
    );
  }

  if (client) {
    tasks.push(
      client
        .end()
        .then(() => console.log("[shutdown] PostgreSQL connection closed"))
        .catch((err) =>
          console.error("[shutdown] PostgreSQL close error:", err.message)
        )
    );
  }

  try {
    await Promise.allSettled(tasks);
  } finally {
    clearTimeout(timeout);
    console.log("[shutdown] Cleanup complete. Exiting.");
    process.exit(0);
  }
}

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});

async function ensureInventoryTables() {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY
      );
    `);
    await client.query(`
      ALTER TABLE inventory
        ADD COLUMN IF NOT EXISTS serial_number TEXT,
        ADD COLUMN IF NOT EXISTS product_name TEXT,
        ADD COLUMN IF NOT EXISTS brand TEXT,
        ADD COLUMN IF NOT EXISTS product_image TEXT,
        ADD COLUMN IF NOT EXISTS owner_role TEXT DEFAULT 'manufacturer',
        ADD COLUMN IF NOT EXISTS owner_username TEXT,
        ADD COLUMN IF NOT EXISTS qty INTEGER DEFAULT 1 CHECK (qty >= 0),
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in-factory',
        ADD COLUMN IF NOT EXISTS location TEXT,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'inventory_serial_number_key'
        ) THEN
          ALTER TABLE inventory ADD CONSTRAINT inventory_serial_number_key UNIQUE (serial_number);
        END IF;
      END$$;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_moves (
        id SERIAL PRIMARY KEY
      );
    `);
    await client.query(`
      ALTER TABLE inventory_moves
        ADD COLUMN IF NOT EXISTS serial_number TEXT,
        ADD COLUMN IF NOT EXISTS product_name TEXT,
        ADD COLUMN IF NOT EXISTS brand TEXT,
        ADD COLUMN IF NOT EXISTS product_image TEXT,
        ADD COLUMN IF NOT EXISTS from_owner_role TEXT,
        ADD COLUMN IF NOT EXISTS from_owner_username TEXT,
        ADD COLUMN IF NOT EXISTS to_owner_role TEXT,
        ADD COLUMN IF NOT EXISTS to_owner_username TEXT,
        ADD COLUMN IF NOT EXISTS qty INTEGER DEFAULT 1 CHECK (qty > 0),
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in-transit',
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS actor_username TEXT,
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS location TEXT,
        ADD COLUMN IF NOT EXISTS moved_at TIMESTAMPTZ DEFAULT NOW();
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_inventory_owner_role'
        ) THEN
          CREATE INDEX idx_inventory_owner_role ON inventory(owner_role);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_inventory_status'
        ) THEN
          CREATE INDEX idx_inventory_status ON inventory(status);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_inventory_updated_at'
        ) THEN
          CREATE INDEX idx_inventory_updated_at ON inventory(updated_at DESC);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_inventory_serial'
        ) THEN
          CREATE INDEX idx_inventory_serial ON inventory(serial_number);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_inventory_moves_serial'
        ) THEN
          CREATE INDEX idx_inventory_moves_serial ON inventory_moves(serial_number);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_inventory_moves_moved_at'
        ) THEN
          CREATE INDEX idx_inventory_moves_moved_at ON inventory_moves(moved_at DESC);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_inventory_moves_to_role'
        ) THEN
          CREATE INDEX idx_inventory_moves_to_role ON inventory_moves(to_owner_role);
        END IF;
      END$$;
    `);
    await client.query(`
      CREATE OR REPLACE FUNCTION set_inventory_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN
          DROP TRIGGER IF EXISTS trg_inventory_set_updated_at ON inventory;
          CREATE TRIGGER trg_inventory_set_updated_at
          BEFORE UPDATE ON inventory
          FOR EACH ROW
          EXECUTE FUNCTION set_inventory_updated_at();
        END IF;
      END$$;
    `);
    await client.query(`
      INSERT INTO inventory (serial_number, product_name, brand, product_image, owner_role, qty, status)
      SELECT p.serialnumber, p.name, p.brand, p.image, 'manufacturer', 1, 'in-factory'
      FROM product p
      WHERE NOT EXISTS (
        SELECT 1 FROM inventory i WHERE i.serial_number = p.serialnumber
      );
    `);
    await client.query(`
      UPDATE inventory i
      SET product_name = COALESCE(i.product_name, p.name),
          brand = COALESCE(i.brand, p.brand),
          product_image = COALESCE(i.product_image, p.image)
      FROM product p
      WHERE p.serialnumber = i.serial_number;
    `);
    console.log("Inventory tables ready");
  } catch (err) {
    console.error("Failed to ensure inventory tables:", err.message);
  }
}

connectionPromise
  .then(async () => {
    console.log("Connected to PostgreSQL");
    await ensureInventoryTables();
    try {
      chainIndexerController = await startChainEventsIndexer({
        pgClient: client,
        logger: console,
      });
    } catch (err) {
      console.error("[chain-indexer] bootstrap failed:", err.message);
    }
  })
  .catch((err) => {
    console.error("Failed to connect to PostgreSQL:", err.message);
  });

// Initialize Socket.IO for chat (pass DB client for persistence)
const io = chatService.initializeChat(server, corsOrigins, client);

// Ensure password reset tokens table exists and has required columns
(async () => {
  try {
    // Create table if missing (minimal definition)
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY
      );
    `);
    // Add required columns if missing
    await client.query(`
      ALTER TABLE password_reset_tokens
        ADD COLUMN IF NOT EXISTS user_id INTEGER,
        ADD COLUMN IF NOT EXISTS token TEXT,
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `);
    // Ensure token column is wide enough (some legacy schemas had VARCHAR(12))
    try {
      await client.query(
        `ALTER TABLE password_reset_tokens ALTER COLUMN token TYPE TEXT`
      );
    } catch (e) {
      // Ignore if already TEXT or conversion not needed
      if (
        !/does not exist|cannot alter|already/.test(String(e?.message || ""))
      ) {
        console.warn(
          "Could not alter password_reset_tokens.token to TEXT:",
          e.message
        );
      }
    }
    // Ensure uniqueness/indexes
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_password_reset_tokens_user_id'
        ) THEN
          CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_password_reset_tokens_expires_at'
        ) THEN
          CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_password_reset_tokens_token'
        ) THEN
          CREATE UNIQUE INDEX uq_password_reset_tokens_token ON password_reset_tokens(token);
        END IF;
      END$$;
    `);
    console.log("password_reset_tokens table ready");
  } catch (e) {
    console.error("Failed to ensure password_reset_tokens table:", e.message);
  }
})();

// RBAC Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    next();
  };
};

// auth

async function createAccount(username, password, role, email, adminUser) {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await client.query(
      "INSERT INTO auth (username, password, role, email) VALUES ($1, $2, $3, $4)",
      [username, hashedPassword, role, email]
    );

    logActivity(
      adminUser,
      "add_account",
      username,
      `Added account with role ${role}`
    );
    console.log("Data insert successful");
  } catch (err) {
    console.log(err.message);
    throw err;
  }
}

async function changePassword(username, password) {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await client.query("UPDATE auth SET password = $1 WHERE username = $2", [
      hashedPassword,
      username,
    ]);

    console.log("Data update successful");
  } catch (err) {
    console.log(err.message);
    throw err;
  }
}

// profile

function createProfile(
  username,
  name,
  description,
  website,
  location,
  image,
  role
) {
  client.query(
    "INSERT INTO profile (username, name, description, website, location, image, role) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [username, name, description, website, location, image, role],
    (err, res) => {
      if (err) {
        console.log(err.message);
      } else {
        console.log("Data insert successful");
      }
    }
  );
}

// product

const storageProduct = multer.diskStorage({
  destination: path.join(__dirname, "public/uploads/product"),
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const storageProfile = multer.diskStorage({
  destination: path.join(__dirname, "public/uploads/profile"),
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

async function seedInventoryFromProduct({
  serialNumber,
  productName,
  brand,
  productImage,
  ownerRole = "manufacturer",
  ownerUsername = null,
  qty = 1,
  status = "in-factory",
  location = null,
  metadata = null,
}) {
  const normalizedSerial = (serialNumber || "").trim();
  if (!normalizedSerial) {
    throw new Error("Serial number is required to seed inventory");
  }
  const normalizedProductName =
    typeof productName === "string" && productName.trim().length
      ? productName.trim()
      : null;
  const normalizedBrand =
    typeof brand === "string" && brand.trim().length ? brand.trim() : null;
  const normalizedImage =
    typeof productImage === "string" && productImage.trim().length
      ? productImage.trim()
      : null;
  const normalizedOwnerRole = normalizeRoleValue(ownerRole) || "manufacturer";
  const normalizedOwnerUsername =
    typeof ownerUsername === "string" && ownerUsername.trim().length
      ? ownerUsername.trim()
      : null;
  const safeQty = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
  const normalizedStatus =
    typeof status === "string" && status.trim().length
      ? status.trim().toLowerCase()
      : "in-factory";
  const normalizedLocation =
    typeof location === "string" && location.trim().length
      ? location.trim()
      : null;
  const metadataPayload = serializeMetadataPayload(metadata);

  const insertResult = await client.query(
    `INSERT INTO inventory (
       serial_number, product_name, brand, product_image,
       owner_role, owner_username, qty, status, location, metadata
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8, $9,
       COALESCE($10::jsonb, '{}'::jsonb)
     )
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [
      normalizedSerial,
      normalizedProductName,
      normalizedBrand,
      normalizedImage,
      normalizedOwnerRole,
      normalizedOwnerUsername,
      safeQty,
      normalizedStatus,
      normalizedLocation,
      metadataPayload,
    ]
  );

  if (insertResult.rows?.length) {
    return {
      record: insertResult.rows[0],
      inserted: true,
      metadataPayload,
    };
  }

  const updateResult = await client.query(
    `UPDATE inventory
       SET product_name = COALESCE($2, product_name),
           brand = COALESCE($3, brand),
           product_image = CASE
             WHEN $4 IS NOT NULL AND LENGTH($4) > 0 THEN $4
             ELSE product_image
           END,
           location = COALESCE($9, location),
           metadata = CASE
             WHEN $10::jsonb IS NOT NULL THEN jsonb_strip_nulls(COALESCE(metadata, '{}'::jsonb) || $10::jsonb)
             ELSE metadata
           END
     WHERE serial_number = $1
     RETURNING *`,
    [
      normalizedSerial,
      normalizedProductName,
      normalizedBrand,
      normalizedImage,
      normalizedOwnerRole,
      normalizedOwnerUsername,
      safeQty,
      normalizedStatus,
      normalizedLocation,
      metadataPayload,
    ]
  );

  return {
    record: updateResult.rows?.[0] || null,
    inserted: false,
    metadataPayload,
  };
}

async function addProduct(
  serialNumber,
  name,
  brand,
  username,
  contractAddress = null,
  options = {}
) {
  try {
    const normalizedSerial = (serialNumber || "").trim();
    const normalizedName = (name || "").trim();
    const normalizedBrand = (brand || "").trim();
    const normalizedDescription =
      typeof options.description === "string" &&
      options.description.trim().length
        ? options.description.trim()
        : null;
    const normalizedImage =
      typeof options.productImage === "string" &&
      options.productImage.trim().length
        ? options.productImage.trim()
        : null;

    await client.query(
      "INSERT INTO product (serialNumber, name, brand, description, image) VALUES ($1, $2, $3, $4, $5)",
      [
        normalizedSerial,
        normalizedName,
        normalizedBrand,
        normalizedDescription,
        normalizedImage,
      ]
    );

    const normalizedOwnerRole =
      normalizeRoleValue(options.ownerRole) || "manufacturer";
    const normalizedOwnerUsername =
      typeof options.ownerUsername === "string" &&
      options.ownerUsername.trim().length
        ? options.ownerUsername.trim()
        : username || null;
    const normalizedStatus =
      typeof options.status === "string" && options.status.trim().length
        ? options.status.trim().toLowerCase()
        : "in-factory";
    const qtyValue =
      Number.isFinite(options.qty) && options.qty > 0
        ? Math.floor(options.qty)
        : 1;
    const normalizedLocation =
      typeof options.location === "string" && options.location.trim().length
        ? options.location.trim()
        : null;

    const baseMetadata = {
      source: "manufacturer-add",
      contractAddress: contractAddress || null,
      addedBy: username,
    };
    let inventoryMetadata = baseMetadata;
    if (options.metadata) {
      if (
        typeof options.metadata === "object" &&
        !Array.isArray(options.metadata)
      ) {
        inventoryMetadata = {
          ...inventoryMetadata,
          ...options.metadata,
        };
      } else {
        inventoryMetadata = {
          ...inventoryMetadata,
          metadataNote: options.metadata,
        };
      }
    }
    if (normalizedDescription) {
      inventoryMetadata.description = normalizedDescription;
    }
    if (normalizedLocation) {
      inventoryMetadata.location = normalizedLocation;
    }

    const seedResult = await seedInventoryFromProduct({
      serialNumber: normalizedSerial,
      productName: normalizedName,
      brand: normalizedBrand,
      productImage: normalizedImage,
      ownerRole: normalizedOwnerRole,
      ownerUsername: normalizedOwnerUsername,
      qty: qtyValue,
      status: normalizedStatus,
      location: normalizedLocation,
      metadata: inventoryMetadata,
    });

    if (seedResult.inserted) {
      try {
        await client.query(
          `INSERT INTO inventory_moves (
             serial_number, product_name, brand, product_image,
             from_owner_role, from_owner_username,
             to_owner_role, to_owner_username,
             qty, status, notes, actor_username, metadata, location
           ) VALUES (
             $1, $2, $3, $4,
             NULL, NULL,
             $5, $6,
             $7, $8, $9, $10, COALESCE($11::jsonb, '{}'::jsonb), $12
           )`,
          [
            normalizedSerial,
            normalizedName,
            normalizedBrand,
            normalizedImage,
            normalizedOwnerRole,
            normalizedOwnerUsername,
            qtyValue,
            normalizedStatus,
            "Initial manufacturing intake",
            username,
            seedResult.metadataPayload,
            normalizedLocation,
          ]
        );
      } catch (moveErr) {
        console.warn(
          "Failed to log initial inventory move for",
          normalizedSerial,
          moveErr?.message || moveErr
        );
      }
    }

    logActivity(
      username,
      "add_product",
      serialNumber,
      `Added product ${name} (${brand})`
    );
    console.log("Data insert successful");

    try {
      const userResult = await client.query(
        "SELECT email FROM auth WHERE username = $1",
        [username]
      );

      if (userResult.rows.length > 0 && userResult.rows[0].email) {
        const userEmail = userResult.rows[0].email;
        const productData = {
          productName: name,
          brand: brand,
          serialNumber: serialNumber,
          contractAddress:
            contractAddress || process.env.CONTRACT_ADDRESS || null,
        };

        await emailService.sendProductRegistrationEmail(
          client,
          userEmail,
          productData
        );
        console.log(`Product registration email sent to ${userEmail}`);
      }
    } catch (emailErr) {
      console.error("Error sending product registration email:", emailErr);
    }
    return {
      inventory: seedResult.record || null,
    };
  } catch (err) {
    console.log(err.message);
    throw err;
  }
}

// auth
app.get("/authAll", async (req, res) => {
  const data = await client.query("Select * from auth");
  res.header("Access-Control-Allow-Credentials", true);
  res.send(data.rows);
  console.log("Data sent successfully");
});

// New secure login endpoint
app.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const { username, password, twoFactorToken } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const data = await client.query("SELECT * FROM auth WHERE username = $1", [
      username,
    ]);

    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    if (data.rows.length === 0) {
      logLoginAttempt(username, false, ip);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = data.rows[0];
    const storedPassword = user.password || "";
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);

    let isValidPassword = false;
    if (isBcryptHash) {
      // Normal path: compare against bcrypt hash
      isValidPassword = await bcrypt.compare(password, storedPassword);
    } else {
      // Backward-compatibility: legacy plaintext password in DB
      isValidPassword = password === storedPassword;
      if (isValidPassword) {
        // Seamlessly upgrade to bcrypt
        try {
          const newHash = await bcrypt.hash(password, 10);
          await client.query(
            "UPDATE auth SET password = $1 WHERE username = $2",
            [newHash, username]
          );
          // Optional activity log for auditing
          logActivity(
            username,
            "password_rehash",
            username,
            "Upgraded plaintext password to bcrypt hash"
          );
        } catch (rehashErr) {
          console.error("Password rehash error:", rehashErr);
          // Continue login even if rehash fails to avoid locking out the user
        }
      }
    }

    if (!isValidPassword) {
      logLoginAttempt(username, false, ip);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if 2FA is enabled
    if (user.is_2fa_enabled) {
      if (!twoFactorToken) {
        return res.status(200).json({
          success: false,
          requiresTwoFactor: true,
          message: "Two-factor authentication required",
        });
      }

      // Verify 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: "base32",
        token: twoFactorToken,
        window: 2,
      });

      if (!verified) {
        logLoginAttempt(username, false, ip);
        return res.status(401).json({
          success: false,
          message: "Invalid two-factor authentication code",
        });
      }
    }

    // Update last login
    await client.query(
      "UPDATE auth SET last_login = NOW() WHERE username = $1",
      [username]
    );

    logLoginAttempt(username, true, ip);

    // Generate JWT token
    const token = jwt.sign(
      {
        username: user.username,
        role: user.role,
        userId: user.id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        username: user.username,
        role: user.role,
        id: user.id,
        email: user.email,
        is_2fa_enabled: user.is_2fa_enabled,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Token validation endpoint
app.get("/auth/validate", authenticateToken, async (req, res) => {
  try {
    const { username } = req.user;

    // Get fresh user data
    const userData = await client.query(
      "SELECT username, role, id, email, is_2fa_enabled FROM auth WHERE username = $1",
      [username]
    );

    if (userData.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: userData.rows[0],
    });
  } catch (err) {
    console.error("Token validation error:", err);
    res.status(500).json({ success: false, message: "Error validating token" });
  }
});

// Keep old endpoint under a legacy path to avoid conflicting with new routes
app.post("/auth/legacy/:username/:password", async (req, res) => {
  console.warn(
    "DEPRECATED: Using legacy auth endpoint. Please migrate to POST /auth/login"
  );
  const { username, password } = req.params;
  try {
    const data = await client.query(
      `SELECT * FROM auth WHERE username = '${username}' AND password = '${password}'`
    );
    const success = data.rows.length > 0;
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    logLoginAttempt(username, success, ip);
  } catch (e) {
    console.error("Legacy auth error", e);
  }
  // Explicitly return 410 Gone to force clients to move
  return res.status(410).json({
    success: false,
    message:
      "Legacy endpoint removed. Use POST /auth/login with JSON body instead.",
  });
});

app.post("/addaccount", async (req, res) => {
  try {
    const { username, password, role, email } = req.body;
    const adminUser = req.user?.username || "admin";

    await createAccount(username, password, role, email || null, adminUser);
    res.json({ success: true, message: "Account created successfully" });
  } catch (err) {
    console.error("Add account error:", err);
    res.status(500).json({ success: false, message: "Error creating account" });
  }
});

app.post("/changepsw", async (req, res) => {
  try {
    const { username, password } = req.body;
    await changePassword(username, password);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error updating password" });
  }
});

// 2FA Endpoints
app.post("/auth/2fa/setup", authenticateToken, async (req, res) => {
  try {
    const { username } = req.user;

    const secret = speakeasy.generateSecret({
      name: `ProductGuard (${username})`,
      issuer: "ProductGuard",
    });

    // Store the temp secret (will be confirmed when user verifies)
    await client.query(
      "UPDATE auth SET two_factor_secret = $1 WHERE username = $2",
      [secret.base32, username]
    );

    // Generate QR code; if it fails, still return secret and otpauthUrl for client-side QR rendering
    let qrCodeUrl = null;
    try {
      if (secret.otpauth_url) {
        qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      }
    } catch (qrErr) {
      console.warn(
        "QR code generation failed, falling back to otpauthUrl:",
        qrErr?.message
      );
    }

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secret.otpauth_url || null,
    });
  } catch (err) {
    console.error("2FA setup error:", err);
    res.status(500).json({ success: false, message: "Error setting up 2FA" });
  }
});

app.post("/auth/2fa/verify", authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const { username } = req.user;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }

    // Get user's secret
    const userData = await client.query(
      "SELECT two_factor_secret FROM auth WHERE username = $1",
      [username]
    );

    if (!userData.rows[0]?.two_factor_secret) {
      return res
        .status(400)
        .json({ success: false, message: "2FA not set up" });
    }

    const verified = speakeasy.totp.verify({
      secret: userData.rows[0].two_factor_secret,
      encoding: "base32",
      token,
      window: 2,
    });

    if (verified) {
      // Enable 2FA for this user
      await client.query(
        "UPDATE auth SET is_2fa_enabled = true WHERE username = $1",
        [username]
      );

      res.json({ success: true, message: "2FA enabled successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid token" });
    }
  } catch (err) {
    console.error("2FA verify error:", err);
    res.status(500).json({ success: false, message: "Error verifying 2FA" });
  }
});

app.post("/auth/2fa/disable", authenticateToken, async (req, res) => {
  try {
    const { password, token } = req.body;
    const { username } = req.user;

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        message: "Password and 2FA token are required",
      });
    }

    // Verify current password
    const userData = await client.query(
      "SELECT password, two_factor_secret FROM auth WHERE username = $1",
      [username]
    );

    const isValidPassword = await bcrypt.compare(
      password,
      userData.rows[0].password
    );
    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: userData.rows[0].two_factor_secret,
      encoding: "base32",
      token,
      window: 2,
    });

    if (!verified) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid 2FA token" });
    }

    // Disable 2FA
    await client.query(
      "UPDATE auth SET is_2fa_enabled = false, two_factor_secret = NULL WHERE username = $1",
      [username]
    );

    res.json({ success: true, message: "2FA disabled successfully" });
  } catch (err) {
    console.error("2FA disable error:", err);
    res.status(500).json({ success: false, message: "Error disabling 2FA" });
  }
});

// ===== Password Reset Flow =====
// Request password reset: accepts { email } or { username }
app.post("/auth/password/forgot", async (req, res) => {
  try {
    const { email, username } = req.body || {};
    if (!email && !username) {
      return res
        .status(400)
        .json({ success: false, message: "Email or username is required" });
    }

    // Look up user by email first, then username
    let userRow = null;
    if (email) {
      const r = await client.query(
        "SELECT id, email, username FROM auth WHERE email = $1",
        [email]
      );
      userRow = r.rows[0] || null;
    }
    if (!userRow && username) {
      const r = await client.query(
        "SELECT id, email, username FROM auth WHERE username = $1",
        [username]
      );
      userRow = r.rows[0] || null;
    }

    // Always return success to avoid user enumeration
    if (!userRow || !userRow.email) {
      return res.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Create token valid for 30 minutes
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Insert token, accommodating legacy schemas that require email/username columns
    let inserted = false;
    try {
      await client.query(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at, email, username) VALUES ($1, $2, $3, $4, $5)",
        [userRow.id, token, expiresAt, userRow.email, userRow.username || null]
      );
      inserted = true;
    } catch (e1) {
      console.warn(
        "password_reset_tokens insert (with email/username) failed, retrying minimal columns:",
        e1.message
      );
      try {
        await client.query(
          "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
          [userRow.id, token, expiresAt]
        );
        inserted = true;
      } catch (e2) {
        console.error("password_reset_tokens insert failed:", e2.message);
      }
    }

    // Determine frontend base URL
    const frontendBase =
      process.env.FRONTEND_BASE_URL || "http://localhost:3000";
    const resetLink = `${frontendBase}/reset-password?token=${encodeURIComponent(
      token
    )}`;

    // Send email using emailService
    try {
      if (inserted) {
        await emailService.sendEmail(client, "passwordReset", userRow.email, {
          resetLink,
        });
        console.log(`Password reset email queued to ${userRow.email}`);
      } else {
        // If insert failed, don't send a broken link; log server-side and still return generic success
        console.error(
          "Skipping password reset email send due to failed token insert"
        );
      }
    } catch (e) {
      console.error("Error sending reset email:", e.message);
      // Do not reveal error to client
    }

    return res.json({
      success: true,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (err) {
    console.error("Password reset request error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error processing request" });
  }
});

// Reset password: accepts { token, password }
app.post("/auth/password/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    // Lookup token
    const tRes = await client.query(
      "SELECT prt.id, prt.user_id, prt.expires_at, prt.used, a.username FROM password_reset_tokens prt JOIN auth a ON a.id = prt.user_id WHERE prt.token = $1",
      [token]
    );
    if (tRes.rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }
    const row = tRes.rows[0];
    if (row.used || new Date(row.expires_at) < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    // Update password
    const newHash = await bcrypt.hash(password, 10);
    await client.query("UPDATE auth SET password = $1 WHERE id = $2", [
      newHash,
      row.user_id,
    ]);

    // Mark token used (support legacy schemas with used_at column)
    try {
      await client.query(
        "UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE id = $1",
        [row.id]
      );
    } catch (e1) {
      await client.query(
        "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
        [row.id]
      );
    }

    // Log activity
    logActivity(
      row.username,
      "password_reset",
      row.user_id,
      "Password reset via email link"
    );

    return res.json({
      success: true,
      message: "Password has been reset. You can now sign in.",
    });
  } catch (err) {
    console.error("Password reset error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error resetting password" });
  }
});

// profile

app.get("/profileAll", async (req, res) => {
  const data = await client.query("Select * from profile");
  res.header("Access-Control-Allow-Credentials", true);
  res.send(data.rows);
  console.log("Data sent successfully");
});

app.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const data = await client.query(
      "SELECT * FROM profile WHERE username = $1",
      [username]
    );
    // Backward-compatible shape: return array of rows as before
    res.send(data.rows);
    console.log("Profile data sent successfully");
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).send("Error fetching profile");
  }
});

app.post("/addprofile", (req, res) => {
  const { username, name, description, website, location, image, role } =
    req.body;
  createProfile(username, name, description, website, location, image, role);
  res.send("Data inserted");
});

// image

app.post("/upload/profile", (req, res) => {
  const upload = multer({ storage: storageProfile }).single("image");

  upload(req, res, (err) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image to upload",
      });
    }

    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    return res.json({
      success: true,
      fileName: req.file.filename,
      originalName: req.file.originalname,
    });
  });
});

// product

app.post("/upload/product", (req, res) => {
  const upload = multer({ storage: storageProduct }).single("image");

  upload(req, res, (err) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image to upload",
      });
    }

    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    return res.json({
      success: true,
      fileName: req.file.filename,
      originalName: req.file.originalname,
    });
  });
});

app.get("/file/profile/:fileName", function (req, res) {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, "public/uploads/profile", fileName);
  res.sendFile(filePath);
});

app.get("/file/product/:fileName", function (req, res) {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, "public/uploads/product", fileName);
  res.sendFile(filePath);
});

app.get("/product/serialNumber", async (req, res) => {
  const data = await client.query(`SELECT serialNumber FROM product`);
  res.send(data.rows);
});

app.post("/addproduct", async (req, res) => {
  // Validate input
  const addProductSchema = Joi.object({
    serialNumber: Joi.string().trim().min(1).max(64).required(),
    name: Joi.string().trim().min(1).max(100).required(),
    brand: Joi.string().trim().min(1).max(100).required(),
    username: Joi.string().allow(null, ""),
    contractAddress: Joi.string().trim().allow(null, ""),
    description: Joi.string().trim().max(4000).allow(null, ""),
    productImage: Joi.string().trim().max(512).allow(null, ""),
    location: Joi.string().trim().max(512).allow(null, ""),
    status: Joi.string().trim().max(64).allow(null, ""),
    ownerRole: Joi.string()
      .valid("manufacturer", "supplier", "retailer", "admin")
      .allow(null, ""),
    ownerUsername: Joi.string().trim().allow(null, ""),
    qty: Joi.number().integer().min(1).max(100000).default(1),
    metadata: Joi.alternatives()
      .try(Joi.object().unknown(true), Joi.string().max(4000))
      .allow(null, ""),
  });

  const { value, error } = addProductSchema.validate(req.body || {}, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res
      .status(400)
      .json({ success: false, message: `Invalid payload: ${error.message}` });
  }

  const {
    serialNumber,
    name,
    brand,
    username,
    contractAddress,
    description,
    productImage,
    location,
    status,
    ownerRole,
    ownerUsername,
    qty,
    metadata,
  } = value;
  const actor = username || req.user?.username || "admin";
  const normalizedOwnerRole = normalizeRoleValue(ownerRole) || "manufacturer";
  const normalizedOwnerUsername = ownerUsername || actor;
  const normalizedStatus =
    typeof status === "string" && status.trim().length
      ? status.trim().toLowerCase()
      : "in-factory";
  const normalizedLocation =
    typeof location === "string" && location.trim().length
      ? location.trim()
      : null;
  const qtyValue = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;

  try {
    const existing = await client.query(
      "SELECT 1 FROM product WHERE serialNumber = $1",
      [serialNumber]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Serial number already exists",
      });
    }

    const addResult = await addProduct(
      serialNumber,
      name,
      brand,
      actor,
      contractAddress || null,
      {
        description,
        productImage,
        location: normalizedLocation,
        ownerRole: normalizedOwnerRole,
        ownerUsername: normalizedOwnerUsername,
        status: normalizedStatus,
        qty: qtyValue,
        metadata: metadata || null,
      }
    );
    res.json({
      success: true,
      message: "Product inserted",
      inventory: addResult?.inventory || null,
    });
  } catch (err) {
    console.error("Add product error:", err?.message || err);
    res.status(500).json({
      success: false,
      message: "Failed to register product",
    });
  }
});

// --- Logging Functions ---
function logLoginAttempt(username, success, ip) {
  client.query(
    "INSERT INTO login_attempts (username, success, ip_address) VALUES ($1, $2, $3)",
    [username, success, ip],
    (err) => {
      if (err) console.log(err.message);
    }
  );
}

function logProductScan(
  serialNumber,
  username,
  location,
  isAuthentic,
  ipAddress = null,
  userAgent = null
) {
  // Simple suspicion detection logic
  let isSuspicious = false;
  let suspicionReason = null;

  // Mark as suspicious if not authentic
  if (!isAuthentic) {
    isSuspicious = true;
    suspicionReason = "Product marked as not authentic";
  }

  client.query(
    "INSERT INTO product_scans (serial_number, username, location, is_authentic, is_suspicious, suspicion_reason, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      serialNumber,
      username,
      location,
      isAuthentic,
      isSuspicious,
      suspicionReason,
      ipAddress,
      userAgent,
    ],
    async (err) => {
      if (err) {
        console.log(err.message);
      } else {
        console.log("Product scan logged successfully");

        // Send email alert for suspicious scans
        if (isSuspicious) {
          try {
            // Get product details and owner email
            const productResult = await client.query(
              `SELECT p.name as product_name, p.brand, a.email, a.username as owner
               FROM product p 
               LEFT JOIN auth a ON a.username = (
                 SELECT al.username FROM activity_log al 
                 WHERE al.action = 'add_product' AND al.target = p.serialnumber 
                 ORDER BY al.log_time DESC LIMIT 1
               )
               WHERE p.serialnumber = $1`,
              [serialNumberForStorage]
            );

            if (productResult.rows.length > 0 && productResult.rows[0].email) {
              const product = productResult.rows[0];
              const scanData = {
                productName: product.product_name,
                serialNumber: serialNumber,
                scanTime: new Date(),
                suspicionReason: suspicionReason,
                ipAddress: ipAddress,
                location: location,
              };

              await emailService.sendSuspiciousScanEmail(
                client,
                product.email,
                scanData
              );
              console.log(`Suspicious scan alert sent to ${product.email}`);
            }
          } catch (emailErr) {
            console.error("Error sending suspicious scan email:", emailErr);
          }
        }
      }
    }
  );
}

function logActivity(username, action, target, details) {
  client.query(
    "INSERT INTO activity_log (username, action, target, details) VALUES ($1, $2, $3, $4)",
    [username, action, target, details],
    (err) => {
      if (err) console.log(err.message);
    }
  );
}

// ===== Consumer Ownership Helpers & Endpoints =====
async function closeExistingOwnership(serialNumber) {
  try {
    await client.query(
      `UPDATE consumer_ownership
       SET transferred_at = NOW()
       WHERE serial_number = $1 AND transferred_at IS NULL`,
      [serialNumber]
    );
  } catch (e) {
    console.warn("Failed to close existing ownership:", e?.message);
  }
}

// Transfer or set current owner of a serial number
app.post("/ownership/transfer", async (req, res) => {
  try {
    const schema = Joi.object({
      serialNumber: Joi.string().trim().required(),
      ownerName: Joi.string().trim().required(),
      ownerIdentifier: Joi.string().trim().min(3).max(128).required(),
      actor: Joi.string().allow(null, ""),
    });
    const { value, error } = schema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: `Invalid payload: ${error.message}` });
    }

    const { serialNumber, ownerName, ownerIdentifier, actor } = value;

    await client.query("BEGIN");
    await closeExistingOwnership(serialNumber);

    // Insert new owner. Support schemas with/without owner_identifier column
    let inserted = false;
    try {
      await client.query(
        `INSERT INTO consumer_ownership (serial_number, owner_name, owner_identifier)
         VALUES ($1, $2, $3)`,
        [serialNumber, ownerName, ownerIdentifier]
      );
      inserted = true;
    } catch (e1) {
      console.warn(
        "consumer_ownership insert with owner_identifier failed, retrying without column:",
        e1?.message
      );
      await client.query(
        `INSERT INTO consumer_ownership (serial_number, owner_name)
         VALUES ($1, $2)`,
        [serialNumber, ownerName]
      );
      inserted = true;
    }

    await client.query("COMMIT");

    logActivity(
      actor || "system",
      "ownership_transfer",
      serialNumber,
      `Ownership set to ${ownerName} (${ownerIdentifier})`
    );

    return res.json({ success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("/ownership/transfer error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Error updating ownership" });
  }
});

// Get current owner (no transferred_at)
app.get("/ownership/:serialNumber", async (req, res) => {
  try {
    const { serialNumber } = req.params;
    let row = null;
    try {
      const r = await client.query(
        `SELECT serial_number, owner_name,
                COALESCE(owner_identifier, NULL) AS owner_identifier,
                acquired_at, transferred_at
         FROM consumer_ownership
         WHERE serial_number = $1
         ORDER BY id DESC
         LIMIT 1`,
        [serialNumber]
      );
      row = r.rows?.[0] || null;
    } catch (e1) {
      // Fallback for schemas without owner_identifier
      const r2 = await client.query(
        `SELECT serial_number, owner_name,
                NULL::text AS owner_identifier,
                acquired_at, transferred_at
         FROM consumer_ownership
         WHERE serial_number = $1
         ORDER BY id DESC
         LIMIT 1`,
        [serialNumber]
      );
      row = r2.rows?.[0] || null;
    }
    return res.json({ success: true, owner: row });
  } catch (e) {
    console.error("/ownership/:serialNumber error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching ownership" });
  }
});

// ===== Inventory & Product Movement Module =====
const INVENTORY_ALLOWED_ROLES = [
  "admin",
  "manufacturer",
  "supplier",
  "retailer",
];

const inventoryListSchema = Joi.object({
  ownerRole: Joi.string()
    .valid("admin", "manufacturer", "supplier", "retailer", "all")
    .empty("")
    .default("all"),
  status: Joi.string().max(64).allow(null, ""),
  search: Joi.string().max(128).allow(null, ""),
  limit: Joi.number().integer().min(1).max(500).default(200),
});

const inventoryMovesSchema = Joi.object({
  ownerRole: Joi.string()
    .valid("admin", "manufacturer", "supplier", "retailer", "all")
    .empty("")
    .default("all"),
  serialNumber: Joi.string().max(128).allow(null, ""),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

const inventoryMoveSchema = Joi.object({
  serialNumber: Joi.string().trim().max(128).required(),
  productName: Joi.string().allow(null, ""),
  brand: Joi.string().allow(null, ""),
  productImage: Joi.string().allow(null, ""),
  qty: Joi.number().integer().min(1).max(100000).default(1),
  toRole: Joi.string()
    .valid("manufacturer", "supplier", "retailer", "admin")
    .required(),
  toUsername: Joi.string().allow(null, ""),
  status: Joi.string().max(64).allow(null, ""),
  fromRole: Joi.string().allow(null, ""),
  fromUsername: Joi.string().allow(null, ""),
  notes: Joi.string().allow(null, ""),
  location: Joi.string().allow(null, ""),
  metadata: Joi.alternatives()
    .try(Joi.object().unknown(true), Joi.string().max(2000))
    .optional(),
});

const normalizeRoleValue = (role) =>
  typeof role === "string" ? role.trim().toLowerCase() : "";

const deriveLowStockWarnings = (roleRows = []) => {
  const warnings = [];
  for (const row of roleRows) {
    const normalizedRole = normalizeRoleValue(row.owner_role);
    if (!normalizedRole) continue;
    const threshold = INVENTORY_LOW_STOCK_THRESHOLDS[normalizedRole];
    if (!Number.isFinite(threshold) || threshold < 0) continue;
    const qty = Number(row.total_qty) || 0;
    if (qty <= threshold) {
      warnings.push({
        role: normalizedRole,
        threshold,
        qty,
        deficit: Math.max(0, threshold - qty),
      });
    }
  }
  return warnings;
};

const serializeMetadataPayload = (metadata) => {
  if (metadata === undefined || metadata === null) {
    return null;
  }
  if (typeof metadata === "string") {
    const trimmed = metadata.trim();
    return trimmed.length ? trimmed : null;
  }
  try {
    return JSON.stringify(metadata);
  } catch (err) {
    console.warn("Failed to stringify metadata payload:", err?.message);
    return null;
  }
};

const resolveInventoryScope = (userRole, requestedRole) => {
  const normalizedUserRole = normalizeRoleValue(userRole);
  if (normalizedUserRole !== "admin") {
    return normalizedUserRole || null;
  }
  const normalizedRequested = normalizeRoleValue(requestedRole);
  if (!normalizedRequested || normalizedRequested === "all") {
    return null;
  }
  return normalizedRequested;
};

app.get(
  "/inventory",
  authenticateToken,
  requireRole(INVENTORY_ALLOWED_ROLES),
  async (req, res) => {
    try {
      const { value, error } = inventoryListSchema.validate(req.query || {}, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      const scopeRole = resolveInventoryScope(req.user?.role, value.ownerRole);
      const statusFilter =
        typeof value.status === "string" && value.status.trim().length
          ? value.status.trim().toLowerCase()
          : null;
      const searchFilter =
        typeof value.search === "string" && value.search.trim().length
          ? `%${value.search.trim()}%`
          : null;

      const filters = [];
      const filterParams = [];

      if (scopeRole) {
        const idx = filterParams.length + 1;
        filters.push(`i.owner_role = $${idx}`);
        filterParams.push(scopeRole);
      }
      if (statusFilter) {
        const idx = filterParams.length + 1;
        filters.push(`LOWER(COALESCE(i.status, '')) = $${idx}`);
        filterParams.push(statusFilter);
      }
      if (searchFilter) {
        const idx = filterParams.length + 1;
        filters.push(
          `(i.serial_number ILIKE $${idx} OR COALESCE(i.product_name, '') ILIKE $${idx} OR COALESCE(i.brand, '') ILIKE $${idx})`
        );
        filterParams.push(searchFilter);
      }

      const whereClause = filters.length
        ? `WHERE ${filters.join(" AND ")}`
        : "";

      const chainEventsAvailable = await isChainEventsAvailable();
      const reconciliationFragments = chainEventsAvailable
        ? buildReconciliationFragments("i", "rec")
        : {
            select:
              "'unknown'::text AS reconciliation_status, NULL::timestamptz AS last_chain_event_at",
            join: "",
          };

      const listParams = [...filterParams, value.limit];
      const limitIdx = listParams.length;
      const itemsResult = await client.query(
        `SELECT i.id,
          i.serial_number,
          COALESCE(i.product_name, p.name) AS product_name,
          COALESCE(i.brand, p.brand) AS brand,
          COALESCE(i.product_image, p.image) AS product_image,
          p.description AS product_description,
          i.owner_role,
          i.owner_username,
          i.qty,
          i.status,
          i.location,
          i.notes,
          i.metadata,
          i.created_at,
          i.updated_at,
          ${reconciliationFragments.select}
         FROM inventory i
         LEFT JOIN product p ON p.serialnumber = i.serial_number
         ${reconciliationFragments.join}
         ${whereClause}
         ORDER BY i.updated_at DESC
         LIMIT $${limitIdx}`,
        listParams
      );

      const totalsResult = await client.query(
        `SELECT COUNT(*)::int AS total_records,
                COALESCE(SUM(i.qty), 0)::int AS total_qty
         FROM inventory i
         ${whereClause}`,
        filterParams
      );

      const statusResult = await client.query(
        `SELECT COALESCE(i.status, 'unknown') AS status,
                COALESCE(SUM(i.qty), 0)::int AS total_qty
         FROM inventory i
         ${whereClause}
         GROUP BY COALESCE(i.status, 'unknown')
         ORDER BY total_qty DESC`,
        filterParams
      );

      const roleResult = await client.query(
        `SELECT COALESCE(i.owner_role, 'unknown') AS owner_role,
                COALESCE(SUM(i.qty), 0)::int AS total_qty
         FROM inventory i
         ${whereClause}
         GROUP BY COALESCE(i.owner_role, 'unknown')
         ORDER BY total_qty DESC`,
        filterParams
      );

      let reconciliationSummaryRows = [];
      if (chainEventsAvailable) {
        const { join: reconciliationSummaryJoin } =
          buildReconciliationFragments("i", "rec_summary");
        const reconciliationResult = await client.query(
          `SELECT COALESCE(rec_summary.reconciliation_status, 'missing') AS status,
                  COUNT(*)::int AS records
           FROM inventory i
           ${reconciliationSummaryJoin}
           ${whereClause}
           GROUP BY COALESCE(rec_summary.reconciliation_status, 'missing')
           ORDER BY status`,
          filterParams
        );
        reconciliationSummaryRows = reconciliationResult.rows || [];
      }

      const lowStockWarnings = deriveLowStockWarnings(roleResult.rows || []);

      return res.json({
        success: true,
        available: true,
        filters: {
          ownerRole: scopeRole || "network",
          status: statusFilter || null,
          search: value.search || null,
        },
        items: itemsResult.rows || [],
        summary: {
          totalRecords: totalsResult.rows?.[0]?.total_records || 0,
          totalQty: totalsResult.rows?.[0]?.total_qty || 0,
          statusBreakdown: statusResult.rows || [],
          roleBreakdown: roleResult.rows || [],
          reconciliation: {
            available: chainEventsAvailable,
            breakdown: reconciliationSummaryRows,
          },
          lowStockWarnings,
        },
      });
    } catch (err) {
      console.error("/inventory error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error fetching inventory" });
    }
  }
);

app.get(
  "/inventory/moves",
  authenticateToken,
  requireRole(INVENTORY_ALLOWED_ROLES),
  async (req, res) => {
    try {
      const { value, error } = inventoryMovesSchema.validate(req.query || {}, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      const scopeRole = resolveInventoryScope(req.user?.role, value.ownerRole);
      const serialFilter =
        typeof value.serialNumber === "string" &&
        value.serialNumber.trim().length
          ? value.serialNumber.trim()
          : null;

      const filters = [];
      const params = [];

      if (serialFilter) {
        const idx = params.length + 1;
        filters.push(`serial_number = $${idx}`);
        params.push(serialFilter);
      }

      if (scopeRole) {
        const idx = params.length + 1;
        filters.push(
          `(COALESCE(from_owner_role, '') = $${idx} OR COALESCE(to_owner_role, '') = $${idx})`
        );
        params.push(scopeRole);
      }

      const whereClause = filters.length
        ? `WHERE ${filters.join(" AND ")}`
        : "";
      const listParams = [...params, value.limit];
      const limitIdx = listParams.length;

      const result = await client.query(
        `SELECT id, serial_number, product_name, brand, product_image,
                from_owner_role, from_owner_username,
                to_owner_role, to_owner_username,
                qty, status, notes, actor_username, metadata, location, moved_at
         FROM inventory_moves
         ${whereClause}
         ORDER BY moved_at DESC
         LIMIT $${limitIdx}`,
        listParams
      );

      return res.json({
        success: true,
        available: true,
        filters: {
          ownerRole: scopeRole || "network",
          serialNumber: serialFilter,
        },
        items: result.rows || [],
      });
    } catch (err) {
      console.error("/inventory/moves error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error fetching move history" });
    }
  }
);

app.get(
  "/inventory/:serialNumber",
  authenticateToken,
  requireRole(INVENTORY_ALLOWED_ROLES),
  async (req, res) => {
    try {
      const serialNumber = (req.params.serialNumber || "").trim();
      if (!serialNumber) {
        return res
          .status(400)
          .json({ success: false, message: "Serial number is required" });
      }
      const scopeRole = resolveInventoryScope(req.user?.role, null);
      const params = [serialNumber];
      let clause = "i.serial_number = $1";
      if (scopeRole) {
        const idx = params.length + 1;
        params.push(scopeRole);
        clause += ` AND i.owner_role = $${idx}`;
      }

      const chainEventsAvailable = await isChainEventsAvailable();
      const detailFragments = chainEventsAvailable
        ? buildReconciliationFragments("i", "rec_detail")
        : {
            select:
              "'unknown'::text AS reconciliation_status, NULL::timestamptz AS last_chain_event_at",
            join: "",
          };

      const result = await client.query(
        `SELECT i.id,
                i.serial_number,
                COALESCE(i.product_name, p.name) AS product_name,
                COALESCE(i.brand, p.brand) AS brand,
                COALESCE(i.product_image, p.image) AS product_image,
                p.description AS product_description,
                i.owner_role,
                i.owner_username,
                i.qty,
                i.status,
                i.location,
                i.notes,
                i.metadata,
                i.created_at,
                  i.updated_at,
                  ${detailFragments.select}
         FROM inventory i
         LEFT JOIN product p ON p.serialnumber = i.serial_number
                ${detailFragments.join}
         WHERE ${clause}
         LIMIT 1`,
        params
      );

      if (!result.rows?.length) {
        return res
          .status(404)
          .json({ success: false, message: "Inventory record not found" });
      }

      return res.json({ success: true, item: result.rows[0] });
    } catch (err) {
      console.error("/inventory/:serialNumber error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error fetching inventory record" });
    }
  }
);

app.post(
  "/inventory/move",
  authenticateToken,
  requireRole(INVENTORY_ALLOWED_ROLES),
  async (req, res) => {
    try {
      const { value, error } = inventoryMoveSchema.validate(req.body || {}, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      const serialNumber = value.serialNumber.trim();
      const actorUsername = req.user?.username || "system";
      const actorRole = normalizeRoleValue(req.user?.role) || "system";
      const toRole = normalizeRoleValue(value.toRole);
      const normalizedFromRole = normalizeRoleValue(value.fromRole);
      const targetQty = Number.isFinite(value.qty) ? value.qty : 1;
      const targetStatus =
        typeof value.status === "string" && value.status.trim().length
          ? value.status.trim().toLowerCase()
          : "in-transit";
      const metadataPayload = serializeMetadataPayload(value.metadata);

      await client.query("BEGIN");

      const existingResult = await client.query(
        "SELECT * FROM inventory WHERE serial_number = $1 FOR UPDATE",
        [serialNumber]
      );
      const existing = existingResult.rows?.[0] || null;
      const existingOwner = existing?.owner_role
        ? existing.owner_role.toLowerCase()
        : null;

      if (
        actorRole !== "admin" &&
        existing &&
        existingOwner &&
        existingOwner !== actorRole &&
        normalizedFromRole !== actorRole &&
        toRole !== actorRole
      ) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          success: false,
          message: "You cannot move inventory you do not control",
        });
      }

      let productRecord = null;
      try {
        const productLookup = await client.query(
          "SELECT name, brand, image FROM product WHERE serialnumber = $1",
          [serialNumber]
        );
        productRecord = productLookup.rows?.[0] || null;
      } catch (lookupErr) {
        console.warn(
          "[inventory] product lookup failed for serial",
          serialNumber,
          lookupErr?.message || lookupErr
        );
      }

      const normalizedProductName =
        typeof value.productName === "string" && value.productName.trim().length
          ? value.productName.trim()
          : null;
      const normalizedBrand =
        typeof value.brand === "string" && value.brand.trim().length
          ? value.brand.trim()
          : null;
      const normalizedProductImage =
        typeof value.productImage === "string" &&
        value.productImage.trim().length
          ? value.productImage.trim()
          : null;

      const productName =
        normalizedProductName ||
        existing?.product_name ||
        productRecord?.name ||
        null;
      const brand =
        normalizedBrand || existing?.brand || productRecord?.brand || null;
      const productImage =
        normalizedProductImage ||
        existing?.product_image ||
        productRecord?.image ||
        null;
      const fromRole = normalizedFromRole || existingOwner || actorRole;
      const fromUsername =
        value.fromUsername || existing?.owner_username || null;
      const toUsername = value.toUsername || null;
      const nextLocation = value.location || existing?.location || null;
      const nextNotes = value.notes ?? null;

      let upsertRow = null;
      if (existing) {
        const updateResult = await client.query(
          `UPDATE inventory
             SET product_name = $2,
                 brand = $3,
                 product_image = $4,
                 owner_role = $5,
                 owner_username = $6,
                 qty = $7,
                 status = $8,
                 location = $9,
                 notes = COALESCE($10, notes),
                 metadata = CASE
                   WHEN $11::jsonb IS NOT NULL THEN jsonb_strip_nulls(COALESCE(metadata, '{}'::jsonb) || $11::jsonb)
                   ELSE metadata
                 END
           WHERE serial_number = $1
           RETURNING *`,
          [
            serialNumber,
            productName,
            brand,
            productImage,
            toRole,
            toUsername || existing.owner_username || null,
            targetQty,
            targetStatus,
            nextLocation,
            nextNotes,
            metadataPayload,
          ]
        );
        upsertRow = updateResult.rows?.[0] || null;
      } else {
        const insertResult = await client.query(
          `INSERT INTO inventory (
             serial_number, product_name, brand, product_image, owner_role, owner_username,
             qty, status, location, notes, metadata
           ) VALUES (
             $1, $2, $3, $4, $5, $6,
             $7, $8, $9, $10, COALESCE($11::jsonb, '{}'::jsonb)
           )
           RETURNING *`,
          [
            serialNumber,
            productName,
            brand,
            productImage,
            toRole,
            toUsername,
            targetQty,
            targetStatus,
            nextLocation,
            nextNotes,
            metadataPayload,
          ]
        );
        upsertRow = insertResult.rows?.[0] || null;
      }

      const moveResult = await client.query(
        `INSERT INTO inventory_moves (
           serial_number, product_name, brand, product_image,
           from_owner_role, from_owner_username,
           to_owner_role, to_owner_username,
           qty, status, notes, actor_username, metadata, location
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6,
           $7, $8,
           $9, $10, $11, $12, COALESCE($13::jsonb, '{}'::jsonb), $14
         )
         RETURNING *`,
        [
          serialNumber,
          productName,
          brand,
          productImage,
          fromRole || null,
          fromUsername,
          toRole,
          toUsername,
          targetQty,
          targetStatus,
          nextNotes,
          actorUsername,
          metadataPayload,
          nextLocation,
        ]
      );

      await client.query("COMMIT");

      logActivity(
        actorUsername,
        "inventory_move",
        serialNumber,
        `Moved ${targetQty} unit(s) from ${fromRole || "unknown"} to ${toRole}`
      );

      return res.json({
        success: true,
        item: upsertRow,
        move: moveResult.rows?.[0] || null,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("/inventory/move error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to record inventory move" });
    }
  }
);

const unixToIso = (seconds) => {
  if (!seconds && seconds !== 0) return null;
  if (!Number.isFinite(seconds)) return null;
  try {
    return new Date(seconds * 1000).toISOString();
  } catch (err) {
    return null;
  }
};

const parseJsonPayload = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return { raw: value };
  }
};

function normalizeChainEventRow(row) {
  const payload = parseJsonPayload(row.payload);
  const timestampUnixCandidate =
    typeof payload.timestampUnix === "number"
      ? payload.timestampUnix
      : Number(payload.timestamp);

  const timestampUnix = Number.isFinite(timestampUnixCandidate)
    ? timestampUnixCandidate
    : null;

  return {
    id: row.id,
    serialNumber: row.serial_number,
    eventName: row.event_name,
    txHash: row.tx_hash,
    payload,
    blockNumber:
      row.block_number !== null && row.block_number !== undefined
        ? Number(row.block_number)
        : null,
    logIndex:
      row.log_index !== null && row.log_index !== undefined
        ? Number(row.log_index)
        : null,
    eventSignature: row.event_signature,
    emittedAt: row.emitted_at,
    createdAt: row.created_at,
    timestampUnix,
    timestampIso: timestampUnix ? unixToIso(timestampUnix) : row.emitted_at,
  };
}

function buildReconciliation(onChainEvents, ownershipHistory) {
  const issues = [];
  let status = "ok";

  const sortedOnChain = [...onChainEvents].sort((a, b) => {
    const aBlock = a.blockNumber ?? -1;
    const bBlock = b.blockNumber ?? -1;
    if (aBlock !== bBlock) return aBlock - bBlock;
    const aLog = a.logIndex ?? -1;
    const bLog = b.logIndex ?? -1;
    if (aLog !== bLog) return aLog - bLog;
    return (a.id || 0) - (b.id || 0);
  });

  const latestSoldEvent = [...sortedOnChain]
    .reverse()
    .find((event) => event.payload && event.payload.isSold === true);

  const currentOwner = ownershipHistory.find((owner) => !owner.transferred_at);

  if (latestSoldEvent && !currentOwner) {
    status = "warning";
    issues.push(
      "On-chain history marks the product as sold but no off-chain ownership record is active."
    );
  }

  if (!latestSoldEvent && currentOwner) {
    status = "warning";
    issues.push(
      "Off-chain ownership record exists but the latest on-chain history does not mark the product as sold."
    );
  }

  if (latestSoldEvent && currentOwner) {
    const onChainTs = latestSoldEvent?.payload?.timestampUnix;
    const offChainTs = currentOwner?.acquired_at
      ? Date.parse(currentOwner.acquired_at) / 1000
      : null;

    if (onChainTs && offChainTs) {
      const deltaMinutes = Math.abs(onChainTs - offChainTs) / 60;
      if (deltaMinutes > 120) {
        status = "warning";
        issues.push(
          `On-chain sale timestamp differs from off-chain ownership record by roughly ${Math.round(
            deltaMinutes
          )} minutes.`
        );
      }
    }
  }

  if (issues.length === 0) {
    issues.push("On-chain events and off-chain ownership are in sync.");
  }

  const combinedTimeline = [
    ...sortedOnChain.map((evt) => ({
      type: "on-chain",
      label: evt.eventName,
      blockNumber: evt.blockNumber,
      logIndex: evt.logIndex,
      timestampUnix: evt.timestampUnix,
      timestampIso: evt.timestampIso || evt.emittedAt,
      payload: evt.payload,
      txHash: evt.txHash,
    })),
    ...ownershipHistory.map((owner) => ({
      type: owner.transferred_at ? "off-chain-transfer" : "off-chain",
      label: owner.transferred_at
        ? "Ownership transferred"
        : "Ownership recorded",
      ownerName: owner.owner_name,
      ownerIdentifier: owner.owner_identifier,
      acquiredAt: owner.acquired_at,
      transferredAt: owner.transferred_at,
      timestampUnix: owner.acquired_at
        ? Date.parse(owner.acquired_at) / 1000
        : null,
      timestampIso: owner.acquired_at,
    })),
  ].sort((a, b) => {
    const aTs = a.timestampUnix ?? -1;
    const bTs = b.timestampUnix ?? -1;
    if (aTs !== bTs) return aTs - bTs;
    const aBlock = a.blockNumber ?? -1;
    const bBlock = b.blockNumber ?? -1;
    if (aBlock !== bBlock) return aBlock - bBlock;
    const aLog = a.logIndex ?? -1;
    const bLog = b.logIndex ?? -1;
    return aLog - bLog;
  });

  return {
    status,
    issues,
    latestSoldEvent,
    currentOwner,
    combinedTimeline,
  };
}

app.get("/chain-indexer/status", (req, res) => {
  try {
    const status = chainIndexerController?.getStatus
      ? chainIndexerController.getStatus()
      : {
          enabled: false,
          status: "not-initialized",
          updatedAt: new Date().toISOString(),
        };

    return res.json({ success: true, status });
  } catch (err) {
    console.error("/chain-indexer/status error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chain indexer status",
    });
  }
});

app.get("/chain-events", async (req, res) => {
  try {
    const schema = Joi.object({
      serialNumber: Joi.string().trim().optional(),
      eventName: Joi.string().trim().optional(),
      limit: Joi.number().integer().min(1).max(500).default(100),
      offset: Joi.number().integer().min(0).default(0),
      format: Joi.string().valid("json", "csv").default("json"),
    });

    const { value, error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const events = await fetchChainEvents(client, value);
    const normalized = events.map(normalizeChainEventRow);

    if (value.format === "csv") {
      const parser = new Parser({
        fields: [
          "id",
          "serialNumber",
          "eventName",
          "txHash",
          "blockNumber",
          "logIndex",
          "timestampIso",
          "timestampUnix",
          "emittedAt",
        ],
      });
      const csv = parser.parse(normalized);
      res.header("Content-Type", "text/csv");
      res.attachment("chain-events.csv");
      return res.send(csv);
    }

    return res.json({ success: true, events: normalized });
  } catch (err) {
    console.error("/chain-events error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching chain events" });
  }
});

app.get("/transparency/:serialNumber", async (req, res) => {
  try {
    const serialNumber = (req.params.serialNumber || "").trim();
    if (!serialNumber) {
      return res.status(400).json({
        success: false,
        message: "Serial number is required",
      });
    }

    const productResult = await client.query(
      `SELECT serialnumber, name, brand, description, image, created_at, updated_at
       FROM product
       WHERE serialnumber = $1`,
      [serialNumber]
    );
    const product = productResult.rows?.[0] || null;

    const events = await fetchChainEvents(client, {
      serialNumber,
      limit: 500,
      offset: 0,
    });
    const onChainEvents = events.map(normalizeChainEventRow).sort((a, b) => {
      const aBlock = a.blockNumber ?? -1;
      const bBlock = b.blockNumber ?? -1;
      if (aBlock !== bBlock) return aBlock - bBlock;
      const aLog = a.logIndex ?? -1;
      const bLog = b.logIndex ?? -1;
      if (aLog !== bLog) return aLog - bLog;
      return (a.id || 0) - (b.id || 0);
    });

    const resolveEventTimestamp = (event) =>
      event?.timestampIso ||
      (typeof event?.timestampUnix === "number"
        ? unixToIso(event.timestampUnix)
        : null) ||
      event?.emittedAt ||
      event?.createdAt ||
      null;

    const firstEvent = onChainEvents[0] || null;
    const lastEvent =
      onChainEvents.length > 0 ? onChainEvents[onChainEvents.length - 1] : null;

    const firstSeenOnChain = resolveEventTimestamp(firstEvent);
    const lastActivityAt = resolveEventTimestamp(lastEvent);

    let ownershipHistory = [];
    try {
      const ownershipResult = await client.query(
        `SELECT id, serial_number, owner_name,
                COALESCE(owner_identifier, NULL) AS owner_identifier,
                acquired_at, transferred_at, created_at
         FROM consumer_ownership
         WHERE serial_number = $1
         ORDER BY acquired_at ASC NULLS LAST, created_at ASC`,
        [serialNumber]
      );
      ownershipHistory = ownershipResult.rows;
    } catch (err) {
      const ownershipResult = await client.query(
        `SELECT id, serial_number, owner_name,
                NULL::text AS owner_identifier,
                acquired_at, transferred_at, created_at
         FROM consumer_ownership
         WHERE serial_number = $1
         ORDER BY acquired_at ASC NULLS LAST, created_at ASC`,
        [serialNumber]
      );
      ownershipHistory = ownershipResult.rows;
    }

    const reconciliation = buildReconciliation(onChainEvents, ownershipHistory);

    return res.json({
      success: true,
      serialNumber,
      product,
      onChainEvents,
      ownershipHistory,
      reconciliation,
      firstSeenOnChain,
      lastActivityAt,
    });
  } catch (err) {
    console.error("/transparency/:serialNumber error:", err);
    return res.status(500).json({
      success: false,
      message: "Error building transparency view",
    });
  }
});

// --- Add Product Scan Logging Endpoint ---
app.post("/scan-product", async (req, res) => {
  const { serialNumber, username, location, isAuthentic } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent");

  try {
    // Check if product exists
    const productExists = await client.query(
      "SELECT serialNumber FROM product WHERE serialNumber = $1",
      [serialNumber]
    );

    // Log the scan regardless of whether the product exists or not
    logProductScan(
      serialNumber,
      username,
      location,
      isAuthentic,
      ipAddress,
      userAgent
    );

    // Return appropriate response based on product existence
    if (productExists.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product serial number",
        scanLogged: true,
      });
    }

    res.json({
      success: true,
      message: "Scan logged successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error logging scan",
    });
  }
});

function normalizeIpAddress(ip) {
  if (!ip) {
    return null;
  }
  let candidate = String(ip).trim();
  if (candidate.includes(",")) {
    candidate = candidate.split(",")[0].trim();
  }
  if (candidate.startsWith("::ffff:")) {
    candidate = candidate.substring(7);
  }
  if (candidate === "::1") {
    candidate = "127.0.0.1";
  }
  return candidate;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const fallback =
    req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  return normalizeIpAddress(forwarded || fallback);
}

function isPrivateIp(ip) {
  if (!ip) return true;
  const privatePatterns = [
    /^10\./,
    /^127\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[0-1])\./,
  ];
  return privatePatterns.some((pattern) => pattern.test(ip));
}

function resolveGeo(ip) {
  if (!ip) {
    return { country: null, city: null };
  }
  if (isPrivateIp(ip)) {
    return { ...PRIVATE_NETWORK_GEO };
  }
  try {
    const geo = geoip.lookup(ip);
    if (!geo) {
      return { country: null, city: null };
    }

    const countryCode = geo.country || null;
    const normalizedCountry = countryCode
      ? regionDisplayNames?.of?.(countryCode) || countryCode
      : null;
    const cityCandidate = geo.city || geo.region || null;
    const normalizedCity =
      cityCandidate && cityCandidate !== "" ? cityCandidate : null;

    return {
      country: normalizedCountry,
      city: normalizedCity,
    };
  } catch (err) {
    console.warn("Failed to resolve geo for ip", ip, err.message);
    return { country: null, city: null };
  }
}

// ===== Verification Endpoint with Duplicate Detection =====
// Rule v1: same serial scanned from >3 distinct IPs within 10 minutes => suspicious
async function computeDuplicateSuspicion(serialNumber) {
  const windowMinutes = 10;
  const windowQuery = `
    SELECT COUNT(DISTINCT ip_address) AS ip_count
    FROM product_scans
    WHERE serial_number = $1
      AND scan_time >= NOW() - INTERVAL '${windowMinutes} minutes'
      AND ip_address IS NOT NULL
  `;
  const r = await client.query(windowQuery, [serialNumber]);
  const ipCount = parseInt(r.rows?.[0]?.ip_count || 0, 10);
  const threshold = 3;
  return {
    isSuspicious: ipCount > threshold,
    reason:
      ipCount > threshold
        ? `Serial scanned from ${ipCount} distinct IPs in last ${windowMinutes} minutes`
        : null,
  };
}

const verifyScanSchema = Joi.object({
  qrData: Joi.string().trim().required(), // expected format: "CONTRACT,serial"
  username: Joi.string().allow(null, "").default("anonymous"),
  location: Joi.string().allow(null, ""),
  coordinates: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  })
    .allow(null)
    .default(null),
  geoCountry: Joi.string().allow(null, ""),
  geoCity: Joi.string().allow(null, ""),
  locationSource: Joi.string().allow(null, ""),
});

const sanitizeLocationToken = (token) => {
  if (token === null || token === undefined) {
    return null;
  }
  const trimmed = String(token).trim();
  if (!trimmed) {
    return null;
  }
  if (/^lat:/i.test(trimmed) || /^lon:/i.test(trimmed)) {
    return null;
  }
  return trimmed;
};

function inferGeoFromLocationString(locationString) {
  if (!locationString || typeof locationString !== "string") {
    return { city: null, country: null };
  }

  const tokens = locationString
    .split(",")
    .map((part) => sanitizeLocationToken(part))
    .filter(Boolean);

  if (!tokens.length) {
    return { city: null, country: null };
  }

  const country = tokens[tokens.length - 1] || null;
  let city = null;
  for (let idx = tokens.length - 2; idx >= 0; idx -= 1) {
    const candidate = tokens[idx];
    if (candidate) {
      city = candidate;
      break;
    }
  }

  return { city, country };
}

const normalizeOptionalString = (value, fallback = null) => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : fallback;
};

app.post("/verification/scan", async (req, res) => {
  try {
    // Validate input
    const rawBody = req.body || {};
    const { value, error } = verifyScanSchema.validate(rawBody, {
      abortEarly: false,
      stripUnknown: true,
    });
    let validationIssue = null;
    let payload = value;
    if (error) {
      validationIssue = error.message;
      console.warn(
        "verification/scan validation fallback",
        validationIssue,
        error?.details || []
      );
      payload = {
        qrData: normalizeOptionalString(rawBody.qrData, ""),
        username: normalizeOptionalString(rawBody.username, "anonymous"),
        location: normalizeOptionalString(rawBody.location, null),
        coordinates: null,
        geoCountry: normalizeOptionalString(rawBody.geoCountry, null),
        geoCity: normalizeOptionalString(rawBody.geoCity, null),
      };
    }

    const {
      qrData,
      username,
      location,
      coordinates,
      geoCountry: geoCountryFromClient,
      geoCity: geoCityFromClient,
    } = payload;
    const ipAddress = getClientIp(req);
    const userAgent = req.get("User-Agent");
    const ipGeo = resolveGeo(ipAddress);

    // Parse QR payload (allowing invalid data to be logged as suspicious)
    const rawPayload = String(qrData || "");
    const parts = rawPayload.split(",");
    const qrContract = parts.length ? parts[0].trim() || null : null;
    const parsedSerial =
      parts.length > 1 ? parts.slice(1).join(",").trim() || null : null;
    const hasValidSerial = Boolean(parsedSerial && parsedSerial.length);
    const serialNumber = hasValidSerial ? parsedSerial : null;
    const fallbackSerialCandidate = rawPayload.slice(0, 255).trim();
    const serialNumberForStorage = hasValidSerial
      ? parsedSerial
      : fallbackSerialCandidate.length
      ? fallbackSerialCandidate
      : "[invalid-qr]";

    let locationToPersist = location;
    if (!locationToPersist && coordinates?.latitude && coordinates?.longitude) {
      locationToPersist = `lat:${coordinates.latitude};lon:${coordinates.longitude}`;
    }
    if (typeof locationToPersist === "string") {
      locationToPersist = locationToPersist.trim();
      if (locationToPersist.length === 0) {
        locationToPersist = null;
      }
    }

    const inferredGeo = inferGeoFromLocationString(locationToPersist);
    const finalGeoCountry =
      geoCountryFromClient && geoCountryFromClient.trim().length
        ? geoCountryFromClient.trim()
        : inferredGeo.country || ipGeo.country;
    const finalGeoCity =
      geoCityFromClient && geoCityFromClient.trim().length
        ? geoCityFromClient.trim()
        : inferredGeo.city || ipGeo.city;

    // Determine authenticity by contract matching; optionally verify product existence in DB
    const expectedContract = process.env.CONTRACT_ADDRESS || null;
    let isAuthentic = expectedContract ? qrContract === expectedContract : true; // if env not set, don’t auto-fail
    if (!hasValidSerial) {
      isAuthentic = false;
    }

    // Log the scan immediately
    const insertResult = await client.query(
      `INSERT INTO product_scans (
         serial_number,
         username,
         location,
         is_authentic,
         ip_address,
         user_agent,
         geo_country,
         geo_city
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        serialNumberForStorage,
        username || "anonymous",
        locationToPersist || null,
        isAuthentic,
        ipAddress,
        userAgent,
        finalGeoCountry,
        finalGeoCity,
      ]
    );
    const insertedScanId = insertResult?.rows?.[0]?.id || null;

    // Evaluate duplicate suspicion window
    const dup = await computeDuplicateSuspicion(serialNumberForStorage);
    let isSuspicious = dup.isSuspicious || false;
    let suspicionReason = dup.reason || null;

    // Non-authentic scans are always suspicious
    if (!isAuthentic) {
      isSuspicious = true;
      suspicionReason = suspicionReason || "Contract address mismatch";
    }

    if (!hasValidSerial) {
      isSuspicious = true;
      suspicionReason = "Invalid QR payload format";
    }

    if (validationIssue) {
      isSuspicious = true;
      suspicionReason = suspicionReason
        ? `${suspicionReason}; Validation: ${validationIssue}`
        : `Validation error: ${validationIssue}`;
    }

    // Update the last inserted scan row to set suspicion fields
    try {
      if (insertedScanId) {
        await client.query(
          `UPDATE product_scans
           SET is_suspicious = $1, suspicion_reason = $2
           WHERE id = $3`,
          [isSuspicious, suspicionReason, insertedScanId]
        );
      }
    } catch {}

    // Activity log (optional)
    logActivity(
      username || "anonymous",
      "product_verification_scan",
      serialNumber || serialNumberForStorage,
      `Verification scan - Authentic: ${isAuthentic}, Suspicious: ${isSuspicious}`
    );

    // If suspicious, optionally notify owner (reuse existing email logic)
    if (isSuspicious) {
      try {
        const productResult = await client.query(
          `SELECT p.name as product_name, p.brand, a.email
           FROM product p 
           LEFT JOIN auth a ON a.username = (
             SELECT al.username FROM activity_log al 
             WHERE al.action = 'add_product' AND al.target = p.serialnumber 
             ORDER BY al.log_time DESC LIMIT 1
           )
           WHERE p.serialnumber = $1`,
          [serialNumber || serialNumberForStorage]
        );
        if (productResult.rows.length > 0 && productResult.rows[0].email) {
          const product = productResult.rows[0];
          await emailService.sendSuspiciousScanEmail(client, product.email, {
            productName: product.product_name,
            serialNumber: serialNumber || serialNumberForStorage,
            scanTime: new Date(),
            suspicionReason: suspicionReason || "Duplicate scan pattern",
            ipAddress,
            location: locationToPersist || null,
          });
        }
      } catch (e) {
        console.warn("Suspicious scan email failed:", e?.message);
      }
    }

    // Build response
    return res.json({
      success: true,
      isAuthentic,
      isSuspicious,
      suspicionReason,
      serialNumber,
    });
  } catch (e) {
    console.error("/verification/scan error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Error processing verification scan" });
  }
});

// --- Admin Delete User Endpoint ---
app.delete("/delete-user/:username", async (req, res) => {
  const { username } = req.params;
  try {
    await client.query("DELETE FROM auth WHERE username = $1", [username]);
    await client.query("DELETE FROM profile WHERE username = $1", [username]);
    logActivity("admin", "delete_user", username, "User deleted by admin");
    res.send({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

// --- Dashboard Analytics Endpoint ---
app.get("/dashboard-analytics", async (req, res) => {
  try {
    // Get user counts by role with coalesce to handle null counts
    const userCounts = await client.query(`
      SELECT role, COUNT(*) as count 
      FROM profile p
      WHERE EXISTS (
        SELECT 1 FROM auth a WHERE a.username = p.username
      )
      GROUP BY role
    `);

    // Get total product count
    const productCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM product
    `);

    // Get total scan count
    const scanCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM product_scans
    `);

    // Get authentic scan count
    const authenticScanCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM product_scans 
      WHERE is_authentic = true
    `);

    // Get counterfeit scan count
    const counterfeitScanCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM product_scans 
      WHERE is_authentic = false
    `);

    // Format the response
    res.send({
      userCounts: userCounts.rows,
      productCount: parseInt(productCount.rows[0]?.count || 0),
      scanCount: parseInt(scanCount.rows[0]?.count || 0),
      authenticScanCount: parseInt(authenticScanCount.rows[0]?.count || 0),
      counterfeitScanCount: parseInt(counterfeitScanCount.rows[0]?.count || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

// --- Enhanced Logs Endpoints with Filters ---
app.get("/login-attempts", async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const username = req.query.username;
  const success = req.query.success;
  const days = parseInt(req.query.days) || null;

  let query = "SELECT * FROM login_attempts WHERE 1=1";
  const params = [];
  let paramIndex = 1;

  if (username) {
    query += ` AND username = $${paramIndex}`;
    params.push(username);
    paramIndex++;
  }

  if (success !== undefined) {
    query += ` AND success = $${paramIndex}`;
    params.push(success === "true");
    paramIndex++;
  }

  if (days) {
    query += ` AND attempt_time >= NOW() - INTERVAL '${days} days'`;
  }

  query += ` ORDER BY attempt_time DESC LIMIT $${paramIndex}`;
  params.push(limit);

  try {
    const data = await client.query(query, params);
    res.send(data.rows);
  } catch (err) {
    console.error("Error fetching login attempts:", err);
    res.status(500).send({ message: err.message });
  }
});

app.get("/manufacturer/products-summary", async (req, res) => {
  try {
    const username = (req.query.username || "").trim();
    const daysParam = parseInt(req.query.days, 10);
    const limitParam = parseInt(req.query.limit, 10);

    if (!username) {
      return res
        .status(400)
        .json({ success: false, message: "Username is required" });
    }

    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    const limit = Math.min(
      Math.max(
        Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 10,
        1
      ),
      50
    );

    const totalsQuery = await client.query(
      `SELECT
         COUNT(*)::int AS total_all_time,
         COUNT(DISTINCT target)::int AS unique_all_time,
         MAX(log_time) AS last_added_at
       FROM activity_log
       WHERE username = $1 AND action = 'add_product'`,
      [username]
    );

    const recentQuery = await client.query(
      `SELECT
         COUNT(*)::int AS total_recent,
         COUNT(DISTINCT target)::int AS unique_recent
       FROM activity_log
       WHERE username = $1
         AND action = 'add_product'
         AND log_time >= NOW() - INTERVAL '${days} days'`,
      [username]
    );

    const recentProductsQuery = await client.query(
      `SELECT
         al.target AS serial_number,
         al.log_time,
         p.name,
         p.brand,
         p.created_at
       FROM activity_log al
       LEFT JOIN product p ON p.serialnumber = al.target
       WHERE al.username = $1 AND al.action = 'add_product'
       ORDER BY al.log_time DESC
       LIMIT $2`,
      [username, limit]
    );

    const totals = totalsQuery.rows?.[0] || {};
    const recent = recentQuery.rows?.[0] || {};

    return res.json({
      success: true,
      username,
      totalAllTime: totals.total_all_time || 0,
      uniqueAllTime: totals.unique_all_time || 0,
      totalRecent: recent.total_recent || 0,
      uniqueRecent: recent.unique_recent || 0,
      lastAddedAt: totals.last_added_at || null,
      recentProducts: recentProductsQuery.rows.map((row) => ({
        serialNumber: row.serial_number,
        name: row.name || null,
        brand: row.brand || null,
        registeredAt: row.log_time || row.created_at || null,
      })),
    });
  } catch (err) {
    console.error("/manufacturer/products-summary error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load manufacturer product summary",
    });
  }
});

const buildSupplyScanSummary = async ({
  username,
  days,
  limit,
  locationLimit,
}) => {
  const totalsQuery = await client.query(
    `SELECT
       COUNT(*)::int AS total_all_time,
       COUNT(DISTINCT serial_number)::int AS unique_all_time,
       MAX(scan_time) AS last_scan_at
     FROM product_scans
     WHERE username = $1`,
    [username]
  );

  const recentQuery = await client.query(
    `SELECT
       COUNT(*)::int AS total_recent,
       COUNT(DISTINCT serial_number)::int AS unique_recent,
       COUNT(*) FILTER (WHERE is_authentic)::int AS authentic_recent,
       COUNT(*) FILTER (WHERE is_suspicious)::int AS suspicious_recent
     FROM product_scans
     WHERE username = $1
       AND scan_time >= NOW() - ($2::int * INTERVAL '1 day')`,
    [username, days]
  );

  const recentScansQuery = await client.query(
    `SELECT
       id,
       serial_number,
       scan_time,
       location,
       is_authentic,
       is_suspicious,
       suspicion_reason
     FROM product_scans
     WHERE username = $1
     ORDER BY scan_time DESC
     LIMIT $2`,
    [username, limit]
  );

  const topLocationsQuery = await client.query(
    `SELECT
       COALESCE(NULLIF(TRIM(location), ''), 'Unknown') AS location,
       COUNT(*)::int AS count
     FROM product_scans
     WHERE username = $1
       AND scan_time >= NOW() - ($2::int * INTERVAL '1 day')
       AND location IS NOT NULL
       AND TRIM(location) <> ''
     GROUP BY location
     ORDER BY count DESC
     LIMIT $3`,
    [username, days, locationLimit]
  );

  const totals = totalsQuery.rows?.[0] || {};
  const recent = recentQuery.rows?.[0] || {};

  return {
    totalAllTime: totals.total_all_time || 0,
    uniqueAllTime: totals.unique_all_time || 0,
    lastScanAt: totals.last_scan_at || null,
    totalRecent: recent.total_recent || 0,
    uniqueRecent: recent.unique_recent || 0,
    authenticRecent: recent.authentic_recent || 0,
    suspiciousRecent: recent.suspicious_recent || 0,
    recentScans: recentScansQuery.rows.map((row) => ({
      id: row.id,
      serialNumber: row.serial_number,
      scanTime: row.scan_time,
      location: row.location,
      isAuthentic: row.is_authentic,
      isSuspicious: row.is_suspicious,
      suspicionReason: row.suspicion_reason || null,
    })),
    topLocations: topLocationsQuery.rows.map((row) => ({
      location: row.location || "Unknown",
      count: row.count || 0,
    })),
  };
};

app.get("/supplier/scans-summary", async (req, res) => {
  try {
    const username = (req.query.username || "").trim();
    const daysParam = parseInt(req.query.days, 10);
    const limitParam = parseInt(req.query.limit, 10);
    const locationLimitParam = parseInt(req.query.locationLimit, 10);

    if (!username) {
      return res
        .status(400)
        .json({ success: false, message: "Username is required" });
    }

    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    const limit = Math.min(
      Math.max(
        Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 10,
        1
      ),
      50
    );
    const locationLimit = Math.min(
      Math.max(
        Number.isFinite(locationLimitParam) && locationLimitParam > 0
          ? locationLimitParam
          : 5,
        1
      ),
      10
    );

    const summary = await buildSupplyScanSummary({
      username,
      days,
      limit,
      locationLimit,
    });

    return res.json({
      success: true,
      username,
      ...summary,
    });
  } catch (err) {
    console.error("/supplier/scans-summary error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load supplier scan summary",
    });
  }
});

app.get("/retailer/scans-summary", async (req, res) => {
  try {
    const username = (req.query.username || "").trim();
    const daysParam = parseInt(req.query.days, 10);
    const limitParam = parseInt(req.query.limit, 10);
    const locationLimitParam = parseInt(req.query.locationLimit, 10);

    if (!username) {
      return res
        .status(400)
        .json({ success: false, message: "Username is required" });
    }

    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    const limit = Math.min(
      Math.max(
        Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 10,
        1
      ),
      50
    );
    const locationLimit = Math.min(
      Math.max(
        Number.isFinite(locationLimitParam) && locationLimitParam > 0
          ? locationLimitParam
          : 5,
        1
      ),
      10
    );

    const summary = await buildSupplyScanSummary({
      username,
      days,
      limit,
      locationLimit,
    });

    return res.json({
      success: true,
      username,
      ...summary,
    });
  } catch (err) {
    console.error("/retailer/scans-summary error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load retailer scan summary",
    });
  }
});

app.get("/product-scans", async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const username = req.query.username;
  const serialNumber = req.query.serialNumber;
  const isAuthentic = req.query.isAuthentic;
  const isSuspicious = req.query.isSuspicious;
  const days = parseInt(req.query.days) || null;

  let query = "SELECT * FROM product_scans WHERE 1=1";
  const params = [];
  let paramIndex = 1;

  if (username) {
    query += ` AND username = $${paramIndex}`;
    params.push(username);
    paramIndex++;
  }

  if (serialNumber) {
    query += ` AND serial_number = $${paramIndex}`;
    params.push(serialNumber);
    paramIndex++;
  }

  if (isAuthentic !== undefined) {
    query += ` AND is_authentic = $${paramIndex}`;
    params.push(isAuthentic === "true");
    paramIndex++;
  }

  if (isSuspicious !== undefined) {
    query += ` AND is_suspicious = $${paramIndex}`;
    params.push(isSuspicious === "true");
    paramIndex++;
  }

  if (days) {
    query += ` AND scan_time >= NOW() - INTERVAL '${days} days'`;
  }

  query += ` ORDER BY scan_time DESC LIMIT $${paramIndex}`;
  params.push(limit);

  try {
    const data = await client.query(query, params);
    res.send(data.rows);
  } catch (err) {
    console.error("Error fetching product scans:", err);
    res.status(500).send({ message: err.message });
  }
});

app.get("/activity-logs", async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const username = req.query.username;
  const action = req.query.action;
  const days = parseInt(req.query.days) || null;

  let query = "SELECT * FROM activity_log WHERE 1=1";
  const params = [];
  let paramIndex = 1;

  if (username) {
    query += ` AND username = $${paramIndex}`;
    params.push(username);
    paramIndex++;
  }

  if (action) {
    query += ` AND action = $${paramIndex}`;
    params.push(action);
    paramIndex++;
  }

  if (days) {
    query += ` AND log_time >= NOW() - INTERVAL '${days} days'`;
  }

  query += ` ORDER BY log_time DESC LIMIT $${paramIndex}`;
  params.push(limit);

  try {
    const data = await client.query(query, params);
    res.send(data.rows);
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).send({ message: err.message });
  }
});

// --- Download Logs as CSV ---
app.get("/download-logs/:type", async (req, res) => {
  const { type } = req.params;
  const {
    username,
    days,
    success,
    action,
    serialNumber,
    isAuthentic,
    isSuspicious,
  } = req.query;
  const limitValue = parseInt(req.query.limit, 10);
  const hasLimit = Number.isFinite(limitValue) && limitValue > 0;

  let query = "";
  const params = [];
  let paramIndex = 1;
  let fields;

  try {
    if (type === "login") {
      query =
        "SELECT id, username, attempt_time, success, ip_address FROM login_attempts WHERE 1=1";

      if (username) {
        query += ` AND username = $${paramIndex}`;
        params.push(username);
        paramIndex++;
      }

      if (success !== undefined && success !== "") {
        query += ` AND success = $${paramIndex}`;
        params.push(success === "true");
        paramIndex++;
      }

      const daysInt = parseInt(days, 10);
      if (Number.isFinite(daysInt) && daysInt > 0) {
        query += ` AND attempt_time >= NOW() - INTERVAL '${daysInt} days'`;
      }

      query += " ORDER BY attempt_time DESC";
      if (hasLimit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limitValue);
        paramIndex++;
      }
      fields = ["id", "username", "attempt_time", "success", "ip_address"];
    } else if (type === "scan") {
      query =
        "SELECT id, serial_number, username, scan_time, location, is_authentic, is_suspicious FROM product_scans WHERE 1=1";

      if (username) {
        query += ` AND username = $${paramIndex}`;
        params.push(username);
        paramIndex++;
      }

      if (serialNumber) {
        query += ` AND serial_number = $${paramIndex}`;
        params.push(serialNumber);
        paramIndex++;
      }

      if (isAuthentic !== undefined && isAuthentic !== "") {
        query += ` AND is_authentic = $${paramIndex}`;
        params.push(isAuthentic === "true");
        paramIndex++;
      }

      if (isSuspicious !== undefined && isSuspicious !== "") {
        query += ` AND is_suspicious = $${paramIndex}`;
        params.push(isSuspicious === "true");
        paramIndex++;
      }

      const daysInt = parseInt(days, 10);
      if (Number.isFinite(daysInt) && daysInt > 0) {
        query += ` AND scan_time >= NOW() - INTERVAL '${daysInt} days'`;
      }

      query += " ORDER BY scan_time DESC";
      if (hasLimit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limitValue);
        paramIndex++;
      }
      fields = [
        "id",
        "serial_number",
        "username",
        "scan_time",
        "location",
        "is_authentic",
        "is_suspicious",
      ];
    } else if (type === "activity") {
      query =
        "SELECT id, username, action, target, details, log_time FROM activity_log WHERE 1=1";

      if (username) {
        query += ` AND username = $${paramIndex}`;
        params.push(username);
        paramIndex++;
      }

      if (action) {
        query += ` AND action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }

      const daysInt = parseInt(days, 10);
      if (Number.isFinite(daysInt) && daysInt > 0) {
        query += ` AND log_time >= NOW() - INTERVAL '${daysInt} days'`;
      }

      query += " ORDER BY log_time DESC";
      if (hasLimit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limitValue);
        paramIndex++;
      }
      fields = ["id", "username", "action", "target", "details", "log_time"];
    } else {
      return res.status(400).send("Invalid log type");
    }

    const result = await client.query(query, params);
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);
    res.header("Content-Type", "text/csv");
    res.attachment(`${type}_logs.csv`);
    return res.send(csv);
  } catch (err) {
    console.error("Error downloading logs:", err);
    res.status(500).send({ message: err.message });
  }
});

// ===== ANALYTICS AGGREGATION ENDPOINTS =====

// Daily scans analytics endpoint
app.get("/analytics/scans/daily", async (req, res) => {
  const days = parseInt(req.query.days) || 30;

  try {
    const data = await client.query(`
      SELECT 
        DATE(scan_time) as date,
        COUNT(*) as total_scans,
        COUNT(CASE WHEN is_authentic = true THEN 1 END) as authentic_scans,
        COUNT(CASE WHEN is_authentic = false THEN 1 END) as counterfeit_scans,
        COUNT(CASE WHEN is_suspicious = true THEN 1 END) as suspicious_scans
      FROM product_scans 
      WHERE scan_time >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(scan_time)
      ORDER BY date DESC
      LIMIT ${days}
    `);

    res.json({
      success: true,
      data: data.rows,
      period: `${days} days`,
    });
  } catch (err) {
    console.error("Error fetching scan analytics:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching scan analytics",
    });
  }
});

// Daily login analytics endpoint
app.get("/analytics/logins/daily", async (req, res) => {
  const days = parseInt(req.query.days) || 30;

  try {
    const data = await client.query(`
      SELECT 
        DATE(attempt_time) as date,
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_logins,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_logins,
        COUNT(DISTINCT username) as unique_users
      FROM login_attempts 
      WHERE attempt_time >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(attempt_time)
      ORDER BY date DESC
      LIMIT ${days}
    `);

    res.json({
      success: true,
      data: data.rows,
      period: `${days} days`,
    });
  } catch (err) {
    console.error("Error fetching login analytics:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching login analytics",
    });
  }
});

// Activity summary endpoint
app.get("/analytics/activity/summary", async (req, res) => {
  const days = parseInt(req.query.days) || 7;

  try {
    const data = await client.query(`
      SELECT 
        action,
        COUNT(*) as action_count,
        COUNT(DISTINCT username) as unique_users
      FROM activity_log 
      WHERE log_time >= NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY action_count DESC
    `);

    res.json({
      success: true,
      data: data.rows,
      period: `${days} days`,
    });
  } catch (err) {
    console.error("Error fetching activity summary:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching activity summary",
    });
  }
});

// Counterfeit detection report: high-risk products by counterfeit rate
app.get("/analytics/counterfeit/top", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const days = parseInt(req.query.days) || 30;
  try {
    const q = `
      WITH scan_metrics AS (
        SELECT 
          ps.serial_number,
          COALESCE(NULLIF(TRIM(p.brand), ''), 'Unbranded Product') AS brand,
          COUNT(*)::int AS total_scans,
          COUNT(*) FILTER (WHERE ps.is_authentic = false)::int AS counterfeit_scans
        FROM product_scans ps
        LEFT JOIN product p ON p.serialnumber = ps.serial_number
        WHERE ps.scan_time >= NOW() - INTERVAL '${days} days'
        GROUP BY ps.serial_number, COALESCE(NULLIF(TRIM(p.brand), ''), 'Unbranded Product')
      ),
      brand_totals AS (
        SELECT
          brand,
          SUM(total_scans)::int AS total_scans,
          SUM(counterfeit_scans)::int AS counterfeit_scans,
          CASE
            WHEN SUM(total_scans) = 0 THEN 0
            ELSE ROUND((SUM(counterfeit_scans)::numeric / SUM(total_scans)::numeric) * 100, 2)
          END AS counterfeit_rate
        FROM scan_metrics
        GROUP BY brand
      ),
      ranked_serials AS (
        SELECT
          brand,
          serial_number,
          total_scans,
          counterfeit_scans,
          ROW_NUMBER() OVER (
            PARTITION BY brand
            ORDER BY counterfeit_scans DESC, total_scans DESC
          ) AS serial_rank
        FROM scan_metrics
      ),
      brand_serials AS (
        SELECT
          brand,
          json_agg(
            json_build_object(
              'serial_number', serial_number,
              'counterfeit_scans', counterfeit_scans,
              'total_scans', total_scans
            )
            ORDER BY serial_rank
          ) AS top_serials
        FROM ranked_serials
        WHERE serial_rank <= 5
        GROUP BY brand
      )
      SELECT 
        bt.brand,
        bt.total_scans,
        bt.counterfeit_scans,
        bt.counterfeit_rate,
        COALESCE(bs.top_serials, '[]'::json) AS top_serials
      FROM brand_totals bt
      LEFT JOIN brand_serials bs ON bs.brand = bt.brand
      WHERE bt.total_scans > 0
      ORDER BY bt.counterfeit_rate DESC, bt.total_scans DESC
      LIMIT ${limit}
    `;
    const r = await client.query(q);
    res.json({ success: true, data: r.rows, period: `${days} days` });
  } catch (e) {
    console.error("Error fetching counterfeit report:", e);
    res
      .status(500)
      .json({ success: false, message: "Error fetching counterfeit report" });
  }
});

// Scans by geography (country/city) report
app.get("/analytics/scans/geo", async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  try {
    const q = `
      SELECT 
        COALESCE(geo_country, 'Unknown') AS country,
        COALESCE(geo_city, 'Unknown') AS city,
        COUNT(*)::int AS scans
      FROM product_scans
      WHERE scan_time >= NOW() - INTERVAL '${days} days'
      GROUP BY COALESCE(geo_country, 'Unknown'), COALESCE(geo_city, 'Unknown')
      ORDER BY scans DESC
    `;
    const r = await client.query(q);
    res.json({ success: true, data: r.rows, period: `${days} days` });
  } catch (e) {
    console.error("Error fetching geo scans:", e);
    res
      .status(500)
      .json({ success: false, message: "Error fetching geo scans" });
  }
});

app.get("/analytics/scans/suspicious-summary", async (req, res) => {
  const rawDays = parseInt(req.query.days, 10);
  const days = Math.min(Math.max(rawDays || 30, 1), 365);
  try {
    const totalsResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_suspicious = true)::int AS suspicious_total,
        COUNT(*) FILTER (WHERE is_suspicious = true AND is_authentic = false)::int AS counterfeit_total,
        COUNT(*) FILTER (WHERE is_suspicious = true AND is_authentic = true)::int AS flagged_authentic_total,
        COUNT(*)::int AS scan_total
      FROM product_scans
      WHERE scan_time >= NOW() - INTERVAL '${days} days'
    `);

    const last24hResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_suspicious = true)::int AS suspicious_total,
        COUNT(*) FILTER (WHERE is_suspicious = true AND is_authentic = false)::int AS counterfeit_total
      FROM product_scans
      WHERE scan_time >= NOW() - INTERVAL '24 hours'
    `);

    const reasonResult = await client.query(`
      SELECT 
        COALESCE(NULLIF(suspicion_reason, ''), 'Unspecified') AS reason,
        COUNT(*)::int AS count
      FROM product_scans
      WHERE is_suspicious = true
        AND scan_time >= NOW() - INTERVAL '${days} days'
      GROUP BY COALESCE(NULLIF(suspicion_reason, ''), 'Unspecified')
      ORDER BY count DESC
      LIMIT 5
    `);

    const trendResult = await client.query(`
      SELECT 
        DATE(scan_time) AS date,
        COUNT(*)::int AS suspicious_scans
      FROM product_scans
      WHERE is_suspicious = true
        AND scan_time >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(scan_time)
      ORDER BY date ASC
    `);

    const totalsRow = totalsResult.rows?.[0] || {};
    const last24hRow = last24hResult.rows?.[0] || {};

    res.json({
      success: true,
      period: `${days} days`,
      data: {
        totals: {
          suspicious: totalsRow.suspicious_total || 0,
          counterfeit: totalsRow.counterfeit_total || 0,
          flaggedAuthentic: totalsRow.flagged_authentic_total || 0,
          scans: totalsRow.scan_total || 0,
        },
        last24h: {
          suspicious: last24hRow.suspicious_total || 0,
          counterfeit: last24hRow.counterfeit_total || 0,
        },
        topReasons: reasonResult.rows || [],
        trend: trendResult.rows || [],
      },
    });
  } catch (err) {
    console.error("Error fetching suspicious summary:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching suspicious summary",
    });
  }
});

app.get("/analytics/inventory/summary", async (req, res) => {
  const rawDays = parseInt(req.query.days, 10);
  const days = Math.min(Math.max(rawDays || 30, 1), 365);
  try {
    const [inventoryReg, movesReg] = await Promise.all([
      client.query(`SELECT to_regclass('public.inventory') AS reg`),
      client.query(`SELECT to_regclass('public.inventory_moves') AS reg`),
    ]);

    const inventoryExists = Boolean(inventoryReg.rows?.[0]?.reg);
    const movesExists = Boolean(movesReg.rows?.[0]?.reg);

    if (!inventoryExists || !movesExists) {
      return res.json({
        success: true,
        available: false,
        message: "Inventory tables not available",
        data: {
          holdings: [],
          statusBreakdown: [],
          transferLeaders: [],
          velocity: [],
        },
      });
    }

    const holdingsResult = await client.query(`
      SELECT 
        COALESCE(owner_role, 'unknown') AS owner_role,
        SUM(qty)::int AS total_qty,
        COUNT(*)::int AS records
      FROM inventory
      GROUP BY COALESCE(owner_role, 'unknown')
      ORDER BY total_qty DESC
    `);

    const statusResult = await client.query(`
      SELECT 
        COALESCE(status, 'unknown') AS status,
        SUM(qty)::int AS total_qty
      FROM inventory
      GROUP BY COALESCE(status, 'unknown')
      ORDER BY total_qty DESC
    `);

    const transferLeaderResult = await client.query(`
      SELECT 
        COALESCE(to_owner_role, 'unknown') AS to_role,
        SUM(qty)::int AS inbound_qty
      FROM inventory_moves
      WHERE moved_at >= NOW() - INTERVAL '${days} days'
      GROUP BY COALESCE(to_owner_role, 'unknown')
      ORDER BY inbound_qty DESC
      LIMIT 6
    `);

    const velocityResult = await client.query(`
      SELECT 
        DATE(moved_at) AS date,
        COALESCE(to_owner_role, 'unknown') AS to_role,
        SUM(qty)::int AS inbound_qty
      FROM inventory_moves
      WHERE moved_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(moved_at), COALESCE(to_owner_role, 'unknown')
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      available: true,
      period: `${days} days`,
      data: {
        holdings: holdingsResult.rows || [],
        statusBreakdown: statusResult.rows || [],
        transferLeaders: transferLeaderResult.rows || [],
        velocity: velocityResult.rows || [],
      },
    });
  } catch (err) {
    console.error("Error fetching inventory summary:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching inventory summary",
    });
  }
});

app.get("/analytics/inventory/moves", async (req, res) => {
  const rawDays = parseInt(req.query.days, 10);
  const days = Math.min(Math.max(rawDays || 30, 1), 365);
  try {
    const movesReg = await client.query(
      `SELECT to_regclass('public.inventory_moves') AS reg`
    );
    if (!movesReg.rows?.[0]?.reg) {
      return res.json({
        success: true,
        available: false,
        message: "Inventory moves table not available",
        data: {
          timeline: [],
          roleMatrix: [],
          recent: [],
        },
      });
    }

    const timelineResult = await client.query(`
      SELECT 
        DATE(moved_at) AS date,
        COALESCE(from_owner_role, 'unknown') AS from_role,
        COALESCE(to_owner_role, 'unknown') AS to_role,
        SUM(qty)::int AS qty
      FROM inventory_moves
      WHERE moved_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(moved_at), COALESCE(from_owner_role, 'unknown'), COALESCE(to_owner_role, 'unknown')
      ORDER BY date ASC
    `);

    const matrixResult = await client.query(`
      SELECT 
        COALESCE(from_owner_role, 'unknown') AS from_role,
        COALESCE(to_owner_role, 'unknown') AS to_role,
        SUM(qty)::int AS qty
      FROM inventory_moves
      WHERE moved_at >= NOW() - INTERVAL '${days} days'
      GROUP BY COALESCE(from_owner_role, 'unknown'), COALESCE(to_owner_role, 'unknown')
      ORDER BY qty DESC
    `);

    const recentResult = await client.query(`
      SELECT 
        id,
        serial_number,
        from_owner_role,
        to_owner_role,
        qty,
        status,
        moved_at,
        actor_username
      FROM inventory_moves
      ORDER BY moved_at DESC
      LIMIT 15
    `);

    res.json({
      success: true,
      available: true,
      period: `${days} days`,
      data: {
        timeline: timelineResult.rows || [],
        roleMatrix: matrixResult.rows || [],
        recent: recentResult.rows || [],
      },
    });
  } catch (err) {
    console.error("Error fetching inventory moves:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching inventory moves",
    });
  }
});

// ===== COMMUNICATION & CUSTOMER SUPPORT MODULE ENDPOINTS =====

// Get chat history
app.get("/support/chat-history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const conversationKey = req.query.conversationKey || null;
    const chatHistory = await chatService.getChatHistory(
      client,
      limit,
      conversationKey
    );

    res.json({
      success: true,
      messages: chatHistory,
    });
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching chat history",
    });
  }
});

// List active conversations (admin use)
app.get("/support/conversations", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const rows = await chatService.listConversations(client, limit);
    res.json({ success: true, conversations: rows });
  } catch (e) {
    console.error("Error fetching conversations:", e);
    res
      .status(500)
      .json({ success: false, message: "Error fetching conversations" });
  }
});

// Get online users
app.get("/support/online-users", (req, res) => {
  try {
    const onlineUsers = chatService.getOnlineUsers();
    res.json({
      success: true,
      users: onlineUsers,
    });
  } catch (err) {
    console.error("Error fetching online users:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching online users",
    });
  }
});

// Send system message
app.post("/support/system-message", (req, res) => {
  try {
    const { message, room = "support" } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    chatService.sendSystemMessage(message, room);

    res.json({
      success: true,
      message: "System message sent",
    });
  } catch (err) {
    console.error("Error sending system message:", err);
    res.status(500).json({
      success: false,
      message: "Error sending system message",
    });
  }
});

// Get notification logs
app.get("/support/notifications", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status; // 'sent', 'failed', 'queued'

    let query = "SELECT * FROM notification_log";
    const params = [];

    if (status) {
      query += " WHERE status = $1";
      params.push(status);
    }

    query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1);
    params.push(limit);

    const result = await client.query(query, params);

    res.json({
      success: true,
      notifications: result.rows,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
    });
  }
});

// Test email configuration
app.post("/support/test-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const testData = {
      productName: "Test Product",
      brand: "Test Brand",
      serialNumber: "TEST-123",
    };

    const result = await emailService.sendProductRegistrationEmail(
      client,
      email,
      testData
    );

    res.json({
      success: result,
      message: result
        ? "Test email sent successfully"
        : "Failed to send test email",
    });
  } catch (err) {
    console.error("Error sending test email:", err);
    res.status(500).json({
      success: false,
      message: "Error sending test email",
    });
  }
});

activeServer = server.listen(port, () => {
  console.log(`Server is running on port ${port} with Socket.IO support`);

  // Test email configuration on startup (only when enabled)
  if (
    (process.env.ENABLE_EMAIL_NOTIFICATIONS || "false").toLowerCase() === "true"
  ) {
    emailService.testEmailConfiguration();
  } else {
    console.log("Email notifications disabled; skipping SMTP verification.");
  }
});
// Update /profileAll endpoint to support role-based filtering
app.get("/profileAll", async (req, res) => {
  const { role } = req.query;
  let query = "SELECT * FROM profile";
  const params = [];

  if (role) {
    query += " WHERE role = $1";
    params.push(role);
  }

  try {
    const data = await client.query(query, params);
    res.send(data.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching profiles");
  }
});

// Add PUT /users/:id endpoint
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, website, location, role } = req.body;

  try {
    await client.query(
      "UPDATE profile SET name = $1, description = $2, website = $3, location = $4, role = $5 WHERE id = $6",
      [name, description, website, location, role, id]
    );
    res.send({ success: true, message: "User updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Error updating user" });
  }
});

// Add DELETE /users/:id endpoint
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Get the username before deleting
    const userResult = await client.query(
      "SELECT username FROM profile WHERE id = $1",
      [id]
    );

    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .send({ success: false, message: "User not found" });
    }

    const username = userResult.rows[0].username;

    // Delete from both tables within a transaction
    await client.query("BEGIN");
    await client.query("DELETE FROM auth WHERE username = $1", [username]);
    await client.query("DELETE FROM profile WHERE id = $1", [id]);
    await client.query("COMMIT");

    // Log the activity
    logActivity(
      "admin",
      "delete_user",
      username,
      `User ${username} deleted by admin`
    );

    res.send({ success: true, message: "User deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).send({ success: false, message: "Error deleting user" });
  }
});
