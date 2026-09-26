import { query } from '../db/pool.js';
import type { User } from '@sportsbook/types';

function mapUser(row: Record<string, unknown>): Omit<User, 'passwordHash'> {
  return {
    id: row.id as string, email: row.email as string, username: row.username as string,
    firstName: row.first_name as string | null, lastName: row.last_name as string | null,
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : null,
    phone: row.phone as string | null, status: row.status as User['status'],
    emailVerified: row.email_verified as boolean,
    emailVerifiedAt: row.email_verified_at ? String(row.email_verified_at) : null,
    mfaEnabled: row.mfa_enabled as boolean,
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export const userService = {
  async findByEmail(email: string) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] as Record<string, unknown> | undefined;
  },
  async findByUsername(username: string) {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] as Record<string, unknown> | undefined;
  },
  async findById(id: string) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] as Record<string, unknown> | undefined;
  },
  async getPublicProfile(id: string) {
    const row = await this.findById(id);
    return row ? mapUser(row) : null;
  },
  async getUserRoles(userId: string): Promise<string[]> {
    const result = await query(
      'SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
      [userId],
    );
    return result.rows.map((r: { name: string }) => r.name);
  },
  async incrementFailedLogins(userId: string): Promise<number> {
    const result = await query(
      'UPDATE users SET failed_login_attempts = failed_login_attempts + 1, updated_at = NOW() WHERE id = $1 RETURNING failed_login_attempts',
      [userId],
    );
    return result.rows[0]?.failed_login_attempts as number;
  },
  async lockAccount(userId: string, durationMinutes: number) {
    await query(
      "UPDATE users SET locked_until = NOW() + INTERVAL '1 minute' * $1, updated_at = NOW() WHERE id = $1",
      [durationMinutes, userId],
    );
  },
  async resetFailedLogins(userId: string) {
    await query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [userId]);
  },
  mapUser,
};
