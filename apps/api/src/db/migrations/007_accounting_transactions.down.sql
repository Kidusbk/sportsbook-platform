-- 007_accounting_transactions.down.sql
-- Reverses ONLY what migration 007 created.
DROP TRIGGER IF EXISTS accounting_transactions_set_updated_at ON accounting_transactions;
DROP TABLE IF EXISTS accounting_transactions;
