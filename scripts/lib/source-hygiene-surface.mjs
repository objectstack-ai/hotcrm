// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The source-hygiene gate's SCAN SURFACE — declared once (#1314).
 *
 * `scripts/check-source-hygiene.mjs` imports these three lists, and so do the
 * three sandbox suites that run it: `test/source-hygiene-scan-surface.test.ts`,
 * `test/source-hygiene-size-advisory.test.ts` and
 * `test/source-hygiene-header-position.test.ts`. One producer with four
 * consumers is the entire point of this file.
 *
 * ## What was wrong
 *
 * Each of those suites builds a throwaway repo, materialises the gate's
 * surface, and runs the REAL gate against it — the gate derives its root from
 * its own location, so a copy under `<sandbox>/scripts/` makes the sandbox its
 * root. To materialise a surface you must know it, and until this change all
 * three suites declared their own copy of all three lists, maintained by hand
 * and checked by nothing. The third spelled them a third way
 * (`REQUIRED_TREES` / `REQUIRED_ROOT_FILES`), so even a grep for the constant
 * name found two of the three.
 *
 * #1236 turned that duplication from wasteful into load-bearing. The root `.ts`
 * files joined the marker and copyright-header checks, so each suite's
 * `rootFixture()` branches on **its own** copy of `ROOT_TEXT_FILES` to decide
 * which fixtures need a header. A fourth root `.ts` added to the gate therefore
 * left all three suites green *while silently not exercising it at all* — a
 * gate whose tests certify a surface the gate no longer has, which is the exact
 * failure class the gate exists to end, one level up.
 *
 * ⚠️ The gate's own missing-file guard cannot catch this. It fires when a
 * whitelisted file is absent from DISK; a suite's list being stale relative to
 * the gate's is invisible to it.
 *
 * ## Why a sibling module rather than exports on the gate itself
 *
 * Both shapes are route 1 of the card, and the cost that used to rule route 1
 * out is gone: #1321 landed `allowJs` repo-wide, and
 * `test/source-token-ratchet.test.ts` already imports constants from a gate
 * `.mjs` under `strict` with `tsc --noEmit` green. What decides between the two
 * shapes is side effects. The gate runs its checks at module top level and
 * calls `process.exit(1)`, so importing IT from a suite would run the whole
 * gate over the real repo at import time and could take a vitest worker down
 * with it. Making that safe means wrapping ~90 lines of top-level statements in
 * a `main()` behind `isMainModule()` — which re-indents the gate's banner line,
 * and that line belongs to #1339, serialised on this same file.
 *
 * A module with no top-level side effects is importable by construction: no
 * guard to get wrong (`scripts/lib/main-module.mjs` exists because that
 * comparison was hand-rolled wrong twice, #1252), no output, no exit, and the
 * gate's executable body is left untouched.
 *
 * ⛔ Keep this file side-effect free and free of first-party dependencies. The
 * gate must stay runnable as bare `node scripts/check-source-hygiene.mjs` with
 * no build step — every workflow invokes it that way — and each suite copies
 * this file into its sandbox next to the gate.
 *
 * ⚠️ These lists ARE the surface, not a description of one: editing an entry
 * here moves what the gate reads and what every suite materialises, together.
 * That is the property #1314 bought, and the reason there is nothing here to
 * assert against.
 */

// The code directories these checks are guarding. A typo here (or a directory
// that gets renamed out from under us) must be loud, not silently vacuous —
// that is the exact failure mode this script exists to fix.
export const SCANNED = ['src', 'test', 'e2e', 'scripts'];

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
export const TEXT_SCANNED = ['content', '.changeset', 'docs', '.github', '.claude'];

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
export const ROOT_TEXT_FILES = [
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
