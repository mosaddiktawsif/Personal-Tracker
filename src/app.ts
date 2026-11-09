import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { describeDbTarget, explainDbError } from './db';

export type AppDeps = {
  pool: Pool;
  databaseUrl: string;
};

type DbCheckRow = {
  now: Date;
  migrationCount: number;
  skeletonVersion: string;
};

/**
 * Build the HTTP app without starting it.
 *
 * Keeping "build" separate from "listen" is what lets the tests start the real
 * server on a random port instead of mocking it — the test exercises the same
 * code path a browser does.
 */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : { level: process.env.LOG_LEVEL ?? 'info' },
    // Trust nothing by default; this project has no reverse proxy in front yet.
    trustProxy: false,
  });

  app.get('/', async () => ({
    name: 'backend-week1',
    routes: ['GET /health', 'GET /db/check'],
    next: 'See README.md — build your domain schema (Week 1), then real endpoints (Week 2).',
  }));

  // ---------------------------------------------------------------------------
  // Liveness. Must answer without touching the database: if this needs Postgres,
  // a DB outage looks identical to a dead process.
  // ---------------------------------------------------------------------------
  app.get('/health', async () => ({
    status: 'ok',
    uptime: Number(process.uptime().toFixed(3)),
    timestamp: new Date().toISOString(),
  }));

  // ---------------------------------------------------------------------------
  // Readiness. Proves the pool, the migrations and a real table query all work
  // end to end. Keeping it separate from /health is the point: a passing /health
  // must never hide a broken database.
  // ---------------------------------------------------------------------------
  app.get('/db/check', async (_request, reply) => {
    const target = describeDbTarget(deps.databaseUrl);

    try {
      const { rows } = await deps.pool.query<DbCheckRow>(
        `SELECT
           now() AS now,
           (SELECT count(*) FROM schema_migrations)::int AS "migrationCount",
           (SELECT value FROM app_meta WHERE key = 'skeleton_version') AS "skeletonVersion"`,
      );

      const row = rows[0];
      if (row === undefined) {
        reply.code(503);
        return { status: 'error', error: `Query against ${target} returned no rows.` };
      }

      return {
        status: 'ok',
        serverTime: row.now.toISOString(),
        migrations: row.migrationCount,
        skeletonVersion: row.skeletonVersion,
      };
    } catch (error) {
      // 503, not 500: the app is fine, a dependency is not.
      reply.code(503);
      return { status: 'error', error: explainDbError(error, deps.databaseUrl) };
    }
  });

  // Unknown routes should still answer with JSON, not an HTML error page.
  app.setNotFoundHandler(async (request, reply) => {
    reply.code(404);
    return {
      status: 'error',
      error: `No route for ${request.method} ${request.url}`,
    };
  });

  await app.ready();
  return app;
}
