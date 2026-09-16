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
 * and 2026-09-14, which moved the SCOPE of all of it (verbatim, untranslated):
 *
 *   「所以应该先分拆基础的crm, 比如 sales 和 support， token 门禁： 放到 sales」
 *
 * and 2026-09-16, which turned the one ceilinged package into four (#1928):
 *
 *   「1928 门禁 改为 多 sales 模块的门禁」
 *
 * ## Every package under `src/` carries its own ceilings (ADR-0130 §4)
 *
 * Since the module split a directory under `src/` IS a package: `src/sales/`
 * is the `type: 'app'` package a customer installs, and `src/service/`,
 * `src/revenue/` and `src/marketing/` are modules. Until #1928 only `src/sales/`
 * carried ceilings and the other three were MEASURED and printed with none,
 * explicitly so that the per-module budget ADR-0130 §4 promises would have its
 * starting figures. Those figures are what #1928 spends: each package now
 * carries its own `business semantics`, `interaction layer` and `authored
 * total` ceiling, anchored from its own reading by the same `anchor()` rule.
 *
 * ⚠️ That is FOUR independent gates, not one gate with a wider surface. A
 * module growing past its own ceiling reddens THAT module and leaves the other
 * three green, which is the whole point of a per-module budget: `src/marketing/`
 * cannot spend headroom that `src/sales/` is not using, and a sales feature
 * cannot be paid for by a quiet module. A single summed ceiling would have let
 * either happen while staying green, which is the state this card ended.
 *
 * `src/sales/` keeps one thing the modules do not: it is the package the README
 * banner is about, so its three ceilings are the ones {@link CEILINGS} exposes
 * under a bare label for `test/docs-readme-token-figures.test.ts` to read. The
 * claim — ADR-0130 §1.3(b), *a CRM sales module fits whole in an AI context
 * window* — is a claim about the package a customer actually installs, and
 * nothing here widens it to the other three.
 *
 * ## The package roster is READ OFF DISK, never listed here
 *
 * A directory under `src/` is a package when it carries an `objects/`
 * directory — the same predicate, in the same words, that
 * `test/helpers/src-roster.ts` and `test/docs-src-tree-paths.test.ts` use. That
 * is deliberate and it is the lesson of #1940: the roster there was a
 * hand-kept four-element list, a fifth package landing on disk was invisible to
 * it, and every sweep built on it went blind in silence. A ratchet is worse
 * again — a package missing from a hand-written array is a package with no
 * ceiling at all, which reads exactly like a package under its ceiling.
 *
 * `src/docs/` falls out of the predicate rather than out of an exception list:
 * it is the platform's ADR-0046 in-product documentation path, four `.md` files
 * and no `objects/`, so it is not a package here and owes no ceiling. It is not
 * named anywhere below, which is the point — a hand-kept exception list is the
 * thing that just failed.
 *
 * So the ratcheted surface is `src/<package>/**\/*.ts` (excluding `.d.ts`),
 * **minus** that package's `translations/` and `data/`, comment-stripped and
 * blank-stripped, reported as two headline layers plus the authored total:
 *
 *   - **business semantics** — `objects/` `flows/` `actions/`
 *   - **interaction layer**  — `views/` `pages/` `dashboards/` `apps/`
 *
 * The layers are keyed by SUBDIRECTORY NAME, so the same two layers read on
 * every package. A package that holds none of a layer's directories owes no
 * ceiling for that layer and is not measured for it; a package that holds one
 * and measures zero is RED, exactly as before.
 *
 * `src/hooks/` is gone from the business layer and nothing was dropped with
 * it: a `*.hook.ts` now sits beside the `*.object.ts` it names (that
 * co-location is what enforces ADR-0130 R4), so hooks are counted inside
 * `objects/` exactly as `src/objects/*.hook.ts` was counted before the move.
 *
 * Translations and seed data are outside the ratchet **entirely**, by ruling: a
 * fifth locale or a richer demo dataset is healthy growth and must never
 * compete with business logic for the budget. They are not measured, not
 * ratcheted, and not reported as debt.
 *
 * The remaining authored directories of a package (datasets, reports,
 * profiles, sharing, skills, mappings, interfaces, …) are not a headline layer
 * — they are printed as that package's residual and carried in its authored
 * total, which has its own ceiling. Nothing under a package can therefore grow
 * unwatched by hiding in a directory that predates or postdates the two
 * headline layers.
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

/** Where the packages live. One segment, so the roster below can be derived. */
const SRC = 'src';

/**
 * The app package — the one the README banner and ADR-0130 §1.3(b) are about.
 *
 * The ONE package this file names, and it is named because a ruling names it:
 * 「token 门禁： 放到 sales」. It is not a roster and it is not an
 * exception — `src/sales/` carries ceilings exactly like every other package
 * does. What it carries additionally is the README's headline claim, which is
 * why {@link CEILINGS} exposes its three ceilings under a bare label.
 *
 * {@link collect} refuses to run if this is not one of the derived packages,
 * rather than quietly measuring a headline surface that moved.
 */
export const SCOPE = `${SRC}/sales`;

/** True when `<dir>/objects` is a directory. The package predicate, once. */
const holdsObjects = (dir) => {
  try {
    return statSync(join(ROOT, dir, 'objects')).isDirectory();
  } catch {
    return false;
  }
};

/**
 * The package directories under `src/`, READ OFF DISK — the app package first,
 * then the rest alphabetically so the printed order is deterministic.
 *
 * A directory under `src/` is a package when it carries an `objects/`
 * directory. Same predicate, same words, as `test/helpers/src-roster.ts` and
 * `test/docs-src-tree-paths.test.ts`, and derived for the reason #1940 gives:
 * the roster there WAS a hand-kept four-element list, a fifth package landing
 * on disk was invisible to it, and every app-wide sweep built on it went blind
 * in silence. Here the same list would be worse — a package missing from a
 * hand-written array is a package with NO CEILING, and an unratcheted package
 * reads exactly like a package under its ceiling.
 *
 * `src/docs/` is out by the predicate, not by an exception: ADR-0046's
 * in-product documentation path holds four `.md` files and no `objects/`. It is
 * named nowhere in this file, because a hand-kept exception list is the thing
 * that just failed.
 *
 * Exported because `test/source-token-ratchet.test.ts` materialises this gate's
 * surface in a sandbox and has to know it: one producer, as with
 * `scripts/lib/source-hygiene-surface.mjs` next door.
 */
export const PACKAGE_DIRS = (() => {
  let entries = [];
  try {
    entries = readdirSync(join(ROOT, SRC), { withFileTypes: true });
  } catch {
    entries = []; // no src/ at all — collect() turns that into a loud failure
  }
  const found = entries
    .filter((entry) => entry.isDirectory() && !SKIP_DIRS.has(entry.name))
    .map((entry) => `${SRC}/${entry.name}`)
    .filter(holdsObjects)
    .sort();
  return [...found.filter((dir) => dir === SCOPE), ...found.filter((dir) => dir !== SCOPE)];
})();

/**
 * Outside the ratchet by maintainer ruling — not measured at all.
 * 「translations + seed 肯定是不需要算 token 的」
 *
 * The ruling's whole content is these two directory names. They are resolved
 * against each package ROOT — `<package>/translations`, `<package>/data` — and
 * never by a trailing-segment match: an exclusion that matched `data` anywhere
 * would quietly grow to cover `objects/data/` the day someone writes one, which
 * is a different rule from the one that was ruled.
 */
export const EXCLUDED_DIR_NAMES = ['translations', 'data'];

/**
 * Those two names, resolved against every package that actually has one.
 *
 * Derived rather than listed for the roster's own reason, and filtered to what
 * exists so the printed line names real directories: a package with no locale
 * pack excludes nothing, which is the correct reading of the ruling rather
 * than a gap in it.
 */
export const EXCLUDED = PACKAGE_DIRS.flatMap((dir) =>
  EXCLUDED_DIR_NAMES.map((name) => `${dir}/${name}`).filter((sub) => {
    try {
      return statSync(join(ROOT, sub)).isDirectory();
    } catch {
      return false;
    }
  }),
);

/**
 * The two headline layers, in the order the README card (#1187) cites them.
 *
 * `dirs` holds SUBDIRECTORY NAMES, not paths. That is what makes the same two
 * layers read on every package rather than on one — before #1928 the names
 * were reconstructed by slicing {@link SCOPE} off a path list, which only
 * worked because there was exactly one ceilinged package to slice against.
 */
export const LAYERS = [
  {
    key: 'business',
    label: 'business semantics',
    // `src/hooks` is not missing — a `*.hook.ts` sits beside its `*.object.ts`
    // since the ADR-0130 layout, so hooks are counted inside `objects/`.
    dirs: ['objects', 'flows', 'actions'],
  },
  {
    key: 'interaction',
    label: 'interaction layer',
    dirs: ['views', 'pages', 'dashboards', 'apps'],
  },
];

/** The label of the per-package total — a ceilinged row, like the two layers. */
export const TOTAL_LABEL = 'authored total';

/** The residual row: printed, carried by the total, deliberately un-ceilinged. */
const RESIDUAL_LABEL = 'other authored metadata';

/** A layer's directories under one package, as repo-relative paths. */
export const layerDirs = (dir, layer) => layer.dirs.map((name) => `${dir}/${name}`);

/** True when the package holds at least one of the layer's directories. */
const layerPresent = (dir, layer) =>
  layerDirs(dir, layer).some((sub) => {
    try {
      return statSync(join(ROOT, sub)).isDirectory();
    } catch {
      return false;
    }
  });

/**
 * The ceilings a package OWES, derived from what it holds on disk.
 *
 * A package with no `views/ pages/ dashboards/ apps/` at all authors no
 * interaction metadata, so an interaction ceiling for it would be a ceiling of
 * zero over a reading of zero — a row that can only ever be red or vacuous.
 * It owes none. A package that holds one of those directories and measures
 * zero is a different thing entirely, and {@link verdict} still calls it red.
 *
 * The authored total is owed by every package, because the roster predicate is
 * `objects/`: a package always authors something.
 */
export const requiredCeilings = (dir) => [
  ...LAYERS.filter((layer) => layerPresent(dir, layer)).map((layer) => layer.label),
  TOTAL_LABEL,
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
 * Ceilings, in estimated tokens — and since #1601 there are two KINDS of them.
 *
 * An ANCHORED ceiling is `anchor(reading)`: a reading this gate actually
 * printed, plus the ruled 5% working buffer, rounded up to the next 1,000. It
 * is shrink-only, it moves in the PR that shrinks its own scope, and it owes a
 * worked row below so anyone can re-run the arithmetic.
 *
 * A RULED ceiling is a maintainer grant. It is NOT derived from any reading,
 * so there is no `anchor()` arithmetic to show for it and no worked row that
 * could honestly be written: the only record it can carry is the ruling.
 *
 * ## 2026-09-16 — one ceilinged package became four, and all twelve anchored
 *
 * The ruling that authorises this, verbatim and untranslated:
 *
 *   「1928 门禁 改为 多 sales 模块的门禁」
 *
 * Before #1928 three ceilings measured `src/sales/` and the other three
 * packages were printed with none. This card spends the starting figures that
 * printing existed to produce: twelve ceilings, three per package, each
 * `anchor()` of that package's own reading.
 *
 * Nine of the twelve are a package's FIRST ceiling, which is an anchoring and
 * not a raise — there was no committed number to move. The three that already
 * existed are `src/sales/`'s, and two of them move UP as the re-anchoring
 * carries them onto today's reading (53,000 -> 55,000 and 97,000 -> 100,000),
 * which is why the ruling above is quoted: a raise needs one, and it is the
 * same ruling that makes the gate per-module. `src/sales/`'s interaction
 * ceiling re-anchors onto exactly the 31,000 it already carried —
 * `anchor(29,477) = 31,000` — which is the proof, on this repository's own
 * numbers, that the rule applied to the other eleven rows is the rule that set
 * the committed one, not a new one invented for this card.
 *
 * The anchoring run all twelve ceilings below come from:
 *
 *   node scripts/check-source-token-ratchet.mjs   # 2026-09-16 00:00 UTC, `origin/main` at 4d7ae9f
 *     #1928 — the per-module budget: the readings the pre-#1928 gate printed per package
 *     src/sales      business semantics ~52,379 · interaction layer ~29,477 · authored total ~94,445
 *     src/service    business semantics ~12,646 · interaction layer ~6,228 · authored total ~20,423
 *     src/revenue    business semantics ~15,196 · interaction layer ~2,136 · authored total ~17,485
 *     src/marketing  business semantics ~8,001 · interaction layer ~876 · authored total ~9,096
 *
 *   src/sales      business semantics   52,379 × 1.05 =  54,998 -> ceil 1k ->  55,000  (headroom 2,621, 5.0%)  2026-09-16
 *   src/sales      interaction layer    29,477 × 1.05 =  30,951 -> ceil 1k ->  31,000  (headroom 1,523, 5.2%)  2026-09-16
 *   src/sales      authored total       94,445 × 1.05 =  99,167 -> ceil 1k -> 100,000  (headroom 5,555, 5.9%)  2026-09-16
 *   src/service    business semantics   12,646 × 1.05 =  13,278 -> ceil 1k ->  14,000  (headroom 1,354, 10.7%)  2026-09-16
 *   src/service    interaction layer     6,228 × 1.05 =   6,539 -> ceil 1k ->   7,000  (headroom 772, 12.4%)  2026-09-16
 *   src/service    authored total       20,423 × 1.05 =  21,444 -> ceil 1k ->  22,000  (headroom 1,577, 7.7%)  2026-09-16
 *   src/revenue    business semantics   15,196 × 1.05 =  15,956 -> ceil 1k ->  16,000  (headroom 804, 5.3%)  2026-09-16
 *   src/revenue    interaction layer     2,136 × 1.05 =   2,243 -> ceil 1k ->   3,000  (headroom 864, 40.4%)  2026-09-16
 *   src/revenue    authored total       17,485 × 1.05 =  18,359 -> ceil 1k ->  19,000  (headroom 1,515, 8.7%)  2026-09-16
 *   src/marketing  business semantics    8,001 × 1.05 =   8,401 -> ceil 1k ->   9,000  (headroom 999, 12.5%)  2026-09-16
 *   src/marketing  interaction layer       876 × 1.05 =     920 -> ceil 1k ->   1,000  (headroom 124, 14.2%)  2026-09-16
 *   src/marketing  authored total        9,096 × 1.05 =   9,551 -> ceil 1k ->  10,000  (headroom 904, 9.9%)  2026-09-16
 *
 * `headroom` is the headroom **at anchor time** (`ceiling - reading`, on that
 * row's own run): it is a derivation of the constant beside it, not a live
 * figure, so it deliberately does not track what the gate prints today — the
 * tree keeps moving between re-anchorings.
 *
 * ⚠️ The small modules carry headroom well past 5% and there is no way around
 * it: `anchor()` rounds up to the next 1,000, and on a reading of 876 that step
 * alone is 14%. The rounding is kept anyway — a ceiling a reader can hold in
 * their head is worth more than the last few hundred tokens of precision on a
 * number estimated as `chars / 4` — but it is why the re-anchoring advisory
 * below now asks whether `anchor()` would commit a LOWER number, not merely
 * whether the headroom is large. On a freshly anchored small module the answer
 * is no, and an advisory that fired there would print, on a clean run, an
 * instruction to re-commit the number the file already carries.
 *
 * The `src/sales/` ceilings this replaces, kept as history and as the
 * arithmetic anyone re-deriving the move can check. ⛔ Do not restore one: they
 * were the whole of this table when one package carried it.
 *
 *   src/sales      business semantics   49,978 × 1.05 =  52,477 -> ceil 1k ->  53,000   2026-09-14 (#1905)
 *   src/sales      interaction layer    29,344 × 1.05 =  30,811 -> ceil 1k ->  31,000   2026-09-14 (#1905)
 *   src/sales      authored total       91,910 × 1.05 =  96,506 -> ceil 1k ->  97,000   2026-09-14 (#1905)
 *
 * and, one surface further back, the whole-tree ceilings #1905 retired:
 *
 *   whole tree     business semantics   ruled 100,000 — a maintainer grant (#1601); last reading ~84,579
 *   whole tree     interaction layer    37,424 × 1.05 =  39,295 -> ceil 1k ->  40,000   2026-08-26 (#1316)
 *   whole tree     authored total      133,302 × 1.05 = 139,967 -> ceil 1k -> 140,000   2026-08-17 (#1189)
 *
 * ⚠️ The RULED kind is still a kind this gate knows, and `isAnchored()` is
 * still what the opportunistic-tightening advisory asks (#1607). No committed
 * ceiling declares it today. That is the finished state of this table, not a
 * disabled mechanism: the next grant declares `CEILING_KIND.RULED` and the
 * advisory drops for it without another change here. ⛔ Do not delete the kind
 * because nothing currently uses it — #1607 is the card that explains what
 * breaks when a grant is silently read as anchored.
 *
 * Lower them whenever the tree shrinks — that is free and encouraged. Raising
 * one requires a maintainer ruling quoted in the raising PR's body. Both of
 * those sentences are about an ANCHORED ceiling, which is a function of the
 * tree: it follows the reading down for free and needs a ruling to go up. A
 * RULED ceiling is not a function of the tree, so it is symmetric — LOWERING
 * one requires a ruling quoted in the lowering PR's body, exactly as raising it
 * does. That is the half no automated suggestion can supply, and the reason
 * this gate stopped offering one.
 *
 * COMMITTING A PACKAGE'S FIRST CEILING IS NOT A RAISE. A package that lands on
 * disk with no row here reddens the gate by name (see {@link collect}); the fix
 * is to run `--json`, apply `anchor()` to each reading and add its rows, with
 * no ruling needed, because no committed number moves. ⛔ Do not instead delete
 * the package from a roster — there is none to delete it from, deliberately.
 */
const CEILING_KIND = { ANCHORED: 'anchored', RULED: 'ruled' };

/**
 * The committed ceilings: the package, the label, the number, and the kind that
 * says where the number came from. One declaration — every map below is derived
 * from it, so a ceiling cannot carry its number in one table and its kind in
 * another that disagrees.
 *
 * Keyed by (package, label) since #1928: `business semantics` is no longer one
 * ceiling, it is four, and a table keyed by label alone could not hold them.
 */
const COMMITTED = [
  { module: 'src/sales', label: 'business semantics', ceiling: 55000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/sales', label: 'interaction layer', ceiling: 31000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/sales', label: 'authored total', ceiling: 100000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/service', label: 'business semantics', ceiling: 14000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/service', label: 'interaction layer', ceiling: 7000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/service', label: 'authored total', ceiling: 22000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/revenue', label: 'business semantics', ceiling: 16000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/revenue', label: 'interaction layer', ceiling: 3000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/revenue', label: 'authored total', ceiling: 19000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/marketing', label: 'business semantics', ceiling: 9000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/marketing', label: 'interaction layer', ceiling: 1000, kind: CEILING_KIND.ANCHORED },
  { module: 'src/marketing', label: 'authored total', ceiling: 10000, kind: CEILING_KIND.ANCHORED },
];

// Every committed ceiling declares a kind this module recognises. A ceiling
// that does not is a hard error rather than a default, in either direction: an
// unknown kind that silently read as ruled would drop the advisory for a layer
// that owes it (a weakened ratchet), and one that silently read as anchored
// would restore the #1607 hazard on the next grant. A gate cannot pick the
// safe side here, so it refuses to run — the same reflex as the empty-scope
// rule at the top of this file.
for (const row of COMMITTED) {
  if (!Object.values(CEILING_KIND).includes(row.kind)) {
    throw new Error(
      `ceiling '${row.module} ${row.label}' declares kind '${row.kind}' — expected one of ` +
        `${Object.values(CEILING_KIND).join(', ')}. See the ANCHORED/RULED paragraphs above.`,
    );
  }
}

/**
 * The whole table, in the committed order — the producer every per-package
 * figure is read from. Exported so `test/source-token-ratchet.test.ts` pins the
 * header rows against it rather than against a second copy of the numbers.
 */
export const COMMITTED_CEILINGS = COMMITTED.map((row) => ({ ...row }));

/** One package's ceiling for one label, or `undefined` if none is committed. */
export const ceilingFor = (module, label) =>
  COMMITTED.find((row) => row.module === module && row.label === label)?.ceiling;

/** One package's ceiling KIND for one label, or `undefined` if none. */
export const kindFor = (module, label) =>
  COMMITTED.find((row) => row.module === module && row.label === label)?.kind;

/**
 * The APP PACKAGE's committed ceilings, per label, in the header table's order.
 *
 * Bare-labelled and {@link SCOPE}-only on purpose: this is what
 * `test/docs-readme-token-figures.test.ts` reads, and the README banner is a
 * claim about the package a customer installs — ADR-0130 §1.3(b) — not about
 * the four summed. ⛔ Do not widen it to the other packages: a doc pin that
 * silently started reading `src/marketing`'s ceiling would check the banner
 * against a surface the banner never described.
 */
export const CEILINGS = new Map(
  COMMITTED.filter((row) => row.module === SCOPE).map((row) => [row.label, row.ceiling]),
);

/**
 * The kind per label for the app package — `'anchored'` or `'ruled'`, the
 * distinction #1601 introduced and #1607 lifted out of this header's prose into
 * the code, so a reader and a run answer the question the same way.
 */
export const CEILING_KINDS = new Map(
  COMMITTED.filter((row) => row.module === SCOPE).map((row) => [row.label, row.kind]),
);

/**
 * Is this ceiling derived from a reading this gate printed?
 *
 * The one question the opportunistic-tightening advisory needs to ask before
 * it offers to re-derive a ceiling. False for a maintainer grant, and false
 * for a (package, label) that is not a committed ceiling at all — nothing can
 * be re-anchored from a reading it never had.
 */
export const isAnchored = (module, label) => kindFor(module, label) === CEILING_KIND.ANCHORED;

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

/** The metadata-type directories a package actually holds, repo-relative. */
const packageDirs = (dir) =>
  readdirSync(join(ROOT, dir), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name))
    .map((e) => `${dir}/${e.name}`);

/** Authored (= ratchet-visible) files under one directory. */
const authoredUnder = (dir) =>
  walk(dir)
    .filter(isTs)
    .filter((f) => !EXCLUDED.some((d) => f.startsWith(`${d}/`)));

/**
 * One package's reading: the two headline layers, the residual, and the total.
 *
 * Every row a package owes a ceiling for is produced here, so nothing can be
 * ceilinged in one place and measured in another. Layer membership is keyed by
 * SUBDIRECTORY NAME, which is what makes the same two layers read on every
 * package rather than on the one the paths happened to name.
 */
function measurePackage(dir) {
  const authored = authoredUnder(dir);
  const layered = new Set();
  const layers = LAYERS.map((layer) => {
    const prefixes = layerDirs(dir, layer).map((d) => `${d}/`);
    const files = authored.filter((f) => prefixes.some((prefix) => f.startsWith(prefix)));
    for (const f of files) layered.add(f);
    return { key: layer.key, label: layer.label, ...measure(files) };
  });
  const residual = measure(authored.filter((f) => !layered.has(f)));
  const total = measure(authored);
  const owed = new Set(requiredCeilings(dir));
  const rows = [
    ...layers.map((row) => ({ ...row, ceiling: owed.has(row.label) ? ceilingFor(dir, row.label) : undefined })),
    { key: 'residual', label: RESIDUAL_LABEL, ...residual, ceiling: undefined },
    { key: 'total', label: TOTAL_LABEL, ...total, ceiling: ceilingFor(dir, TOTAL_LABEL) },
  ];
  return { dir, layers, residual, total, rows, owed: [...owed] };
}

/**
 * The reasons this gate refuses to run rather than print a number.
 *
 * Every one of them is a state in which a reading would be produced and would
 * be WRONG in the quiet direction — a package with no ceiling reads exactly
 * like a package under its ceiling, and a layer whose directory names no longer
 * exist reads exactly like a layer nobody writes to. The empty-scope rule at
 * the top of this file is the same reflex; these are the shapes #1928 added
 * with the roster it stopped hand-writing.
 */
function refusals() {
  const problems = [];

  if (PACKAGE_DIRS.length === 0) {
    problems.push(
      `no directory under ${SRC}/ carries an objects/ directory, so this ratchet has nothing ` +
        'to measure and would pass by measuring nothing. Teach the package predicate the new ' +
        'layout rather than leaving it green over an empty tree.',
    );
    return problems; // every check below would be vacuous against an empty roster
  }

  if (!PACKAGE_DIRS.includes(SCOPE)) {
    problems.push(
      `${SCOPE} is not one of the packages on disk (${PACKAGE_DIRS.join(', ')}), and it is the ` +
        'package the README banner and ADR-0130 §1.3(b) make their claim about. Re-point SCOPE ' +
        'in the same PR that moves it — a headline claim whose surface moved is not a claim.',
    );
  }

  // A layer whose directory names have vanished from EVERY package is a layer
  // that was renamed under the gate. Each package would then read 0 for it and
  // owe no ceiling, so nothing else here would notice: the gate would go green
  // having stopped measuring half the surface.
  for (const layer of LAYERS) {
    if (!PACKAGE_DIRS.some((dir) => layerPresent(dir, layer))) {
      problems.push(
        `no package holds any '${layer.label}' directory (${layer.dirs.join(', ')}). Either the ` +
          'metadata-type directories were renamed — re-point LAYERS in the same PR — or this ' +
          'layer stopped existing, which is a decision to make deliberately rather than by rename.',
      );
    }
  }

  // A package with no ceilings, and a ceiling with no package. Both are silent
  // on their own: the first is an unratcheted package, the second is a number
  // guarding a surface that is gone.
  for (const dir of PACKAGE_DIRS) {
    const owed = requiredCeilings(dir);
    const missing = owed.filter((label) => ceilingFor(dir, label) === undefined);
    if (missing.length) {
      problems.push(
        `${dir} carries no committed ceiling for: ${missing.join(', ')}. A package on disk with ` +
          'no ceiling reads exactly like a package under its ceiling. Run this gate with --json, ' +
          'apply anchor() to each reading and add the rows to COMMITTED — a package\'s FIRST ' +
          'ceiling is an anchoring, not a raise, so it needs no ruling.',
      );
    }
  }
  const onDisk = new Set(PACKAGE_DIRS);
  for (const row of COMMITTED) {
    if (!onDisk.has(row.module)) {
      problems.push(
        `a ceiling is committed for ${row.module} ('${row.label}'), which is not a package on ` +
          `disk (${PACKAGE_DIRS.join(', ')}). Drop the row in the PR that removed the package.`,
      );
      continue;
    }
    if (!requiredCeilings(row.module).includes(row.label)) {
      problems.push(
        `a ceiling is committed for ${row.module} '${row.label}', but that package holds none of ` +
          'the directories that layer measures, so the row can only ever be red or vacuous. ' +
          'Drop it, or give the package the directories.',
      );
    }
  }

  return problems;
}

function collect() {
  const problems = refusals();
  if (problems.length) {
    console.error('\u2717 source token ratchet: refusing to run.');
    for (const problem of problems) console.error(`  • ${problem}`);
    process.exit(1);
  }

  const packages = PACKAGE_DIRS.map(measurePackage);
  const scoped = packages.find((pkg) => pkg.dir === SCOPE);
  const excludedFiles = PACKAGE_DIRS.flatMap((dir) =>
    walk(dir)
      .filter(isTs)
      .filter((f) => EXCLUDED.some((d) => f.startsWith(`${d}/`))),
  );
  return { packages, scoped, excluded: measure(excludedFiles) };
}

function main() {
  const report = collect();

  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          surface:
            `${SRC}/<package>/**/*.ts per package, comment-stripped and blank-stripped, minus ` +
            EXCLUDED.join(' + '),
          estimator: 'chars / 4',
          headlinePackage: SCOPE,
          packages: report.packages.map((pkg) => ({
            dir: pkg.dir,
            ratcheted: true,
            headline: pkg.dir === SCOPE,
            scopes: pkg.rows.map(({ label, files, lines, chars, tokens, ceiling }) => ({
              label,
              files,
              lines,
              chars,
              tokens,
              ceiling: ceiling ?? null,
              kind: kindFor(pkg.dir, label) ?? null,
            })),
            total: { ...pkg.total },
          })),
          // The app package's rows under their bare labels, unchanged since
          // before #1928: `test/docs-readme-token-figures.test.ts` reads this
          // key, and the README banner is a claim about this package alone.
          scopes: report.scoped.rows.map(({ label, files, lines, chars, tokens, ceiling }) => ({
            label,
            files,
            lines,
            chars,
            tokens,
            ceiling: ceiling ?? null,
            kind: kindFor(SCOPE, label) ?? null,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    `Source token ratchet — every package under ${SRC}/ carries its own ceilings\n` +
      '  (comments and blank lines stripped; ~tokens = stripped chars / 4)\n',
  );

  const pad = (s, w) => String(s).padStart(w);
  const cell = (row) => (row.ceiling === undefined ? '—' : fmt(row.ceiling));
  for (const pkg of report.packages) {
    console.log(`  ${pkg.dir}${pkg.dir === SCOPE ? '   ← the README headline claim (ADR-0130 §1.3(b))' : ''}`);
    console.log(
      `  ${'  scope'.padEnd(26)}${pad('files', 6)}${pad('lines', 8)}${pad('chars', 10)}${pad('~tokens', 10)}${pad('ceiling', 10)}`,
    );
    for (const row of pkg.rows) {
      if (row.label === TOTAL_LABEL) console.log(`    ${'─'.repeat(66)}`);
      console.log(
        `  ${`  ${row.label}`.padEnd(26)}${pad(row.files, 6)}${pad(fmt(row.lines), 8)}${pad(fmt(row.chars), 10)}${pad(fmt(row.tokens), 10)}${pad(cell(row), 10)}`,
      );
    }

    // A directory in neither headline layer nor the exclusion list still lands
    // in the package total, so it cannot grow unwatched — but a *new* metadata
    // type usually belongs in one of the two layers, and saying so here is
    // cheaper than noticing it a quarter later in a drifted headline number.
    const known = new Set([...LAYERS.flatMap((l) => layerDirs(pkg.dir, l)), ...EXCLUDED]);
    const unlayered = packageDirs(pkg.dir).filter((d) => !known.has(d));
    if (unlayered.length) {
      console.log(`    ℹ️  not in a headline layer (counted in the total only): ${unlayered.join(', ')}`);
    }
    console.log('');
  }

  console.log(
    `  outside the ratchet by ruling (${EXCLUDED.join(', ')}): ` +
      `${report.excluded.files} files, ~${fmt(report.excluded.tokens)} tokens — healthy growth, never measured here.\n`,
  );
  console.log(
    `  Headline (${SCOPE}): ${report.scoped.layers
      .map((s) => `${s.label} ${headline(s.tokens)}`)
      .join(' · ')} · authored total ${headline(report.scoped.total.tokens)}\n`,
  );

  let failed = 0;
  for (const pkg of report.packages) {
    for (const row of pkg.rows) {
      if (row.ceiling === undefined) continue;
      const label = `${pkg.dir} ${row.label}`;
      const v = verdict(label, row.tokens, row.ceiling);
      if (!v.ok) {
        failed++;
        console.error(`  ✗ ${v.msg}`);
        continue;
      }
      console.log(`  ✓ ${v.msg}`);

      // A RULED ceiling is never offered for opportunistic tightening (#1607).
      // The advisory below says "your reading anchors lower than the committed
      // ceiling, so re-derive it" — a sentence that presumes the ceiling was
      // derived from a reading. A maintainer grant was not: its headroom IS the
      // grant, so an automated offer to reclaim the headroom is an automated
      // offer to undo the ruling, printed fresh on every run and reading as this
      // gate's own recommendation. It says what the row is instead, because the
      // exemption is worth stating where a reader meets it — silence would look
      // like a ceiling nobody had thought about.
      if (!isAnchored(pkg.dir, row.label)) {
        console.log(
          '      ℹ️  ruled ceiling — a maintainer grant, not `anchor()` of a reading, so this gate does ' +
            `not offer to re-anchor it; the ~${fmt(row.ceiling - row.tokens)} tokens of headroom are the ` +
            "ruling's. Lowering it needs a ruling quoted in the lowering PR, exactly as raising it does.",
        );
        continue;
      }

      // Nag only when the ceiling has drifted well past the ruled buffer — i.e.
      // the tree has shrunk enough that `anchor()` would now commit a lower
      // number. A flat "headroom is over Nk" threshold cannot be used any more:
      // under 「给 5% 缓冲」 a healthy scope carries thousands of tokens of
      // headroom by design, so a flat threshold would fire on every clean run and
      // tell the author to undo the ruling. The trigger is therefore relative and
      // one whole buffer clear of it (10% vs the ruled 5%), so ordinary shrinkage
      // inside the buffer stays quiet.
      //
      // ⚠️ AND it must actually re-anchor LOWER. `anchor()` rounds up to the next
      // 1,000, and on the small modules #1928 ceilinged that rounding step alone
      // is 10–40% of the reading: `anchor(876) = 1,000` on a committed 1,000.
      // Without this half the advisory printed, on a clean run and on a ceiling
      // committed that same day, an instruction to re-anchor a ceiling to the
      // number it already is — noise that teaches a reader to skip the line the
      // day it means something.
      const suggested = anchor(row.tokens);
      if (row.ceiling - row.tokens > row.tokens * 2 * BUFFER && suggested < row.ceiling) {
        console.log(
          `      ℹ️  headroom is ${fmt(row.ceiling - row.tokens)} tokens, over twice the 5% buffer — ` +
            `re-anchor this ceiling to ~${fmt(suggested)} in your PR; shrink-only ratchets tighten opportunistically.`,
        );
      }
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
// `COMMITTED_CEILINGS` (it sizes its fixtures per package from that table,
// pins the twelve worked rows in the header above against `anchor()`, and
// holds those rows' ruled/anchored kinds to the ones the table declares), and
// `test/docs-readme-token-figures.test.ts` imports `BUFFER` and `CEILINGS` to
// check the README banner. So a re-anchoring moves the constant and the copies
// follow.
//
// ⚠️ The two ceiling exports are NOT interchangeable and #1928 is why.
// `COMMITTED_CEILINGS` is the whole twelve-row table; `CEILINGS` is the app
// package's three rows under bare labels, which is what the README pin wants
// and all it should ever see. A doc guard that started reading the full table
// would check the banner against packages the banner never described.
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
// re-derived at 57ce720 (2026-09-05). Its predecessor said only two suites
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
