# Communication & Customer Support Module

This module implements communication and customer support features for ProductGuard, including email notifications and live chat functionality.

## Features

### Essential Features (Implemented)

#### Email Notifications
- **Product Registration Notifications**: Automatic email confirmations when products are registered
- **Suspicious Scan Alerts**: Email alerts when suspicious product scans are detected
- **Simple Templates**: Plain text and minimal HTML email templates
- **SMTP Integration**: Uses nodemailer with free SMTP providers (Gmail, etc.)
- **Notification Logging**: All email attempts are logged in the database

#### Live Chat Support
- **Real-time Chat**: Socket.IO powered live chat between users and support
- **Role-based Messaging**: Different message handling for admins, manufacturers, suppliers, and retailers
- **Online Status**: Shows online users and connection status
- **Chat History**: Persistent message storage and retrieval
- **Customer Support Widget**: Floating action button for easy access

### Database Schema

The module uses the following database tables:

#### notification_log
```sql
CREATE TABLE notification_log (
  id SERIAL PRIMARY KEY,
  type VARCHAR(30) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  status VARCHAR(30) DEFAULT 'queued' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  sent_at TIMESTAMPTZ,
  error TEXT
);
```

#### support_chats
```sql
CREATE TABLE support_chats (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50),
  role VARCHAR(50),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

## Setup Instructions

### Backend Configuration

1. **Install Dependencies**
   ```bash
   cd backend
   npm install nodemailer socket.io
   ```

2. **Environment Variables**
   Add the following to your `.env` file:
   ```env
   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=your-email@gmail.com
   FROM_NAME=ProductGuard Support
   
   # Enable/disable email notifications
   ENABLE_EMAIL_NOTIFICATIONS=true
   ```

3. **Gmail Setup** (if using Gmail SMTP)
   - Enable 2-Factor Authentication on your Gmail account
   - Generate an App Password for ProductGuard
   - Use the App Password as `SMTP_PASS`

### Frontend Configuration

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install socket.io-client
   ```

2. **Components Integration**
   - `CustomerSupport`: Floating support widget (automatically added to Layout)
   - `SupportDashboard`: Admin dashboard for managing support
   - `LiveChat`: Real-time chat component

## Usage

### For Administrators

1. **Access Support Dashboard**
   - Navigate to `/support-dashboard` (admin only)
   - View email notification statistics
   - Test email configuration
   - Monitor chat activity
   - Send system messages

2. **Email Management**
   - View notification history with status (sent/failed/queued)
   - Send test emails to verify configuration
   - Monitor email delivery statistics

### For Users

1. **Customer Support Access**
   - Click the floating support button (bottom-right corner)
   - Access available when logged in
   - Real-time chat with support team

2. **Automatic Notifications**
   - Receive email confirmations for product registrations
   - Get alerts for suspicious scan activities

## API Endpoints

### Support Endpoints

- `GET /support/chat-history` - Get chat message history
- `GET /support/online-users` - Get currently online users
- `POST /support/system-message` - Send system announcement
- `GET /support/notifications` - Get email notification logs
- `POST /support/test-email` - Send test email

### Email Triggers

- **Product Registration**: Triggered in `addProduct()` function
- **Suspicious Scans**: Triggered in `logProductScan()` when suspicious activity detected

## Email Templates

### Product Registration
```
Subject: Product Registration Confirmation

Dear User,

Your product has been successfully registered in ProductGuard.

Product Details:
- Name: {productName}
- Brand: {brand}
- Serial Number: {serialNumber}
- Registration Date: {date}

Thank you for using ProductGuard to protect your product authenticity.

Best regards,
ProductGuard Team
```

### Suspicious Scan Alert
```
Subject: Suspicious Product Scan Detected

ALERT: Suspicious Product Scan Detected

A suspicious scan has been detected for one of your products:

Product Details:
- Name: {productName}
- Serial Number: {serialNumber}
- Scan Time: {scanTime}
- Suspicion Reason: {suspicionReason}
- Scanner IP: {ipAddress}
- Location: {location}

Please review this activity and take appropriate action if necessary.

Best regards,
ProductGuard Security Team
```

## Socket.IO Events

### Client to Server
- `authenticate` - User authentication with username and role
- `joinSupportChat` - Join the support chat room
- `sendMessage` - Send a chat message
- `typing` - Indicate user is typing
- `stopTyping` - Indicate user stopped typing

### Server to Client
- `newMessage` - New message received
- `onlineUsers` - List of online users
- `userOnline` - User came online
- `userOffline` - User went offline
- `userTyping` - User is typing indicator
- `userStoppedTyping` - User stopped typing indicator

## Troubleshooting

### Email Issues

1. **SMTP Authentication Failed**
   - Verify SMTP credentials
   - Check if 2FA is enabled (use App Password for Gmail)
   - Ensure SMTP_HOST and SMTP_PORT are correct

2. **Emails Not Sending**
   - Check `ENABLE_EMAIL_NOTIFICATIONS=true` in .env
   - Verify email service is running
   - Check notification_log table for error messages

### Chat Issues

1. **Connection Failed**
   - Ensure Socket.IO server is running
   - Check CORS configuration
   - Verify frontend can connect to backend port

2. **Messages Not Showing**
   - Check browser console for Socket.IO errors
   - Verify user authentication
   - Check database connection for chat history

## Security Considerations

1. **Email Security**
   - Use App Passwords instead of account passwords
   - Store SMTP credentials securely
   - Validate email addresses before sending

2. **Chat Security**
   - Authenticate users before allowing chat access
   - Sanitize message content
   - Implement rate limiting for message sending

## Future Enhancements

1. **Email Templates**
   - HTML email templates with better styling
   - Email template management interface
   - Multi-language support

2. **Chat Features**
   - File sharing in chat
   - Chat moderation tools
   - Chat analytics and reporting
   - Push notifications for new messages

3. **Integration**
   - Webhook support for external integrations
   - API for third-party chat systems
   - Mobile app push notifications