// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

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
 * The code-level checks deliberately did NOT move with it — `console.log` is
 * legitimate prose in the marketplace docs, the marker and copyright-header
 * checks read `.ts` via `allTs` (derived from `SCANNED`), and the 100KB cap's
 * remedy ("split the file") is a review argument about modules, not
 * documentation pages (#814). Both halves are pinned below: widening the byte
 * scan is asserted, and NOT widening the others is asserted just as explicitly,
 * so a later change to either is a deliberate edit to this file rather than an
 * accident. The two lock files are pinned the same way — they are text, they
 * sit at the root, and they are excluded on purpose.
 *
 * Mechanics: the script derives its repo root from its own location
 * (`new URL('..', import.meta.url)`), so copying it into `<sandbox>/scripts/`
 * makes a throwaway directory its root. That runs the real, unmodified script
 * against fixtures we control, without adding a test-only seam to production
 * tooling and without ever writing a control byte into the real tree.
 */

/** Trees the code-level checks judge. */
const CODE_TREES = ['src', 'test', 'e2e', 'scripts'];

/** Trees only the control-byte check judges. */
const TEXT_TREES = ['content', '.changeset', 'docs', '.github', '.claude'];

/**
 * Root-level files only the control-byte check judges (#838), mirroring
 * `ROOT_TEXT_FILES` in the gate. The gate requires every one of them to exist —
 * a listed file that vanished would scan nothing — so the sandbox has to
 * materialise all of them before any run.
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

/** Root-level text files the control-byte check deliberately does NOT read. */
const ROOT_EXCLUDED_FILES = ['pnpm-lock.yaml', 'package-lock.json'];

const GATE = 'scripts/check-source-hygiene.mjs';

/**
 * Assembled at runtime on purpose: this file is itself scanned by the gate's
 * marker check, and spelling the marker literally would fail the very check it
 * is here to exercise.
 */
const MARKER = ['TO', 'DO'].join('');

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
  for (const file of ROOT_TEXT_FILES) writeFileSync(join(root, file), 'placeholder\n');
  copyFileSync(join(REPO_ROOT, GATE), join(root, GATE));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(rel: string, contents: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/** Run the gate against the sandbox root; never throws. */
function runGate(): { status: number; output: string } {
  try {
    const stdout = execFileSync(process.execPath, [join(root, GATE)], { encoding: 'utf8' });
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
    expect(output).toContain('content, .changeset, docs, .github, .claude');
    expect(output).toContain(`${ROOT_TEXT_FILES.length} root file(s)`);
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
    write(file, `placeholder${SOH}\n`);

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain(`${file}:1`);
    expect(output).toContain('control byte 0x01 at column 12');
  });

  it('does NOT read the lock files, which are excluded on purpose (#838)', () => {
    // Text, and at the root the whitelist covers — but generated by pnpm/npm,
    // so the check's remedy ("write it as an escape") has no author to reach.
    // Excluding them is a decision, so it is pinned like one.
    for (const file of ROOT_EXCLUDED_FILES) write(file, `key: value${NUL}\n`);

    const { status, output } = runGate();
    expect(status).toBe(0);
    expect(output).toContain('source hygiene clean');
  });

  it('does not extend the code-level checks to the new trees or the root (#838)', () => {
    // Each of these would be a violation if a code-level check had been widened
    // along with the byte scan: a marker and a header-less .ts file in the new
    // trees and at the root, and a doc page well past the 100KB cap.
    write('docs/stray.ts', `export const x = 1; // ${MARKER}: not judged here\n`);
    write('objectstack.config.ts', 'export default { name: "hotcrm" };\n');
    write('.github/notes.md', '```bash\nnode -e "console.log(1)"\n```\n');
    write('docs/huge.md', `${'x'.repeat(120 * 1024)}\n`);

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
