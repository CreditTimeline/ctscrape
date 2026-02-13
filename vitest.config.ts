import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

export default defineConfig({
  // WxtVitest returns Vite 6 plugin types; cast to satisfy Vitest's Vite 7 types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [WxtVitest() as any],
  test: {
    mockReset: true,
    restoreMocks: true,
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      enabled: false,
      reportsDirectory: './coverage',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/**/fixtures/**',
        'src/types/**',
        'src/**/*.d.ts',
        'src/entrypoints/**',
        'src/lib/analytics/**',
        'src/lib/telemetry/**',
        'src/lib/pdf/**',
        'src/lib/logger/support-bundle.ts',
        'src/adapters/equifax-pdf/**',
        'src/adapters/pdf-registry.ts',
      ],
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
    },
  },
});
