# Security

## Implemented

- **Helmet** — HTTP security headers
- **CORS** — Configured allowed origins
- **Rate Limiting** — General + auth-specific limits
- **bcrypt** — Password hashing (configurable rounds)
- **JWT** — Separate access/refresh token secrets
- **Session Revocation** — DB-tracked with SHA-256 hashed tokens
- **Account Lockout** — After 5 failed attempts (30 min)
- **Input Validation** — Zod schemas on all endpoints
- **Audit Logging** — Append-only table with immutability triggers
- **RBAC** — 8 system roles with granular permissions
- **Error Sanitization** — No stack traces in production responses
- **Request IDs** — Traceability across the stack

## Rules

- No secrets in source code
- `.env` is gitignored
- Production errors are generic (no internal details leaked)
- Auth endpoints have stricter rate limits
- Sessions are individually revocable
