#!/usr/bin/env node
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Source hygiene gate.
 *
 * These three checks used to live as inline `grep`/`find` one-liners in
 * `.github/workflows/code-quality.yml`. All three scanned `packages/` — a
 * directory this repository has never had — and all three carried
 * `continue-on-error: true`, so they reported success without ever reading a
 * single file of ours.
 *
 * They now scan the real source tree and FAIL the build, which is only
 * defensible because the tree is already clean on all three counts. Running
 * this locally is the same command CI runs:
 *
 *   node scripts/check-source-hygiene.mjs
 *
 * Scope note: `src/` is declarative CRM metadata plus the hook/flow handler
 * bodies that the runtime executes. Diagnostics there belong on `ctx.logger`,
 * which is why `console.log` is banned. `scripts/` is deliberately NOT scanned
 * for `console.log` — those files are CLIs whose entire job is stdout.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Directories that never contain first-party source. */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.source', '.objectstack', '.git']);

/** Max byte size for a single first-party source file. */
const MAX_FILE_BYTES = 100 * 1024;

/** Recursively collect files under `dir` (repo-relative paths). */
function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(join(ROOT, dir), { withFileTypes: true });
  } catch {
    return out; // directory absent — the caller decides whether that is fatal
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

const isTs = (f) => f.endsWith('.ts') && !f.endsWith('.d.ts');

/**
 * Report every line in `files` matching `pattern`.
 * @returns {{file: string, line: number, text: string}[]}
 */
function grep(files, pattern) {
  const hits = [];
  for (const file of files) {
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (pattern.test(text)) hits.push({ file, line: i + 1, text: text.trim() });
    });
  }
  return hits;
}

const failures = [];

function check(name, hits, remedy) {
  if (hits.length === 0) {
    console.log(`  ✓ ${name}`);
    return;
  }
  console.log(`  ✗ ${name} — ${hits.length} violation(s)`);
  for (const h of hits.slice(0, 20)) {
    console.log(`      ${h.file}:${h.line}  ${h.text.slice(0, 120)}`);
  }
  if (hits.length > 20) console.log(`      … and ${hits.length - 20} more`);
  console.log(`      → ${remedy}`);
  failures.push(name);
}

// The directories these checks are guarding. A typo here (or a directory that
// gets renamed out from under us) must be loud, not silently vacuous — that is
// the exact failure mode this script exists to fix.
const SCANNED = ['src', 'test', 'e2e', 'scripts'];
const missing = SCANNED.filter((d) => {
  try {
    return !statSync(join(ROOT, d)).isDirectory();
  } catch {
    return true;
  }
});
if (missing.length) {
  console.error(`✗ source hygiene: scanned director(y|ies) missing: ${missing.join(', ')}`);
  console.error('  Update SCANNED in scripts/check-source-hygiene.mjs — a check that');
  console.error('  scans nothing is worse than no check at all.');
  process.exit(1);
}

const allFiles = SCANNED.flatMap(walk);
const allTs = allFiles.filter(isTs);
const srcTs = allTs.filter((f) => f.startsWith('src/'));

console.log(`Source hygiene — ${allFiles.length} files under ${SCANNED.join(', ')}\n`);

check(
  'no console.log in src/',
  grep(srcTs, /\bconsole\.log\b/),
  'use ctx.logger inside hook/flow handlers; src/ is runtime code, not a CLI',
);

check(
  'no TODO/FIXME markers',
  grep(allTs, /\b(TODO|FIXME)\b/),
  'file an issue and link it, or finish the work — a marker in main is invisible',
);

check(
  `no source file over ${MAX_FILE_BYTES / 1024}KB`,
  allFiles
    .filter((f) => statSync(join(ROOT, f)).size > MAX_FILE_BYTES)
    .map((f) => ({
      file: f,
      line: 0,
      text: `${(statSync(join(ROOT, f)).size / 1024).toFixed(0)}KB`,
    })),
  'split the file — oversized modules defeat review',
);

console.log('');
if (failures.length) {
  console.error(`✗ source hygiene failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('✓ source hygiene clean');
