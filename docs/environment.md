# Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `APP_PORT` | `3001` | API server port |
| `APP_HOST` | `0.0.0.0` | API server host |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `sportsbook_dev` | Database name |
| `DB_USER` | `sportsbook` | Database user |
| `DB_PASSWORD` | — | Database password (required) |
| `JWT_ACCESS_SECRET` | — | Access token signing secret (required) |
| `JWT_REFRESH_SECRET` | — | Refresh token signing secret (required) |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token TTL |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | `900000` | General rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `LOG_LEVEL` | `info` | Log level |

**Security**: Never commit `.env` to version control.
