import { query } from '../db/pool.js';
import type { CreateAuditLogInput } from '@sportsbook/types';

export const auditService = {
  async log(input: CreateAuditLogInput): Promise<void> {
    await query(
      `INSERT INTO audit_logs (actor_id, actor_type, action, target_type, target_id, request_id, ip_address, user_agent, metadata, success, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8, $9, $10, $11)`,
      [
        input.actorId ?? null, input.actorType, input.action,
        input.targetType ?? null, input.targetId ?? null,
        input.requestId ?? null, input.ipAddress ?? null, input.userAgent ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.success, input.failureReason ?? null,
      ],
    );
  },
};
