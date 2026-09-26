# API Reference (v1)

Base URL: `http://localhost:3001/api/v1`

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/ready` | No | Readiness probe (DB check) |

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Sign in |
| POST | `/auth/logout` | Yes | Sign out (revoke session) |
| POST | `/auth/refresh` | No | Refresh access token |
| GET | `/auth/me` | Yes | Get current user + roles |

### Register `POST /auth/register`
```json
{ "email": "user@example.com", "username": "user123", "password": "SecureP@ss1" }
```

### Login `POST /auth/login`
```json
{ "email": "user@example.com", "password": "SecureP@ss1" }
```

### Response format
```json
{ "success": true, "data": { ... }, "meta": { "requestId": "...", "timestamp": "..." } }
```

### Error format
```json
{ "success": false, "error": { "code": "...", "message": "...", "details": {} }, "meta": { ... } }
```
