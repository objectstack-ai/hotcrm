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
 * defensible because the tree is already clean on every count. The
 * copyright-header check came last, from #1094. Running this locally is the
 * same command CI runs:
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
 * one judges first-party text wherever it lives (#818); the header check judges
 * `.ts` only, for the measured reason given at `scanHeaderPosition`.
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

/**
 * The license header, anchored to the start of its line.
 *
 * The year is `\d{4}` rather than `2025` because two files already say 2026 and
 * the year a file was written is not this check's business — its *position* is.
 * Only the `Copyright (c) <year> ObjectStack.` stem is matched, not the licence
 * sentence that follows it: policing the wording would be a different check,
 * one this repo has not measured and does not need today.
 */
const COPYRIGHT_HEADER = /^\/\/ Copyright \(c\) \d{4} ObjectStack\./;

/**
 * The same header pushed off column 1 by whitespace or a byte-order mark.
 *
 * Consulted only when no properly anchored header exists, and deliberately
 * narrow — leading whitespace and nothing else — so that a file merely
 * *mentioning* the header inside a string (this gate's own tests do) is never
 * mistaken for a file that has one. It exists so the message can name the real
 * case instead of reporting a header that is plainly there as missing.
 *
 * `\s` covers the byte-order mark without spelling it: U+FEFF is whitespace in
 * ECMAScript. Written as an escape wherever it must be named at all — a raw BOM
 * in a source file renders as nothing and is unfindable by grep in either
 * spelling, which is the same argument the control-byte scan above makes.
 */
const INDENTED_COPYRIGHT_HEADER = /^\s+\/\/ Copyright \(c\) \d{4} ObjectStack\./;

/**
 * The copyright header must be the first line of every `.ts` file (#1094).
 *
 * The drift did not accrete a typo at a time — it arrived in one batch. All
 * eleven affected files took their displaced import from a single commit,
 * `01da4a8e` (836 files, 2026-08-06), which prepended an `import` line above the
 * header mechanically. Nothing caught it: typecheck, lint and this gate were all
 * green, so it sat in `main` for five days.
 *
 * It then cost two issues and two PRs to clean up by hand. #1091 noticed three
 * of the eleven and fixed those; the sweep it prompted found the other eight
 * within the hour, which became #1094 — a second card, a second review, a second
 * PR, for one commit's worth of drift. Hand-fixing instance twelve buys nothing,
 * because the next bulk edit will land the same way. A gate turns that whole
 * sequence into a red build on the commit that introduces it.
 *
 * So this check is the deliverable, and #1094's eight fixes are what made it
 * green.
 *
 * **What "correct" means here**, and why:
 *
 *   - **The header is line 1.** A licence header that is not the first thing in
 *     the file is not doing its job for any reader or tool that looks at the top
 *     of a file.
 *   - **A shebang may precede it, and nothing else may.** `#!` is the one
 *     construct whose position is load-bearing — the kernel requires it at byte
 *     0. `/* eslint-disable *\/`, `'use strict'` and JSDoc banners all behave
 *     identically one line lower, so none of them earns a place above the
 *     header. (No `.ts` file in this repo has a shebang today; the two `.mjs`
 *     gates in `scripts/` do, and they carry the header on line 2, which is the
 *     shape this allows.)
 *   - **A missing header is an error, not out of scope.** Measured before
 *     writing this: all 282 `.ts` files under the scanned trees carry the
 *     header, 274 of them on line 1. So requiring presence costs zero collateral
 *     fixes — and without it the check would police the symptom while leaving
 *     the invariant open, since deleting the header would be a way to satisfy a
 *     position-only rule.
 *
 * **Why `.ts` only** (`allTs`, the same predicate the marker check uses, so
 * `.d.ts` is excluded exactly as #1094's own reproduce loop excluded it): the
 * header is universal in `.ts` and is *not* in the rest of the scanned trees —
 * 3 of the 5 `.mjs` files under `scripts/`, the `.sh` script and the four
 * `src/docs/*.md` pages have none. Widening the surface would therefore either
 * demand a header in files this card cannot touch, or force the weaker
 * position-only rule on everyone to accommodate them. Filed separately instead.
 *
 * There is no skip-list and no path list — a new `.ts` file with its header in
 * the wrong place goes red, which is the entire point. Generated output is
 * already outside the walk (`dist`, `.source`, `.objectstack` are in
 * `SKIP_DIRS`), and no generated `.ts` lives in the scanned trees, so no
 * exemption is invented for a case that does not exist.
 *
 * @returns {{file: string, line: number, text: string}[]}
 */
function scanHeaderPosition(files) {
  const hits = [];
  for (const file of files) {
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
    const preamble = lines[0]?.startsWith('#!') ? 1 : 0;
    const want = preamble + 1; // the 1-based line the header must occupy
    const at = lines.findIndex((line) => COPYRIGHT_HEADER.test(line));

    if (at === want - 1) continue;

    if (at !== -1) {
      const displaced = lines[preamble].trim();
      hits.push({
        file,
        line: at + 1,
        text: `header on line ${at + 1}, must be line ${want} — move it back above \`${displaced}\``,
      });
      continue;
    }

    const indented = lines.findIndex((line) => INDENTED_COPYRIGHT_HEADER.test(line));
    if (indented !== -1) {
      hits.push({
        file,
        line: indented + 1,
        text: 'header does not start at column 1 — strip the leading whitespace or byte-order mark',
      });
      continue;
    }

    hits.push({
      file,
      line: want,
      text:
        `no copyright header — add \`// Copyright (c) ${new Date().getFullYear()} ` +
        `ObjectStack. Licensed under the Apache-2.0 license.\` as line ${want}`,
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
 *     it today — the largest is 15KB:
 *     `content/docs/administration/sharing-and-security.zh-Hant.mdx` — but its
 *     remedy, "split the file", is a review argument about modules that does
 *     not transfer to prose, and whether docs want a size ceiling belongs to
 *     #814, not to a silent side effect of this one.
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

check(
  'copyright header at the top of every .ts file',
  scanHeaderPosition(allTs),
  'the header is line 1 (line 2 when a shebang comes first) — move it back up, do not delete it or add a second one; #1091 and #1094 were this same drift twice',
);

console.log('');
if (failures.length) {
  console.error(`✗ source hygiene failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('✓ source hygiene clean');
