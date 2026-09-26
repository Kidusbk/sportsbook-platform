import { describe, it, expect } from 'vitest';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, parseExpiryToSeconds } from '../../src/utils/jwt.js';

describe('JWT Utility', () => {
  const input = { userId: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com', roles: ['USER'] };

  describe('Access Token', () => {
    it('should generate and verify', () => {
      const token = generateAccessToken(input);
      expect(token.split('.').length).toBe(3);
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(input.userId);
      expect(payload.type).toBe('access');
    });
    it('should reject invalid tokens', () => { expect(() => verifyAccessToken('invalid')).toThrow(); });
  });

  describe('Refresh Token', () => {
    it('should generate and verify', () => {
      const token = generateRefreshToken(input);
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe(input.userId);
      expect(payload.type).toBe('refresh');
    });
    it('should not verify with access secret', () => {
      const token = generateRefreshToken(input);
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('parseExpiryToSeconds', () => {
    it('parses minutes', () => { expect(parseExpiryToSeconds('15m')).toBe(900); });
    it('parses hours', () => { expect(parseExpiryToSeconds('2h')).toBe(7200); });
    it('parses days', () => { expect(parseExpiryToSeconds('7d')).toBe(604800); });
    it('parses seconds', () => { expect(parseExpiryToSeconds('30s')).toBe(30); });
    it('defaults for invalid', () => { expect(parseExpiryToSeconds('invalid')).toBe(900); });
  });
});
