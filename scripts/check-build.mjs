#!/usr/bin/env node

/**
 * Post-build verification script for the ctscrape browser extension.
 * Checks build output for source maps, bundle size, and manifest validity.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const BUILD_DIR = '.output/chrome-mv3';
const MAX_TOTAL_SIZE = 2 * 1024 * 1024; // 2MB
const WARN_FILE_SIZE = 512 * 1024; // 512KB

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

let failures = 0;
let warnings = 0;

function fail(msg) {
  console.error(red(`  FAIL: ${msg}`));
  failures++;
}

function warn(msg) {
  console.warn(yellow(`  WARN: ${msg}`));
  warnings++;
}

function pass(msg) {
  console.log(green(`  PASS: ${msg}`));
}

async function walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function checkNoSourceMaps(files) {
  console.log(bold('\n--- Source Maps ---'));

  const mapFiles = files.filter((f) => f.endsWith('.map'));
  if (mapFiles.length > 0) {
    for (const f of mapFiles) {
      fail(`.map file found: ${relative(BUILD_DIR, f)}`);
    }
  } else {
    pass('No .map files in build output');
  }

  const jsFiles = files.filter((f) => f.endsWith('.js'));
  let foundSourceMappingURL = false;
  for (const f of jsFiles) {
    const content = await readFile(f, 'utf-8');
    if (content.includes('sourceMappingURL')) {
      fail(`sourceMappingURL comment found in ${relative(BUILD_DIR, f)}`);
      foundSourceMappingURL = true;
    }
  }
  if (!foundSourceMappingURL) {
    pass('No sourceMappingURL comments in JS files');
  }
}

async function checkBundleSize(files) {
  console.log(bold('\n--- Bundle Size ---'));

  let totalSize = 0;
  for (const f of files) {
    const s = await stat(f);
    totalSize += s.size;
    if (s.size > WARN_FILE_SIZE) {
      warn(
        `${relative(BUILD_DIR, f)} is ${(s.size / 1024).toFixed(1)}KB (> 512KB)`,
      );
    }
  }

  const totalKB = (totalSize / 1024).toFixed(1);
  if (totalSize > MAX_TOTAL_SIZE) {
    fail(`Total bundle size ${totalKB}KB exceeds 2MB budget`);
  } else {
    pass(`Total bundle size: ${totalKB}KB (budget: 2048KB)`);
  }
}

async function checkManifest() {
  console.log(bold('\n--- Manifest ---'));

  let manifest;
  try {
    const raw = await readFile(join(BUILD_DIR, 'manifest.json'), 'utf-8');
    manifest = JSON.parse(raw);
  } catch {
    fail('Could not read or parse manifest.json');
    return;
  }

  // Check manifest_version
  if (manifest.manifest_version === 3) {
    pass('manifest_version is 3');
  } else {
    fail(`manifest_version is ${manifest.manifest_version}, expected 3`);
  }

  // Check version is valid (must be 1-4 dot-separated integers)
  const versionPattern = /^\d+(\.\d+){0,3}$/;
  if (manifest.version && versionPattern.test(manifest.version)) {
    pass(`Version "${manifest.version}" is valid`);
  } else {
    fail(`Version "${manifest.version}" is invalid`);
  }

  // Check CSP for unsafe directives
  const csp = manifest.content_security_policy;
  if (csp) {
    const policyStr =
      typeof csp === 'string'
        ? csp
        : typeof csp === 'object'
          ? Object.values(csp).join(' ')
          : '';
    if (policyStr.includes('unsafe-eval')) {
      fail('CSP contains unsafe-eval');
    } else if (policyStr.includes('unsafe-inline')) {
      // Only check script-src for unsafe-inline
      const scriptSrcMatch = policyStr.match(
        /script-src[^;]*/,
      );
      if (scriptSrcMatch && scriptSrcMatch[0].includes('unsafe-inline')) {
        fail('CSP script-src contains unsafe-inline');
      } else {
        pass('CSP has no unsafe directives in script-src');
      }
    } else {
      pass('CSP has no unsafe directives');
    }
  } else {
    pass('No custom CSP (using MV3 defaults)');
  }
}

async function main() {
  console.log(bold('=== ctscrape build verification ==='));

  let files;
  try {
    files = await walkDir(BUILD_DIR);
  } catch {
    console.error(red(`\nBuild output not found at ${BUILD_DIR}`));
    console.error(red('Run "pnpm build" first.'));
    process.exit(1);
  }

  await checkNoSourceMaps(files);
  await checkBundleSize(files);
  await checkManifest();

  console.log(bold('\n--- Summary ---'));
  if (failures > 0) {
    console.error(red(`  ${failures} failure(s), ${warnings} warning(s)`));
    process.exit(1);
  } else {
    console.log(
      green(`  All checks passed${warnings > 0 ? ` (${warnings} warning(s))` : ''}`),
    );
    process.exit(0);
  }
}

main();
