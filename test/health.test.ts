import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readJson, startTestServer, type TestServer } from './helpers';

type HealthBody = {
  status: string;
  uptime: number;
  timestamp: string;
};

describe('GET /health', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    // beforeAll may have failed; don't mask the real error with a TypeError.
    if (server) await server.close();
  });

  it('returns 200 with a status, uptime and timestamp', async () => {
    const response = await fetch(`${server.url}/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await readJson<HealthBody>(response, 'GET /health');

    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('does not depend on the database', async () => {
    // /health is liveness only. If this ever starts querying Postgres, a database
    // outage becomes indistinguishable from a dead process.
    const first = await fetch(`${server.url}/health`);
    expect(first.status).toBe(200);

    const second = await fetch(`${server.url}/health`);
    expect(second.status).toBe(200);
  });

  it('answers unknown routes with JSON, not an HTML error page', async () => {
    const response = await fetch(`${server.url}/definitely-not-a-route`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = (await response.json()) as { status: string; error: string };
    expect(body.status).toBe('error');
    expect(body.error).toContain('No route');
  });
});
