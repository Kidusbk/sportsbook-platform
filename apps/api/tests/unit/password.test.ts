import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';

describe('Password Utility', () => {
  it('should hash a password and produce a bcrypt hash', async () => {
    const hash = await hashPassword('TestPassword123!');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('TestPassword123!');
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });
  it('should verify a correct password', async () => {
    const hash = await hashPassword('SecurePassword456!');
    expect(await verifyPassword('SecurePassword456!', hash)).toBe(true);
  });
  it('should reject an incorrect password', async () => {
    const hash = await hashPassword('CorrectPassword');
    expect(await verifyPassword('WrongPassword', hash)).toBe(false);
  });
  it('should produce different hashes for the same password', async () => {
    const hash1 = await hashPassword('Same');
    const hash2 = await hashPassword('Same');
    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword('Same', hash1)).toBe(true);
    expect(await verifyPassword('Same', hash2)).toBe(true);
  });
});
