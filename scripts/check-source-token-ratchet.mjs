#!/usr/bin/env node
// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Source token ratchet — a shrink-only ceiling on the authored surface (#1183).
 *
 *   node scripts/check-source-token-ratchet.mjs          # the gate (CI runs this)
 *   node scripts/check-source-token-ratchet.mjs --json   # the same measurement, machine-readable
 *
 * ## Why a ceiling
 *
 * HotCRM's headline positioning claim — the entire enterprise CRM fits in a
 * single agent context window — is a number, and an ungated number drifts. It
 * drifted before this gate existed: the README quoted a hand measurement that
 * no longer matched the tree, and nothing anywhere could have noticed. This
 * script is the one place that measurement is defined, so a doc citing it
 * cites a command anyone can re-run instead of someone's afternoon with `wc`.
 *
 * ## What is measured, and why exactly this
 *
 * Maintainer rulings, 2026-08-17 (verbatim, PM session chat):
 *
 *   「translations + seed 肯定是不需要算 token 的」
 *   「我觉得只需要写 业务语义 ~78k 交互层 ~40k ，这样客户更好理解，也更吸引开发者」
 *
 * So the measured surface is `src/**\/*.ts` (excluding `.d.ts`), **minus**
 * `src/translations/` and `src/data/`, comment-stripped and blank-stripped,
 * reported as two headline layers plus the authored total:
 *
 *   - **business semantics** — `src/objects/` `src/flows/` `src/actions/` `src/hooks/`
 *   - **interaction layer**  — `src/views/` `src/pages/` `src/dashboards/` `src/apps/`
 *
 * Translations and seed data are outside the ratchet **entirely**, by ruling: a
 * fifth locale or a richer demo dataset is healthy growth and must never
 * compete with business logic for the budget. They are not measured, not
 * ratcheted, and not reported as debt.
 *
 * The remaining authored directories (datasets, reports, profiles, sharing,
 * skills, mappings, interfaces, …) are not a headline layer — they are printed
 * as a residual and carried in the authored total, which has its own ceiling.
 * Nothing under `src/` can therefore grow unwatched by hiding in a directory
 * that predates or postdates the two headline layers.
 *
 * Because the measure is **comment-stripped**, comment-slimming work (#1184)
 * does not move these numbers. That is deliberate: comments are for the humans
 * and agents reading the repo, and a gate that rewarded deleting them would be
 * a gate against explanation. If a change to this script ever makes comment
 * mass affect the number, the measurement basis has been broken.
 *
 * ## The stripping rule — stated so the number is reproducible and arguable
 *
 * `stripComments()` is a character scanner, not a line matcher. Exactly this,
 * and nothing more:
 *
 *   1. `//` to end of line, and `/* … *\/` however many lines it spans, are
 *      removed — including a trailing comment that follows code on its line.
 *   2. A comment opener inside a string literal (`'…'`, `"…"`, `` `…` ``) or
 *      inside a regular-expression literal is **not** a comment. String and
 *      regex bodies are preserved byte-for-byte, escapes included.
 *   3. `/` is read as a regex literal when the previous significant character
 *      cannot end an expression (`=`, `(`, `,`, `:`, `[`, `!`, `&`, `|`, `?`,
 *      `{`, `}`, `;`, `return`-like positions) and as division otherwise. This
 *      is the standard heuristic; it is ambiguous only after `)`, where this
 *      scanner chooses division.
 *   4. After stripping, lines that are empty or whitespace-only are dropped,
 *      and every retained line is right-trimmed. Leading indentation is
 *      **kept** — it is real input to a model reading the file, and dropping it
 *      would make the number smaller than the thing it claims to measure.
 *   5. `chars` is the length of the retained lines joined with `\n`. `~tokens`
 *      is `chars / 4`, rounded.
 *
 * The line-oriented approximation this replaced (a line is a comment when it
 * starts with `//`, `*` or `/*`) mis-handles both halves of rule 1 and 2. The
 * difference is small on today's tree, but the point of a ratchet is that the
 * *same* rule is applied on every future run, so the rule is written down here
 * and pinned by `test/source-token-ratchet.test.ts`, which asserts it against
 * fixtures for the hazard classes it covers — a comment opener inside a
 * string, a regex literal carrying quote and comment characters, a trailing
 * comment after code, a multi-line block, blank-line collapse.
 *
 * That suite does **not** cross-check this scanner against a compiler, and
 * nothing in this repo does: TypeScript 7's npm package exposes no compiler
 * API, so there is no comment-trivia scanner to borrow. What proved the rule
 * over the *whole real tree* was a one-off hand run against esbuild — every
 * first-party `.ts` file minified twice, once as authored and once
 * comment-stripped, and the two outputs compared byte for byte. That run, its
 * figures, and the reason it is **not** automated here (`esbuild` is not a
 * declared dependency of this repo; it arrives under the ObjectStack CLI) are
 * recorded in that suite's docstring, under the heading
 * "The stripper's equivalence proof is a hand run, recorded here".
 *
 * `typescript` IS a devDependency of this repo, but it belongs to `tsc
 * --noEmit` and is evidence for none of the above — confirming that the
 * dependency exists is not confirming this paragraph. The gate itself imports
 * nothing outside `node:` builtins and `scripts/lib/main-module.mjs`, so it
 * runs with nothing installed and its number cannot move because a compiler
 * upgraded.
 *
 * ## Why `chars / 4` and not a tokenizer
 *
 * Deliberately crude. A ratchet compares like with like — the estimator's
 * absolute accuracy never enters the verdict, only its stability does, and
 * `chars / 4` is perfectly stable and needs no dependency. Adding a real BPE
 * tokenizer would add a third-party runtime dependency to a repo that has none
 * outside `@objectstack/*`, to move a headline number by a few percent in a
 * direction nobody can act on. Measured before writing this: no tokenizer is
 * already available in the dependency graph, so there was no free upgrade to
 * take. If one is ever wanted, it changes the ceilings once and the ratchet
 * continues from there.
 *
 * ## The ratchet discipline (shrink-only, over a 5% working buffer)
 *
 *   - A ceiling may be LOWERED by any PR that shrinks its scope. Lowering is
 *     always legitimate and is the point.
 *   - RAISING one requires a **maintainer ruling quoted in the raising PR's
 *     body**. A feature that would cross a ceiling pays its way by compressing
 *     elsewhere, or by getting an explicit decision that the claim has moved —
 *     which is exactly the conversation the drift-prone number never triggered
 *     on its own.
 *   - Headroom is a **deliberate 5% working buffer**, by maintainer ruling of
 *     2026-08-17: 「给 5% 缓冲」. The first anchor was set flush against the
 *     reading, under 1%, and that was rejected: routine work must not be
 *     interrupted, only real growth should be. So a red run here is not "someone
 *     added a field" — it is "this surface has grown more than 5% past the last
 *     agreed claim", which is worth a conversation.
 *
 * A scope that reads as empty is RED, never a pass: a gate that cannot find its
 * input must fail rather than silently measure nothing.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { isMainModule } from './lib/main-module.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Directories that never contain first-party source. */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.source', '.objectstack', '.git']);

/**
 * Outside the ratchet by maintainer ruling — not measured at all.
 * 「translations + seed 肯定是不需要算 token 的」
 */
const EXCLUDED = ['src/translations', 'src/data'];

/** The two headline layers, in the order the README card (#1187) cites them. */
const LAYERS = [
  {
    key: 'business',
    label: 'business semantics',
    dirs: ['src/objects', 'src/flows', 'src/actions', 'src/hooks'],
  },
  {
    key: 'interaction',
    label: 'interaction layer',
    dirs: ['src/views', 'src/pages', 'src/dashboards', 'src/apps'],
  },
];

/**
 * The ruled working buffer over a measured reading: 「给 5% 缓冲」.
 *
 * Exported for the same reason `anchor()` is: the buffer is an input to every
 * figure derived from a ceiling, so a test fixture or a doc pin sizes itself
 * from this constant rather than restating `1.05` by hand beside it.
 */
export const BUFFER = 0.05;

/**
 * The ceiling to commit for a given reading: `measured × 1.05`, rounded up to
 * the next 1,000 tokens. Exported so the anchoring arithmetic lives in one
 * place — the header, the advisory below and any re-anchoring PR all read it
 * from here rather than repeating a multiplication by hand.
 */
export const anchor = (tokens) => Math.ceil((tokens * (1 + BUFFER)) / 1000) * 1000;

/**
 * Shrink-only ceilings, in estimated tokens.
 *
 * A ceiling moves only in the PR that shrinks its own scope, so re-anchoring is
 * per-layer and these three no longer come from one run. Both anchoring runs:
 *
 *   node scripts/check-source-token-ratchet.mjs   # 2026-08-17 03:20 UTC, `main` at d038b957
 *     #1189 — removed the account renewal fields, their view and their seed values
 *     business semantics ~80,356 · interaction layer ~39,084 · authored total ~133,302
 *
 *   node scripts/check-source-token-ratchet.mjs   # 2026-08-26 06:47 UTC, `main` at d863d547
 *     #1316 — removed the inert `list.tabs[]` block from every view file
 *     business semantics ~82,489 · interaction layer ~37,424 · authored total ~133,840
 *
 * Each ceiling is `anchor(reading)` — the reading plus the ruled 5% working
 * buffer, rounded up to the next 1,000. `headroom` is the headroom **at anchor
 * time** (`ceiling - reading`, on that row's own run): it is a derivation of the
 * constant beside it, not a live figure, so it deliberately does not track what
 * the gate prints today — the tree keeps moving between re-anchorings.
 *
 *   business semantics   80,356 × 1.05 =  84,374 -> ceil 1k ->  85,000  (headroom 4,644, 5.8%)  2026-08-17
 *   interaction layer    37,424 × 1.05 =  39,295 -> ceil 1k ->  40,000  (headroom 2,576, 6.9%)  2026-08-26
 *   authored total      133,302 × 1.05 = 139,967 -> ceil 1k -> 140,000  (headroom 6,698, 5.0%)  2026-08-17
 *
 * The rounding step is what carries two of the three a little past 5%; it is
 * kept because a ceiling a reader can hold in their head is worth more than the
 * last few hundred tokens of precision on a number estimated as `chars / 4`.
 *
 * Only the interaction layer re-anchored on 2026-08-26, and the other two rows
 * are left alone on purpose: on that same run `anchor()` of each of their
 * readings lands ABOVE the ceiling committed below it. One worked line per
 * declined re-anchoring, in the shape of the table above — reading, its
 * `anchor()`, and the committed ceiling it would have raised:
 *
 *   business semantics  anchor( 82,489) =  87,000  > ceiling  85,000  2026-08-26
 *   authored total      anchor(133,840) = 141,000  > ceiling 140,000  2026-08-26
 *
 * Re-anchoring either would therefore be a RAISE, and a raise sits on the
 * maintainer floor. So a shrink-only ratchet re-anchors a layer only when
 * `anchor(reading) < ceiling`; when it is greater the committed ceiling is
 * already the tighter of the two and stands.
 *
 * Lower them whenever the tree shrinks — that is free and encouraged. Raising
 * one requires a maintainer ruling quoted in the raising PR's body.
 */
export const CEILINGS = new Map([
  ['business semantics', 85000],
  ['interaction layer', 40000],
  ['authored total', 140000],
]);

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

/** True when `/` at this point opens a regex literal rather than dividing. */
function regexCanFollow(prev) {
  if (prev === '') return true;
  return !/[\w$)\]]/.test(prev);
}

/**
 * Remove comments, preserving everything else byte-for-byte.
 *
 * Newlines inside a removed block comment are kept so that line numbers and
 * the blank-line pass below still see the file's real shape. See the stripping
 * rule in this file's header — that prose and this function must agree, and
 * `test/source-token-ratchet.test.ts` holds them to it.
 */
export function stripComments(source) {
  let out = '';
  let prev = ''; // last significant (non-whitespace) character emitted
  let i = 0;

  const emit = (text) => {
    out += text;
    const trimmed = text.trimEnd();
    if (trimmed !== '') prev = trimmed[trimmed.length - 1];
  };

  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];

    if (c === '/' && d === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    if (c === '/' && d === '*') {
      const end = source.indexOf('*/', i + 2);
      const body = source.slice(i, end === -1 ? source.length : end + 2);
      out += body.replace(/[^\n]/g, ''); // keep the newlines, drop the prose
      i += body.length;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === c) {
          j++;
          break;
        }
        // An unterminated ' or " cannot cross a line; a template literal can.
        if (c !== '`' && source[j] === '\n') break;
        j++;
      }
      emit(source.slice(i, j));
      i = j;
      continue;
    }

    if (c === '/' && regexCanFollow(prev)) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < source.length) {
        const ch = source[j];
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === '\n') break; // unterminated — not a regex after all
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) {
          j++;
          closed = true;
          break;
        }
        j++;
      }
      if (closed) {
        while (j < source.length && /[a-z]/.test(source[j])) j++; // flags
        emit(source.slice(i, j));
        i = j;
        continue;
      }
      // Not a regex literal after all — fall through and emit the bare slash.
    }

    emit(c);
    i++;
  }

  return out;
}

/** Comment-stripped, blank-stripped text of one file, per the header's rule. */
export function authoredText(source) {
  return stripComments(source)
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line !== '')
    .join('\n');
}

/** `~tokens = chars / 4`, rounded. Crude on purpose — see the header. */
export const tokensOf = (chars) => Math.round(chars / 4);

/** Measure one set of repo-relative files. */
function measure(files) {
  let chars = 0;
  let lines = 0;
  for (const file of files) {
    const text = authoredText(readFileSync(join(ROOT, file), 'utf8'));
    if (text === '') continue;
    chars += text.length;
    lines += text.split('\n').length;
  }
  return { files: files.length, lines, chars, tokens: tokensOf(chars) };
}

/**
 * The verdict for one scope. Exported so the decision logic can be exercised
 * without building a 300KB fixture tree for every case.
 */
export function verdict(label, tokens, ceiling) {
  if (tokens === 0) {
    return {
      ok: false,
      msg: `${label} measured 0 tokens — refusing to treat an empty read as a pass. Check the directory list in scripts/check-source-token-ratchet.mjs.`,
    };
  }
  if (tokens > ceiling) {
    return {
      ok: false,
      msg:
        `${label} is ~${fmt(tokens)} tokens; the ratchet ceiling is ~${fmt(ceiling)} ` +
        `(over by ~${fmt(tokens - ceiling)}). That ceiling already carries the ruled 5% working ` +
        'buffer, so this is growth past the buffer, not routine drift. This surface is the ' +
        "app's headline claim — shrink it back (compress metadata, drop duplication, move prose " +
        'to content/docs), or raise the ceiling in a PR that quotes a maintainer ruling approving ' +
        'the new number. Comments are already stripped, so deleting comments will not help.',
    };
  }
  return {
    ok: true,
    msg: `${label} ~${fmt(tokens)} tokens (ceiling ~${fmt(ceiling)}; headroom ~${fmt(ceiling - tokens)}).`,
  };
}

/**
 * Thousands-separated — the form every figure this gate prints carries.
 * Exported so a pin quotes the gate's own formatting instead of restating it.
 */
export const fmt = (n) => n.toLocaleString('en-US');
/** `78,123` -> `~78k`, the form the README card and CI summary quote. */
const headline = (tokens) => `~${Math.round(tokens / 1000)}k`;

const srcDirs = () =>
  readdirSync(join(ROOT, 'src'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name))
    .map((e) => `src/${e.name}`);

function collect() {
  const missing = [...LAYERS.flatMap((l) => l.dirs), ...EXCLUDED].filter((d) => {
    try {
      return !statSync(join(ROOT, d)).isDirectory();
    } catch {
      return true;
    }
  });
  if (missing.length) {
    console.error(`✗ source token ratchet: measured director(y|ies) missing: ${missing.join(', ')}`);
    console.error('  Update LAYERS / EXCLUDED in scripts/check-source-token-ratchet.mjs —');
    console.error('  a ratchet that measures a tree nobody writes to is worse than no ratchet.');
    process.exit(1);
  }

  const all = walk('src').filter(isTs);
  const authored = all.filter((f) => !EXCLUDED.some((d) => f.startsWith(`${d}/`)));
  const layered = new Set();
  const scopes = LAYERS.map((layer) => {
    const files = authored.filter((f) => layer.dirs.some((d) => f.startsWith(`${d}/`)));
    for (const f of files) layered.add(f);
    return { ...layer, ...measure(files) };
  });
  const residual = measure(authored.filter((f) => !layered.has(f)));
  const total = measure(authored);
  return { scopes, residual, total, excluded: measure(all.filter((f) => !authored.includes(f))) };
}

function main() {
  const report = collect();
  const rows = [
    ...report.scopes.map((s) => ({ label: s.label, ...s, ceiling: CEILINGS.get(s.label) })),
    { label: 'other authored metadata', ...report.residual, ceiling: undefined },
    { label: 'authored total', ...report.total, ceiling: CEILINGS.get('authored total') },
  ];

  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          surface: 'src/**/*.ts, comment-stripped and blank-stripped, minus ' + EXCLUDED.join(' + '),
          estimator: 'chars / 4',
          scopes: rows.map(({ label, files, lines, chars, tokens, ceiling }) => ({
            label,
            files,
            lines,
            chars,
            tokens,
            ceiling: ceiling ?? null,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    `Source token ratchet — authored surface: src/**/*.ts minus ${EXCLUDED.join(', ')}\n` +
      '  (comments and blank lines stripped; ~tokens = stripped chars / 4)\n',
  );

  const pad = (s, w) => String(s).padStart(w);
  console.log(
    `  ${'scope'.padEnd(24)}${pad('files', 6)}${pad('lines', 8)}${pad('chars', 10)}${pad('~tokens', 10)}`,
  );
  for (const row of rows) {
    if (row.label === 'authored total') console.log(`  ${'─'.repeat(58)}`);
    console.log(
      `  ${row.label.padEnd(24)}${pad(row.files, 6)}${pad(fmt(row.lines), 8)}${pad(fmt(row.chars), 10)}${pad(fmt(row.tokens), 10)}`,
    );
  }
  console.log(
    `\n  outside the ratchet by ruling (${EXCLUDED.join(', ')}): ` +
      `${report.excluded.files} files, ~${fmt(report.excluded.tokens)} tokens — healthy growth, never measured here.\n`,
  );
  console.log(
    `  Headline: ${report.scopes
      .map((s) => `${s.label} ${headline(s.tokens)}`)
      .join(' · ')} · authored total ${headline(report.total.tokens)}\n`,
  );

  // A directory under src/ that is in neither headline layer nor the exclusion
  // list still lands in the total, so it cannot grow unwatched — but a *new*
  // metadata type usually belongs in one of the two layers, and saying so here
  // is cheaper than noticing it a quarter later in a drifted headline number.
  const known = new Set([...LAYERS.flatMap((l) => l.dirs), ...EXCLUDED]);
  const unlayered = srcDirs().filter((d) => !known.has(d));
  if (unlayered.length) {
    console.log(`  ℹ️  not in a headline layer (counted in the total only): ${unlayered.join(', ')}\n`);
  }

  let failed = 0;
  for (const row of rows) {
    if (row.ceiling === undefined) continue;
    const v = verdict(row.label, row.tokens, row.ceiling);
    if (!v.ok) {
      failed++;
      console.error(`  ✗ ${v.msg}`);
      continue;
    }
    console.log(`  ✓ ${v.msg}`);
    // Nag only when the ceiling has drifted well past the ruled buffer — i.e.
    // the tree has shrunk enough that `anchor()` would now commit a lower
    // number. A flat "headroom is over Nk" threshold cannot be used any more:
    // under 「给 5% 缓冲」 a healthy scope carries thousands of tokens of
    // headroom by design, so a flat threshold would fire on every clean run and
    // tell the author to undo the ruling. The trigger is therefore relative and
    // one whole buffer clear of it (10% vs the ruled 5%), so ordinary shrinkage
    // inside the buffer stays quiet.
    const suggested = anchor(row.tokens);
    if (row.ceiling - row.tokens > row.tokens * 2 * BUFFER) {
      console.log(
        `      ℹ️  headroom is ${fmt(row.ceiling - row.tokens)} tokens, over twice the 5% buffer — ` +
          `re-anchor this ceiling to ~${fmt(suggested)} in your PR; shrink-only ratchets tighten opportunistically.`,
      );
    }
  }

  console.log('');
  if (failed) {
    console.error(`✗ source token ratchet failed: ${failed} scope(s) over ceiling`);
    process.exit(1);
  }
  console.log('✓ source token ratchet clean');
}

// Run only when invoked directly. Three suites import from this module, in two
// groups — and the second group is why an edit here is not a local edit.
//
// GROUP 1 — the ceiling figures. Every number derived from a ceiling is
// DERIVED by the test quoting it rather than transcribed beside it:
// `test/source-token-ratchet.test.ts` imports `anchor`, `fmt`, `BUFFER` and
// `CEILINGS` (it sizes its fixtures from `CEILINGS`/`BUFFER` and pins the
// worked table in the header above against `anchor()`), and
// `test/docs-readme-token-figures.test.ts` imports `BUFFER` and `CEILINGS` to
// check the README banner. So a re-anchoring moves the constant and the copies
// follow.
//
// GROUP 2 — the stripper. `test/docs-object-term-consistency.test.ts` imports
// `stripComments` and runs every `.ts` file through it to decide what the #802
// Chinese-term guard is allowed to see: a retired spelling may sit in a
// comment, but not in the code. ⇒ EDITING `stripComments` EDITS WHAT THAT
// GUARD SCANS. Strip more than intended and offending literals stop being
// read — the guard then passes by finding nothing, which reads exactly like
// clean. That suite's own defence is a single assertion, that stripping a
// known file leaves its ledger standing; it catches a stripper that returns
// nothing, not one that returns too little. ⛔ So this is not a private
// helper: change it with that suite in hand and re-run it, not just this gate.
//
// `verdict` is exported and imported by nothing. It, and the stripping rule as
// this gate applies it, are also exercised by RUNNING this file:
// `test/source-token-ratchet.test.ts` copies the gate into a sandbox root,
// writes fixtures under it, and asserts the stripped `chars` and the verdict
// text off that real run. No cross-check against a TypeScript scanner is
// involved — not here, and nowhere in this repo; the header paragraph on the
// stripping rule says why.
// Importing must not run the gate or call exit().
//
// ⚠️ The list above is hand-written and nothing holds it to the tree. It was
// re-derived at 81a79ee (2026-09-05). Its predecessor said only two suites
// imported from here and that the stripping rule was never imported: true when
// written (#1380), false three days later when #802 landed the `stripComments`
// importer, and nothing here could notice (#1533). Re-derive before relying on
// it — resolved imports, not name matches:
//
//   grep -rn "from '.*check-source-token-ratchet" test/
//
// `test/deal-threshold-parity.test.ts` declares a local `const stripComments`
// of its own and `test/script-main-guard.test.ts` spawns this file by path;
// neither imports from here, and a name-only grep counts both.
//
// The comparison lives in `scripts/lib/main-module.mjs` and is never
// hand-rolled here: this line used to read
// `import.meta.url === pathToFileURL(process.argv[1]).href`, which is false for
// every invocation through a symlinked path — the gate then measured nothing
// and exited 0 (#1252). See that file for the measurement.
if (isMainModule(import.meta.url)) main();
