-- 005_set_updated_at_trigger.up.sql
--
-- Creates a reusable set_updated_at() trigger function and applies it
-- to all existing mutable tables that carry an updated_at column:
--   - users
--   - roles
--
-- NOT applied to:
--   - audit_logs  (append-only, no updated_at by design)
--   - sessions    (no updated_at column)
--   - _migrations (internal bookkeeping table)
--
-- UUID convention note:
--   From migration 005 onwards, gen_random_uuid() is used instead of
--   uuid_generate_v4() from the uuid-ossp extension. The extension
--   remains installed for backward compatibility with migrations 001-004.
--
-- This migration is idempotent via CREATE OR REPLACE / DROP IF EXISTS.

-- -----------------------------------------------------------------------
-- Trigger function
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------
-- Apply to: users
-- -----------------------------------------------------------------------
DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------
-- Apply to: roles
-- -----------------------------------------------------------------------
DROP TRIGGER IF EXISTS roles_set_updated_at ON roles;
CREATE TRIGGER roles_set_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
