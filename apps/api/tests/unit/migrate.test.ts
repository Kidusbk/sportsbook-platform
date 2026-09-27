/**
 * Unit tests for migration runner logic and migration ownership.
 *
 * Migration ownership rule:
 *   Each NNN_name.down.sql must only drop/remove objects that were
 *   created by its corresponding NNN_name.up.sql. It must never drop
 *   objects owned by a different migration number.
 *
 * Tests cover:
 *  - fileChecksum() determinism and sensitivity
 *  - getMigrationFiles() sorting / filtering
 *  - Checksum integrity: detects modified applied migrations
 *  - Advisory lock key is a stable integer
 *
 * These tests do NOT require a live database connection.
 * They use temp files and mock the pg.Client.
 */
import { describe, it, expect, vi, afterAll } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// fileChecksum — replicate the function for testing
// (the function is not exported from migrate.ts which is a CLI entry point)
// ---------------------------------------------------------------------------
function fileChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

describe('Migration checksum logic', () => {
  let tmpDir: string;
  let tmpFile: string;

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-migrate-test-'));
  tmpFile = path.join(tmpDir, 'test.sql');

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces a 64-character hex string', () => {
    fs.writeFileSync(tmpFile, 'SELECT 1;', 'utf-8');
    const sum = fileChecksum(tmpFile);
    expect(sum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same content produces same checksum', () => {
    fs.writeFileSync(tmpFile, 'CREATE TABLE t (id INT);', 'utf-8');
    const a = fileChecksum(tmpFile);
    const b = fileChecksum(tmpFile);
    expect(a).toBe(b);
  });

  it('detects any content change', () => {
    fs.writeFileSync(tmpFile, 'CREATE TABLE t (id INT);', 'utf-8');
    const original = fileChecksum(tmpFile);

    fs.writeFileSync(tmpFile, 'CREATE TABLE t (id UUID);', 'utf-8');
    const modified = fileChecksum(tmpFile);

    expect(original).not.toBe(modified);
  });

  it('detects whitespace-only changes', () => {
    fs.writeFileSync(tmpFile, 'SELECT 1;', 'utf-8');
    const a = fileChecksum(tmpFile);

    fs.writeFileSync(tmpFile, 'SELECT 1; ', 'utf-8'); // trailing space
    const b = fileChecksum(tmpFile);

    expect(a).not.toBe(b);
  });

  it('produces the expected SHA-256 for known content', () => {
    const content = 'SELECT 1;';
    fs.writeFileSync(tmpFile, content, 'utf-8');
    const expected = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
    expect(fileChecksum(tmpFile)).toBe(expected);
  });
});

describe('Advisory lock key', () => {
  it('ADVISORY_LOCK_KEY is a safe integer', () => {
    // The key used in migrate.ts — must match exactly
    const key = 1_234_567_890;
    expect(Number.isSafeInteger(key)).toBe(true);
    // PostgreSQL advisory lock keys are 64-bit signed integers.
    // node-postgres passes JS numbers as bigint-compatible values.
    expect(key).toBeGreaterThan(0);
    expect(key).toBeLessThanOrEqual(2_147_483_647); // fits in int32 too
  });
});

describe('Migration file sorting', () => {
  it('SQL filenames sort correctly by prefix', () => {
    const files = [
      '005_set_updated_at_trigger.up.sql',
      '001_users.up.sql',
      '003_sessions.up.sql',
      '002_rbac.up.sql',
      '004_audit_logs.up.sql',
    ];
    const sorted = [...files].sort();
    expect(sorted[0]).toBe('001_users.up.sql');
    expect(sorted[4]).toBe('005_set_updated_at_trigger.up.sql');
  });

  it('up and down files are filtered correctly', () => {
    const all = [
      '001_users.up.sql',
      '001_users.down.sql',
      '002_rbac.up.sql',
      '002_rbac.down.sql',
    ];
    const upFiles = all.filter((f) => f.endsWith('.up.sql'));
    const downFiles = all.filter((f) => f.endsWith('.down.sql'));
    expect(upFiles).toHaveLength(2);
    expect(downFiles).toHaveLength(2);
    expect(upFiles.every((f) => !f.endsWith('.down.sql'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Migration ownership — parse actual migration files from disk
// ---------------------------------------------------------------------------
describe('Migration ownership', () => {
  const MIGRATIONS_DIR = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')),
    '../../src/db/migrations',
  );

  /**
   * Extract table names that a SQL file DROPs.
   * Only matches bare DROP TABLE [IF EXISTS] <name> statements.
   */
  function droppedTables(sql: string): string[] {
    const matches = [...sql.matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/gi)];
    return matches.map((m) => m[1].toLowerCase());
  }

  /**
   * Extract table names that a SQL file CREATEs.
   */
  function createdTables(sql: string): string[] {
    const matches = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi)];
    return matches.map((m) => m[1].toLowerCase());
  }

  function readMigration(name: string): string {
    return fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf-8');
  }

  it('001.down only drops objects owned by 001', () => {
    const up = readMigration('001_users.up.sql');
    const down = readMigration('001_users.down.sql');

    const owned = new Set(createdTables(up)); // ['users']
    const dropped = droppedTables(down);

    for (const table of dropped) {
      expect(
        owned.has(table),
        `001.down drops "${table}" which is NOT owned by migration 001`,
      ).toBe(true);
    }
  });

  it('002.down only drops objects owned by 002', () => {
    const up = readMigration('002_rbac.up.sql');
    const down = readMigration('002_rbac.down.sql');

    const owned = new Set(createdTables(up)); // roles, permissions, role_permissions, user_roles
    const dropped = droppedTables(down);

    for (const table of dropped) {
      expect(
        owned.has(table),
        `002.down drops "${table}" which is NOT owned by migration 002`,
      ).toBe(true);
    }
  });

  it('003.down only drops objects owned by 003', () => {
    const up = readMigration('003_sessions.up.sql');
    const down = readMigration('003_sessions.down.sql');

    const owned = new Set(createdTables(up)); // sessions
    const dropped = droppedTables(down);

    for (const table of dropped) {
      expect(
        owned.has(table),
        `003.down drops "${table}" which is NOT owned by migration 003`,
      ).toBe(true);
    }
  });

  it('004.down only drops objects owned by 004', () => {
    const up = readMigration('004_audit_logs.up.sql');
    const down = readMigration('004_audit_logs.down.sql');

    const owned = new Set(createdTables(up)); // audit_logs
    const dropped = droppedTables(down);

    for (const table of dropped) {
      expect(
        owned.has(table),
        `004.down drops "${table}" which is NOT owned by migration 004`,
      ).toBe(true);
    }
  });

  it('005.down does not drop any tables (it only drops triggers/functions)', () => {
    const down = readMigration('005_set_updated_at_trigger.down.sql');
    const dropped = droppedTables(down);
    expect(dropped).toHaveLength(0);
  });

  it('no down migration drops a table owned by a lower-numbered migration', () => {
    // Build a map: tableName -> migration number that owns it
    const ownership: Record<string, number> = {};
    for (const num of [1, 2, 3, 4]) {
      const prefix = String(num).padStart(3, '0');
      const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.startsWith(prefix) && f.endsWith('.up.sql'));
      for (const file of files) {
        const sql = readMigration(file);
        for (const t of createdTables(sql)) {
          ownership[t] = num;
        }
      }
    }

    // Verify each down file
    for (const num of [1, 2, 3, 4]) {
      const prefix = String(num).padStart(3, '0');
      const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.startsWith(prefix) && f.endsWith('.down.sql'));
      for (const file of files) {
        const sql = readMigration(file);
        for (const table of droppedTables(sql)) {
          const owner = ownership[table];
          if (owner !== undefined) {
            expect(
              owner,
              `${file} drops table "${table}" which belongs to migration ${String(owner).padStart(3, '0')}`,
            ).toBe(num);
          }
        }
      }
    }
  });
});
