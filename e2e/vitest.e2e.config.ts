import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ['e2e/**/*.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
