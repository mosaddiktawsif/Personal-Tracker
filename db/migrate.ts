import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { loadConfig } from '../src/config';
import { createPool, describeDbTarget, explainDbError } from '../src/db';

/**
 * A very small forward-only migration runner.
 *
 * Why hand-rolled instead of a library: it is ~100 lines, it only uses SQL you
 * already know, and reading it tells you exactly what "applying a migration"
 * means. That is the Week 1 lesson. Swap in a real tool later if you like.
 *
 * How it works:
 *   - `db/migrations/*.sql` are applied in filename order.
 *   - Every applied filename is recorded in the `schema_migrations` table.
 *   - Each file runs inside a transaction, so a half-failing migration leaves
 *     no partial schema behind.
 *   - Files ending in `.sql.todo` are ignored — that is where you draft a schema.
 */

// Resolved from the working directory so this works both under `tsx` and from
// the compiled output in dist/.
const migrationsDir = path.join(process.cwd(), 'db', 'migrations');

async function listMigrationFiles(): Promise<{ sql: string[]; drafts: string[] }> {
  let entries: string[];
  try {
    entries = await readdir(migrationsDir);
  } catch {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const sorted = entries.sort((a, b) => a.localeCompare(b));
  return {
    sql: sorted.filter((name) => name.endsWith('.sql')),
    drafts: sorted.filter((name) => name.endsWith('.sql.todo')),
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const target = describeDbTarget(config.databaseUrl);
  const pool = createPool(config.databaseUrl);

  console.log(`[migrate] target: ${target}`);

  let conn: PoolClient;
  try {
    conn = await pool.connect();
    await conn.query('SELECT 1');
  } catch (error) {
    console.error('\n[migrate] cannot reach the database.\n');
    console.error(explainDbError(error, config.databaseUrl));
    await pool.end();
    process.exitCode = 1;
    return;
  }

  try {
    // Bootstrap the ledger itself. This is the only DDL the runner owns.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         text        PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await conn.query<{ id: string }>('SELECT id FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.id));
    const { sql: files, drafts } = await listMigrationFiles();

    if (files.length === 0) {
      console.log('[migrate] no .sql files found in db/migrations');
      return;
    }

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip    ${file}`);
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      try {
        await conn.query('BEGIN');
        await conn.query(sql);
        await conn.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
        await conn.query('COMMIT');
        console.log(`[migrate] applied ${file}`);
        count += 1;
      } catch (error) {
        await conn.query('ROLLBACK');
        console.error(`\n[migrate] FAILED while applying ${file} — rolled back.`);
        console.error(explainDbError(error, config.databaseUrl));
        console.error('\nThe database is unchanged by this file. Fix the SQL and run again.');
        process.exitCode = 1;
        return;
      }
    }

    console.log(`[migrate] done — ${count} applied, ${files.length - count} already up to date`);

    if (drafts.length > 0) {
      console.log(
        `\n[migrate] note: ${drafts.length} unfinished draft(s) ignored:\n` +
          drafts.map((name) => `           ${name}`).join('\n') +
          `\n         Write your schema, then rename .sql.todo -> .sql`,
      );
    }
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('[migrate] unexpected failure:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
