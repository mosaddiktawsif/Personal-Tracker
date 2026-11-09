import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Keep test output quiet and make the app skip its request logger.
    env: { NODE_ENV: 'test' },
    // One file at a time: each file boots a real server and a real connection
    // pool, and these tests talk to a shared database.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
