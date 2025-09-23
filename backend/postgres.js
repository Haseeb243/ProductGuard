const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Client } = require("pg");
const path = require("path");
const multer = require("multer");
const { Parser } = require("json2csv");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

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

const port = process.env.PORT || 5000;

const client = new Client({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  port: Number(process.env.PGPORT || 5432),
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "postgres",
});

client.connect();

// auth

function createAccount(username, password, role, adminUser) {
  client.query(
    "INSERT INTO auth (username, password, role) VALUES ($1, $2, $3)",
    [username, password, role],
    (err, res) => {
      if (err) {
        console.log(err.message);
      } else {
        logActivity(
          adminUser,
          "add_account",
          username,
          `Added account with role ${role}`
        );
        console.log("Data insert successful");
      }
    }
  );
}

function changePassword(username, password) {
  const res = client.query(
    "UPDATE auth SET password = $1 WHERE username = $2",
    [password, username],
    (err, res) => {
      if (err) {
        console.log(err.message);
      } else {
        console.log("Data update successful");
      }
    }
  );
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

function addProduct(serialNumber, name, brand, username) {
  client.query(
    "INSERT INTO product (serialNumber, name, brand) VALUES ($1, $2, $3)",
    [serialNumber, name, brand],
    (err, res) => {
      if (err) {
        console.log(err.message);
      } else {
        logActivity(
          username,
          "add_product",
          serialNumber,
          `Added product ${name} (${brand})`
        );
        console.log("Data insert successful");
      }
    }
  );
}

// auth
app.get("/authAll", async (req, res) => {
  const data = await client.query("Select * from auth");
  res.header("Access-Control-Allow-Credentials", true);
  res.send(data.rows);
  console.log("Data sent successfully");
});

app.post("/auth/:username/:password", async (req, res) => {
  const { username, password } = req.params;
  const data = await client.query(
    `SELECT * FROM auth WHERE username = '${username}' AND password = '${password}'`
  );
  const success = data.rows.length > 0;
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  logLoginAttempt(username, success, ip);
  res.send(data.rows);
  console.log("Data sent successfully");
});

app.post("/addaccount", (req, res) => {
  const { username, password, role } = req.body;
  createAccount(username, password, role, req.user?.username || "admin");
  res.send("Data inserted");
});

app.post("/changepsw", (req, res) => {
  const { username, password } = req.body;
  changePassword(username, password);
  res.send("Data updated");
});

// profile

app.get("/profileAll", async (req, res) => {
  const data = await client.query("Select * from profile");
  res.header("Access-Control-Allow-Credentials", true);
  res.send(data.rows);
  console.log("Data sent successfully");
});

app.get("/profile/:username", async (req, res) => {
  const { username } = req.params;
  const data = await client.query(
    `SELECT * FROM profile WHERE username = '${username}'`
  );
  res.send(data.rows);
  console.log("Data sent successfully");
});

app.post("/addprofile", (req, res) => {
  const { username, name, description, website, location, image, role } =
    req.body;
  createProfile(username, name, description, website, location, image, role);
  res.send("Data inserted");
});

// image

app.post("/upload/profile", (req, res) => {
  let upload = multer({ storage: storageProfile }).single("image");

  upload(req, res, (err) => {
    if (!req.file) {
      return res.send("Please select an image to upload");
    } else if (err instanceof multer.MulterError) {
      return res.send(err);
    } else if (err) {
      return res.send(err);
    }
  });
});

// product

app.post("/upload/product", (req, res) => {
  let upload = multer({ storage: storageProduct }).single("image");

  upload(req, res, (err) => {
    if (!req.file) {
      return res.send("Please select an image to upload");
    } else if (err instanceof multer.MulterError) {
      return res.send(err);
    } else if (err) {
      return res.send(err);
    }
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

app.post("/addproduct", (req, res) => {
  const { serialNumber, name, brand } = req.body;
  addProduct(serialNumber, name, brand, req.user?.username || "admin");
  res.send("Data inserted");
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

function logProductScan(serialNumber, username, location, isAuthentic) {
  client.query(
    "INSERT INTO product_scans (serial_number, username, location, is_authentic) VALUES ($1, $2, $3, $4)",
    [serialNumber, username, location, isAuthentic],
    (err) => {
      if (err) console.log(err.message);
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

// --- Add Product Scan Logging Endpoint ---
app.post("/scan-product", async (req, res) => {
  const { serialNumber, username, location, isAuthentic } = req.body;

  try {
    // Check if product exists
    const productExists = await client.query(
      "SELECT serialNumber FROM product WHERE serialNumber = $1",
      [serialNumber]
    );

    // Log the scan regardless of whether the product exists or not
    logProductScan(serialNumber, username, location, isAuthentic);

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

// --- Logs Endpoints ---
app.get("/login-attempts", async (req, res) => {
  const data = await client.query(
    "SELECT * FROM login_attempts ORDER BY attempt_time DESC LIMIT 100"
  );
  res.send(data.rows);
});

app.get("/product-scans", async (req, res) => {
  const data = await client.query(
    "SELECT * FROM product_scans ORDER BY scan_time DESC LIMIT 100"
  );
  res.send(data.rows);
});

app.get("/activity-logs", async (req, res) => {
  const data = await client.query(
    "SELECT * FROM activity_log ORDER BY log_time DESC LIMIT 100"
  );
  res.send(data.rows);
});

// --- Download Logs as CSV ---
app.get("/download-logs/:type", async (req, res) => {
  const { type } = req.params;
  let data, fields;
  try {
    if (type === "login") {
      data = (await client.query("SELECT * FROM login_attempts")).rows;
      fields = ["id", "username", "attempt_time", "success", "ip_address"];
    } else if (type === "scan") {
      data = (await client.query("SELECT * FROM product_scans")).rows;
      fields = [
        "id",
        "serial_number",
        "username",
        "scan_time",
        "location",
        "is_authentic",
      ];
    } else if (type === "activity") {
      data = (await client.query("SELECT * FROM activity_log")).rows;
      fields = ["id", "username", "action", "target", "details", "log_time"];
    } else {
      return res.status(400).send("Invalid log type");
    }
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    res.header("Content-Type", "text/csv");
    res.attachment(`${type}_logs.csv`);
    return res.send(csv);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
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
