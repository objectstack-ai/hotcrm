// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Releasing HotCRM still versions HotCRM, and "nothing to release" is still an
 * answer rather than a failure (#1503).
 *
 * ## The two business facts this file pins
 *
 * `package.json` declares `"private": true` next to `"version": "3.0.0"`:
 * **hotcrm is a single private package that versions itself through
 * changesets**, and `CHANGELOG.md` — the release notes it publishes — is
 * written by `changeset version` and by nothing else.
 *
 * `@changesets/cli` 3.0.0 put both halves of that on a default:
 *
 *   1. *Private packages are no longer versioned by default.* Measured on a
 *      private single-package fixture with a pending changeset and no
 *      `privatePackages` option: `changeset version` exits **0**, prints "All
 *      files have been updated. Review them and commit at your leisure", and
 *      leaves the version at 1.0.0, writes no `CHANGELOG.md`, and does not even
 *      consume the changeset. ⭐ The failure mode is **silence wearing a
 *      success message** — nothing in PR CI exercises the release path, so the
 *      whole gate suite stays green and the first observation point is a
 *      release that quietly does nothing.
 *   2. `changeset version` now exits **1** when there are no unreleased
 *      changesets (2.x exited 0), which turns an ordinary "not yet" at release
 *      time into a red command.
 *
 * `.changeset/config.json` answers the first with
 * `privatePackages: { version: true, tag: false }` — the 2.x default, restored
 * explicitly — and `scripts/changeset-version.mjs` answers the second.
 *
 * ## Why a fixture rather than an assertion about the config
 *
 * Reading `privatePackages` out of the JSON would pin the spelling, not the
 * behaviour, and the spelling is exactly what moved under this repo once
 * already (`prettier` → `format`). So the fixture is a real private package
 * carrying **this repo's own `.changeset/config.json`**, run through the real
 * CLI: a future upgrade that renames or re-defaults the option turns this red
 * rather than turning a release silent.
 */

const WRAPPER = join(REPO_ROOT, 'scripts/changeset-version.mjs');
const REPO_CONFIG = join(REPO_ROOT, '.changeset/config.json');

/** Deliberately far above the real cost (~1s): this catches a HANG, not slowness. */
const SPAWN_TIMEOUT_MS = 30_000;

let sandbox: string;

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'changeset-version-wrapper-'));
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

/**
 * A private single-package project carrying this repo's real changesets config.
 *
 * @param name - subdirectory under the sandbox, so each case gets a clean tree.
 * @param changeset - the changeset body to leave pending, or `null` for none.
 */
function fixture(name: string, changeset: string | null): string {
  const dir = join(sandbox, name);
  mkdirSync(join(dir, '.changeset'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    `${JSON.stringify({ name: 'hotcrm-release-fixture', version: '1.0.0', private: true }, null, 2)}\n`,
  );
  copyFileSync(REPO_CONFIG, join(dir, '.changeset/config.json'));
  if (changeset !== null) writeFileSync(join(dir, '.changeset/pending.md'), changeset);
  return dir;
}

function runWrapper(cwd: string, args: string[] = []): { status: number; output: string } {
  const r = spawnSync(process.execPath, [WRAPPER, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: SPAWN_TIMEOUT_MS,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { status: r.status ?? -1, output: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

describe('releasing a private package still versions it', () => {
  it('bumps the version and generates CHANGELOG.md from a pending changeset', () => {
    const dir = fixture('with-changeset', "---\n'hotcrm-release-fixture': patch\n---\n\nA real change.\n");

    const { status, output } = runWrapper(dir);

    expect(status, output).toBe(0);

    // The pin: 3.x's `privatePackages` default would leave both of these untouched
    // while still exiting 0 with a success message.
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version).toBe('1.0.1');
    expect(existsSync(join(dir, 'CHANGELOG.md'))).toBe(true);
    expect(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')).toContain('A real change.');
  });
});

describe('"nothing to release" is an answer, not a failure', () => {
  it('exits 0 and says so when no changesets are pending', () => {
    const dir = fixture('no-changeset', null);

    const { status, output } = runWrapper(dir);

    expect(status, output).toBe(0);
    // Pins the sentinel the wrapper keys on against the installed CLI: reword it
    // upstream and this goes red here, not at a release.
    expect(output).toContain('No unreleased changesets found.');
    expect(output).toContain('Nothing to release');
  });

  it('does not swallow a real failure that also exits 1', () => {
    const dir = fixture('real-failure', "---\n'hotcrm-release-fixture': patch\n---\n\nA real change.\n");

    const { status, output } = runWrapper(dir, ['--ignore', 'no-such-package']);

    expect(status, output).toBe(1);
    expect(output).toContain('no-such-package');
    expect(output).not.toContain('Nothing to release');
  });
});

describe('#1602’s ruling survives the 3.x config rename', () => {
  it('turns the formatter off under its new name and keeps no stale key', () => {
    const config = JSON.parse(readFileSync(REPO_CONFIG, 'utf8'));

    // 3.x replaced `prettier` with `format`; a leftover `prettier` key is accepted
    // in silence and formatting comes back on at its `auto` default, which would
    // re-mangle the published 3.0.0 release notes #1602 repaired.
    expect(config.format).toBe(false);
    expect(config).not.toHaveProperty('prettier');
  });
});
