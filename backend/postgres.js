const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Client } = require("pg");
const path = require("path");
const multer = require("multer");
const { Parser } = require("json2csv");
const emailService = require("./emailService");
const chatService = require("./chatService");
const http = require("http");
require("dotenv").config();

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

const client = new Client({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  port: Number(process.env.PGPORT || 5432),
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "postgres",
});

client.connect();

// Initialize Socket.IO for chat (pass DB client for persistence)
const io = chatService.initializeChat(server, corsOrigins, client);

// auth

function createAccount(username, password, role, email, adminUser) {
  client.query(
    "INSERT INTO auth (username, password, role, email) VALUES ($1, $2, $3, $4)",
    [username, password, role, email],
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
    async (err, res) => {
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

        // Send email notification for product registration
        try {
          // Get user email from profile or auth table
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
  const { username, password, role, email } = req.body;
  createAccount(
    username,
    password,
    role,
    email || null,
    req.user?.username || "admin"
  );
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
  const { serialNumber, name, brand, username } = req.body;
  // Prefer username from body (frontend sends the logged-in manufacturer)
  const actor = username || req.user?.username || "admin";
  addProduct(serialNumber, name, brand, actor);
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
              [serialNumber]
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

server.listen(port, () => {
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
