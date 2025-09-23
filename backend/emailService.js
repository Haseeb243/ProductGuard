const nodemailer = require("nodemailer");
require("dotenv").config();

// Email service configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email templates
const emailTemplates = {
  productRegistration: {
    subject: "Product Registration Confirmation",
    template: (data) => {
      const payload = `${
        process.env.CONTRACT_ADDRESS ? process.env.CONTRACT_ADDRESS + "," : ""
      }${data.serialNumber}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
        payload
      )}`;
      const text = `
Dear User,

Your product has been successfully registered in ProductGuard.

Product Details:
- Name: ${data.productName}
- Brand: ${data.brand}
- Serial Number: ${data.serialNumber}
- Registration Date: ${new Date().toLocaleDateString()}

Scan QR to verify product:
${qrUrl}

Thank you for using ProductGuard to protect your product authenticity.

Best regards,
ProductGuard Team
      `.trim();
      const html = `
<div style="font-family:Arial,sans-serif;line-height:1.5;">
  <p>Dear User,</p>
  <p>Your product has been successfully registered in <strong>ProductGuard</strong>.</p>
  <h3 style="margin-bottom:4px;">Product Details</h3>
  <ul style="margin-top:4px;">
    <li><strong>Name:</strong> ${data.productName}</li>
    <li><strong>Brand:</strong> ${data.brand}</li>
    <li><strong>Serial Number:</strong> ${data.serialNumber}</li>
    <li><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</li>
  </ul>
  <p>Scan this QR to verify the product:</p>
  <p><img alt="Product QR" src="${qrUrl}" width="250" height="250" style="border:1px solid #eee;"/></p>
  <p>If the image doesn't load, you can open this link: <a href="${qrUrl}">${qrUrl}</a></p>
  <p>Best regards,<br/>ProductGuard Team</p>
  </div>
      `.trim();
      return { text, html };
    },
  },

  suspiciousScan: {
    subject: "Suspicious Product Scan Detected",
    template: (data) => {
      const text = `
ALERT: Suspicious Product Scan Detected

A suspicious scan has been detected for one of your products:

Product Details:
- Name: ${data.productName}
- Serial Number: ${data.serialNumber}
- Scan Time: ${new Date(data.scanTime).toLocaleString()}
- Suspicion Reason: ${data.suspicionReason}
- Scanner IP: ${data.ipAddress || "Unknown"}
- Location: ${data.location || "Unknown"}

Please review this activity and take appropriate action if necessary.

Best regards,
ProductGuard Security Team
      `.trim();
      const html = `
<div style="font-family:Arial,sans-serif;line-height:1.5;">
  <p><strong>ALERT:</strong> Suspicious Product Scan Detected</p>
  <p>A suspicious scan has been detected for one of your products:</p>
  <ul>
    <li><strong>Name:</strong> ${data.productName}</li>
    <li><strong>Serial Number:</strong> ${data.serialNumber}</li>
    <li><strong>Scan Time:</strong> ${new Date(
      data.scanTime
    ).toLocaleString()}</li>
    <li><strong>Suspicion Reason:</strong> ${data.suspicionReason}</li>
    <li><strong>Scanner IP:</strong> ${data.ipAddress || "Unknown"}</li>
    <li><strong>Location:</strong> ${data.location || "Unknown"}</li>
  </ul>
  <p>Please review this activity and take appropriate action if necessary.</p>
  <p>Best regards,<br/>ProductGuard Security Team</p>
  </div>
      `.trim();
      return { text, html };
    },
  },
};

// Log email to database
async function logNotification(
  client,
  type,
  recipient,
  subject,
  body,
  status = "queued",
  error = null
) {
  try {
    const query = `
      INSERT INTO notification_log (type, recipient, subject, body, status, error, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const values = [
      type,
      recipient,
      subject,
      body,
      status,
      error,
      status === "sent" ? new Date() : null,
    ];

    const result = await client.query(query, values);
    return result.rows[0].id;
  } catch (err) {
    console.error("Error logging notification:", err);
    return null;
  }
}

// Send email notification
async function sendEmail(client, type, recipient, data = {}) {
  // Check if email notifications are enabled
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== "true") {
    console.log("Email notifications are disabled");
    return false;
  }

  if (!emailTemplates[type]) {
    console.error(`Unknown email template type: ${type}`);
    return false;
  }

  const template = emailTemplates[type];
  const subject = template.subject;
  const { text, html } = template.template(data);

  // Log the notification attempt
  const logId = await logNotification(
    client,
    type,
    recipient,
    subject,
    text,
    "queued"
  );

  try {
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: recipient,
      subject: subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);

    // Update log as sent
    if (logId) {
      await logNotification(client, type, recipient, subject, text, "sent");
    }

    return true;
  } catch (error) {
    console.error("Error sending email:", error);

    // Update log with error
    if (logId) {
      await logNotification(
        client,
        type,
        recipient,
        subject,
        text,
        "failed",
        error.message
      );
    }

    return false;
  }
}

// Send product registration confirmation email
async function sendProductRegistrationEmail(client, userEmail, productData) {
  return await sendEmail(client, "productRegistration", userEmail, productData);
}

// Send suspicious scan alert email
async function sendSuspiciousScanEmail(client, userEmail, scanData) {
  return await sendEmail(client, "suspiciousScan", userEmail, scanData);
}

// Test email configuration
async function testEmailConfiguration() {
  try {
    await transporter.verify();
    console.log("Email configuration is valid");
    return true;
  } catch (error) {
    console.error("Email configuration error:", error);
    return false;
  }
}

module.exports = {
  sendEmail,
  sendProductRegistrationEmail,
  sendSuspiciousScanEmail,
  testEmailConfiguration,
  logNotification,
};
