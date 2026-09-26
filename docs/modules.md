# Module Roadmap

Each module below is designed to be implemented incrementally on top of the existing foundation.

## Phase 1: Core Platform (Current)
- [x] User authentication (JWT, bcrypt, sessions)
- [x] Role-based access control (8 system roles)
- [x] Audit logging (append-only, immutable)
- [x] API versioning and error handling
- [x] Frontend shell with routing

## Phase 2: Financial Foundation
- [ ] **Double-entry ledger** — Chart of accounts, journal entries, immutable transactions
- [ ] **Wallets** — Balance is a derived value from ledger entries, not a mutable column
- [ ] **Deposits** — Payment processing stubs (no real payments), ledger recording
- [ ] **Withdrawals** — Withdrawal requests, approval flow, ledger recording

## Phase 3: Sports & Events
- [ ] **Sports** — Sport definitions, categories
- [ ] **Competitions** — Leagues, tournaments, seasons
- [ ] **Events** — Match creation, scheduling, status management
- [ ] **Markets** — Market types (1X2, over/under, handicap, etc.)
- [ ] **Selections** — Outcomes within markets
- [ ] **Odds** — Odds management, movement tracking

## Phase 4: Betting
- [ ] **Bet slips** — Cart-style bet slip construction
- [ ] **Bet placement** — Odds validation, stake deduction via ledger
- [ ] **Bet settlement** — Result-driven settlement via ledger credits
- [ ] **Multi/accumulator bets** — Combined selections

## Phase 5: Compliance & Risk
- [ ] **KYC/Verification** — Identity verification workflow
- [ ] **Risk controls** — Maximum exposure, liability management
- [ ] **Responsible gambling** — Deposit limits, self-exclusion, cool-off periods, reality checks
- [ ] **Regulatory reporting** — Compliance data exports

## Phase 6: Engagement
- [ ] **Promotions** — Bonus engine, free bets, reload bonuses
- [ ] **Notifications** — Email, in-app, push notifications
- [ ] **Customer support** — Ticket system, live chat integration

## Phase 7: Operations
- [ ] **Administration** — Admin dashboard, user management, event management
- [ ] **Reporting** — Financial reports, player reports, KPIs
- [ ] **Live betting** — Real-time odds updates, in-play markets, WebSocket feeds

## Key Architectural Constraints

1. **Ledger-first financials** — All money movement through double-entry journal entries
2. **Balance as derived value** — `SELECT SUM(credits) - SUM(debits) FROM journal_entries WHERE account_id = ?`
3. **No `user.balance` column** — Balance is always computed from the ledger
4. **Append-only audit trail** — No DELETE/UPDATE on audit_logs or journal_entries
5. **Incremental rollout** — Each phase builds on the previous without rewriting existing modules
