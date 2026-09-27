-- 009_holds.up.sql
--
-- Fund holds/reservations.
-- A hold reserves a portion of a wallet's available balance so it cannot
-- be withdrawn or double-spent while pending (e.g. awaiting bet settlement).
--
-- Available balance = total balance - SUM(amount_minor WHERE status='active')
--
-- A hold does NOT create ledger entries itself; it is a reservation record.
-- When the hold is released, a corresponding bet_payout or bet_refund
-- accounting_transaction will generate the actual ledger entries.
--
-- updated_at maintained by set_updated_at() trigger.

CREATE TABLE holds (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id                UUID        NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  accounting_transaction_id UUID       REFERENCES accounting_transactions(id) ON DELETE RESTRICT,

  amount_minor             BIGINT      NOT NULL CHECK (amount_minor > 0),
  currency                 CHAR(3)     NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),

  -- Why this hold exists
  reason                   VARCHAR(50) NOT NULL
    CHECK (reason IN ('bet_stake', 'withdrawal', 'manual')),

  status                   VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'released', 'cancelled', 'expired')),

  -- Optional back-reference to the domain object holding the funds
  reference_type           VARCHAR(50),
  reference_id             UUID,

  expires_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holds_wallet_id      ON holds(wallet_id);
CREATE INDEX idx_holds_status         ON holds(status);
CREATE INDEX idx_holds_reference      ON holds(reference_type, reference_id);
CREATE INDEX idx_holds_expires_at     ON holds(expires_at) WHERE status = 'active';

-- updated_at trigger
DROP TRIGGER IF EXISTS holds_set_updated_at ON holds;
CREATE TRIGGER holds_set_updated_at
  BEFORE UPDATE ON holds
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
