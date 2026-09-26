import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { TokenPayload } from '@sportsbook/types';

interface TokenInput { userId: string; email: string; roles: string[]; }

export function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 900; // default 15 min
  const value = parseInt(match[1]!, 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}

export function generateAccessToken(input: TokenInput): string {
  return jwt.sign(
    { sub: input.userId, email: input.email, roles: input.roles, type: 'access' },
    config.auth.accessSecret,
    { expiresIn: config.auth.accessExpiry },
  );
}

export function generateRefreshToken(input: TokenInput): string {
  return jwt.sign(
    { sub: input.userId, email: input.email, roles: input.roles, type: 'refresh' },
    config.auth.refreshSecret,
    { expiresIn: config.auth.refreshExpiry },
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.auth.accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.auth.refreshSecret) as TokenPayload;
}
