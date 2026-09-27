import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Arbitrary stable lock key — must be consistent across all migration processes.
// Uses pg_advisory_lock (session-level); released automatically on disconnect.
const ADVISORY_LOCK_KEY = 1_234_567_890;

async function getClient() {
  const client = new pg.Client({
    host: config.db.host, port: config.db.port, database: config.db.name,
    user: config.db.user, password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  return client;
}

/**
 * Ensures the _migrations table exists and has the checksum column.
 * Safe to call on both fresh installs and existing installations that
 * were created before checksums were introduced.
 */
async function ensureMigrationsTable(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL       PRIMARY KEY,
      name       VARCHAR(255) NOT NULL UNIQUE,
      checksum   VARCHAR(64),
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  // Backfill existing installations that have the table but lack the column.
  await client.query(`
    ALTER TABLE _migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)
  `);
}

/** Returns the SHA-256 hex digest of the migration file content. */
function fileChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

function getMigrationFiles(direction: 'up' | 'down'): { name: string; path: string }[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(`.${direction}.sql`))
    .sort();
  return files.map((f) => ({
    name: f.replace(`.${direction}.sql`, ''),
    path: path.join(MIGRATIONS_DIR, f),
  }));
}

async function migrate(direction: 'up' | 'down') {
  const client = await getClient();
  try {
    // Acquire a session-level advisory lock — blocks if another migration is running.
    // Released automatically when this pg.Client disconnects (finally block).
    console.log('Acquiring migration advisory lock…'); // eslint-disable-line no-console
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    console.log('Advisory lock acquired.'); // eslint-disable-line no-console

    await ensureMigrationsTable(client);

    if (direction === 'up') {
      // Fetch all applied migrations with their stored checksums
      const applied = await client.query<{ name: string; checksum: string | null }>(
        'SELECT name, checksum FROM _migrations ORDER BY id',
      );

      // Verify integrity of every already-applied migration file
      for (const row of applied.rows) {
        const upFile = getMigrationFiles('up').find((m) => m.name === row.name);
        if (!upFile) continue; // file may have been intentionally removed

        const currentChecksum = fileChecksum(upFile.path);
        if (row.checksum === null) {
          // Legacy row without a checksum — backfill it now
          await client.query('UPDATE _migrations SET checksum = $1 WHERE name = $2', [
            currentChecksum, row.name,
          ]);
          console.log(`Backfilled checksum for ${row.name}`); // eslint-disable-line no-console
        } else if (row.checksum !== currentChecksum) {
          throw new Error(
            `INTEGRITY ERROR: Migration file "${row.name}" has been modified after being applied.\n` +
            `  Stored checksum : ${row.checksum}\n` +
            `  Current checksum: ${currentChecksum}\n` +
            'Do NOT edit applied migration files. Create a new migration instead.',
          );
        }
      }

      const appliedNames = new Set(applied.rows.map((r) => r.name));
      const pending = getMigrationFiles('up').filter((m) => !appliedNames.has(m.name));

      if (pending.length === 0) {
        console.log('No pending migrations.'); // eslint-disable-line no-console
        return;
      }

      for (const migration of pending) {
        const sql = fs.readFileSync(migration.path, 'utf-8');
        const checksum = fileChecksum(migration.path);
        console.log(`Applying migration: ${migration.name} (sha256: ${checksum.slice(0, 12)}…)`); // eslint-disable-line no-console
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO _migrations (name, checksum) VALUES ($1, $2)',
            [migration.name, checksum],
          );
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      console.log(`Applied ${pending.length} migration(s).`); // eslint-disable-line no-console

    } else {
      // --- DOWN ---
      const result = await client.query<{ name: string }>(
        'SELECT name FROM _migrations ORDER BY id DESC LIMIT 1',
      );
      if (result.rows.length === 0) {
        console.log('No migrations to rollback.'); // eslint-disable-line no-console
        return;
      }

      const lastMigration = result.rows[0];
      const downFile = getMigrationFiles('down').find((m) => m.name === lastMigration.name);
      if (!downFile) {
        console.error(`No down migration found for ${lastMigration.name}`); // eslint-disable-line no-console
        process.exit(1);
      }

      const sql = fs.readFileSync(downFile.path, 'utf-8');
      console.log(`Rolling back: ${lastMigration.name}`); // eslint-disable-line no-console
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('DELETE FROM _migrations WHERE name = $1', [lastMigration.name]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    // Advisory lock is released automatically on disconnect.
    await client.end();
  }
}

const direction = process.argv[2] === 'down' ? 'down' : 'up';
migrate(direction).catch((err) => {
  console.error('Migration failed:', err.message ?? err); // eslint-disable-line no-console
  process.exit(1);
});
