import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function getClient() {
  const client = new pg.Client({
    host: config.db.host, port: config.db.port, database: config.db.name,
    user: config.db.user, password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  return client;
}

async function ensureMigrationsTable(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
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
    await ensureMigrationsTable(client);
    if (direction === 'up') {
      const applied = await client.query('SELECT name FROM _migrations ORDER BY id');
      const appliedNames = new Set(applied.rows.map((r: { name: string }) => r.name));
      const pending = getMigrationFiles('up').filter((m) => !appliedNames.has(m.name));
      if (pending.length === 0) { console.log('No pending migrations.'); return; } // eslint-disable-line no-console
      for (const migration of pending) {
        const sql = fs.readFileSync(migration.path, 'utf-8');
        console.log(`Applying migration: ${migration.name}`); // eslint-disable-line no-console
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration.name]);
          await client.query('COMMIT');
        } catch (err) { await client.query('ROLLBACK'); throw err; }
      }
      console.log(`Applied ${pending.length} migration(s).`); // eslint-disable-line no-console
    } else {
      const result = await client.query('SELECT name FROM _migrations ORDER BY id DESC LIMIT 1');
      if (result.rows.length === 0) { console.log('No migrations to rollback.'); return; } // eslint-disable-line no-console
      const lastMigration = result.rows[0] as { name: string };
      const downFile = getMigrationFiles('down').find((m) => m.name === lastMigration.name);
      if (!downFile) { console.error(`No down migration found for ${lastMigration.name}`); process.exit(1); } // eslint-disable-line no-console
      const sql = fs.readFileSync(downFile.path, 'utf-8');
      console.log(`Rolling back: ${lastMigration.name}`); // eslint-disable-line no-console
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('DELETE FROM _migrations WHERE name = $1', [lastMigration.name]);
        await client.query('COMMIT');
      } catch (err) { await client.query('ROLLBACK'); throw err; }
    }
  } finally { await client.end(); }
}

const direction = process.argv[2] === 'down' ? 'down' : 'up';
migrate(direction).catch((err) => { console.error('Migration failed:', err); process.exit(1); }); // eslint-disable-line no-console
