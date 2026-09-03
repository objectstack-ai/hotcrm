// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import {
  SCANNED,
  TEXT_SCANNED,
  ROOT_TEXT_FILES,
} from '../scripts/lib/source-hygiene-surface.mjs';

/**
 * `scripts/check-source-hygiene.mjs` scan-surface guard (#818, #838).
 *
 * The gate runs five checks over three surfaces, and the split is the part that
 * silently rots: a check whose directory list no longer covers the files people
 * write is not red, it is *vacuous* — exactly the failure the script was
 * written to end. Before #818 the control-byte scan read `src/test/e2e/scripts`
 * only, so `content/` (all product docs) and `.changeset/` (a file every PR
 * adds) were invisible to it; #807 changed four files and the gate saw one.
 *
 * #838 widened the same check again — and only that check — to `docs/`,
 * `.github/`, `.claude/` and a whitelist of root-level first-class files,
 * including the three root `.ts` configs no check had ever read. The gate was
 * blind to all of it: the same planted bytes that make the current gate report
 * four violations left the pre-#838 gate reporting "source hygiene clean".
 *
 * The code-level checks did NOT move to the TEXT TREES with it, and still have
 * not — `console.log` is legitimate prose in the marketplace docs, and the
 * 100KB cap's remedy ("split the file") is a review argument about modules, not
 * documentation pages (#814).
 *
 * The ROOT is the half that did move. #838 left it in the byte check alone and
 * recorded widening the two `.ts` checks as "a different argument"; #1236 made
 * it, because the root `.ts` files are first-party TypeScript and the header
 * check's requirement of PRESENCE has the same force there as under `src/`. So
 * `allTs` is now `SCANNED`'s `.ts` plus the `.ts` members of the root
 * whitelist. Every boundary is pinned below in the direction it actually runs:
 * the byte scan's width, the text trees still being off the code-level checks,
 * the root `.ts` now being ON the marker and header checks, and the root still
 * being off `console.log` and the size cap. A later change to any of them is a
 * deliberate edit to this file rather than an accident. The lock-file
 * exclusion is pinned in the same direction, and it is a GUARD rather than an
 * inventory: the byte check reads a whitelist, and what is pinned is that no
 * lock-file name is on it — a property that has to hold whether or not such a
 * file sits at the root today. One does (`pnpm-lock.yaml`); one is a name held
 * out of the whitelist against its return (`package-lock.json`, retired with
 * the StackBlitz demo in #1469). See `ROOT_EXCLUDED_FILES` below.
 *
 * Mechanics: the script derives its repo root from its own location
 * (`new URL('..', import.meta.url)`), so copying it into `<sandbox>/scripts/`
 * makes a throwaway directory its root. That runs the real, unmodified script
 * against fixtures we control, without adding a test-only seam to production
 * tooling and without ever writing a control byte into the real tree.
 */

/**
 * The gate's scan surface, imported from the gate's own producer instead of
 * copied (#1314).
 *
 * All three lists used to be spelled out here by hand, and nothing checked them
 * against the gate. #1236 made that load-bearing: `rootFixture()` below
 * branches on `ROOT_TEXT_FILES` to decide which fixtures need a copyright
 * header, so a root file added to the gate and not to this copy left every case
 * in this file green while silently never exercising it. The fixtures now
 * follow the surface.
 */

/** Trees the code-level checks judge. */
const CODE_TREES = SCANNED;

/** Trees only the control-byte check judges. */
const TEXT_TREES = TEXT_SCANNED;

// `ROOT_TEXT_FILES` — the root-level files only the control-byte check judges
// (#838) — is used below under the gate's own name. The gate requires every one
// of them to exist (a listed file that vanished would scan nothing), so the
// sandbox materialises all of them before any run.

/**
 * Lock-file names the control-byte check must NOT read — whether or not a file
 * of that name is at the root.
 *
 * This is an assertion about `ROOT_TEXT_FILES`, not an inventory of the tree.
 * The byte check reads a whitelist, so what the case below pins is that neither
 * name is on it. Both would be false hits: a lock file is generated, so the
 * remedy the check prints ("write the character as an escape") has no author to
 * reach — the argument is written out beside `ROOT_TEXT_FILES` in the surface
 * module.
 *
 * The two entries no longer stand on the same footing, and that is the point
 * rather than the defect:
 *
 *   - `pnpm-lock.yaml` is at the root and excluded by a live, written decision.
 *   - `package-lock.json` is absent. #1469 retired it with the StackBlitz demo
 *     it existed for. It stays here as a guard rather than as a fixture for a
 *     file we have: the deletion was a DECISION, not an impossibility, and a
 *     returning npm lock file must not join the byte-scan surface by default.
 *
 * ⭐ That the second entry is a LIVE guard was measured, not assumed (#1470):
 * adding `package-lock.json` back to the gate's `ROOT_TEXT_FILES` turns the case
 * below red on the byte it plants there. Deleting the entry deletes that.
 *
 * ⚠️ Hand-maintained, unlike `ROOT_TEXT_FILES` above, which is imported from the
 * gate because #1314 found hand-copied surface lists rot silently. Here it is
 * hand-maintained by necessity — this names what the gate does NOT declare, so
 * there is nothing to import — and #1314's failure still found it: the prose
 * around this list went on describing a pair of files at the root for a round
 * after one of them was deleted. Only prose can rot here, so only prose is the
 * thing to keep honest.
 */
const ROOT_EXCLUDED_FILES = ['pnpm-lock.yaml', 'package-lock.json'];

const GATE = 'scripts/check-source-hygiene.mjs';

/**
 * First-party modules the gate imports — the sandbox copy needs them too.
 *
 * Hand-maintained, and safe to be: an import the sandbox does not carry makes
 * the spawned gate die with `ERR_MODULE_NOT_FOUND` and takes every case in this
 * file down with it. It cannot rot quietly, which is exactly the property the
 * surface lists lacked while they were copied by hand (#1314).
 */
const GATE_DEPENDENCIES = ['scripts/lib/source-hygiene-surface.mjs'];

const HEADER = '// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.';

/**
 * Root fixture contents. The root `.ts` files joined the copyright-header and
 * marker checks in #1236, so a bare `placeholder` there would make every
 * clean-tree run in this file red on a header finding instead of proving what
 * the case is about.
 */
function rootFixture(file: string): string {
  return file.endsWith('.ts') ? `${HEADER}\nplaceholder\n` : 'placeholder\n';
}

/**
 * Assembled at runtime on purpose: this file is itself scanned by the gate's
 * marker check, and spelling the marker literally would fail the very check it
 * is here to exercise.
 */
const MARKER = ['TO', 'DO'].join('');

/**
 * The marker check's own headline, assembled for exactly the reason `MARKER`
 * is: asserting on it is asserting on a string that contains both marker
 * words, and spelling either one here would fail the check under test.
 */
const MARKER_CHECK = `no ${MARKER}/${['FIX', 'ME'].join('')} markers`;

/**
 * The bytes under test, built from their code points instead of being spelled
 * into this file. Every fixture byte is materialised at run time inside a
 * temporary directory, so no file in this repository — least of all the one
 * arguing about control bytes — ever holds one, and no editor or agent writing
 * here has to round-trip a literal byte. Both are present because the gate
 * guards the whole class, not just NUL.
 */
const NUL = String.fromCharCode(0x00);
const SOH = String.fromCharCode(0x01);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hygiene-surface-'));
  for (const dir of [...CODE_TREES, ...TEXT_TREES]) mkdirSync(join(root, dir), { recursive: true });
  for (const file of ROOT_TEXT_FILES) writeFileSync(join(root, file), rootFixture(file));
  for (const dep of [GATE, ...GATE_DEPENDENCIES]) {
    mkdirSync(dirname(join(root, dep)), { recursive: true });
    copyFileSync(join(REPO_ROOT, dep), join(root, dep));
  }
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(rel: string, contents: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/**
 * Run the gate against the sandbox root; never throws, never inherits stderr.
 *
 * `stdio` is pinned so the fixture-driven `✗ source hygiene …` lines are
 * CAPTURED rather than echoed into the parent's log (#1302) — this file was
 * the single largest contributor, 29 of the 64 measured lines.
 * `error.stderr` is populated either way, so every assertion on the failure
 * text below is unchanged. See test/verify-log-decoy-pin.test.ts.
 */
function runGate(): { status: number; output: string } {
  try {
    const stdout = execFileSync(process.execPath, [join(root, GATE)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: stdout };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? -1,
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
    };
  }
}

describe('source hygiene — scan surface', () => {
  it('passes on a clean tree (the harness is not vacuously red)', () => {
    write('content/docs/guide.mdx', '# Guide\n\nOrdinary prose.\n');
    write('.changeset/entry.md', '---\n---\n\nOrdinary changeset.\n');

    const { status, output } = runGate();
    expect(status).toBe(0);
    expect(output).toContain('source hygiene clean');
    // The header names the byte-scan surface, so a reader of a red run can tell
    // which surface produced the finding — trees by name, root files by count.
    expect(output).toContain(TEXT_SCANNED.join(', '));
    expect(output).toContain(`${ROOT_TEXT_FILES.length} root file(s)`);
    // The `.ts` surface names its root count too (#1236) — a widened check that
    // scanned an empty set would print 0 here and pass every case in this file.
    expect(output).toContain(
      `plus ${ROOT_TEXT_FILES.filter((f) => f.endsWith('.ts')).length} root .ts file(s)`,
    );
  });

  it('binds each banner figure to the surface its own checks read (#1339)', () => {
    // ## What was wrong
    //
    // The banner was one sentence, and its opening figure was
    // `codeFiles.length` — EVERY file type the walk returns — while the clause
    // that figure sat in named the marker and copyright-header checks, which
    // read `allTs`: `.ts` only. On `main` when this was written the sentence
    // said "340 files … plus 3 root .ts file(s) in the marker and header
    // checks" where those checks were reading 329 files.
    //
    // ⚠️ Not a stale constant: the gap WIDENS on its own, because every
    // non-`.ts` file added anywhere under the scanned trees moves
    // `codeFiles.length` and leaves `allTs` alone. #1343 added one and took the
    // gap from 13 to 14 without touching the banner.
    //
    // ## Why this fixture is shaped this way
    //
    // ⭐ A green run proves nothing here — the gate was green all along, and so
    // was this file. What the assertion needs is a sandbox where the two
    // figures DISAGREE, so that printing the wrong one is visible. So the tree
    // below carries three `.ts` files under the code trees and six non-`.ts`
    // beside them (four written here, plus the gate and its dependency that
    // `beforeEach` copies into `scripts/`). Marker/header surface = 3 + the
    // root `.ts`; walk surface = 9. Print the walk figure in the marker clause
    // and this case goes red.
    const gateCopies = [GATE, ...GATE_DEPENDENCIES];
    // The arithmetic below counts them as non-`.ts`; a `.ts` dependency added
    // to the gate must move this fixture rather than silently skew it.
    expect(gateCopies.every((f) => !f.endsWith('.ts'))).toBe(true);

    write('src/objects/account.object.ts', `${HEADER}\nexport const account = 1;\n`);
    write('test/account.test.ts', `${HEADER}\nexport const spec = 1;\n`);
    write('e2e/smoke.spec.ts', `${HEADER}\nexport const smoke = 1;\n`);

    // Non-`.ts` under the SAME trees, every one carrying a marker. The size cap
    // and the byte scan read them; the marker and header checks never open one
    // — which is the whole reason the two figures may not share a clause, and
    // is asserted below by the run staying green.
    write('src/docs/overview.md', `# Overview — ${MARKER}: prose, not judged here\n`);
    write('scripts/helper.mjs', `export const x = 1; // ${MARKER}: not judged here\n`);
    write('scripts/live-schema.sh', `#!/usr/bin/env bash\n# ${MARKER}: not judged here\n`);
    write('test/fixture.json', `{ "note": "${MARKER}: not judged here" }\n`);

    const rootTs = ROOT_TEXT_FILES.filter((f) => f.endsWith('.ts'));
    const tsUnderCodeTrees = 3;
    const nonTsUnderCodeTrees = 4 + gateCopies.length;

    const markerHeaderSurface = tsUnderCodeTrees + rootTs.length;
    const walkSurface = tsUnderCodeTrees + nonTsUnderCodeTrees;
    // The control that makes the two assertions below discriminating rather
    // than decorative. If a later change to `beforeEach` ever made these equal,
    // this case would pass on a mis-bound banner and say nothing.
    expect(walkSurface).toBeGreaterThan(markerHeaderSurface);

    const { status, output } = runGate();
    expect(status).toBe(0);

    const bannerLine = (label: string): string =>
      output.split('\n').find((l) => l.includes(label)) ?? '';

    // ⭐ The card's acceptance: the figure printed beside the marker and header
    // checks equals what those checks consume — `allTs`, which in this sandbox
    // is exactly the `.ts` written above plus the root `.ts` whitelist.
    expect(bannerLine('markers, copyright header')).toContain(`${markerHeaderSurface} .ts file(s)`);
    expect(bannerLine('markers, copyright header')).not.toContain(`${walkSurface} .ts file(s)`);

    // …and `codeFiles.length` is not deleted, it is re-homed: it is a live
    // reading, and this is the pair of checks that actually measures that set.
    expect(bannerLine('size cap, size advisory')).toContain(`${walkSurface} file(s) under`);

    // The gap is real, not a wording difference: six marker-bearing non-`.ts`
    // files sit inside the walked trees and the marker check opens none of
    // them. Whatever number that clause prints, this is the set behind it.
    expect(output).toContain(`\u2713 ${MARKER_CHECK}`);
    expect(output).toContain('source hygiene clean');
  });

  it('reports a control byte under content/, naming the file, byte and column', () => {
    write('content/docs/guide.mdx', `# Guide\n\nbefore${SOH}after\n`);

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('content/docs/guide.mdx:3');
    expect(output).toContain('control byte 0x01 at column 7');
    expect(output).toContain('no raw control bytes');
  });

  it('reports a raw NUL under .changeset/', () => {
    write('.changeset/entry.md', `---\n---\n\nkey${NUL} value\n`);

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('.changeset/entry.md:4');
    expect(output).toContain('control byte 0x00 at column 4');
  });

  it.each([
    ['docs/maintenance-notes.md', `# Notes\n\nbefore${SOH}after\n`, 'docs/maintenance-notes.md:3'],
    ['.github/workflows/ci.yml', `name: CI\non:\n  push:${NUL}\n`, '.github/workflows/ci.yml:3'],
    ['.claude/launch.json', `{\n  "a": "b${SOH}c"\n}\n`, '.claude/launch.json:2'],
  ])('reports a control byte under %s (#838)', (file, contents, expected) => {
    write(file, contents);

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain(expected);
    expect(output).toContain('no raw control bytes');
  });

  it.each(ROOT_TEXT_FILES)('reports a control byte in the root file %s (#838)', (file) => {
    // The `.ts` members keep their header (#1236) so this case stays about the
    // byte: without it the run would also carry a header violation, and the
    // planted byte moves one line down accordingly.
    const isTs = file.endsWith('.ts');
    write(file, `${isTs ? `${HEADER}\n` : ''}placeholder${SOH}\n`);

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain(`${file}:${isTs ? 2 : 1}`);
    expect(output).toContain('control byte 0x01 at column 12');
    expect(output).not.toContain('no copyright header');
  });

  it('does NOT read a lock file at the root, present or returning (#838, #1470)', () => {
    // A byte is planted under BOTH names, including the one with no file at the
    // root today: the subject is the gate's whitelist, which holds neither, and
    // the property has to survive a lock file appearing. It discriminates in
    // the direction that matters — a name that joined `ROOT_TEXT_FILES` is read
    // here and turns this red, which was measured rather than assumed (#1470).
    for (const file of ROOT_EXCLUDED_FILES) write(file, `key: value${NUL}\n`);

    const { status, output } = runGate();
    expect(status).toBe(0);
    expect(output).toContain('source hygiene clean');
  });

  it('does not extend the code-level checks to the new trees (#838)', () => {
    // Each of these would be a violation if a code-level check had been widened
    // along with the byte scan: a marker in a stray .ts under a text tree, a
    // documented CLI one-liner that prints, and a doc page past the 100KB cap.
    // The ROOT no longer belongs in this list — see the two cases below (#1236).
    write('docs/stray.ts', `export const x = 1; // ${MARKER}: not judged here\n`);
    write('.github/notes.md', '```bash\nnode -e "console.log(1)"\n```\n');
    write('docs/huge.md', `${'x'.repeat(120 * 1024)}\n`);

    const { status, output } = runGate();
    expect(status).toBe(0);
    expect(output).toContain('source hygiene clean');
  });

  it('DOES extend the marker and header checks to the root .ts files (#1236)', () => {
    // #838 put the root in the byte check only and called widening the two
    // `.ts` checks "a different argument", which #1236 then settled: these are
    // first-party TypeScript, and the header check requires PRESENCE for a
    // reason (deleting the header must not satisfy a position-only rule) that
    // does not stop at the repo root. Both halves are asserted, so narrowing
    // this back is a deliberate edit to this file rather than an accident.
    write('objectstack.config.ts', 'export default { name: "hotcrm" };\n');
    write('vitest.config.ts', `${HEADER}\nexport const x = 1; // ${MARKER}: judged now\n`);

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('objectstack.config.ts:1');
    expect(output).toContain('no copyright header');
    expect(output).toContain('vitest.config.ts:2');
    expect(output).toContain(MARKER_CHECK);
  });

  it('leaves the console.log and size checks off the root .ts files (#1236)', () => {
    // Only the two `.ts` checks moved. `console.log` stays `src/`-only — the
    // root configs are entry points, not runtime hook bodies — and the size cap
    // keeps reading the walked code trees, so neither of these is a violation.
    write('objectstack.config.ts', `${HEADER}\nconsole.log('config loaded');\n`);
    write('vitest.config.ts', `${HEADER}\nexport const big = '${'y'.repeat(120 * 1024)}';\n`);

    const { status, output } = runGate();
    expect(status).toBe(0);
    expect(output).toContain('source hygiene clean');
  });

  it('fails loudly when a whitelisted root file is absent, naming the constant', () => {
    rmSync(join(root, 'objectstack.config.ts'), { force: true });

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('scanned root file(s) missing: objectstack.config.ts');
    expect(output).toContain('Update ROOT_TEXT_FILES');
  });

  it('still reports a control byte under the original code trees', () => {
    write('src/probe.ts', `export const separator = "a${NUL}b";\n`);

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('src/probe.ts:1');
    expect(output).toContain('control byte 0x00');
  });

  it('does not extend the console.log, marker or size checks to the text trees', () => {
    // All three would be violations if the code-level checks had been widened:
    // a documented CLI one-liner that prints, a marker in a stray .ts file, and
    // a page well past the 100KB cap.
    write('content/docs/publishing.mdx', '# Publishing\n\n```bash\nnode -e "console.log(1)"\n```\n');
    write('content/stray.ts', `export const x = 1; // ${MARKER}: not judged here\nconsole.log(x);\n`);
    write('content/docs/huge.mdx', `${'x'.repeat(120 * 1024)}\n`);

    const { status, output } = runGate();
    expect(status).toBe(0);
    expect(output).toContain('source hygiene clean');
  });

  it('keeps applying the size cap inside the code trees', () => {
    write('src/huge.ts', `export const x = "${'y'.repeat(120 * 1024)}";\n`);

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('src/huge.ts');
    expect(output).toContain('over 100KB');
  });

  it('fails loudly when a scanned tree is absent, text trees included', () => {
    for (const dir of TEXT_TREES) {
      rmSync(join(root, dir), { recursive: true, force: true });

      const { status, output } = runGate();
      expect(status).toBe(1);
      expect(output).toContain(`missing: ${dir}`);

      mkdirSync(join(root, dir), { recursive: true });
    }
  });
});
