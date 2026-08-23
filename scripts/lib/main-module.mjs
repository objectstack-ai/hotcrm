// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * `isMainModule()` — the one correct way for a script in `scripts/` to decide
 * whether it was launched directly (#1252).
 *
 * ## The defect this replaces
 *
 * Both of this repo's guarded gate scripts hand-rolled the comparison, and both
 * were wrong in the same way:
 *
 *   check-source-token-ratchet.mjs  if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
 *   check-lint-i18n-gate.mjs        if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());
 *
 * `import.meta.url` carries the **realpath** — Node's ESM loader resolves
 * symlinks for the entry module. `process.argv[1]` carries the path as the
 * caller spelled it, resolved to absolute but *not* canonicalised. When any
 * component of that path is a symlink the two strings differ, the guard is
 * false, `main()` never runs — and the process prints **zero bytes and exits
 * 0**. A gate that measures nothing reads as a pass.
 *
 * Measured on macOS, against the unmodified gate at `a0bc5e8`:
 *
 *   node scripts/check-source-token-ratchet.mjs --json          exit 0, 787 bytes
 *   node <symlink-to-repo>/scripts/check-source-token-ratchet.mjs --json
 *                                                               exit 0,   0 bytes
 *
 * That is not hypothetical plumbing: `mkdtempSync(tmpdir())` returns
 * `/var/folders/…` on macOS, and `/var` is a symlink to `/private/var`, so ten
 * of `test/source-token-ratchet.test.ts`'s fifteen cases failed on every macOS
 * checkout — each as `SyntaxError: Unexpected end of JSON input`, which reads
 * like a bug in the gate's `--json` output rather than the gate never having
 * run at all. Linux CI stayed green because `/tmp` is a real directory there,
 * so the farm could never see it.
 *
 * ## The rule
 *
 * Canonicalise **both** sides and compare paths, not URL strings:
 *
 *   - `realpathSync` on each side removes the symlink asymmetry in both
 *     directions, including under `--preserve-symlinks-main`, where it is
 *     `import.meta.url` rather than `argv[1]` that carries the link path.
 *   - Comparing paths rather than `href` strings also removes a second,
 *     independent failure of the `` `file://${process.argv[1]}` `` spelling:
 *     that template never percent-encodes, so a checkout under a path
 *     containing a space, `#`, `?` or `%` mismatches `import.meta.url` (which
 *     is always encoded) and the gate silently no-ops there too.
 *
 * ## Why not `import.meta.main`
 *
 * Node exposes exactly this as `import.meta.main` — but only from **v24.2.0**.
 * This repo declares `engines.node: '>=22'` and CI pins `22.x`, where the
 * property is `undefined`. Spelling the guard that way would make every gate
 * silently skip itself on the supported runtime: the same defect as above, in a
 * new place, with the farm green. Revisit only when the floor moves past 24.2.
 *
 * ## Do not hand-roll a replacement
 *
 * `test/script-main-guard.test.ts` enumerates every script under `scripts/`,
 * fails on any hand-rolled `import.meta.url` / `process.argv[1]` comparison,
 * and runs each guarded script through a symlinked path to prove it still
 * speaks. A helper nobody is forced to use is a helper somebody forgets.
 */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * True when `moduleUrl` names the very file Node was launched with.
 *
 * @param {string} moduleUrl - the calling module's `import.meta.url`.
 * @returns {boolean}
 */
export function isMainModule(moduleUrl) {
  const entry = process.argv[1];
  // `node --eval` / the REPL: nothing was launched from a file, so no module is
  // the entry point. This is the only silent `false` in here by design.
  if (!entry) return false;
  // A module loaded from a `data:` URL is never a file Node was launched with.
  if (!moduleUrl.startsWith('file:')) return false;

  // Deliberately not wrapped in try/catch. `argv[1]` is the running process's
  // own entry path, so a throw here means something genuinely unexpected — and
  // a loud stack trace is the whole point of this file: the failure mode being
  // fixed is a guard that decides "no" in silence.
  return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(entry);
}
