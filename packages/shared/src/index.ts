// Constants
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const PAGINATION_DEFAULT_PAGE = 1;
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;
export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_DURATION_MINUTES = 30;
export const REQUEST_BODY_LIMIT = '1mb';

export const HttpStatus = {
  OK: 200, CREATED: 201, NO_CONTENT: 204, BAD_REQUEST: 400, UNAUTHORIZED: 401,
  FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429, INTERNAL_SERVER_ERROR: 500, SERVICE_UNAVAILABLE: 503,
} as const;

// Errors
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, string[]>;
  constructor(message: string, statusCode: number, code: string, details?: Record<string, string[]>, isOperational = true) {
    super(message);
    this.statusCode = statusCode; this.code = code; this.isOperational = isOperational; this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) { super(message, 400, 'VALIDATION_ERROR', details); }
}
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') { super(message, 401, 'AUTHENTICATION_ERROR'); }
}
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') { super(message, 403, 'AUTHORIZATION_ERROR'); }
}
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) { super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, 404, 'NOT_FOUND'); }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409, 'CONFLICT'); }
}
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') { super(message, 429, 'RATE_LIMIT_EXCEEDED'); }
}
