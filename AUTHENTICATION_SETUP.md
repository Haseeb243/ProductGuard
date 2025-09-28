# ProductGuard Authentication Setup Guide

This guide provides detailed setup instructions for the new secure authentication system with JWT tokens, bcrypt password hashing, and optional Two-Factor Authentication (2FA).

## Table of Contents

1. [Overview](#overview)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Database Schema Updates](#database-schema-updates)
5. [Environment Variables](#environment-variables)
6. [2FA Setup Guide](#2fa-setup-guide)
7. [API Endpoints](#api-endpoints)
8. [Security Features](#security-features)
9. [Migration Guide](#migration-guide)
10. [Troubleshooting](#troubleshooting)

## Overview

The new authentication system includes:
- **Secure password hashing** using bcrypt
- **JWT-based authentication** with access tokens
- **Role-based access control (RBAC)** middleware
- **Rate limiting** on login attempts
- **Two-Factor Authentication (2FA)** support using TOTP
- **SQL injection protection** with parameterized queries

## Backend Setup

### 1. Dependencies

The following new dependencies are required:
```json
{
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.0",
  "express-rate-limit": "^6.7.0",
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.0"
}
```

Install them with:
```bash
cd backend
npm install bcrypt jsonwebtoken express-rate-limit speakeasy qrcode
```

### 2. Backend Configuration

The backend now includes:
- JWT token generation and validation
- Bcrypt password hashing
- Rate limiting middleware
- RBAC middleware
- 2FA endpoints

#### Key Features:
- **Password Hashing**: All passwords are hashed with bcrypt (salt rounds: 10)
- **JWT Tokens**: 24-hour expiration (configurable)
- **Rate Limiting**: 5 login attempts per 15 minutes per IP
- **Parameterized Queries**: All SQL queries use parameterized statements

## Frontend Setup

### 1. Login Component Updates

The `Login.jsx` component now supports:
- JSON-based login requests
- 2FA code input
- JWT token storage
- Error handling for rate limiting

### 2. Authentication Context

Updated `AuthProvider.js` includes:
- JWT token validation on app startup
- Automatic token refresh logic
- Enhanced user state management

### 3. 2FA Management

New `TwoFactorAuth.jsx` component provides:
- QR code generation for authenticator apps
- 2FA enable/disable functionality
- Verification code input

## Database Schema Updates

The authentication system uses the existing database schema with these fields in the `auth` table:

```sql
-- Existing fields used:
username VARCHAR(50) NOT NULL
password VARCHAR(255) NOT NULL  -- Now stores bcrypt hashes
role VARCHAR(50) NOT NULL
email VARCHAR(255)
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
last_login TIMESTAMP WITH TIME ZONE
is_2fa_enabled BOOLEAN DEFAULT false
two_factor_secret VARCHAR(64)
```

No schema migrations are required - the system works with the existing structure.

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Database (existing)
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=your-db-password
PGDATABASE=productguard
PGPORT=5432

# CORS (existing)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Important**: Change the `JWT_SECRET` to a strong, random string in production!

## 2FA Setup Guide

### For End Users

1. **Navigate to 2FA Settings**
   - Go to Profile page
   - Click "Manage" next to Two-Factor Authentication

2. **Enable 2FA**
   - Toggle the "Enable 2FA" switch
   - Install an authenticator app (Google Authenticator, Authy, etc.)
   - Scan the QR code with your authenticator app
   - Enter the 6-digit verification code
   - Click "Verify & Enable"

3. **Login with 2FA**
   - Enter username and password as usual
   - When prompted, enter the 6-digit code from your authenticator app
   - Click "Verify Code"

4. **Disable 2FA**
   - Go to 2FA Settings
   - Toggle off "Enable 2FA"
   - Enter your current password and a 2FA code
   - Click "Disable 2FA"

### For Administrators

2FA is recommended for admin accounts:
1. Login as admin
2. Go to Profile → 2FA Settings
3. Follow the setup process above

## API Endpoints

### Authentication Endpoints

#### POST `/auth/login`
Login with username/password and optional 2FA code.

**Request:**
```json
{
  "username": "admin",
  "password": "password123",
  "twoFactorToken": "123456"  // Optional, only if 2FA enabled
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "admin",
    "role": "admin",
    "id": 1,
    "email": "admin@example.com",
    "is_2fa_enabled": false
  }
}
```

**2FA Required Response:**
```json
{
  "success": false,
  "requiresTwoFactor": true,
  "message": "Two-factor authentication required"
}
```

#### GET `/auth/validate`
Validate JWT token and get user info.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "role": "admin",
    "id": 1,
    "email": "admin@example.com",
    "is_2fa_enabled": false
  }
}
```

### 2FA Endpoints

#### POST `/auth/2fa/setup`
Generate 2FA secret and QR code.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

#### POST `/auth/2fa/verify`
Verify 2FA token and enable 2FA.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request:**
```json
{
  "token": "123456"
}
```

#### POST `/auth/2fa/disable`
Disable 2FA (requires password and current 2FA token).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request:**
```json
{
  "password": "currentpassword",
  "token": "123456"
}
```

## Security Features

### 1. Password Security
- **Bcrypt hashing** with salt rounds of 10
- **Minimum password requirements** (implement client-side validation)
- **Password change logging** in activity logs

### 2. JWT Security
- **Configurable expiration** (default 24 hours)
- **Secure signing** with HMAC SHA256
- **Token validation** on protected routes

### 3. Rate Limiting
- **Login attempts**: 5 per 15 minutes per IP
- **Customizable limits** via middleware configuration
- **IP-based tracking** with forwarded headers support

### 4. SQL Injection Protection
- **Parameterized queries** for all database operations
- **Input validation** on all endpoints
- **Error handling** without exposing system details

### 5. Role-Based Access Control
- **Middleware-based** route protection
- **Role verification** from JWT tokens
- **Flexible role requirements** per route

## Migration Guide

### From Old Authentication System

#### Backend Migration

1. **Existing passwords**: The system maintains backward compatibility with the old endpoint but it's deprecated
2. **Password rehashing**: When users login with old plaintext passwords, the backend will automatically detect the legacy format, accept the login once, and immediately upgrade the stored password to a bcrypt hash (no user action required). This is logged as an `activity_log` entry with action `password_rehash`.
3. **Database**: No schema changes required

#### Frontend Migration

1. **Update API calls**: Replace old auth endpoints with new `/auth/login`
2. **Token storage**: Implement JWT token storage and axios interceptors
3. **Error handling**: Update error handling for new response formats

### Migration Steps

1. **Deploy backend changes**
2. **Test new login endpoint**
3. **Deploy frontend changes**
4. **Notify users** about enhanced security
5. **Monitor logs** for any issues

## Troubleshooting

### Common Issues

#### 1. "Invalid or expired token"
- **Cause**: JWT token expired or invalid
- **Solution**: Re-login to get a new token
- **Prevention**: Implement token refresh logic

#### 2. "Too many login attempts"
- **Cause**: Rate limiting triggered
- **Solution**: Wait 15 minutes or use different IP
- **Prevention**: Don't make rapid login attempts

#### 3. "Two-factor authentication required"
- **Cause**: User has 2FA enabled but didn't provide token
- **Solution**: Provide 2FA token in login request
- **Prevention**: Check user's 2FA status before login

#### 4. Database connection errors
- **Cause**: PostgreSQL not running or incorrect credentials
- **Solution**: Check database connection and credentials
- **Prevention**: Use environment variables correctly

### Debugging Tips

1. **Check logs**: Backend logs provide detailed error information
2. **Verify environment variables**: Ensure all required env vars are set
3. **Test endpoints**: Use Postman or curl to test API endpoints
4. **Database queries**: Check PostgreSQL logs for query issues

### Performance Considerations

1. **JWT validation**: Cached for performance
2. **Bcrypt rounds**: Balanced for security vs performance
3. **Database indexes**: Ensure indexes on username and role fields
4. **Rate limiting**: Uses in-memory storage (consider Redis for production)

## Production Deployment

### Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Enable HTTPS for all communications
- [ ] Set secure CORS origins
- [ ] Use strong database passwords
- [ ] Enable database SSL connections
- [ ] Set up proper logging and monitoring
- [ ] Implement JWT token refresh mechanism
- [ ] Consider using Redis for rate limiting storage
- [ ] Set up backup procedures for 2FA secrets
- [ ] Implement account lockout policies

### Monitoring

Monitor these metrics:
- Login success/failure rates
- 2FA adoption rates
- Rate limiting triggers
- JWT token validation failures
- Database query performance

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs
3. Test with curl or Postman
4. Check database connectivity
5. Verify environment variables

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Compatibility**: Node.js 16+, PostgreSQL 12+, React 18+