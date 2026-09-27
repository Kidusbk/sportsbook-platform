-- 007_accounting_transactions.up.sql
--
-- An accounting_transaction groups one or more balanced ledger entries
-- that together represent a single financial event (deposit, withdrawal,
-- bet stake, payout, adjustment, etc.).
--
-- Idempotency:
--   The idempotency_key column has a UNIQUE constraint. Inserting a
--   duplicate key raises a unique violation, which the application must
--   catch and treat as "already processed — return the existing record".
--   This prevents duplicate financial effects from retried requests.
--
-- Double-entry integrity:
--   The accounting_transactions table records the event; the balance
--   constraint (SUM debits = SUM credits) is enforced by a deferrable
--   trigger on ledger_entries (migration 008).

CREATE TABLE accounting_transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(50) NOT NULL
    CHECK (transaction_type IN (
      'deposit', 'withdrawal', 'bet_stake', 'bet_payout',
      'bet_refund', 'bonus', 'adjustment', 'hold', 'hold_release'
    )),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),

  -- Optional linkage to the domain object that caused this transaction
  -- e.g. reference_type='deposit', reference_id=<deposit UUID>
  reference_type   VARCHAR(50),
  reference_id     UUID,

  -- Idempotency: unique per external caller intent
  idempotency_key  VARCHAR(255) UNIQUE,

  -- Free-form metadata (provider refs, correlation IDs, etc.)
  metadata         JSONB,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acctxn_type           ON accounting_transactions(transaction_type);
CREATE INDEX idx_acctxn_status         ON accounting_transactions(status);
CREATE INDEX idx_acctxn_reference      ON accounting_transactions(reference_type, reference_id);
CREATE INDEX idx_acctxn_idempotency    ON accounting_transactions(idempotency_key);
CREATE INDEX idx_acctxn_created_at     ON accounting_transactions(created_at);

-- updated_at trigger
DROP TRIGGER IF EXISTS accounting_transactions_set_updated_at ON accounting_transactions;
CREATE TRIGGER accounting_transactions_set_updated_at
  BEFORE UPDATE ON accounting_transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
