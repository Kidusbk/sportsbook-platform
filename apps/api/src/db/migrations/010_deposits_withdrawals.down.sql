-- 010_deposits_withdrawals.down.sql
-- Reverses ONLY what migration 010 created.
DROP TRIGGER IF EXISTS withdrawals_set_updated_at ON withdrawals;
DROP TABLE IF EXISTS withdrawals;
DROP TRIGGER IF EXISTS deposits_set_updated_at ON deposits;
DROP TABLE IF EXISTS deposits;
