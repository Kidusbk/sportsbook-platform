/**
 * Unit tests for userService.lockAccount parameter correctness.
 *
 * These tests verify the SQL parameter ordering bug fix:
 * Previously $1 was used for BOTH durationMinutes AND WHERE id,
 * meaning the WHERE clause resolved to the integer duration (e.g. 30)
 * instead of the UUID userId. Fixed: duration=$1, userId=$2.
 *
 * These tests mock the database query so they run without a live DB.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to intercept the query call before importing the service.
// Use vi.mock with a factory to capture the spy.
const mockQuery = vi.fn();

vi.mock('../../src/db/pool.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

// Import after mock is set up
const { userService } = await import('../../src/services/user.service.js');

describe('userService.lockAccount', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call query with duration as $1 and userId as $2', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const durationMinutes = 30;

    await userService.lockAccount(userId, durationMinutes);

    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];

    // SQL must reference $2 in the WHERE clause
    expect(sql).toContain('WHERE id = $2');
    // SQL must reference $1 for the interval
    expect(sql).toContain("INTERVAL '1 minute' * $1");

    // First param is the duration
    expect(params[0]).toBe(durationMinutes);
    // Second param is the userId
    expect(params[1]).toBe(userId);
  });

  it('should NOT use the same parameter for both duration and WHERE id', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    const durationMinutes = 30;

    await userService.lockAccount(userId, durationMinutes);

    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];

    // The bug was: WHERE id = $1 (which resolves to 30, not the UUID)
    // Verify that the WHERE clause does NOT use $1
    expect(sql).not.toMatch(/WHERE id\s*=\s*\$1/);

    // Verify second parameter is the UUID, not an integer
    expect(typeof params[1]).toBe('string');
    expect(params[1]).toBe(userId);
  });

  it('should pass exactly two parameters', async () => {
    await userService.lockAccount('some-uuid', 15);
    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toHaveLength(2);
  });

  it('should set the correct duration value', async () => {
    await userService.lockAccount('some-uuid', 60);
    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBe(60);
  });
});
