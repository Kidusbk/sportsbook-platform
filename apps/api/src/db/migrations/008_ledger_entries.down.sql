-- 008_ledger_entries.down.sql
-- Reverses ONLY what migration 008 created.
DROP TRIGGER IF EXISTS accounting_transactions_balance_check ON accounting_transactions;
DROP FUNCTION IF EXISTS check_double_entry_balance();
DROP TRIGGER IF EXISTS ledger_entries_no_delete ON ledger_entries;
DROP TRIGGER IF EXISTS ledger_entries_no_update ON ledger_entries;
DROP FUNCTION IF EXISTS prevent_ledger_entry_modification();
DROP TABLE IF EXISTS ledger_entries;
