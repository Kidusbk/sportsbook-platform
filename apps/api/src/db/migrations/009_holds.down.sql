-- 009_holds.down.sql
-- Reverses ONLY what migration 009 created.
DROP TRIGGER IF EXISTS holds_set_updated_at ON holds;
DROP TABLE IF EXISTS holds;
