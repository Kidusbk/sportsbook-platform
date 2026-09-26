import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AuthenticationError, AuthorizationError } from '@sportsbook/shared';
import type { TokenPayload } from '@sportsbook/types';

declare global {
  namespace Express {
    interface Request { user?: TokenPayload; }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token required');
    }
    const token = authHeader.substring(7);
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      next(new AuthenticationError('Invalid or expired access token'));
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AuthenticationError());
    const userRoles = req.user.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));
    if (!hasRole) return next(new AuthorizationError('Insufficient role'));
    next();
  };
}
