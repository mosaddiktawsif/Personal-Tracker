import dotenv from 'dotenv';

// Load .env before anything reads process.env.
//
// `override` locally so the file is authoritative: editing PORT in .env and
// seeing nothing change is the most confusing failure mode there is. In
// production there is no .env file, so the platform's injected PORT wins.
dotenv.config({ override: process.env.NODE_ENV !== 'production' });

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  logLevel: string;
};

/** Read a variable that has no safe default, and fail with an actionable message. */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}.\n` +
        `Fix: copy the example file and fill it in:\n` +
        `  cp .env.example .env`,
    );
  }
  return value;
}

function readPort(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const port = Number(raw);
  // 0 is legitimate: it means "let the OS pick a free port", which is what the
  // test suite uses so tests never collide with a running dev server.
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(
      `Environment variable ${name} must be 0 (OS-assigned) or a port between 1 and 65535, got "${raw}".`,
    );
  }
  return port;
}

/**
 * Load and validate configuration once, at startup.
 *
 * Everything is read here rather than sprinkled through the codebase so a
 * misconfiguration fails immediately and in one place, instead of halfway
 * through a request.
 */
export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    host: process.env.HOST ?? '127.0.0.1',
    port: readPort('PORT', 3000),
    databaseUrl: required('DATABASE_URL'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  };
}
