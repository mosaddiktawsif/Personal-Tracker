import { Pool } from 'pg';

/**
 * Human-readable database target for log and error messages.
 *
 * Built from the parsed URL on purpose: `url.hostname`/`port`/`pathname` never
 * include the password, so it is safe to print. Never log DATABASE_URL itself.
 */
export function describeDbTarget(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    const database = url.pathname.replace(/^\//, '') || '(no database name)';
    const port = url.port === '' ? '5432' : url.port;
    return `${url.hostname}:${port}/${database}`;
  } catch {
    return '(DATABASE_URL could not be parsed as a URL)';
  }
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Turn a raw driver/socket error into something a human can act on.
 *
 * "connect ECONNREFUSED ::1:5432" is technically accurate and completely
 * useless at 1am; this maps the common failure modes to the fix.
 */
export function explainDbError(error: unknown, databaseUrl: string): string {
  const target = describeDbTarget(databaseUrl);
  const code = errorCode(error);

  switch (code) {
    case 'ECONNREFUSED':
      return (
        `Postgres is not accepting connections at ${target}.\n` +
        `Is it running? Start it with:  docker compose up -d\n` +
        `Then check it is ready:        docker compose ps`
      );
    case 'ENOTFOUND':
      return (
        `The database host in DATABASE_URL could not be resolved (${target}).\n` +
        `Check the hostname — it should usually be 127.0.0.1 for local work.`
      );
    case 'ETIMEDOUT':
      return (
        `Timed out connecting to Postgres at ${target}.\n` +
        `The host is reachable in principle but did not answer in time.`
      );
    case '28P01':
      return (
        `Postgres rejected the credentials for ${target}.\n` +
        `The user/password in DATABASE_URL must match POSTGRES_USER / POSTGRES_PASSWORD in docker-compose.yml.`
      );
    case '3D000':
      return (
        `The database named in DATABASE_URL does not exist (${target}).\n` +
        `Either create it, or fix the name — docker compose creates POSTGRES_DB on first start only.`
      );
    case '42P01':
      return (
        `The database at ${target} is reachable but the expected tables are missing.\n` +
        `It has not been migrated yet. Run:  npm run db:migrate`
      );
    default:
      return (
        `Database error${code === '' ? '' : ` (${code})`} at ${target}:\n${errorMessage(error)}`
      );
  }
}

/**
 * Create the connection pool.
 *
 * Deliberately lazy: creating a pool does not open a socket, so the HTTP server
 * can boot and serve /health even when Postgres is down. Routes that need the
 * database report the failure themselves.
 */
export function createPool(databaseUrl: string): Pool {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
  });

  pool.on('error', (error) => {
    // An idle client failed (e.g. Postgres restarted). Without this handler the
    // process would crash on an unhandled 'error' event.
    console.error(`[db] idle connection error: ${errorMessage(error)}`);
  });

  return pool;
}

export type DatabaseProbe = { ok: true } | { ok: false; message: string };

/** Cheap liveness check used at startup and by /db/check. */
export async function probeDatabase(pool: Pool, databaseUrl: string): Promise<DatabaseProbe> {
  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (error) {
    return { ok: false, message: explainDbError(error, databaseUrl) };
  }
}
