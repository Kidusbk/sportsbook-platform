-- 010_deposits_withdrawals.up.sql
--
-- Deposit and withdrawal lifecycle records.
--
-- Both tables:
--   - Track the external payment lifecycle independently of ledger entries
--   - Reference an accounting_transaction for the internal financial effect
--   - Use BIGINT minor currency units for amounts
--   - Have idempotency_key UNIQUE for duplicate-request protection
--   - updated_at maintained by set_updated_at() trigger
--
-- Deposits: external funds arriving into the platform
-- Withdrawals: platform funds going out to the user

-- -----------------------------------------------------------------------
-- Deposits
-- -----------------------------------------------------------------------
CREATE TABLE deposits (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  wallet_id                  UUID        NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  accounting_transaction_id  UUID        REFERENCES accounting_transactions(id) ON DELETE RESTRICT,

  amount_minor               BIGINT      NOT NULL CHECK (amount_minor > 0),
  currency                   CHAR(3)     NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),

  status                     VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),

  -- Payment provider details (populated when a provider is integrated)
  provider                   VARCHAR(50),
  provider_reference         VARCHAR(255),

  -- Idempotency: one financial effect per unique key
  idempotency_key            VARCHAR(255) NOT NULL UNIQUE,

  -- Free-form metadata (webhook payload, provider response, etc.)
  metadata                   JSONB,

  -- Lifecycle timestamps
  completed_at               TIMESTAMPTZ,
  failed_at                  TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deposits_user_id      ON deposits(user_id);
CREATE INDEX idx_deposits_wallet_id    ON deposits(wallet_id);
CREATE INDEX idx_deposits_status       ON deposits(status);
CREATE INDEX idx_deposits_idempotency  ON deposits(idempotency_key);
CREATE INDEX idx_deposits_provider_ref ON deposits(provider, provider_reference);
CREATE INDEX idx_deposits_created_at   ON deposits(created_at);

DROP TRIGGER IF EXISTS deposits_set_updated_at ON deposits;
CREATE TRIGGER deposits_set_updated_at
  BEFORE UPDATE ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------
-- Withdrawals
-- -----------------------------------------------------------------------
CREATE TABLE withdrawals (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  wallet_id                  UUID        NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  accounting_transaction_id  UUID        REFERENCES accounting_transactions(id) ON DELETE RESTRICT,
  hold_id                    UUID        REFERENCES holds(id) ON DELETE RESTRICT,

  amount_minor               BIGINT      NOT NULL CHECK (amount_minor > 0),
  currency                   CHAR(3)     NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),

  status                     VARCHAR(20) NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED')),

  -- Payment provider details (populated when a provider is integrated)
  provider                   VARCHAR(50),
  provider_reference         VARCHAR(255),

  -- Idempotency: one financial effect per unique key
  idempotency_key            VARCHAR(255) NOT NULL UNIQUE,

  -- Rejection/failure context
  rejection_reason           TEXT,

  -- Free-form metadata
  metadata                   JSONB,

  -- Lifecycle timestamps
  completed_at               TIMESTAMPTZ,
  failed_at                  TIMESTAMPTZ,
  rejected_at                TIMESTAMPTZ,
  cancelled_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_user_id      ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_wallet_id    ON withdrawals(wallet_id);
CREATE INDEX idx_withdrawals_status       ON withdrawals(status);
CREATE INDEX idx_withdrawals_idempotency  ON withdrawals(idempotency_key);
CREATE INDEX idx_withdrawals_hold_id      ON withdrawals(hold_id);
CREATE INDEX idx_withdrawals_created_at   ON withdrawals(created_at);

DROP TRIGGER IF EXISTS withdrawals_set_updated_at ON withdrawals;
CREATE TRIGGER withdrawals_set_updated_at
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
