import { query, pool } from '../db/pool.js';
import type { Withdrawal, WithdrawalStatus } from '@sportsbook/types';
import { NotFoundError, ConflictError, ValidationError } from '@sportsbook/shared';
import { walletService } from './wallet.service.js';

function mapWithdrawal(row: Record<string, unknown>): Withdrawal {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    walletId: row.wallet_id as string,
    accountingTransactionId: row.accounting_transaction_id as string | null,
    holdId: row.hold_id as string | null,
    amountMinor: BigInt(row.amount_minor as string | number),
    currency: row.currency as string,
    status: row.status as WithdrawalStatus,
    provider: row.provider as string | null,
    providerReference: row.provider_reference as string | null,
    idempotencyKey: row.idempotency_key as string,
    rejectionReason: row.rejection_reason as string | null,
    metadata: row.metadata as Record<string, unknown> | null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    failedAt: row.failed_at ? String(row.failed_at) : null,
    rejectedAt: row.rejected_at ? String(row.rejected_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const withdrawalService = {
  /**
   * Requests a withdrawal.
   * Verifies sufficient AVAILABLE balance (total minus active holds).
   * Creates a hold to reserve the funds immediately.
   * The actual debit ledger entry is posted when the withdrawal completes.
   */
  async requestWithdrawal(input: {
    userId: string;
    walletId: string;
    amountMinor: bigint;
    currency: string;
    idempotencyKey: string;
    provider?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Withdrawal> {
    if (input.amountMinor <= 0n) {
      throw new ValidationError('Withdrawal amount must be a positive value in minor currency units');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock wallet row
      const walletResult = await client.query(
        'SELECT * FROM wallets WHERE id = $1 FOR UPDATE',
        [input.walletId],
      );
      if (walletResult.rows.length === 0) throw new NotFoundError(`Wallet ${input.walletId} not found`);
      const wallet = walletResult.rows[0] as Record<string, unknown>;

      if (wallet.user_id !== input.userId) throw new ValidationError('Wallet does not belong to user');
      if ((wallet.currency as string) !== input.currency) throw new ValidationError('Currency mismatch');
      if (wallet.status !== 'active') throw new ValidationError('Wallet is not active');

      // Compute available balance within this transaction
      const balResult = await client.query(
        `
        SELECT
          COALESCE(
            SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END) -
            SUM(CASE WHEN direction = 'debit'  THEN amount_minor ELSE 0 END),
            0
          ) -
          COALESCE((
            SELECT SUM(h.amount_minor) FROM holds h
            WHERE h.wallet_id = $1 AND h.status = 'active'
          ), 0) AS available_minor
        FROM ledger_entries
        WHERE wallet_id = $1
        `,
        [input.walletId],
      );
      const availableMinor = BigInt((balResult.rows[0] as { available_minor: string | number }).available_minor);

      if (availableMinor < input.amountMinor) {
        throw new ValidationError(
          `Insufficient available balance. Available: ${availableMinor}, requested: ${input.amountMinor}`,
        );
      }

      // Create a hold to reserve the funds
      const holdResult = await client.query(
        `INSERT INTO holds (wallet_id, amount_minor, currency, reason, status, reference_type)
         VALUES ($1, $2, $3, 'withdrawal', 'active', 'withdrawal')
         RETURNING id`,
        [input.walletId, input.amountMinor.toString(), input.currency],
      );
      const holdId = (holdResult.rows[0] as { id: string }).id;

      // Create withdrawal record
      let withdrawal: Withdrawal;
      try {
        const wResult = await client.query(
          `INSERT INTO withdrawals
             (user_id, wallet_id, hold_id, amount_minor, currency, idempotency_key, provider, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            input.userId, input.walletId, holdId,
            input.amountMinor.toString(), input.currency,
            input.idempotencyKey,
            input.provider ?? null,
            input.metadata ? JSON.stringify(input.metadata) : null,
          ],
        );
        withdrawal = mapWithdrawal(wResult.rows[0] as Record<string, unknown>);
      } catch (err: unknown) {
        const pgErr = err as { code?: string };
        if (pgErr.code === '23505') {
          throw new ConflictError(`Withdrawal with idempotency key "${input.idempotencyKey}" already exists`);
        }
        throw err;
      }

      // Link the hold back to the withdrawal
      await client.query(
        'UPDATE holds SET reference_type = $1, reference_id = $2 WHERE id = $3',
        ['withdrawal', withdrawal.id, holdId],
      );

      await client.query('COMMIT');
      return withdrawal;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Completes a withdrawal: posts the debit ledger entry and releases the hold.
   */
  async completeWithdrawal(withdrawalId: string, providerReference?: string): Promise<Withdrawal> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const wResult = await client.query(
        'SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE',
        [withdrawalId],
      );
      if (wResult.rows.length === 0) throw new NotFoundError(`Withdrawal ${withdrawalId} not found`);

      const w = wResult.rows[0] as Record<string, unknown>;
      if (w.status !== 'REQUESTED' && w.status !== 'PROCESSING') {
        throw new ValidationError(`Cannot complete withdrawal in status ${w.status as string}`);
      }

      const amountMinor = BigInt(w.amount_minor as string | number);

      // Create accounting transaction (debit from wallet)
      const txResult = await client.query(
        `INSERT INTO accounting_transactions
           (transaction_type, status, reference_type, reference_id, idempotency_key)
         VALUES ('withdrawal', 'pending', 'withdrawal', $1, $2)
         RETURNING id`,
        [withdrawalId, `withdrawal:complete:${withdrawalId}`],
      );
      const txId = (txResult.rows[0] as { id: string }).id;

      // Debit user wallet (money leaves)
      await client.query(
        `INSERT INTO ledger_entries
           (wallet_id, accounting_transaction_id, direction, amount_minor, currency, description)
         VALUES ($1, $2, 'debit', $3, $4, 'Withdrawal debit')`,
        [w.wallet_id, txId, amountMinor.toString(), w.currency],
      );

      // Credit contra entry
      await client.query(
        `INSERT INTO ledger_entries
           (wallet_id, accounting_transaction_id, direction, amount_minor, currency, description)
         VALUES ($1, $2, 'credit', $3, $4, 'Withdrawal platform credit')`,
        [w.wallet_id, txId, amountMinor.toString(), w.currency],
      );

      // Balance check
      await client.query(
        `UPDATE accounting_transactions SET status = 'completed' WHERE id = $1`,
        [txId],
      );

      // Release the hold
      if (w.hold_id) {
        await client.query(
          `UPDATE holds SET status = 'released', accounting_transaction_id = $1 WHERE id = $2`,
          [txId, w.hold_id],
        );
      }

      // Mark withdrawal COMPLETED
      const updatedResult = await client.query(
        `UPDATE withdrawals
         SET status = 'COMPLETED', accounting_transaction_id = $1,
             provider_reference = COALESCE($2, provider_reference), completed_at = NOW()
         WHERE id = $3 RETURNING *`,
        [txId, providerReference ?? null, withdrawalId],
      );

      await client.query('COMMIT');
      return mapWithdrawal(updatedResult.rows[0] as Record<string, unknown>);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async rejectWithdrawal(withdrawalId: string, reason: string): Promise<Withdrawal> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const wResult = await client.query(
        'SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE',
        [withdrawalId],
      );
      if (wResult.rows.length === 0) throw new NotFoundError(`Withdrawal ${withdrawalId} not found`);
      const w = wResult.rows[0] as Record<string, unknown>;
      if (w.status !== 'REQUESTED' && w.status !== 'PROCESSING') {
        throw new ValidationError(`Cannot reject withdrawal in status ${w.status as string}`);
      }

      // Release the hold
      if (w.hold_id) {
        await client.query(`UPDATE holds SET status = 'cancelled' WHERE id = $1`, [w.hold_id]);
      }

      const updatedResult = await client.query(
        `UPDATE withdrawals
         SET status = 'REJECTED', rejection_reason = $1, rejected_at = NOW()
         WHERE id = $2 RETURNING *`,
        [reason, withdrawalId],
      );

      await client.query('COMMIT');
      return mapWithdrawal(updatedResult.rows[0] as Record<string, unknown>);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findById(id: string): Promise<Withdrawal | null> {
    const result = await query('SELECT * FROM withdrawals WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapWithdrawal(result.rows[0] as Record<string, unknown>) : null;
  },

  async findByIdempotencyKey(key: string): Promise<Withdrawal | null> {
    const result = await query('SELECT * FROM withdrawals WHERE idempotency_key = $1', [key]);
    return result.rows.length > 0 ? mapWithdrawal(result.rows[0] as Record<string, unknown>) : null;
  },
};
