// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * `scripts/check-source-hygiene.mjs` scan-surface guard (#818).
 *
 * The gate runs four checks over two different trees, and the split is the part
 * that silently rots: a check whose directory list no longer covers the files
 * people write is not red, it is *vacuous* — exactly the failure the script was
 * written to end. Before #818 the control-byte scan read `src/test/e2e/scripts`
 * only, so `content/` (all product docs) and `.changeset/` (a file every PR
 * adds) were invisible to it; #807 changed four files and the gate saw one.
 *
 * The three code-level checks deliberately did NOT move with it — `console.log`
 * is legitimate prose in the marketplace docs, the marker check reads `.ts`
 * (of which those trees have none), and the 100KB cap's remedy ("split the
 * file") is a review argument about modules, not documentation pages (#814).
 * Both halves are pinned below: widening the byte scan is asserted, and NOT
 * widening the other three is asserted just as explicitly, so a later change to
 * either is a deliberate edit to this file rather than an accident.
 *
 * Mechanics: the script derives its repo root from its own location
 * (`new URL('..', import.meta.url)`), so copying it into `<sandbox>/scripts/`
 * makes a throwaway directory its root. That runs the real, unmodified script
 * against fixtures we control, without adding a test-only seam to production
 * tooling and without ever writing a control byte into the real tree.
 */

/** Trees the three code-level checks judge. */
const CODE_TREES = ['src', 'test', 'e2e', 'scripts'];

/** Trees only the control-byte check judges. */
const TEXT_TREES = ['content', '.changeset'];

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
    // The header names the byte-scan trees, so a reader of a red run can tell
    // which surface produced the finding.
    expect(output).toContain('content, .changeset');
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
