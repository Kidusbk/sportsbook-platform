-- 006_wallets.down.sql
-- Reverses ONLY what migration 006 created.
DROP TRIGGER IF EXISTS wallets_set_updated_at ON wallets;
DROP TABLE IF EXISTS wallets;
