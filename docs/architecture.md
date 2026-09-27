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

---

## Database Conventions

### UUID Strategy

All domain entity tables use UUID primary keys.

- **Migrations 001–004**: use `uuid_generate_v4()` from the `uuid-ossp` extension.
- **Migration 005 and later**: use `gen_random_uuid()` (native PostgreSQL 13+ function,
  no extension dependency). The `uuid-ossp` extension remains installed for backward
  compatibility but must not be used in new migrations.

### Timestamp Convention

All timestamps must use `TIMESTAMPTZ` (timestamp with time zone), never bare `TIMESTAMP`.
This ensures all stored times are UTC-anchored and unambiguous across deployments.

### `updated_at` Trigger Convention

All mutable tables with an `updated_at` column must have the `set_updated_at()` trigger
applied (created in migration 005). This trigger automatically sets `updated_at = NOW()`
on every UPDATE, removing the fragile requirement for application code to manually
include `updated_at = NOW()` in every query.

Tables where this applies: `users`, `roles`, and every new mutable table going forward.

Tables where this does NOT apply:
- `audit_logs` — append-only, no `updated_at` by design
- `sessions` — no `updated_at` column

### `set_updated_at()` Trigger Template

For any new mutable table with an `updated_at` column, include this in its migration:

```sql
DROP TRIGGER IF EXISTS <table>_set_updated_at ON <table>;
CREATE TRIGGER <table>_set_updated_at
  BEFORE UPDATE ON <table>
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

---

## Financial Architecture

> **No financial tables have been created yet.** This section documents the mandatory
> conventions that must be followed when Phase 2 (financial foundation) begins.

### Monetary Amount Representation

**All monetary amounts MUST be stored as `BIGINT` in minor currency units.**

Examples:
| Human amount | Currency | Stored value (`BIGINT`) |
|--------------|----------|------------------------|
| £10.50 | GBP | `1050` |
| $9.99 | USD | `999` |
| €100.00 | EUR | `10000` |

**Prohibited types for monetary amounts:**

| Type | Reason |
|------|--------|
| `FLOAT` | Binary floating-point — cannot represent most decimal fractions exactly |
| `DOUBLE PRECISION` | Same issue as FLOAT |
| `REAL` | Same issue |
| PostgreSQL `MONEY` | Locale-dependent formatting; poor interoperability |
| JavaScript `number` | IEEE 754 double — must never be used as authoritative money arithmetic |

`NUMERIC(19,4)` / `DECIMAL` is acceptable in Postgres (exact arithmetic), but `BIGINT`
minor units are preferred for performance and unambiguity.

### Currency Representation

Currency is stored separately as `CHAR(3)` using ISO 4217 three-letter codes
(e.g. `'GBP'`, `'USD'`, `'EUR'`). It is never inferred from context.

### JavaScript / Application Layer Rules

- Application code must **never** perform authoritative arithmetic on monetary values
  using JavaScript's `number` type.
- If a monetary value must be passed between layers, use:
  - A `string` representation of the integer (e.g. `"1050"`)
  - Or JavaScript's native `BigInt` type
- Display formatting (e.g. dividing by 100 to show `£10.50`) is a **presentation-layer
  concern only** and must not affect stored values.
- All balance calculations must be performed in PostgreSQL via `SUM()` over ledger entries.

### Ledger Architecture (double-entry)

The financial system will use an immutable double-entry ledger:

- **No `balance` column** will ever exist on `users`, `wallets`, or any other table.
- A user's balance is always a **derived value**:

```sql
SELECT
  SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) -
  SUM(CASE WHEN entry_type = 'debit'  THEN amount ELSE 0 END)
AS balance_minor_units
FROM ledger_entries
WHERE account_id = $1;
```

- Every financial event (deposit, stake, payout, refund, withdrawal, bonus, adjustment)
  produces one or more immutable rows in `ledger_entries`.
- `ledger_entries` will have the same Postgres UPDATE/DELETE immutability triggers
  as `audit_logs`.

---

## Security Notes

### MFA Secret Encryption

The `users.mfa_secret` column currently exists in the database schema but contains no
data (MFA is not yet implemented). Before MFA is enabled in any environment:

- The `mfa_secret` column **must** store the TOTP secret encrypted at rest using
  application-level encryption (e.g. AES-256-GCM with a key stored in an environment
  variable or secrets manager), not in plaintext.
- A migration to convert existing plaintext values (if any) must be written before MFA
  goes live.
- Do not implement MFA until this encryption mechanism is in place.

### Phone Number Validation

The `users.phone` column is `VARCHAR(20)` with no format constraint. Before the phone
field is exposed in any user-facing flow:

- Application-layer validation must enforce the E.164 format (e.g. `+447911123456`).
- A database CHECK constraint or separate migration may be added once the validation
  layer is in place and existing data is confirmed clean.

---

## Module Roadmap

See [modules.md](modules.md) for the complete feature roadmap.
