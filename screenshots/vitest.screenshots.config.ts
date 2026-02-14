import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    include: ['screenshots/capture.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
