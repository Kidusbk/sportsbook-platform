import { query, pool } from '../db/pool.js';
import type { Deposit, DepositStatus } from '@sportsbook/types';
import { NotFoundError, ConflictError, ValidationError } from '@sportsbook/shared';
import { walletService } from './wallet.service.js';

function mapDeposit(row: Record<string, unknown>): Deposit {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    walletId: row.wallet_id as string,
    accountingTransactionId: row.accounting_transaction_id as string | null,
    amountMinor: BigInt(row.amount_minor as string | number),
    currency: row.currency as string,
    status: row.status as DepositStatus,
    provider: row.provider as string | null,
    providerReference: row.provider_reference as string | null,
    idempotencyKey: row.idempotency_key as string,
    metadata: row.metadata as Record<string, unknown> | null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    failedAt: row.failed_at ? String(row.failed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const depositService = {
  /**
   * Initiates a deposit request in PENDING state.
   * The idempotency_key ensures the same request cannot produce two deposits.
   */
  async initiateDeposit(input: {
    userId: string;
    walletId: string;
    amountMinor: bigint;
    currency: string;
    idempotencyKey: string;
    provider?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Deposit> {
    if (input.amountMinor <= 0n) {
      throw new ValidationError('Deposit amount must be a positive value in minor currency units');
    }

    const wallet = await walletService.findById(input.walletId);
    if (!wallet) throw new NotFoundError(`Wallet ${input.walletId} not found`);
    if (wallet.userId !== input.userId) throw new ValidationError('Wallet does not belong to user');
    if (wallet.currency !== input.currency) throw new ValidationError('Currency does not match wallet currency');
    if (wallet.status !== 'active') throw new ValidationError('Wallet is not active');

    try {
      const result = await query(
        `INSERT INTO deposits
           (user_id, wallet_id, amount_minor, currency, idempotency_key, provider, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          input.userId,
          input.walletId,
          input.amountMinor.toString(),
          input.currency,
          input.idempotencyKey,
          input.provider ?? null,
          input.metadata ? JSON.stringify(input.metadata) : null,
        ],
      );
      return mapDeposit(result.rows[0] as Record<string, unknown>);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new ConflictError(`Deposit with idempotency key "${input.idempotencyKey}" already exists`);
      }
      throw err;
    }
  },

  /**
   * Completes a deposit: creates the ledger entries and marks the deposit COMPLETED.
   * Uses a database transaction for atomicity.
   *
   * Double-entry model for a deposit of £10.50 (1050 minor units):
   *   CREDIT  user wallet (money arrives in wallet)
   *   DEBIT   platform liability account (also user's wallet for a simple model)
   *
   * In a full platform ledger, the debit would go to a "customer funds" liability
   * account. For Phase 2, both sides of the entry reference the user wallet,
   * representing the two-sided nature of the transaction symbolically.
   * The architecture supports a full chart of accounts when Phase 3 is implemented.
   */
  async completeDeposit(
    depositId: string,
    providerReference?: string,
  ): Promise<Deposit> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const depResult = await client.query(
        `SELECT * FROM deposits WHERE id = $1 FOR UPDATE`,
        [depositId],
      );
      if (depResult.rows.length === 0) throw new NotFoundError(`Deposit ${depositId} not found`);

      const dep = depResult.rows[0] as Record<string, unknown>;
      if (dep.status !== 'PENDING' && dep.status !== 'PROCESSING') {
        throw new ValidationError(`Cannot complete deposit in status ${dep.status as string}`);
      }

      // Create the accounting transaction + ledger entries
      const txResult = await client.query(
        `INSERT INTO accounting_transactions
           (transaction_type, status, reference_type, reference_id, idempotency_key)
         VALUES ('deposit', 'pending', 'deposit', $1, $2)
         RETURNING id`,
        [depositId, `deposit:complete:${depositId}`],
      );
      const txId = (txResult.rows[0] as { id: string }).id;

      const amountMinor = BigInt(dep.amount_minor as string | number);

      // Credit the user's wallet (funds arrive)
      await client.query(
        `INSERT INTO ledger_entries
           (wallet_id, accounting_transaction_id, direction, amount_minor, currency, description)
         VALUES ($1, $2, 'credit', $3, $4, 'Deposit credit')`,
        [dep.wallet_id, txId, amountMinor.toString(), dep.currency],
      );

      // Corresponding debit — balances the credit (platform contra entry)
      await client.query(
        `INSERT INTO ledger_entries
           (wallet_id, accounting_transaction_id, direction, amount_minor, currency, description)
         VALUES ($1, $2, 'debit', $3, $4, 'Deposit platform debit')`,
        [dep.wallet_id, txId, amountMinor.toString(), dep.currency],
      );

      // Mark accounting_transaction completed — triggers balance check
      await client.query(
        `UPDATE accounting_transactions SET status = 'completed' WHERE id = $1`,
        [txId],
      );

      // Mark deposit COMPLETED
      const updatedResult = await client.query(
        `UPDATE deposits
         SET status = 'COMPLETED',
             accounting_transaction_id = $1,
             provider_reference = COALESCE($2, provider_reference),
             completed_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [txId, providerReference ?? null, depositId],
      );

      await client.query('COMMIT');
      return mapDeposit(updatedResult.rows[0] as Record<string, unknown>);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async failDeposit(depositId: string, reason?: string): Promise<Deposit> {
    const result = await query(
      `UPDATE deposits
       SET status = 'FAILED', failed_at = NOW(),
           metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{failure_reason}', to_jsonb($2::text))
       WHERE id = $1 AND status IN ('PENDING','PROCESSING')
       RETURNING *`,
      [depositId, reason ?? 'Provider failure'],
    );
    if (result.rows.length === 0) {
      throw new NotFoundError(`Deposit ${depositId} not found or not in a faileable state`);
    }
    return mapDeposit(result.rows[0] as Record<string, unknown>);
  },

  async findById(id: string): Promise<Deposit | null> {
    const result = await query('SELECT * FROM deposits WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapDeposit(result.rows[0] as Record<string, unknown>) : null;
  },

  async findByIdempotencyKey(key: string): Promise<Deposit | null> {
    const result = await query('SELECT * FROM deposits WHERE idempotency_key = $1', [key]);
    return result.rows.length > 0 ? mapDeposit(result.rows[0] as Record<string, unknown>) : null;
  },
};
