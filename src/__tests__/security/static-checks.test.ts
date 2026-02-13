import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC_DIR = join(__dirname, '../../..');

/**
 * Recursively collect files from a directory matching given extensions.
 * Skips node_modules, .output, .wxt, and __tests__ directories.
 */
function collectFiles(dir: string, extensions: string[], opts?: { includeTests?: boolean }): string[] {
  const results: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (entry === 'node_modules' || entry === '.output' || entry === '.wxt') continue;
      if (!opts?.includeTests && entry === '__tests__') continue;
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (extensions.includes(extname(full)) && !full.match(/\.(test|spec)\.[^.]+$/)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

function readAllSourceFiles(): Array<{ path: string; content: string }> {
  return collectFiles(join(SRC_DIR, 'src'), ['.ts', '.svelte']).map((p) => ({
    path: p,
    content: readFileSync(p, 'utf8'),
  }));
}

describe('security static checks', () => {
  const sourceFiles = readAllSourceFiles();
  const svelteFiles = sourceFiles.filter((f) => f.path.endsWith('.svelte'));

  it('no eval() or new Function() in source files', () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      // Match eval( but not .defaultEval or similar
      if (/\beval\s*\(/.test(file.content) || /\bnew\s+Function\s*\(/.test(file.content)) {
        violations.push(file.path);
      }
    }
    expect(violations, `eval/new Function found in: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('no setTimeout/setInterval with string arguments', () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      if (/setTimeout\s*\(\s*["'`]/.test(file.content) || /setInterval\s*\(\s*["'`]/.test(file.content)) {
        violations.push(file.path);
      }
    }
    expect(violations, `string setTimeout/setInterval found in: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('no localStorage or sessionStorage usage (use wxt/storage)', () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      if (/\blocalStorage\b/.test(file.content) || /\bsessionStorage\b/.test(file.content)) {
        violations.push(file.path);
      }
    }
    expect(violations, `localStorage/sessionStorage found in: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('no .innerHTML assignment', () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      if (/\.innerHTML\s*=/.test(file.content)) {
        violations.push(file.path);
      }
    }
    expect(violations, `.innerHTML assignment found in: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('no insertAdjacentHTML usage', () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      if (/insertAdjacentHTML/.test(file.content)) {
        violations.push(file.path);
      }
    }
    expect(violations, `insertAdjacentHTML found in: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('no document.write usage', () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      if (/document\.write\s*\(/.test(file.content)) {
        violations.push(file.path);
      }
    }
    expect(violations, `document.write found in: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('no {@html} in Svelte templates', () => {
    const violations: string[] = [];
    for (const file of svelteFiles) {
      if (/\{@html\b/.test(file.content)) {
        violations.push(file.path);
      }
    }
    expect(violations, `{@html} found in: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('content script does not specify world: MAIN', () => {
    const contentScript = sourceFiles.find((f) => f.path.includes('entrypoints/content.ts'));
    expect(contentScript, 'content.ts not found').toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(contentScript!.content).not.toMatch(/world\s*:\s*['"]MAIN['"]/);
  });

  it('content script has no window.postMessage or CustomEvent', () => {
    const contentScript = sourceFiles.find((f) => f.path.includes('entrypoints/content.ts'));
    expect(contentScript, 'content.ts not found').toBeDefined();
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    expect(contentScript!.content).not.toMatch(/window\.postMessage/);
    expect(contentScript!.content).not.toMatch(/new\s+CustomEvent/);
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  });

  it('no apiKey appears in console.log calls', () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      if (/console\.log\s*\([^)]*apiKey/.test(file.content)) {
        violations.push(file.path);
      }
    }
    expect(violations, `apiKey in console.log found in: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('no externally_connectable in wxt.config.ts', () => {
    const configPath = join(SRC_DIR, 'wxt.config.ts');
    const content = readFileSync(configPath, 'utf8');
    expect(content).not.toMatch(/externally_connectable/);
  });

  it('no web_accessible_resources in wxt.config.ts', () => {
    const configPath = join(SRC_DIR, 'wxt.config.ts');
    const content = readFileSync(configPath, 'utf8');
    expect(content).not.toMatch(/web_accessible_resources/);
  });

  it('all target="_blank" links include rel="noopener"', () => {
    const violations: string[] = [];
    for (const file of svelteFiles) {
      // Find all target="_blank" occurrences and check they have rel="noopener"
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/target\s*=\s*["']_blank["']/.test(lines[i] ?? '')) {
          // Check surrounding context (the tag may span multiple lines)
          const context = lines.slice(Math.max(0, i - 2), i + 3).join('\n');
          if (!/rel\s*=\s*["'][^"]*noopener/.test(context)) {
            violations.push(`${file.path}:${i + 1}`);
          }
        }
      }
    }
    expect(violations, `target="_blank" without rel="noopener" at: ${violations.join(', ')}`).toHaveLength(0);
  });
});
