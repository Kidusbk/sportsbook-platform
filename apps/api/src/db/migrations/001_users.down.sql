-- 001_users.down.sql
--
-- Reverses ONLY what migration 001 created:
--   - the users table
--   - the uuid-ossp extension
--
-- Dependency note:
--   user_roles (FK → users) is owned by migration 002 — removed by 002.down
--   sessions   (FK → users) is owned by migration 003 — removed by 003.down
--   audit_logs (FK → users) is owned by migration 004 — removed by 004.down
--
-- The migration runner rolls back one migration at a time in reverse order
-- (005 → 004 → 003 → 002 → 001), so all dependents will have been removed
-- before this file runs. No cross-migration drops belong here.
DROP TABLE IF EXISTS users;
DROP EXTENSION IF EXISTS "uuid-ossp";
