import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createPool } from '../src/db';

export type TestServer = {
  app: FastifyInstance;
  pool: Pool;
  url: string;
  close: () => Promise<void>;
};

/**
 * Start the real app on an ephemeral port.
 *
 * No mocks and no fake request objects: the tests below go over a real socket so
 * a passing test means the thing a browser would hit actually works. Port 0 asks
 * the OS for a free port, so tests never collide with a `npm run dev` server.
 */
export async function startTestServer(): Promise<TestServer> {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  const app = await buildApp({ pool, databaseUrl: config.databaseUrl });

  await app.listen({ host: '127.0.0.1', port: 0 });

  const address = app.server.address();
  if (address === null || typeof address === 'string') {
    await app.close();
    await pool.end();
    throw new Error('Could not determine the port the test server is listening on.');
  }

  return {
    app,
    pool,
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
}

/** Read a JSON body and fail with the server's own explanation if it errored. */
export async function readJson<T>(response: Response, label: string): Promise<T> {
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${label} did not return JSON (status ${response.status}):\n${text}`);
  }

  if (!response.ok) {
    const error =
      typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : text;
    throw new Error(`${label} failed with status ${response.status}:\n${error}`);
  }

  return parsed as T;
}
