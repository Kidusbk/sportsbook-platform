import { query, pool } from '../db/pool.js';
import type {
  Wallet,
  BalanceSummary,
  AccountingTransactionType,
} from '@sportsbook/types';
import { ConflictError, NotFoundError, ValidationError } from '@sportsbook/shared';

// ---------------------------------------------------------------------------
// ISO 4217 currency validation
// ---------------------------------------------------------------------------
const ISO_4217_RE = /^[A-Z]{3}$/;
export function assertValidCurrency(currency: string): void {
  if (!ISO_4217_RE.test(currency)) {
    throw new ValidationError(`Invalid currency code: "${currency}". Must be ISO 4217 (e.g. GBP, USD).`);
  }
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------
function mapWallet(row: Record<string, unknown>): Wallet {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    currency: row.currency as string,
    status: row.status as Wallet['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapBalance(row: Record<string, unknown>): BalanceSummary {
  return {
    walletId: row.wallet_id as string,
    currency: row.currency as string,
    totalMinor: BigInt(row.total_minor as string | number),
    reservedMinor: BigInt(row.reserved_minor as string | number),
    availableMinor: BigInt(row.available_minor as string | number),
  };
}

// ---------------------------------------------------------------------------
// Wallet service
// ---------------------------------------------------------------------------
export const walletService = {
  /**
   * Creates a wallet for a user.
   * Throws ConflictError if the user already has a wallet for that currency.
   */
  async createWallet(userId: string, currency: string): Promise<Wallet> {
    assertValidCurrency(currency);

    try {
      const result = await query(
        `INSERT INTO wallets (user_id, currency) VALUES ($1, $2) RETURNING *`,
        [userId, currency],
      );
      return mapWallet(result.rows[0] as Record<string, unknown>);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        // unique_violation: uq_wallets_user_currency
        throw new ConflictError(`User already has a wallet for currency ${currency}`);
      }
      throw err;
    }
  },

  async findById(id: string): Promise<Wallet | null> {
    const result = await query('SELECT * FROM wallets WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapWallet(result.rows[0] as Record<string, unknown>) : null;
  },

  async findByUserAndCurrency(userId: string, currency: string): Promise<Wallet | null> {
    const result = await query(
      'SELECT * FROM wallets WHERE user_id = $1 AND currency = $2',
      [userId, currency],
    );
    return result.rows.length > 0 ? mapWallet(result.rows[0] as Record<string, unknown>) : null;
  },

  async findByUser(userId: string): Promise<Wallet[]> {
    const result = await query('SELECT * FROM wallets WHERE user_id = $1 ORDER BY created_at', [userId]);
    return result.rows.map((r) => mapWallet(r as Record<string, unknown>));
  },

  /**
   * Derives the balance summary for a wallet.
   * - totalMinor   = SUM(credits) - SUM(debits) from ledger_entries
   * - reservedMinor = SUM(active holds)
   * - availableMinor = totalMinor - reservedMinor
   *
   * All arithmetic is performed in PostgreSQL — never in JavaScript.
   */
  async getBalance(walletId: string): Promise<BalanceSummary> {
    const wallet = await this.findById(walletId);
    if (!wallet) throw new NotFoundError(`Wallet ${walletId} not found`);

    const result = await query(
      `
      SELECT
        $1::uuid                                                AS wallet_id,
        w.currency                                              AS currency,
        COALESCE(
          SUM(CASE WHEN le.direction = 'credit' THEN le.amount_minor ELSE 0 END) -
          SUM(CASE WHEN le.direction = 'debit'  THEN le.amount_minor ELSE 0 END),
          0
        )                                                       AS total_minor,
        COALESCE((
          SELECT SUM(h.amount_minor)
          FROM holds h
          WHERE h.wallet_id = $1 AND h.status = 'active'
        ), 0)                                                   AS reserved_minor,
        COALESCE(
          SUM(CASE WHEN le.direction = 'credit' THEN le.amount_minor ELSE 0 END) -
          SUM(CASE WHEN le.direction = 'debit'  THEN le.amount_minor ELSE 0 END),
          0
        ) - COALESCE((
          SELECT SUM(h.amount_minor)
          FROM holds h
          WHERE h.wallet_id = $1 AND h.status = 'active'
        ), 0)                                                   AS available_minor
      FROM wallets w
      LEFT JOIN ledger_entries le ON le.wallet_id = w.id
      WHERE w.id = $1
      GROUP BY w.currency
      `,
      [walletId],
    );

    if (result.rows.length === 0) {
      // Wallet exists but has no ledger entries yet — return zeroed balance
      return {
        walletId,
        currency: wallet.currency,
        totalMinor: 0n,
        reservedMinor: 0n,
        availableMinor: 0n,
      };
    }

    return mapBalance(result.rows[0] as Record<string, unknown>);
  },

  /**
   * Posts a balanced double-entry transaction within a single DB transaction.
   *
   * entries must contain at least one credit and one debit,
   * and SUM(credits) must equal SUM(debits) — enforced by DB trigger.
   *
   * Returns the accounting_transaction id.
   */
  async postTransaction(input: {
    transactionType: AccountingTransactionType;
    idempotencyKey: string;
    referenceType?: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
    entries: Array<{
      walletId: string;
      direction: 'debit' | 'credit';
      amountMinor: bigint;
      currency: string;
      description?: string;
    }>;
  }): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert accounting transaction in pending state
      const txResult = await client.query(
        `INSERT INTO accounting_transactions
           (transaction_type, status, reference_type, reference_id, idempotency_key, metadata)
         VALUES ($1, 'pending', $2, $3, $4, $5)
         RETURNING id`,
        [
          input.transactionType,
          input.referenceType ?? null,
          input.referenceId ?? null,
          input.idempotencyKey,
          input.metadata ? JSON.stringify(input.metadata) : null,
        ],
      );
      const txId = (txResult.rows[0] as { id: string }).id;

      // Insert all ledger entries
      for (const entry of input.entries) {
        await client.query(
          `INSERT INTO ledger_entries
             (wallet_id, accounting_transaction_id, direction, amount_minor, currency, description)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            entry.walletId,
            txId,
            entry.direction,
            entry.amountMinor.toString(),
            entry.currency,
            entry.description ?? null,
          ],
        );
      }

      // Mark completed — triggers DB balance check (SUM credits = SUM debits)
      await client.query(
        `UPDATE accounting_transactions SET status = 'completed' WHERE id = $1`,
        [txId],
      );

      await client.query('COMMIT');
      return txId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
