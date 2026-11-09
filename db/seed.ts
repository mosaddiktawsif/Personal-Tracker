import type { PoolClient } from 'pg';
import { loadConfig } from '../src/config';
import { createPool, describeDbTarget, explainDbError } from '../src/db';

/**
 * Your seed script — the Week 1 deliverable that makes EXPLAIN meaningful.
 *
 * The registry below is empty on purpose. Seeding is the part where you find out
 * whether your constraints are actually right: which columns can be null, what
 * combinations are illegal, whether that UNIQUE index means what you think.
 * Copying a seeder skips exactly that.
 *
 * Run it with:   npm run db:seed
 * More rows:     npm run db:seed -- --rows=50000
 *
 * Each seeder runs inside its own transaction, so a failure rolls that table
 * back and leaves the rest of the database alone.
 */

const INFRA_TABLES = ['schema_migrations', 'app_meta'];
const DEFAULT_ROWS = 10_000;

type Seeder = (conn: PoolClient, rows: number) => Promise<number>;

/**
 * Register one seeder per domain table, keyed by table name.
 *
 * The shape, once you have a table called `bookings`:
 *
 *   bookings: async (conn, rows) => {
 *     const result = await conn.query(
 *       `INSERT INTO bookings (resource_id, starts_at, ends_at)
 *        SELECT 1 + (g % 20),
 *               now() + (g || ' minutes')::interval,
 *               now() + (g || ' minutes')::interval + interval '30 minutes'
 *          FROM generate_series(1, $1) AS g`,
 *       [rows],
 *     );
 *     return result.rowCount ?? 0;
 *   },
 *
 * Rules of thumb that save you time:
 *   - generate_series beats a loop: one statement, no round trips.
 *   - Insert parents before children (FKs), or seed in dependency order.
 *   - Make the data violate nothing, but keep it realistic: uneven distribution
 *     is what makes an index look worth having.
 */
const seeders: Record<string, Seeder> = {};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function readRowsArg(): number {
  const flag = process.argv.find((arg) => arg.startsWith('--rows='));
  if (flag === undefined) return DEFAULT_ROWS;

  const raw = flag.slice('--rows='.length);
  const rows = Number(raw);
  if (!Number.isInteger(rows) || rows < 1) {
    throw new Error(`--rows must be a positive whole number, got "${raw}"`);
  }
  return rows;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const target = describeDbTarget(config.databaseUrl);
  const rows = readRowsArg();
  const pool = createPool(config.databaseUrl);

  let conn: PoolClient;
  try {
    conn = await pool.connect();
    await conn.query('SELECT 1');
  } catch (error) {
    console.error('\n[seed] cannot reach the database.\n');
    console.error(explainDbError(error, config.databaseUrl));
    await pool.end();
    process.exitCode = 1;
    return;
  }

  try {
    console.log(`[seed] target: ${target}, ${rows} row(s) per seeder`);

    const tablesResult = await conn.query<{ table_name: string }>(
      `SELECT c.relname AS table_name
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname <> ALL($1::text[])
        ORDER BY c.relname`,
      [INFRA_TABLES],
    );
    const tables = tablesResult.rows.map((row) => row.table_name);

    if (tables.length === 0) {
      console.log('\n[seed] no domain tables yet — nothing to seed. That is expected on day one.');
      console.log('\n       1. rename db/migrations/002_domain_schema.sql.todo to .sql and write your schema');
      console.log('       2. npm run db:migrate');
      console.log('       3. add a seeder per table in db/seed.ts, then run this again');
      console.log('\n       You are not blocked: everything else below still works.\n');
      return;
    }

    const known = new Set(tables);
    for (const name of Object.keys(seeders)) {
      if (!known.has(name)) {
        console.warn(
          `[seed] warning: a seeder is registered for "${name}" but no such table exists.`,
        );
      }
    }

    let ran = 0;
    for (const table of tables) {
      const seeder = seeders[table];
      if (seeder === undefined) {
        console.log(`[seed] TODO  ${table} — no seeder registered in db/seed.ts`);
        continue;
      }

      try {
        await conn.query('BEGIN');
        const inserted = await seeder(conn, rows);
        await conn.query('COMMIT');
        console.log(`[seed] ok    ${table} — ${inserted} row(s)`);
        ran += 1;
      } catch (error) {
        await conn.query('ROLLBACK');
        console.error(`\n[seed] FAILED while seeding ${table} — rolled back, no partial rows.`);
        console.error(explainDbError(error, config.databaseUrl));
        console.error('\nFix the seeder in db/seed.ts and run again.');
        process.exitCode = 1;
        return;
      }
    }

    console.log('\n[seed] current row counts:');
    for (const table of tables) {
      const counted = await conn.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.${quoteIdent(table)}`,
      );
      console.log(`       ${table.padEnd(28)} ${counted.rows[0]?.n ?? 0}`);
    }

    console.log(
      `\n[seed] done — ${ran} seeder(s) ran, ${tables.length - ran} table(s) still without one`,
    );
    if (ran < tables.length) {
      console.log('[seed] seed every table before trusting an EXPLAIN measurement.');
    }
    console.log('[seed] next: npm run check:week1\n');
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] unexpected failure:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
