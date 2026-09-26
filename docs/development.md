# Development Guide

## Prerequisites

- Node.js >= 20
- Docker + Docker Compose
- Git

## Setup

```bash
git clone <repo> && cd sportsbook-platform
cp .env.example .env      # Configure environment
npm run docker:up          # Start PostgreSQL + Redis
npm install                # Install all workspace dependencies
npm run db:migrate         # Run database migrations
```

## Running

```bash
npm run dev:api            # API server on :3001
npm run dev:web            # Frontend on :5173
npm run dev                # Both in parallel (turbo)
```

## Testing

```bash
npm run test:api           # Backend tests
npm run test:web           # Frontend tests
npm test                   # All tests
```

## Database

```bash
npm run db:migrate         # Apply pending migrations
npm run db:migrate:down    # Rollback last migration
```

## Project Structure

- `packages/types/` — Shared TypeScript types
- `packages/shared/` — Constants, error classes
- `packages/config/` — Shared config (ESLint, etc.)
- `apps/api/` — Express API server
- `apps/web/` — React SPA
- `infrastructure/` — Docker Compose, init scripts
