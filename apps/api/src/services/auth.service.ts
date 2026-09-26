import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, parseExpiryToSeconds } from '../utils/jwt.js';
import { userService } from './user.service.js';
import { auditService } from './audit.service.js';
import { ConflictError, AuthenticationError } from '@sportsbook/shared';
import { AuditAction } from '@sportsbook/types';
import { config } from '../config/index.js';

interface RegisterInput { email: string; username: string; password: string; firstName?: string; lastName?: string; dateOfBirth?: string; }
interface AuthContext { ipAddress?: string; userAgent?: string; requestId?: string; }

export const authService = {
  async register(input: RegisterInput, ctx: AuthContext) {
    const existingEmail = await userService.findByEmail(input.email);
    if (existingEmail) throw new ConflictError('Email already registered');
    const existingUsername = await userService.findByUsername(input.username);
    if (existingUsername) throw new ConflictError('Username already taken');

    const passwordHash = await hashPassword(input.password);
    const result = await query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [input.email.toLowerCase(), input.username, passwordHash, input.firstName ?? null, input.lastName ?? null, input.dateOfBirth ?? null],
    );
    const user = result.rows[0] as Record<string, unknown>;

    // Assign default USER role
    await query(
      "INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = 'USER'",
      [user.id],
    );

    const roles = ['USER'];
    const tokens = await this.createSession(user.id as string, user.email as string, roles, ctx);

    await auditService.log({
      actorId: user.id as string, actorType: 'user', action: AuditAction.USER_REGISTERED,
      targetType: 'user', targetId: user.id as string,
      requestId: ctx.requestId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, success: true,
    });

    return { user: userService.mapUser(user), tokens };
  },

  async login(email: string, password: string, ctx: AuthContext) {
    const user = await userService.findByEmail(email.toLowerCase());
    if (!user) {
      await auditService.log({ actorType: 'system', action: AuditAction.USER_LOGIN_FAILED, requestId: ctx.requestId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, success: false, failureReason: 'User not found', metadata: { email } });
      throw new AuthenticationError('Invalid email or password');
    }

    // Check lockout
    if (user.locked_until && new Date(user.locked_until as string) > new Date()) {
      throw new AuthenticationError('Account is temporarily locked. Please try again later.');
    }

    const isValid = await verifyPassword(password, user.password_hash as string);
    if (!isValid) {
      const attempts = await userService.incrementFailedLogins(user.id as string);
      if (attempts >= 5) {
        await userService.lockAccount(user.id as string, 30);
        await auditService.log({ actorId: user.id as string, actorType: 'system', action: AuditAction.USER_ACCOUNT_LOCKED, targetType: 'user', targetId: user.id as string, requestId: ctx.requestId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, success: true, metadata: { attempts } });
      }
      await auditService.log({ actorId: user.id as string, actorType: 'user', action: AuditAction.USER_LOGIN_FAILED, requestId: ctx.requestId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, success: false, failureReason: 'Invalid password' });
      throw new AuthenticationError('Invalid email or password');
    }

    await userService.resetFailedLogins(user.id as string);
    const roles = await userService.getUserRoles(user.id as string);
    const tokens = await this.createSession(user.id as string, user.email as string, roles, ctx);

    await auditService.log({ actorId: user.id as string, actorType: 'user', action: AuditAction.USER_LOGIN_SUCCESS, targetType: 'user', targetId: user.id as string, requestId: ctx.requestId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, success: true });

    return { user: userService.mapUser(user), tokens };
  },

  async createSession(userId: string, email: string, roles: string[], ctx: AuthContext) {
    const accessToken = generateAccessToken({ userId, email, roles });
    const refreshToken = generateRefreshToken({ userId, email, roles });
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresIn = parseExpiryToSeconds(config.auth.refreshExpiry);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await query(
      `INSERT INTO sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at) VALUES ($1, $2, $3::inet, $4, $5)`,
      [userId, refreshTokenHash, ctx.ipAddress ?? null, ctx.userAgent ?? null, expiresAt],
    );

    return { accessToken, refreshToken, expiresIn: parseExpiryToSeconds(config.auth.accessExpiry) };
  },

  async logout(refreshToken: string, userId: string, ctx: AuthContext) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query('UPDATE sessions SET is_revoked = TRUE, revoked_at = NOW() WHERE refresh_token_hash = $1 AND user_id = $2', [hash, userId]);
    await auditService.log({ actorId: userId, actorType: 'user', action: AuditAction.USER_LOGOUT, targetType: 'user', targetId: userId, requestId: ctx.requestId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, success: true });
  },

  async refresh(refreshToken: string, ctx: AuthContext) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const result = await query('SELECT * FROM sessions WHERE refresh_token_hash = $1 AND is_revoked = FALSE AND expires_at > NOW()', [hash]);
    if (result.rows.length === 0) throw new AuthenticationError('Invalid or expired refresh token');

    const session = result.rows[0] as Record<string, unknown>;
    const userId = session.user_id as string;
    const user = await userService.findById(userId);
    if (!user) throw new AuthenticationError('User not found');

    // Revoke old session
    await query('UPDATE sessions SET is_revoked = TRUE, revoked_at = NOW() WHERE id = $1', [session.id]);

    const roles = await userService.getUserRoles(userId);
    return this.createSession(userId, user.email as string, roles, ctx);
  },
};
