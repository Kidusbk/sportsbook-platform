-- 006_wallets.up.sql
--
-- Creates the wallet/account table.
-- A wallet represents a single-currency account owned by a user.
--
-- Rules:
--   - A user may not have two active wallets for the same currency (UNIQUE constraint).
--   - Monetary balance is NEVER stored here; it is always derived from ledger_entries.
--   - Uses gen_random_uuid() per project convention (migration 005+).
--   - updated_at is maintained by the set_updated_at() trigger (migration 005).

CREATE TABLE wallets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  currency    CHAR(3)     NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active wallet per user per currency.
  -- Closed/suspended wallets do not count toward this uniqueness to allow
  -- future re-opening scenarios. Enforced partially here and in application.
  CONSTRAINT uq_wallets_user_currency UNIQUE (user_id, currency)
);

CREATE INDEX idx_wallets_user_id   ON wallets(user_id);
CREATE INDEX idx_wallets_currency  ON wallets(currency);
CREATE INDEX idx_wallets_status    ON wallets(status);

-- Apply the shared updated_at trigger
DROP TRIGGER IF EXISTS wallets_set_updated_at ON wallets;
CREATE TRIGGER wallets_set_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
