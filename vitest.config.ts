import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

export default defineConfig({
  // WxtVitest returns Vite 6 plugin types; cast to satisfy Vitest's Vite 7 types
  plugins: [WxtVitest() as any],
  test: {
    mockReset: true,
    restoreMocks: true,
  },
});
