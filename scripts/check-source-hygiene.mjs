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
 * `SCANNED`, `TEXT_SCANNED` and `ROOT_TEXT_FILES` below. Three checks judge
 * code; the byte-level one judges first-party text wherever it lives (#818,
 * widened again in #838); the header check judges `.ts` only, for the measured
 * reason given at `scanHeaderPosition`. The two `.ts` checks read first-party
 * TypeScript wherever it lives too — the `SCANNED` trees plus the root `.ts`
 * files named in `ROOT_TEXT_FILES` (#1236).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Directories that never contain first-party source. */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.source', '.objectstack', '.git']);

/** Max byte size for a single first-party source file. */
const MAX_FILE_BYTES = 100 * 1024;

/**
 * Where the size ADVISORY starts, as a fraction of the cap above (#1287).
 *
 * ⛔ This is not a second cap and it is not a lever on the first one. It only
 * decides when a file gets *named* on an otherwise green run; `MAX_FILE_BYTES`
 * is the only thing that can fail this check, and lowering or raising this
 * fraction cannot make an oversized file pass.
 *
 * **Why an advisory exists at all.** The cap is silent at 99% and red at 101%,
 * so the signal always arrived as a failed run on somebody else's change. It
 * had done so three times when this was written — `test/metadata-references.ts`
 * with 817 B of headroom left (#814), `src/data/index.ts` with ~1.5 KB (#635),
 * `test/docs-drift.test.ts` with 2,654 B (#1196, which forced #1187 to re-home
 * its rule mid-implementation). Every one of those is under a *median* commit's
 * worth of growth, i.e. no lead time at all.
 *
 * **Why 70%, measured on `main` @ `7250a1f0` (333 files under `SCANNED`).**
 * Two independent numbers bound the choice, and neither is the 90% the card
 * that asked for this suggested:
 *
 *   - **A band must be wider than one commit, or a file jumps it whole.**
 *     Growth of an already-existing code file in a single commit, over the 53
 *     commits of available history: p50 1,004 B · p90 6,715 B · p95 8,640 B ·
 *     p99 13,703 B · max 13,927 B. A 90% threshold is a 10,240 B band —
 *     *narrower than the largest single commit observed* — so a file can cross
 *     it entirely between two runs and never be named. That reproduces the
 *     silent-then-red failure this check exists to end, 10 KB lower down.
 *   - **The warning has to be seen on one PR and actable on the next**, which
 *     is two touches of headroom: 2 × p99 ≈ 27.4 KB, so the threshold must sit
 *     at or below 73.2%. 70% gives a 30,720 B band — 2.2 × p99, 4.6 × p90,
 *     30.6 × p50 — with margin.
 *
 * **What it costs in noise.** At 70% exactly two of 333 files are named today
 * (`src/translations/es-ES.ts` 75.3%, `src/translations/ja-JP.ts` 73.4%); the
 * tree is otherwise small — median 10,034 B, 323 files under half the cap. Two
 * lines is far inside what this gate already considers readable: `check()`
 * truncates at 20 hits. The opposite error was the real risk. A guard that
 * names nothing is the failure mode this script was written to end — its three
 * original checks scanned `packages/`, a directory this repo has never had, and
 * `SCANNED` carries the verdict in one line: *a check that scans nothing is
 * worse than no check at all*. At the suggested 90%, **zero** of 333 files are
 * named — the advisory would ship watching an empty set.
 */
const ADVISORY_FRACTION = 0.7;

/** First byte at which a file is named by the advisory. Never a failure. */
const ADVISORY_BYTES = Math.floor(MAX_FILE_BYTES * ADVISORY_FRACTION);

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
 * `TEXT_SCANNED` plus `ROOT_TEXT_FILES` — and not just `.ts`: the hazard is
 * about the bytes on disk, not the language, so it follows first-party text
 * rather than code. Those directories hold text only; a binary fixture arriving
 * there should fail loudly and be an explicit decision, not something a silent
 * skip-list absorbs.
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
 * An expression that yields a RECORD ID, by the name it is written under.
 *
 * `id`, anything ending `_id`, and the `<thing>Id` camel spelling — the three
 * shapes this repo actually uses. Deliberately anchored on identifier
 * boundaries, so `valid`, `uuid`, `idx` and `Idle` do not match: the check has
 * to be worth reading a hit from, and a name-shaped heuristic that fires on
 * ordinary words gets suppressed rather than obeyed.
 */
const ID_EXPRESSION = /\b(?:[Ii][Dd]|[A-Za-z_$][\w$]*_[Ii][Dd]|[a-z$][\w$]*Id)\b/;

/**
 * The sinks where an id is the RIGHT thing, recognised by the call it lands in.
 *
 * A diagnostic is for whoever reads the server log after a cascade failed —
 * they have a database, and an opaque key is the most precise thing the message
 * can carry. `quote.hook.ts` keeps two of these deliberately, and their own
 * comments explain why (both feed the bare `Error` that maps to `500 /
 * INTERNAL_ERROR`).
 *
 * This is an exemption on the SINK, never on the site, and that distinction is
 * the whole design. A per-site suppression comment is a thing an author reaches
 * for to get a red build green; moving a sentence into `failures.push(...)` is
 * not — it stops being prose a user reads and becomes a log line, which is
 * exactly the fact the exemption asserts. So the next instance of this class
 * cannot be waved through without also being made true.
 */
const DIAGNOSTIC_SINK = /(?:failures\.push|(?:ctx\.)?log(?:ger)?\.\w+)\s*\(\s*$/;

/**
 * Blank out comments and quoted (non-template) strings, preserving offsets.
 *
 * Returned text is the same length as the input with the same line breaks, so
 * an index into it is an index into the original. Template literals are kept —
 * they are what the scan reads.
 */
function blankNonCode(text) {
  const out = text.split('');
  let i = 0;
  const n = text.length;
  const blankTo = (from, to) => {
    for (let k = from; k < to; k += 1) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < n) {
    const two = text.slice(i, i + 2);
    if (two === '//') {
      const end = text.indexOf('\n', i);
      blankTo(i, end === -1 ? n : end);
      i = end === -1 ? n : end;
    } else if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      blankTo(i, stop);
      i = stop;
    } else if (text[i] === "'" || text[i] === '"') {
      const quote = text[i];
      let k = i + 1;
      while (k < n && text[k] !== quote && text[k] !== '\n') k += text[k] === '\\' ? 2 : 1;
      blankTo(i, Math.min(k + 1, n));
      i = Math.min(k + 1, n);
    } else if (text[i] === '`') {
      // Skip the template body wholesale here; `scanIdsInProse` walks it.
      let k = i + 1;
      let depth = 0;
      while (k < n) {
        if (text[k] === '\\') { k += 2; continue; }
        if (depth === 0 && text[k] === '`') break;
        if (text.slice(k, k + 2) === '${') { depth += 1; k += 2; continue; }
        if (depth > 0 && text[k] === '}') depth -= 1;
        k += 1;
      }
      i = Math.min(k + 1, n);
    } else {
      i += 1;
    }
  }
  return out.join('');
}

/**
 * No record id may be interpolated into prose a user reads (#1243).
 *
 * #1208 fixed one site by hand: an escalation follow-up task titled
 * `Escalated case ${caseId} needs attention`, which gave a demo org nine urgent
 * rows differing only in a 16-character opaque key. The class survived in eight
 * more places across four hooks, and a walkthrough measured what that costs —
 * 15 of 31 tasks in a demo org named by their primary key, a contract whose one
 * provenance field pointed at a string no screen in the app displays, and a
 * duplicate-email refusal that answered "which contact already has this
 * address?" with a key the reader cannot paste into search.
 *
 * Hand-fixing instance ten buys nothing, for the same reason #1094's
 * copyright-header sweep became this file's fifth check rather than a tenth
 * hand fix. So the rule is a gate:
 *
 *   **An id may not appear inside a template literal in `src/`, unless the
 *   template is an argument to a diagnostic sink.**
 *
 * `src/` only, and template literals only, because that is where the hazard
 * lives: `src/` is the metadata and hook bodies whose strings ARE the product's
 * user-facing sentences, and an interpolation is how a runtime value gets into
 * one. Tests name ids in strings all day and are none of this check's business.
 *
 * What the author should do instead is what `case.hook.ts` does: name the record
 * the way its `nameField` does, composed from the stored columns already in
 * hand, and leave the id in the relationship field that exists to carry it.
 *
 * @returns {{file: string, line: number, text: string}[]}
 */
function scanIdsInProse(files) {
  const hits = [];
  for (const file of files) {
    const raw = readFileSync(join(ROOT, file), 'utf8');
    const text = blankNonCode(raw);
    // Line starts, so an index can be reported as a line number.
    const lineOf = (index) => raw.slice(0, index).split('\n').length;

    for (let i = 0; i < text.length; i += 1) {
      if (text[i] !== '`') continue;
      const open = i;
      let k = i + 1;
      while (k < text.length) {
        if (text[k] === '\\') { k += 2; continue; }
        if (text[k] === '`') break;
        if (text.slice(k, k + 2) === '${') {
          // Read one interpolation, tracking nested braces.
          let depth = 1;
          let j = k + 2;
          const from = j;
          while (j < text.length && depth > 0) {
            if (text[j] === '{') depth += 1;
            else if (text[j] === '}') depth -= 1;
            if (depth > 0) j += 1;
          }
          const expression = text.slice(from, j);
          if (ID_EXPRESSION.test(expression)) {
            const before = text.slice(Math.max(0, open - 400), open);
            if (!DIAGNOSTIC_SINK.test(before)) {
              hits.push({
                file,
                line: lineOf(from),
                text: `record id in prose: \${${expression.trim()}}`,
              });
            }
          }
          k = j + 1;
          continue;
        }
        k += 1;
      }
      i = k;
    }
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
 * There is no skip-list and no exemption — a `.ts` file with its header in the
 * wrong place goes red, which is the entire point. Under the scanned trees that
 * needs no list at all: they are walked, so a NEW file is caught the moment it
 * lands. The root is the one place a path list is unavoidable (`walk()`
 * recurses, and the root holds `node_modules` and build output), so root
 * coverage is exactly what `ROOT_TEXT_FILES` names — a new first-class root
 * `.ts` is covered once it is added there, the cost that constant's own
 * docstring states rather than a loophole this check invents. Generated output
 * is already outside the walk (`dist`, `.source`, `.objectstack` are in
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

/**
 * Report something WITHOUT failing the gate (#1287).
 *
 * Deliberately not a mode of `check()` above, and the difference is the whole
 * point of the card: `failures` is never touched here, `process.exit` is never
 * reached from here, and nothing this prints can change the exit code. A
 * `hits`-shaped argument with a boolean "but do not fail" flag was the other
 * shape available and is worse — the two calls would then differ by one
 * argument at the call site, and the next person to widen the advisory would be
 * one typo away from making it a gate.
 *
 * **It must not read like a failure**, or the reader who learns to skip a
 * warning skips the next red too. So it shares nothing with a failure's
 * vocabulary: `check()` writes `✗ <name> — N violation(s)`; this writes `ℹ️`,
 * says "advisory", says in the same line that it does not fail the gate, and
 * never uses the word "violation". It goes to **stdout**, never `console.error`
 * — the two lines a reader of the verify log can already mistake for failures
 * are fixture output, and this must not become a third.
 *
 * The shape is the token ratchet's re-anchor nag
 * (`scripts/check-source-token-ratchet.mjs`), which is this repo's existing
 * answer to "warn before the wall": same `ℹ️` marker, same indent under the
 * check it belongs to, and silent when it has nothing to say.
 */
function advise(headline, hits, remedy) {
  if (hits.length === 0) return;
  console.log(`  ℹ️  ${headline} — advisory, this does not fail the gate`);
  for (const h of hits.slice(0, 20)) console.log(`      ${h.file}  ${h.text}`);
  if (hits.length > 20) console.log(`      … and ${hits.length - 20} more`);
  console.log(`      → ${remedy}`);
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
 * The other three checks do not read these trees. That split is measured, not
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
 *
 * `docs/`, `.github/` and `.claude/` joined them in #838, on the same reasoning
 * and measured the same way: 59 files, all text (28 `.md` under `docs/`; 17
 * `.yml` + 12 `.md` + 1 `.json` under `.github/`; 1 `.json` under `.claude/`),
 * with zero control bytes across all three at the time of the change.
 *
 *   - `docs/` is the internal maintenance documentation, and — with `AGENTS.md`
 *     next door in `ROOT_TEXT_FILES` — is what agents grep daily. A file that
 *     drops out of text search takes the means of investigating it along.
 *   - `.claude/` holds a single `launch.json` today, but it is where skill and
 *     hook files land as they are written. Upstream objectstack#4890 put a bare
 *     NUL inside a `.claude/` `SKILL.md` *while writing the rule that forbids
 *     bare NULs*; it survived because that path was outside every gate.
 *   - `.github/` is workflow YAML, where a control byte is invisible to grep
 *     and a parse hazard at the same time.
 *
 * ⛔ `assets/` is deliberately NOT here, and must not be added without changing
 * what this check means. It holds 34 files, 22 of them images — 19 `.png`, 2
 * `.jpg`, 1 `.svg` — so the rasters would be 21 immediate hits. Admitting it
 * would force an extension predicate onto a check whose whole stance is "the
 * surfaces I read hold text only, and a binary landing in one should be loud".
 * That is an edit to the check's meaning, not a longer directory list, and it
 * belongs on its own card if it is ever wanted.
 */
const TEXT_SCANNED = ['content', '.changeset', 'docs', '.github', '.claude'];

/**
 * Root-level first-party text files (#838). Read in full by the control-byte
 * check; the `.ts` members are read by the marker and copyright-header checks
 * as well (#1236).
 *
 * The three root `.ts` files are why this list exists at all:
 * `objectstack.config.ts` is the app manifest AGENTS.md calls the source of
 * truth, and `vitest.config.ts` / `playwright.config.ts` are the test entry
 * points — first-class TypeScript that no check read before #838. They joined
 * the byte check there, and the two `.ts` checks in #1236, which derives
 * `rootTs` from this list where the checks are wired.
 *
 * #838 deferred that second step because `playwright.config.ts` carried no
 * header and would have gone red. #1236 settled it the other way — widen
 * first, then add the missing header — because the header check requires
 * PRESENCE, and the reason it does (deleting the header must not become a way
 * to satisfy a position-only rule, see `scanHeaderPosition`) covers
 * first-party TypeScript at the root exactly as it covers `src/`. The old
 * boundary was an artefact of the `.ts` surface being expressed as a directory
 * list, not a judgement that root files answer to less.
 *
 * The root is not a tree this script can walk: `walk()` recurses, and the root
 * holds `node_modules`, build output and every directory already scanned. So
 * the root needs its own take, and there were two shapes available — an
 * explicit whitelist, or a non-recursive root-level pass. This is the
 * whitelist, for one reason: a non-recursive pass asserts "every file at the
 * repo root is first-party text", which is false at the root of a Node repo and
 * gets falser over time. It would read whatever untracked, git-ignored junk a
 * working copy keeps at root — `.env`, `*.tsbuildinfo`, a `.DS_Store` (binary,
 * so an instant red) — and fail a local `pnpm hygiene` on files that are
 * neither ours nor present in CI.
 *
 * The cost of that choice is stated rather than hidden: a whitelist cannot
 * notice a NEW first-class root file, so adding one means adding it here. It IS
 * loud in the other direction — a listed file that disappears fails the gate by
 * name, exactly as a missing scanned directory does.
 *
 * ⛔ `pnpm-lock.yaml` and `package-lock.json` are deliberately absent. They are
 * text, and they are the largest files at root (221KB and 320KB — 541KB of the
 * 571KB this surface would otherwise add), but size is not the argument: they
 * are generated by pnpm and npm, nobody hand-edits them, and the hazard this
 * check guards is a writing-time one (during PR #835 an editing tool
 * materialised escapes into real 0x01/0x00 bytes in a file being authored,
 * confirmed with `od -c`). The remedy this check prints — "write the character
 * as an escape sequence" — is advice to an author, and a lock file has none; a
 * hit there would come from a package manager and could not be fixed in this
 * repo. Their integrity already has a dedicated gate,
 * `scripts/check-stackblitz-lock.mjs`. Admitting them later is one line, and
 * should be its own decision rather than a side effect of this one.
 */
const ROOT_TEXT_FILES = [
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  '.stackblitzrc',
  'AGENTS.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.legacy.md',
  'README.md',
  'objectstack.config.ts',
  'objectstack.manifest.json',
  'package.json',
  'playwright.config.ts',
  'tsconfig.json',
  'vitest.config.ts',
];

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

// Same loudness for the root whitelist, and a message that names the constant
// to edit rather than the two above it — a listed file that has been renamed or
// deleted scans nothing while still reading, in the source, as covered.
const missingRootFiles = ROOT_TEXT_FILES.filter((f) => {
  try {
    return !statSync(join(ROOT, f)).isFile();
  } catch {
    return true;
  }
});
if (missingRootFiles.length) {
  console.error(`✗ source hygiene: scanned root file(s) missing: ${missingRootFiles.join(', ')}`);
  console.error('  Update ROOT_TEXT_FILES in scripts/check-source-hygiene.mjs —');
  console.error('  a check that scans nothing is worse than no check at all.');
  process.exit(1);
}

const codeFiles = SCANNED.flatMap(walk);
const textFiles = TEXT_SCANNED.flatMap(walk);

// The root `.ts` files are first-party TypeScript, so they belong to the two
// `.ts` checks as much as anything under `SCANNED` does. Derived from
// `ROOT_TEXT_FILES` rather than listed a second time: one root whitelist is
// already maintained and already fails loudly when an entry disappears, and a
// second list is how the two drift apart.
const rootTs = ROOT_TEXT_FILES.filter(isTs);
const allTs = [...codeFiles.filter(isTs), ...rootTs];
const srcTs = allTs.filter((f) => f.startsWith('src/'));

console.log(
  `Source hygiene — ${codeFiles.length} files under ${SCANNED.join(', ')}, ` +
    `plus ${rootTs.length} root .ts file(s) in the marker and header checks; ` +
    `the control-byte scan adds ${textFiles.length} under ${TEXT_SCANNED.join(', ')} ` +
    `and ${ROOT_TEXT_FILES.length} root file(s)\n`,
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
  'no record id interpolated into user-visible prose in src/',
  scanIdsInProse(srcTs),
  'name the record the way its nameField does (compose it from the stored columns the hook already holds) and leave the id in the relationship field — see src/objects/case.hook.ts and test/record-id-not-in-prose.test.ts; an id meant for a server log belongs in a diagnostic sink, not in a sentence',
);

check(
  'no raw control bytes in first-party files',
  scanControlBytes([...codeFiles, ...textFiles, ...ROOT_TEXT_FILES]),
  'write the character as an escape sequence (\\u0000 for NUL) — byte-identical at runtime, and it keeps the file findable by grep',
);

// Sized once, and BOTH the cap and the advisory below read this one list. The
// advisory is not allowed its own idea of what a source file is: a second walk
// or a second filter is how the two drift apart, and a band that watches a
// different set of files than the cap it warns about is worse than no band.
const codeFileSizes = codeFiles.map((f) => ({ file: f, size: statSync(join(ROOT, f)).size }));

const asKB = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

check(
  `no source file over ${MAX_FILE_BYTES / 1024}KB`,
  codeFileSizes
    .filter((f) => f.size > MAX_FILE_BYTES)
    .map((f) => ({ file: f.file, line: 0, text: asKB(f.size) })),
  'split the file — oversized modules defeat review',
);

advise(
  `${ADVISORY_FRACTION * 100}% of the ${MAX_FILE_BYTES / 1024}KB cap reached, and not passed`,
  codeFileSizes
    .filter((f) => f.size > ADVISORY_BYTES && f.size <= MAX_FILE_BYTES)
    .sort((a, b) => b.size - a.size)
    .map((f) => ({
      file: f.file,
      text:
        `${((f.size / MAX_FILE_BYTES) * 100).toFixed(1)}% of cap, ` +
        `${asKB(MAX_FILE_BYTES - f.size)} of headroom left`,
    })),
  'split it while that is still a scheduled job rather than a detour on an unrelated PR — nothing here is a violation and the cap is unchanged',
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
