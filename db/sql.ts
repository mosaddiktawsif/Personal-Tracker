import { readFile } from 'node:fs/promises';
import { loadConfig } from '../src/config';
import { createPool, explainDbError } from '../src/db';

/**
 * Run one SQL statement and print the result.
 *
 * This exists because Week 1 asks you to measure queries with EXPLAIN ANALYZE,
 * and until now the project had no way to run SQL at all without installing a
 * separate database client. It is a thin wrapper over the same pool the app uses.
 *
 *   npm run db:sql -- "SELECT * FROM app_meta"
 *   npm run db:sql -- "EXPLAIN ANALYZE SELECT ..."
 *   npm run db:sql -- --file db/queries/001-slow.sql
 *
 * Note the `--`: without it npm eats the flags instead of passing them through.
 */

const MAX_COLUMN_WIDTH = 40;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function clip(text: string): string {
  return text.length > MAX_COLUMN_WIDTH ? `${text.slice(0, MAX_COLUMN_WIDTH - 1)}…` : text;
}

async function readSql(): Promise<string> {
  const args = process.argv.slice(2);

  const fileFlag = args.indexOf('--file');
  if (fileFlag !== -1) {
    const filePath = args[fileFlag + 1];
    if (filePath === undefined) {
      throw new Error('--file needs a path: npm run db:sql -- --file query.sql');
    }
    return readFile(filePath, 'utf8');
  }

  const inline = args.join(' ').trim();
  if (inline === '') {
    throw new Error(
      'No SQL given.\n\n' +
        'Usage:\n' +
        '  npm run db:sql -- "SELECT * FROM app_meta"\n' +
        '  npm run db:sql -- "EXPLAIN ANALYZE SELECT ..."\n' +
        '  npm run db:sql -- --file query.sql',
    );
  }
  return inline;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const sql = await readSql();
  const pool = createPool(config.databaseUrl);

  try {
    const result = await pool.query(sql);

    if (result.fields.length === 0) {
      console.log(`${result.command} — ${result.rowCount ?? 0} row(s) affected`);
      return;
    }

    const headers = result.fields.map((field) => field.name);
    const cells = result.rows.map((row) => {
      const record = row as Record<string, unknown>;
      return headers.map((header) => clip(formatValue(record[header])));
    });

    const widths = headers.map((header, index) =>
      Math.max(clip(header).length, ...cells.map((row) => (row[index] ?? '').length)),
    );

    const formatRow = (values: string[]): string =>
      values.map((value, index) => value.padEnd(widths[index] ?? 0)).join(' | ');

    console.log(formatRow(headers.map(clip)));
    console.log(widths.map((width) => '-'.repeat(width)).join('-+-'));
    for (const row of cells) console.log(formatRow(row));
    console.log(`\n(${cells.length} row${cells.length === 1 ? '' : 's'})`);
  } catch (error) {
    console.error(explainDbError(error, config.databaseUrl));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('[db:sql] unexpected failure:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
