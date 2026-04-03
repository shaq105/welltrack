# WellTrack API Reference

Base URL: `/api`

All authenticated endpoints require an `Authorization: Bearer <token>` header.

---

## Auth

### Register
`POST /api/auth/register`

Creates a new user account and returns tokens.

Request:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "display_name": "Jane"
}
```

Response: `201 Created`
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Jane",
    "timezone": "UTC"
  }
}
```

---

### Login
`POST /api/auth/login`

Authenticates a user and returns tokens.

Request:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response: `200 OK`
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Jane",
    "timezone": "UTC"
  }
}
```

Errors: `401` invalid credentials

---

### Refresh Token
`POST /api/auth/refresh`

Exchanges a valid refresh token for a new access token.

Request:
```json
{
  "refreshToken": "eyJ..."
}
```

Response: `200 OK`
```json
{
  "accessToken": "eyJ..."
}
```

Errors: `401` token invalid or expired

---

### Logout
`POST /api/auth/logout`

Invalidates the provided refresh token.

Request:
```json
{
  "refreshToken": "eyJ..."
}
```

Response: `204 No Content`

---

### Forgot Password
`POST /api/auth/forgot-password`

Sends a password reset email. Always returns 200 to prevent email enumeration.

Request:
```json
{
  "email": "user@example.com"
}
```

Response: `200 OK`
```json
{
  "message": "If that email exists, a reset link has been sent."
}
```

---

### Reset Password
`POST /api/auth/reset-password`

Sets a new password using a valid reset token (from the email link).

Request:
```json
{
  "token": "reset-token-from-email",
  "password": "newsecurepassword"
}
```

Response: `200 OK`
```json
{
  "message": "Password updated successfully."
}
```

Errors: `400` token invalid or expired
