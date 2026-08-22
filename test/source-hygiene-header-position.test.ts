// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * `scripts/check-source-hygiene.mjs` copyright-header check (#1094).
 *
 * The drift this pins has now been fixed twice by hand: one mechanical 836-file
 * commit put an `import` above the header in eleven files, #1091 moved three of
 * them back, and the sweep it prompted found the other eight (#1094). The check
 * is the fix; the eight files were only what made it green. So what this suite
 * guards is not the eight paths — it is
 * that the check keeps judging by RULE. Every fixture below is a file the gate
 * has never heard of, in a directory invented on the spot, because a check that
 * only knows a list stops working the moment someone adds file twelve.
 *
 * The other half is just as deliberate and is asserted just as explicitly: a
 * shebang may precede the header, `.d.ts` and non-`.ts` files are not judged at
 * all, and each of the three failure shapes reports a DIFFERENT message. A
 * hygiene error that prints only a path teaches the next author nothing, so the
 * message text is part of the contract, not decoration.
 *
 * Mechanics are the sibling suite's (`source-hygiene-scan-surface.test.ts`,
 * #818): the script derives its repo root from its own location, so copying it
 * into `<sandbox>/scripts/` makes a throwaway directory its root and runs the
 * real, unmodified script against fixtures we control. That suite pins which
 * TREES each check reads; this one pins what the header check DECIDES.
 */

/** Every tree the gate insists on finding, or it exits before running a check. */
const REQUIRED_TREES = [
  'src',
  'test',
  'e2e',
  'scripts',
  'content',
  '.changeset',
  'docs',
  '.github',
  '.claude',
];

/**
 * Root-level files the gate insists on finding, for the same reason (#838).
 * The header check does not judge them — they are outside `allTs`, which is
 * derived from `SCANNED` — but the gate exits before any check runs if one is
 * absent, so this sandbox has to materialise them. Kept in step with
 * `ROOT_TEXT_FILES` in the gate.
 */
const REQUIRED_ROOT_FILES = [
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

/** The four code trees the header check judges — all of them, not just `src/`. */
const CODE_TREES = ['src', 'test', 'e2e', 'scripts'];

const GATE = 'scripts/check-source-hygiene.mjs';

const HEADER = '// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hygiene-header-'));
  for (const dir of REQUIRED_TREES) mkdirSync(join(root, dir), { recursive: true });
  for (const file of REQUIRED_ROOT_FILES) writeFileSync(join(root, file), 'placeholder\n');
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

describe('source hygiene — copyright header position', () => {
  it('passes when the header is line 1 (the harness is not vacuously red)', () => {
    write('src/objects/widget.object.ts', `${HEADER}\n\nexport const Widget = {};\n`);

    const { status, output } = runGate();
    expect(status).toBe(0);
    expect(output).toContain('✓ copyright header at the top of every .ts file');
  });

  it('reports the exact drift #1091 and #1094 were filed for, quoting the displaced line', () => {
    write(
      'src/objects/widget.object.ts',
      `import { P } from '@objectstack/spec';\n${HEADER}\n\nexport const Widget = {};\n`,
    );

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('src/objects/widget.object.ts:2');
    expect(output).toContain('header on line 2, must be line 1');
    // The message names what ended up above the header, so the author can see
    // the fix without opening the file.
    expect(output).toContain("move it back above `import { P } from '@objectstack/spec';`");
    expect(output).toContain('✗ source hygiene failed: copyright header at the top of every .ts file');
  });

  it('judges by rule, not by path — a file in a directory that has never existed goes red', () => {
    // Nothing in the gate, this suite, or #1094's file list mentions this path.
    // If the check ever grows a hard-coded list or a skip-list, this is the test
    // that dies.
    write(
      'src/invented/deeply/nested/brand-new.ts',
      `import { thing } from './thing';\n${HEADER}\n\nexport const x = thing;\n`,
    );

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('src/invented/deeply/nested/brand-new.ts:2');
  });

  it('judges all four code trees, not just src/', () => {
    for (const tree of CODE_TREES) {
      write(`${tree}/drifted.ts`, `import './x';\n${HEADER}\n\nexport const x = 1;\n`);
    }

    const { status, output } = runGate();
    expect(status).toBe(1);
    for (const tree of CODE_TREES) expect(output).toContain(`${tree}/drifted.ts:2`);
    expect(output).toContain('4 violation(s)');
  });

  it('reports a file with no header at all, and says so in those words', () => {
    write('e2e/checkout.spec.ts', 'export const spec = 1;\n');

    const { status, output } = runGate();
    expect(status).toBe(1);
    // Points at line 1 — where the header has to go — and spells the line to add.
    expect(output).toContain('e2e/checkout.spec.ts:1');
    expect(output).toContain('no copyright header — add');
    expect(output).toContain('Licensed under the Apache-2.0 license.` as line 1');
  });

  it('distinguishes a header pushed off column 1 from a missing one', () => {
    // Indentation and a byte-order mark reach the same place: the header is
    // there, so reporting it as absent would send the author looking for the
    // wrong thing. The BOM is built from its code point rather than spelled
    // into this file — a raw U+FEFF renders as nothing and is unfindable by
    // grep in either spelling, the same argument the control-byte scan makes.
    const BOM = String.fromCharCode(0xfeff);
    write('src/indented.ts', `   ${HEADER}\n\nexport const x = 1;\n`);
    write('src/bom.ts', `${BOM}${HEADER}\n\nexport const y = 1;\n`);

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('src/indented.ts:1');
    expect(output).toContain('src/bom.ts:1');
    expect(output).toContain('header does not start at column 1');
    expect(output).not.toContain('no copyright header');
  });

  it('allows a shebang above the header — the one construct whose position is load-bearing', () => {
    write('scripts/tool.ts', `#!/usr/bin/env node\n${HEADER}\n\nexport const run = () => {};\n`);

    const { status, output } = runGate();
    expect(status).toBe(0);
    expect(output).toContain('source hygiene clean');
  });

  it('still requires the header directly under a shebang, not further down', () => {
    write(
      'scripts/tool.ts',
      `#!/usr/bin/env node\nimport { x } from './x';\n${HEADER}\n\nexport const run = x;\n`,
    );

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('scripts/tool.ts:3');
    expect(output).toContain('header on line 3, must be line 2');
  });

  it('accepts any four-digit year — the check judges position, not vintage', () => {
    write('src/next-year.ts', '// Copyright (c) 2031 ObjectStack. Licensed under the MIT license.\n');

    const { status } = runGate();
    expect(status).toBe(0);
  });

  it('does not judge .d.ts, or anything that is not .ts', () => {
    // `.d.ts` is excluded by the same predicate the marker check uses, and by
    // #1094's own reproduce loop. The rest of the scanned trees genuinely have
    // no header today — 3 of 5 `.mjs` under scripts/, the `.sh`, the four
    // `src/docs/*.md` pages — so widening this check would demand headers in
    // files nobody has decided about. Pinned here so that widening it later is
    // a deliberate edit to this file rather than an accident.
    write('src/types/generated.d.ts', 'export declare const x: number;\n');
    write('scripts/plain.mjs', "import { x } from './x.mjs';\nexport const y = x;\n");
    write('scripts/drifted.mjs', `import './x.mjs';\n${HEADER}\n`);
    write('scripts/tool.sh', '#!/usr/bin/env bash\necho hi\n');
    write('src/docs/overview.md', '# Overview\n');

    const { status, output } = runGate();
    expect(status).toBe(0);
    expect(output).toContain('source hygiene clean');
  });

  it('reads an empty file as missing its header rather than crashing', () => {
    write('src/empty.ts', '');

    const { status, output } = runGate();
    expect(status).toBe(1);
    expect(output).toContain('src/empty.ts:1');
    expect(output).toContain('no copyright header');
  });
});
