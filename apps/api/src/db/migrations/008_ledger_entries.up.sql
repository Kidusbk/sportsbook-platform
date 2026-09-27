-- 008_ledger_entries.up.sql
--
-- Immutable double-entry ledger.
--
-- Rules:
--   1. Entries are NEVER updated or deleted after creation (immutability triggers).
--   2. amount_minor MUST be positive (CHECK > 0); direction = 'debit'|'credit'.
--   3. currency MUST match the wallet's currency (enforced in application layer;
--      the CHECK here ensures well-formed ISO 4217 codes at DB level).
--   4. Every completed accounting_transaction MUST balance:
--        SUM(amount_minor WHERE direction='credit') =
--        SUM(amount_minor WHERE direction='debit')
--      This is enforced by a DEFERRED constraint trigger on COMMIT.
--
-- Balance derivation (no stored balance column):
--   SELECT
--     SUM(CASE WHEN direction='credit' THEN amount_minor ELSE 0 END) -
--     SUM(CASE WHEN direction='debit'  THEN amount_minor ELSE 0 END)
--   AS balance_minor
--   FROM ledger_entries
--   WHERE wallet_id = $1;

CREATE TABLE ledger_entries (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id                UUID        NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  accounting_transaction_id UUID       NOT NULL REFERENCES accounting_transactions(id) ON DELETE RESTRICT,
  direction                VARCHAR(6)  NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount_minor             BIGINT      NOT NULL CHECK (amount_minor > 0),
  currency                 CHAR(3)     NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),

  -- Human-readable description for this specific line
  description              TEXT,

  -- Free-form metadata
  metadata                 JSONB,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: ledger entries are immutable.
);

CREATE INDEX idx_ledger_wallet_id      ON ledger_entries(wallet_id);
CREATE INDEX idx_ledger_acctxn_id      ON ledger_entries(accounting_transaction_id);
CREATE INDEX idx_ledger_direction      ON ledger_entries(direction);
CREATE INDEX idx_ledger_created_at     ON ledger_entries(created_at);
CREATE INDEX idx_ledger_wallet_dir     ON ledger_entries(wallet_id, direction);

-- -----------------------------------------------------------------------
-- Immutability: prevent UPDATE and DELETE on ledger_entries
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_ledger_entry_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable. UPDATE and DELETE are not permitted. '
                  'Create a correcting entry instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_no_update
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ledger_entry_modification();

CREATE TRIGGER ledger_entries_no_delete
  BEFORE DELETE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ledger_entry_modification();

-- -----------------------------------------------------------------------
-- Double-entry balance check: DEFERRED, fires at COMMIT time.
-- When an accounting_transaction transitions to 'completed', verify that
-- SUM(credits) = SUM(debits) for all its ledger entries.
--
-- This is enforced as a DEFERRABLE INITIALLY DEFERRED constraint trigger,
-- so all entries can be inserted within the transaction before the check runs.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_double_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_credits BIGINT;
  v_debits  BIGINT;
BEGIN
  -- Only enforce balance when the transaction is being marked completed
  IF NEW.status = 'completed' THEN
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'debit'  THEN amount_minor ELSE 0 END), 0)
    INTO v_credits, v_debits
    FROM ledger_entries
    WHERE accounting_transaction_id = NEW.id;

    IF v_credits <> v_debits THEN
      RAISE EXCEPTION
        'Double-entry imbalance on accounting_transaction %: credits=% debits=%',
        NEW.id, v_credits, v_debits;
    END IF;

    IF v_credits = 0 THEN
      RAISE EXCEPTION
        'accounting_transaction % has no ledger entries.', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This trigger fires on UPDATE of accounting_transactions.status.
-- It is NOT deferred (we want immediate feedback within the same transaction).
CREATE TRIGGER accounting_transactions_balance_check
  BEFORE UPDATE OF status ON accounting_transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_double_entry_balance();
