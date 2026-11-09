import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readJson, startTestServer, type TestServer } from './helpers';

type DbCheckBody = {
  status: string;
  serverTime: string;
  migrations: number;
  skeletonVersion: string;
};

/**
 * This file is the one that proves the database wiring is real.
 *
 * /health passing tells you nothing about Postgres — that is exactly why the
 * readiness endpoint and this test exist separately.
 *
 * If this fails, read the error: it comes from src/db.ts and names the fix.
 * The usual two are "Postgres is not running" and "database not migrated".
 */
describe('GET /db/check', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    // beforeAll may have failed; don't mask the real error with a TypeError.
    if (server) await server.close();
  });

  it('returns 200 with live data read from Postgres', async () => {
    const response = await fetch(`${server.url}/db/check`);
    expect(response.status).toBe(200);

    const body = await readJson<DbCheckBody>(response, 'GET /db/check');

    // Values that could only come from the database, not from memory.
    expect(typeof body.migrations).toBe('number');
    expect(body.migrations).toBeGreaterThanOrEqual(1);
    expect(body.skeletonVersion).toBe('1');

    const serverTime = Date.parse(body.serverTime);
    expect(Number.isNaN(serverTime)).toBe(false);

    const drift = Math.abs(Date.now() - serverTime);
    expect(drift).toBeLessThan(5 * 60 * 1000);
  });

  it('runs a parameterised query against a real table', async () => {
    // Guards the pattern Week 2 depends on: values travel as parameters, never
    // as string concatenation. The payload below is deliberately hostile.
    const hostile = "1'; DROP TABLE app_meta; --";

    const { rows } = await server.pool.query<{ value: string | null }>(
      'SELECT value FROM app_meta WHERE key = $1',
      [hostile],
    );

    expect(rows).toHaveLength(0);

    const stillThere = await server.pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM app_meta WHERE key = 'skeleton_version'",
    );
    expect(stillThere.rows[0]?.count).toBe(1);
  });
});
