// User types
export type UserStatus = 'active' | 'suspended' | 'closed' | 'pending_verification';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<User, 'emailVerifiedAt' | 'lastLoginAt'>;

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
}

// Auth types
export interface LoginInput { email: string; password: string; }
export interface RegisterInput { email: string; username: string; password: string; firstName?: string; lastName?: string; dateOfBirth?: string; }
export interface AuthTokens { accessToken: string; refreshToken: string; expiresIn: number; }
export interface TokenPayload { sub: string; email: string; roles: string[]; type: 'access' | 'refresh'; iat: number; exp: number; }
export interface SessionInfo { id: string; userId: string; ipAddress: string | null; userAgent: string | null; createdAt: string; expiresAt: string; }

// API types
export interface ApiResponse<T = unknown> { success: boolean; data?: T; error?: ApiError; meta?: ApiMeta; }
export interface ApiError { code: string; message: string; details?: Record<string, string[]>; }
export interface ApiMeta { requestId: string; timestamp: string; pagination?: PaginationMeta; }
export interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; }
export interface HealthResponse { status: 'healthy' | 'degraded' | 'unhealthy'; version: string; timestamp: string; uptime: number; }
export interface ReadinessResponse { status: 'ready' | 'not_ready'; checks: { database: 'ok' | 'error'; redis: 'ok' | 'error' | 'skipped'; }; timestamp: string; }

// Audit types
export interface AuditLogEntry {
  id: string; actorId: string | null; actorType: 'user' | 'system' | 'admin'; action: string;
  targetType: string | null; targetId: string | null; requestId: string | null;
  ipAddress: string | null; userAgent: string | null; metadata: Record<string, unknown> | null;
  success: boolean; failureReason: string | null; createdAt: string;
}

export interface CreateAuditLogInput {
  actorId?: string | null; actorType: 'user' | 'system' | 'admin'; action: string;
  targetType?: string; targetId?: string; requestId?: string; ipAddress?: string;
  userAgent?: string; metadata?: Record<string, unknown>; success: boolean; failureReason?: string;
}

export const AuditAction = {
  USER_REGISTERED: 'user.registered', USER_LOGIN_SUCCESS: 'user.login.success',
  USER_LOGIN_FAILED: 'user.login.failed', USER_LOGOUT: 'user.logout',
  USER_PASSWORD_CHANGED: 'user.password.changed', USER_PASSWORD_RESET_REQUESTED: 'user.password_reset.requested',
  USER_PASSWORD_RESET_COMPLETED: 'user.password_reset.completed', USER_EMAIL_VERIFIED: 'user.email.verified',
  USER_MFA_ENABLED: 'user.mfa.enabled', USER_MFA_DISABLED: 'user.mfa.disabled',
  USER_ACCOUNT_LOCKED: 'user.account.locked', USER_ACCOUNT_UNLOCKED: 'user.account.unlocked',
  USER_ROLE_ASSIGNED: 'user.role.assigned', USER_ROLE_REMOVED: 'user.role.removed',
  USER_PROFILE_UPDATED: 'user.profile.updated', USER_STATUS_CHANGED: 'user.status.changed',
  USER_SUSPENDED: 'user.suspended', USER_CLOSED: 'user.closed',
  SESSION_CREATED: 'session.created', SESSION_REVOKED: 'session.revoked', SESSION_EXPIRED: 'session.expired',
  ADMIN_ACTION: 'admin.action',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

// RBAC types
export const SystemRole = {
  USER: 'USER', SUPPORT_AGENT: 'SUPPORT_AGENT', SPORTSBOOK_ADMIN: 'SPORTSBOOK_ADMIN',
  FINANCE_ADMIN: 'FINANCE_ADMIN', KYC_ADMIN: 'KYC_ADMIN', RISK_ADMIN: 'RISK_ADMIN',
  REPORTING_USER: 'REPORTING_USER', SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
export type SystemRoleType = (typeof SystemRole)[keyof typeof SystemRole];

export interface Role { id: string; name: string; description: string | null; isSystem: boolean; createdAt: string; updatedAt: string; }
export interface Permission { id: string; name: string; description: string | null; resource: string; action: string; createdAt: string; }
export interface RoleWithPermissions extends Role { permissions: Permission[]; }

export const Resource = { USERS: 'users', ROLES: 'roles', PERMISSIONS: 'permissions', AUDIT_LOGS: 'audit_logs' } as const;
export const Action = { CREATE: 'create', READ: 'read', UPDATE: 'update', DELETE: 'delete', LIST: 'list', MANAGE: 'manage' } as const;
