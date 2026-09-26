# Architecture

## Overview

The platform follows a layered monorepo architecture:

```
sportsbook-platform/
├── packages/          # Shared libraries
│   ├── types/         # TypeScript type definitions
│   ├── shared/        # Constants, errors, utilities
│   └── config/        # Shared configuration
├── apps/              # Applications
│   ├── api/           # Express backend API
│   └── web/           # React frontend SPA
├── infrastructure/    # Docker, postgres
└── docs/              # Documentation
```

## Design Principles

1. **No fake data** — No simulated balances or mock financial operations
2. **Immutable ledger** — Financial system will use double-entry accounting
3. **Incremental modules** — Each feature module can be added without rewriting the core
4. **Security first** — Auth, RBAC, audit logging, rate limiting from day one
5. **Separation of concerns** — Config, middleware, services, routes are cleanly separated

## Backend Layers

- **Config** → Environment-driven configuration
- **Middleware** → Security, auth, validation, logging, error handling
- **Services** → Business logic
- **Routes** → HTTP interface
- **DB** → PostgreSQL with raw SQL migrations

## Database Schema

- `users` — User accounts
- `roles` / `permissions` / `role_permissions` — RBAC system
- `user_roles` — User-to-role assignments
- `sessions` — Refresh token tracking with revocation
- `audit_logs` — Append-only event log with immutability triggers

## API Versioning

All endpoints are prefixed with `/api/v1/`. Breaking changes will introduce `/api/v2/`.

## Module Roadmap

See [modules.md](modules.md) for the complete feature roadmap.
