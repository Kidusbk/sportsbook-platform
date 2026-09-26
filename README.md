# Sportsbook Platform

A production-grade sportsbook web platform built with TypeScript, React, Express, and PostgreSQL.

> **Foundation Phase** — This is the architectural foundation. Betting features are not implemented yet.

## Quick Start

```bash
cp .env.example .env
npm run docker:up
npm install
npm run db:migrate
npm run dev:api    # API on http://localhost:3001
npm run dev:web    # Frontend on http://localhost:5173
```

## Architecture

| Component | Technology |
|-----------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Express + TypeScript |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Testing | Vitest |

## Documentation

- [Architecture](docs/architecture.md) — Design decisions and module roadmap
- [Development](docs/development.md) — Setup and workflow guide
- [Environment](docs/environment.md) — Configuration reference
- [Security](docs/security.md) — Security measures
- [API](docs/api.md) — Endpoint documentation
- [Future Modules](docs/modules.md) — Module roadmap

## Foundation Features

- ✅ Monorepo (npm workspaces)
- ✅ Express API with versioned routes
- ✅ React SPA with responsive design
- ✅ PostgreSQL with migration system
- ✅ User auth (bcrypt + JWT)
- ✅ Role-based access control (8 roles)
- ✅ Granular permission system
- ✅ Append-only audit logging
- ✅ Security middleware (Helmet, CORS, rate limiting)
- ✅ Input validation (Zod)
- ✅ Structured error handling
- ✅ Health and readiness endpoints
- ✅ Docker dev environment
- ✅ Automated tests (30 passing)
