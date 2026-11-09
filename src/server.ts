import { buildApp } from './app';
import { loadConfig } from './config';
import { createPool, describeDbTarget, probeDatabase } from './db';

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  const app = await buildApp({ pool, databaseUrl: config.databaseUrl });

  await app.listen({ host: config.host, port: config.port });

  const target = describeDbTarget(config.databaseUrl);
  const probe = await probeDatabase(pool, config.databaseUrl);
  if (probe.ok) {
    console.log(`[db] connected to ${target}`);
  } else {
    // Loud, but not fatal: /health still needs to answer while the DB is down.
    console.error(`\n[db] NOT CONNECTED — /db/check will return 503.\n${probe.message}\n`);
  }

  console.log(`[http] listening on http://${config.host}:${config.port}`);
  console.log(`[http] try: curl http://${config.host}:${config.port}/health`);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[app] ${signal} received, shutting down`);
    try {
      await app.close();
      await pool.end();
      process.exit(0);
    } catch (error) {
      console.error('[app] error during shutdown:', error);
      process.exit(1);
    }
  };

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void shutdown(signal);
    });
  }
}

main().catch((error: unknown) => {
  console.error('[app] failed to start:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
