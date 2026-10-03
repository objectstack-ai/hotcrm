// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * `changeset version`, with "nothing to release" separated from failure (#1503).
 *
 * ## Why this file exists
 *
 * `@changesets/cli` 3.0.0 changed the exit code of the empty run. Through 2.x,
 * `changeset version` with no pending changesets printed a warning and exited
 * **0**. From 3.0.0 it exits **1**:
 *
 *   node_modules/@changesets/cli/dist/version.mjs
 *     if (changesets.length === 0 && (preState == null || preState.mode !== "exit")) {
 *       log.warn("No unreleased changesets found.");
 *       throw new ExitError(1);
 *     }
 *
 * `pnpm changeset:version` is the command CONTRIBUTING.md hands the maintainer
 * at release time, and "there is nothing to release yet" is an ordinary answer
 * to it — not a broken release. Left unwrapped, the bump turns that ordinary
 * answer into a red command.
 *
 * ## Why the exit code alone cannot be the test
 *
 * Every other failure in that command exits 1 too — an unknown `--ignore`
 * package, a snapshot request in pre mode, a malformed config, an unwritable
 * tree. Reading `1` as "nothing to release" would swallow all of them, which is
 * the failure this card exists to prevent, moved one level up. So the ONE
 * outcome that is translated is identified by the sentinel line the CLI prints
 * on exactly that path, and everything else passes through untouched.
 *
 * ## The direction the sentinel can fail in
 *
 * If a future upgrade rewords that line, this wrapper stops recognising it and
 * an empty release exits 1 again — loud, and exactly the state 3.0.0 shipped.
 * It can never drift the other way: a real failure has no way to acquire the
 * sentinel. `test/changeset-version-wrapper.test.ts` runs both legs against the
 * real CLI so the rewording shows up in the test suite rather than at a release.
 *
 * ## Output
 *
 * The child's streams are captured so this file can read the sentinel, then
 * re-emitted verbatim on the same stream they arrived on. Nothing is hidden;
 * the only thing lost is the interleaving between stdout and stderr, which
 * `changeset version` does not depend on.
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

/**
 * The exact line `@changesets/cli` prints when there is nothing to release.
 * Pinned against the installed CLI by `test/changeset-version-wrapper.test.ts`.
 */
const NOTHING_TO_RELEASE = 'No unreleased changesets found.';

const require = createRequire(import.meta.url);
const cliBin = require.resolve('@changesets/cli/bin.js');

const result = spawnSync(process.execPath, [cliBin, 'version', ...process.argv.slice(2)], {
  encoding: 'utf8',
  stdio: ['inherit', 'pipe', 'pipe'],
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error(`✗ could not run \`changeset version\`: ${result.error.message}`);
  process.exit(1);
}

// Killed by a signal: `status` is null, and a null read as 0 would be a pass.
if (result.signal) {
  console.error(`✗ \`changeset version\` was killed by ${result.signal}`);
  process.exit(1);
}

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

if (result.status === 1 && output.includes(NOTHING_TO_RELEASE)) {
  console.log(
    'ℹ️  Nothing to release — no changesets are pending, so no version was bumped ' +
      'and CHANGELOG.md was not touched. Treating this as success (@changesets/cli 3.x ' +
      'exits 1 here; 2.x exited 0).',
  );
  process.exit(0);
}

process.exit(result.status ?? 1);
