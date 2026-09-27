-- 005_set_updated_at_trigger.down.sql
--
-- Removes the set_updated_at triggers from users and roles,
-- and drops the trigger function.
-- The updated_at columns themselves are retained (created in migration 001/002).

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
DROP TRIGGER IF EXISTS roles_set_updated_at ON roles;
DROP FUNCTION IF EXISTS set_updated_at();
