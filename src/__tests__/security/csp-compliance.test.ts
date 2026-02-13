/**
 * CSP compliance tests — these verify the production build output.
 * They will be skipped if `.output/chrome-mv3/` does not exist.
 * Run `pnpm build` first, then `pnpm test:run` to include these checks.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';

const BUILD_DIR = resolve(__dirname, '../../../.output/chrome-mv3');

function collectFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (extensions.includes(extname(full))) results.push(full);
    }
  }
  walk(dir);
  return results;
}

describe('CSP compliance (requires build)', () => {
  const hasBuild = existsSync(BUILD_DIR);

  it.skipIf(!hasBuild)('manifest has no unsafe-eval or unsafe-inline in CSP', () => {
    const manifest = JSON.parse(readFileSync(join(BUILD_DIR, 'manifest.json'), 'utf8'));
    const csp = JSON.stringify(manifest.content_security_policy ?? {});
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline');
  });

  it.skipIf(!hasBuild)('no source maps in production build', () => {
    const mapFiles = collectFiles(BUILD_DIR, ['.map']);
    expect(mapFiles, `Source map files found: ${mapFiles.join(', ')}`).toHaveLength(0);
  });
});
