#!/usr/bin/env node
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Source hygiene gate.
 *
 * The console.log / TODO / file-size checks used to live as inline
 * `grep`/`find` one-liners in `.github/workflows/code-quality.yml`. All three
 * scanned `packages/` — a directory this repository has never had — and all
 * three carried `continue-on-error: true`, so they reported success without
 * ever reading a single file of ours. The control-byte scan was added later,
 * from #686.
 *
 * They now scan the real source tree and FAIL the build, which is only
 * defensible because the tree is already clean on every count. Running
 * this locally is the same command CI runs:
 *
 *   node scripts/check-source-hygiene.mjs
 *
 * Scope note: `src/` is declarative CRM metadata plus the hook/flow handler
 * bodies that the runtime executes. Diagnostics there belong on `ctx.logger`,
 * which is why `console.log` is banned. `scripts/` is deliberately NOT scanned
 * for `console.log` — those files are CLIs whose entire job is stdout.
 *
 * The checks do not all read the same tree, and that is deliberate — see
 * `SCANNED` and `TEXT_SCANNED` below. Three checks judge code; the byte-level
 * one judges first-party text wherever it lives (#818).
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

/**
 * Every control character except tab (0x09), LF (0x0a) and CR (0x0d).
 *
 * A NUL-only check would not be enough: 0x01 and friends make grep reach the
 * same verdict, and a gate that scans for one byte gives false confidence about
 * the whole class.
 */
const CONTROL_BYTE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;

/**
 * Byte-level scan for control characters in first-party source (#686).
 *
 * One raw control byte makes grep/ripgrep classify the ENTIRE file as binary:
 * `grep -rn` prints `binary file matches` instead of line hits, and the `-l` /
 * `-c` forms most sweeps use report nothing at all. The file silently drops out
 * of every text search — so the defect hides itself, and every later sweep over
 * the repo reads clean while skipping that file. `test/seed-consistency.test.ts`
 * carried a raw NUL as a key separator for months for exactly this reason; the
 * separator was fine, its spelling was not.
 *
 * Scans every file under the widest surface this script reads — `SCANNED` plus
 * `TEXT_SCANNED` — and not just `.ts`: the hazard is about the bytes on disk,
 * not the language, so it follows first-party text rather than code. Those
 * directories hold text only; a binary fixture arriving there should fail
 * loudly and be an explicit decision, not something a silent skip-list absorbs.
 *
 * Read as `latin1` so each byte maps 1:1 to a code point. utf8 decoding folds
 * an invalid byte into U+FFFD, which sits outside the control range and would
 * be missed by a scan that is supposed to be byte-level.
 *
 * @returns {{file: string, line: number, text: string}[]}
 */
function scanControlBytes(files) {
  const hits = [];
  for (const file of files) {
    const lines = readFileSync(join(ROOT, file), 'latin1').split('\n');
    lines.forEach((text, i) => {
      const at = text.search(CONTROL_BYTE);
      if (at === -1) return;
      const hex = text.charCodeAt(at).toString(16).padStart(2, '0');
      hits.push({ file, line: i + 1, text: `control byte 0x${hex} at column ${at + 1}` });
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

// The code directories these checks are guarding. A typo here (or a directory
// that gets renamed out from under us) must be loud, not silently vacuous —
// that is the exact failure mode this script exists to fix.
const SCANNED = ['src', 'test', 'e2e', 'scripts'];

/**
 * First-party text trees read by the control-byte check, and ONLY by it (#818).
 *
 * `content/` (the product docs, three locales) and `.changeset/` (a file every
 * PR must add) are pure text and among the most grep-ed trees in the repo, yet
 * they sat outside every check: #807 touched four files and this gate saw one
 * of them. The hazard the byte scan guards is about the bytes on disk, so its
 * surface is "first-party text", not "code".
 *
 * The other three checks stay on `SCANNED`. That split is measured, not
 * assumed — as of this change, over `content/` + `.changeset/`:
 *
 *   - `console.log` is already `src/`-only, and docs legitimately print it:
 *     `content/docs/marketplace/publishing-your-first-app*.mdx` instruct the
 *     reader to run `node -e "console.log(...)"` (3 occurrences). Widening
 *     that check here would be wrong, not merely noisy.
 *   - `TODO`/`FIXME` filters to `.ts`, and these two trees hold none of it
 *     (201 `.mdx` + 137 `.md` + 40 `.json`, zero `.ts`). Widening would guard
 *     nothing while reading, to the next maintainer, as if prose were covered.
 *   - the 100KB cap would newly constrain documentation pages. Nothing is over
 *     it today (largest: 15KB, `content/docs/administration/
 *     sharing-and-security.zh-Hant.mdx`), but its remedy — "split the file" —
 *     is a review argument about modules that does not transfer to prose, and
 *     whether docs want a size ceiling belongs to #814, not to a silent
 *     side effect of this one.
 *
 * Both trees are text-only today (no file outside `.mdx` / `.md` / `.json`;
 * doc screenshots live in `assets/screenshots/` and are referenced by URL). A
 * binary arriving here should fail loudly and be an explicit decision — the
 * same rule the code trees already live under.
 */
const TEXT_SCANNED = ['content', '.changeset'];

/** Every directory this script reads, in either surface. */
const ALL_SCANNED = [...SCANNED, ...TEXT_SCANNED];
const missing = ALL_SCANNED.filter((d) => {
  try {
    return !statSync(join(ROOT, d)).isDirectory();
  } catch {
    return true;
  }
});
if (missing.length) {
  console.error(`✗ source hygiene: scanned director(y|ies) missing: ${missing.join(', ')}`);
  console.error('  Update SCANNED / TEXT_SCANNED in scripts/check-source-hygiene.mjs —');
  console.error('  a check that scans nothing is worse than no check at all.');
  process.exit(1);
}

const codeFiles = SCANNED.flatMap(walk);
const textFiles = TEXT_SCANNED.flatMap(walk);
const allTs = codeFiles.filter(isTs);
const srcTs = allTs.filter((f) => f.startsWith('src/'));

console.log(
  `Source hygiene — ${codeFiles.length} files under ${SCANNED.join(', ')}; ` +
    `the control-byte scan adds ${textFiles.length} under ${TEXT_SCANNED.join(', ')}\n`,
);

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
  'no raw control bytes in first-party files',
  scanControlBytes([...codeFiles, ...textFiles]),
  'write the character as an escape sequence (\\u0000 for NUL) — byte-identical at runtime, and it keeps the file findable by grep',
);

check(
  `no source file over ${MAX_FILE_BYTES / 1024}KB`,
  codeFiles
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
