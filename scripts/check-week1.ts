import type { PoolClient } from 'pg';
import { loadConfig } from '../src/config';
import { createPool, describeDbTarget, explainDbError } from '../src/db';

/**
 * Week 1 self-check.
 *
 * Inspects the live database and grades it against the Week 1 checklist in
 * ROADMAP.md. It never creates or changes anything — it only reads catalogs.
 *
 * It exists because "am I done with Week 1?" should be a fact, not a feeling.
 * Run it after every migration:  npm run check:week1
 */

const INFRA_TABLES = ['schema_migrations', 'app_meta'];
const MIN_TABLES = 6;
const SEED_TARGET = 1000;

type Status = 'PASS' | 'FAIL' | 'WARN';

type Check = {
  label: string;
  status: Status;
  detail: string;
};

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function print(checks: Check[]): void {
  for (const check of checks) {
    console.log(`  [${check.status}] ${check.label}`);
    if (check.detail !== '') {
      for (const line of check.detail.split('\n')) {
        console.log(`         ${line}`);
      }
    }
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const target = describeDbTarget(config.databaseUrl);
  const pool = createPool(config.databaseUrl);

  let conn: PoolClient;
  try {
    conn = await pool.connect();
    await conn.query('SELECT 1');
  } catch (error) {
    console.error(`\nCannot reach the database at ${target}.\n`);
    console.error(explainDbError(error, config.databaseUrl));
    await pool.end();
    process.exitCode = 1;
    return;
  }

  try {
    // --- migration ledger -------------------------------------------------
    const ledger = await conn.query<{ present: boolean }>(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present",
    );
    const hasLedger = ledger.rows[0]?.present === true;

    let migrationCount = 0;
    if (hasLedger) {
      const counted = await conn.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM schema_migrations',
      );
      migrationCount = counted.rows[0]?.n ?? 0;
    }

    // --- domain tables (infrastructure excluded) ---------------------------
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

    // --- columns ----------------------------------------------------------
    const columnsResult = await conn.query<ColumnRow>(
      `SELECT table_name, column_name, data_type, udt_name, is_nullable
         FROM information_schema.columns
        WHERE table_schema = 'public'`,
    );
    const columns = columnsResult.rows.filter((row) => tables.includes(row.table_name));

    // --- constraints ------------------------------------------------------
    const constraintsResult = await conn.query<{ contype: string; n: number }>(
      `SELECT c.contype, count(*)::int AS n
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relkind = 'r'
          AND t.relname <> ALL($1::text[])
        GROUP BY c.contype`,
      [INFRA_TABLES],
    );
    const constraintCounts = new Map(
      constraintsResult.rows.map((row) => [row.contype, row.n] as const),
    );

    const fkColumnsResult = await conn.query<{ table_name: string; column_name: string }>(
      `SELECT t.relname AS table_name, a.attname AS column_name
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         JOIN unnest(c.conkey) AS k(attnum) ON true
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
        WHERE c.contype = 'f'
          AND n.nspname = 'public'
          AND t.relname <> ALL($1::text[])`,
      [INFRA_TABLES],
    );
    const fkColumns = new Set(
      fkColumnsResult.rows.map((row) => `${row.table_name}.${row.column_name}`),
    );

    // --- row counts -------------------------------------------------------
    const rowCounts: { table: string; rows: number }[] = [];
    for (const table of tables) {
      const counted = await conn.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.${quoteIdent(table)}`,
      );
      rowCounts.push({ table, rows: counted.rows[0]?.n ?? 0 });
    }
    const largest = [...rowCounts].sort((a, b) => b.rows - a.rows);

    const checks: Check[] = [];

    // 1. migrations applied
    checks.push(
      hasLedger && migrationCount > 0
        ? {
            label: 'Migrations applied',
            status: 'PASS',
            detail: `${migrationCount} migration(s) recorded in schema_migrations`,
          }
        : {
            label: 'Migrations applied',
            status: 'FAIL',
            detail: hasLedger
              ? 'schema_migrations exists but is empty — run: npm run db:migrate'
              : 'No schema_migrations table — run: npm run db:migrate',
          },
    );

    // 2. enough tables
    const tableCheck: Check =
      tables.length >= MIN_TABLES
        ? {
            label: 'Domain modeled',
            status: 'PASS',
            detail: `${tables.length} tables: ${tables.join(', ')}`,
          }
        : tables.length === 0
          ? {
              label: 'Domain modeled',
              status: 'FAIL',
              detail:
                'No domain tables yet.\n' +
                'Rename db/migrations/002_domain_schema.sql.todo to .sql, write 6-10 tables,\n' +
                'then run: npm run db:migrate',
            }
          : {
              label: 'Domain modeled',
              status: 'FAIL',
              detail:
                `${tables.length} table(s), need at least ${MIN_TABLES}: ${tables.join(', ')}\n` +
                'A realistic domain has more than one noun in it.',
            };
    checks.push(tableCheck);

    // 3. every table has a primary key
    if (tables.length === 0) {
      checks.push({
        label: 'Primary keys',
        status: 'FAIL',
        detail: 'No tables to check yet.',
      });
    } else {
      const pkCount = constraintCounts.get('p') ?? 0;
      checks.push(
        pkCount >= tables.length
          ? { label: 'Primary keys', status: 'PASS', detail: `All ${tables.length} tables have one` }
          : {
              label: 'Primary keys',
              status: 'FAIL',
              detail: `${pkCount} of ${tables.length} tables have a primary key\nEvery table needs one: it is the row identity your FKs point at.`,
            },
      );
    }

    // 4. no floating-point columns
    if (tables.length === 0) {
      checks.push({ label: 'No float columns', status: 'FAIL', detail: 'No tables to check yet.' });
    } else {
      const floats = columns.filter(
        (column) => column.data_type === 'real' || column.data_type === 'double precision',
      );
      checks.push(
        floats.length === 0
          ? { label: 'No float columns', status: 'PASS', detail: 'Nothing stored as float/real' }
          : {
              label: 'No float columns',
              status: 'FAIL',
              detail:
                floats.map((column) => `${column.table_name}.${column.column_name} (${column.data_type})`).join('\n') +
                '\nFloats cannot represent 0.10 exactly. Use integer cents, or numeric(12,2).',
            },
      );
    }

    // 5. timestamps with time zone
    if (tables.length === 0) {
      checks.push({ label: 'timestamptz, not timestamp', status: 'FAIL', detail: 'No tables to check yet.' });
    } else {
      const naive = columns.filter((column) => column.data_type === 'timestamp without time zone');
      checks.push(
        naive.length === 0
          ? { label: 'timestamptz, not timestamp', status: 'PASS', detail: 'All timestamps carry a zone' }
          : {
              label: 'timestamptz, not timestamp',
              status: 'FAIL',
              detail:
                naive.map((column) => `${column.table_name}.${column.column_name}`).join('\n') +
                '\n`timestamp` silently drops the offset. Use `timestamptz`.',
            },
      );
    }

    // 6. _id columns are real foreign keys
    if (tables.length === 0) {
      checks.push({ label: 'Foreign keys', status: 'FAIL', detail: 'No tables to check yet.' });
    } else {
      const orphans = columns
        .filter((column) => column.column_name.endsWith('_id') && column.table_name !== '')
        .filter((column) => !fkColumns.has(`${column.table_name}.${column.column_name}`));
      checks.push(
        orphans.length === 0
          ? {
              label: 'Foreign keys',
              status: 'PASS',
              detail: `${(constraintCounts.get('f') ?? 0)} foreign key(s), every *_id column covered`,
            }
          : {
              label: 'Foreign keys',
              status: 'WARN',
              detail:
                orphans.map((column) => `${column.table_name}.${column.column_name}`).join('\n') +
                '\nThese look like references but have no FK constraint. Add one,\n' +
                'or rename them if they point outside this database.',
            },
      );
    }

    // 7. uniqueness enforced somewhere beyond the primary key
    if (tables.length === 0) {
      checks.push({ label: 'Unique constraints', status: 'FAIL', detail: 'No tables to check yet.' });
    } else {
      const uniqueCount = constraintCounts.get('u') ?? 0;
      checks.push(
        uniqueCount > 0
          ? { label: 'Unique constraints', status: 'PASS', detail: `${uniqueCount} unique constraint(s)` }
          : {
              label: 'Unique constraints',
              status: 'FAIL',
              detail:
                'No UNIQUE constraint. What must never be duplicated in your domain?\n' +
                'Emails, slugs, booking slots for the same resource at the same time.',
            },
      );
    }

    // 8. business rules expressed as CHECK constraints
    if (tables.length === 0) {
      checks.push({ label: 'CHECK constraints', status: 'FAIL', detail: 'No tables to check yet.' });
    } else {
      const checkCount = constraintCounts.get('c') ?? 0;
      checks.push(
        checkCount > 0
          ? { label: 'CHECK constraints', status: 'PASS', detail: `${checkCount} CHECK constraint(s)` }
          : {
              label: 'CHECK constraints',
              status: 'FAIL',
              detail:
                'No CHECK constraint. Encode what your app assumes:\n' +
                'CHECK (ends_at > starts_at), CHECK (quantity > 0), CHECK (status IN (...)).',
            },
      );
    }

    // 9. enough data to measure an index
    if (tables.length === 0) {
      checks.push({ label: 'Seed data', status: 'WARN', detail: 'No tables to seed yet.' });
    } else {
      const biggest = largest[0];
      checks.push(
        biggest !== undefined && biggest.rows >= SEED_TARGET
          ? {
              label: 'Seed data',
              status: 'PASS',
              detail: `${biggest.table} has ${biggest.rows} rows — enough for EXPLAIN to mean something`,
            }
          : {
              label: 'Seed data',
              status: 'WARN',
              detail:
                `Largest table has ${biggest?.rows ?? 0} rows; aim for ${SEED_TARGET}+ before trusting EXPLAIN.\n` +
                'A sequential scan on 20 rows always looks fast. That teaches you nothing.',
            },
      );
    }

    // --- report -----------------------------------------------------------
    console.log(`\nWeek 1 self-check — ${target}\n`);
    print(checks);

    const failed = checks.filter((check) => check.status === 'FAIL').length;
    const warned = checks.filter((check) => check.status === 'WARN').length;
    const passed = checks.filter((check) => check.status === 'PASS').length;

    console.log(`\n  ${passed}/${checks.length} passed, ${failed} failed, ${warned} warning(s)`);

    if (failed === 0 && warned === 0) {
      console.log('\n  Week 1 checklist complete. Before moving on, write queries.md with your');
      console.log('  top 5 queries and their EXPLAIN output before/after indexing.\n');
    } else if (failed > 0) {
      console.log('\n  Week 1 is not done yet — that is expected on day one. Work top to bottom:');
      console.log('  the first failure is usually the one blocking the rest.\n');
    } else {
      console.log('\n  No failures, but read the warnings before calling it done.\n');
    }

    process.exitCode = failed === 0 ? 0 : 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('[check:week1] unexpected failure:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
