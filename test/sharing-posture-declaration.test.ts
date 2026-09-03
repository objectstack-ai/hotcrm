// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * A suite that boots `SharingServicePlugin` must state its tenancy posture
 * (#1444).
 *
 * ### The trap this closes
 *
 * From 17.2.0 `SharingServicePlugin` seeds declared sharing rules **per
 * organization** whenever the tenancy posture encloses a wall, and by the
 * ADR-0105 fail-closed rule an *unresolvable* posture reports `isolated`, not
 * `single` (objectstack#10103). The `tenancy` service is registered by
 * `plugin-auth`, which none of these reduced harnesses mounts. So a suite that
 * boots the enforcement stack without saying anything about tenancy resolves
 * to `isolated`, enumerates `sys_organization`, finds nothing, and seeds
 * **zero** rules — where 17.1.0 seeded them unconditionally, once,
 * organization-less.
 *
 * Re-measured on the pin this repo runs (17.2.0), same config, `memory`
 * driver, zero organizations:
 *
 *   | tenancy service     | `sys_sharing_rule` rows        |
 *   | ------------------- | ------------------------------ |
 *   | absent              | **0**                          |
 *   | `posture: 'single'` | **10** (`organization_id: null`)|
 *   | `posture: 'isolated'`| **0**                         |
 *
 * `objectstack start` over the same config, full plugin set, seeds all 10 with
 * `organization_id: null` — so `single` is the shipped app's row, and a
 * probe-less harness models an application HotCRM does not ship.
 *
 * ### Why a guard rather than four edits
 *
 * The four suites that lacked a posture were green, because none of them read
 * a rule the seeder was supposed to create. That is a property of what they
 * currently **assert**, not of how they **boot** — so the first assertion
 * someone adds about record reach through a sharing rule gets an empty
 * catalogue and a failure that points at the rule rather than at the missing
 * posture. #1442 spent a while diagnosing exactly that shape. Editing the
 * files fixes the four that exist; this file fixes the seventh suite too,
 * before it is written.
 *
 * ### An IMPORT is not a MENTION — the distinction is load-bearing
 *
 * `test/sharing-seeding.test.ts` contains the string `SharingServicePlugin`,
 * inside a doc comment quoting a boot log. It never imports the plugin and
 * never mounts it: it drives `compileCelToFilter` and a hand-built ObjectQL
 * engine, so it never depended on a seeded row and needs no posture. A guard
 * written as a raw grep for the identifier would fail that file and be
 * measuring *text* rather than the boot shape that matters. The predicate here
 * is therefore anchored to real import and mount statements, and the fixture
 * cases below pin that discrimination directly.
 *
 * ### Vacuity is the failure mode a rule like this actually has
 *
 * A predicate that stops matching passes forever, silently — this repo already
 * paid for one such test (#1102: an assertion comparing `undefined` to
 * `undefined`, green while the mechanism was dark). Three things keep this one
 * honest: the population must be non-empty and must still contain a named
 * sentinel suite; the two independent detectors (imports the symbol / mounts
 * the constructor) must agree file-for-file, so a rename cannot empty one of
 * them unnoticed; and the predicate itself is exercised against inline
 * fixtures whose expected classification is stated, not derived.
 */

/** Test-tree files this guard reads. */
const TEST_DIR = join(REPO_ROOT, 'test');

/**
 * The suite that must always be a member — the anti-vacuity pin.
 *
 * It boots the real enforcement stack to measure `controlled_by_parent` reach,
 * and it carries the posture already (#1442). If the detectors stop seeing it,
 * they have stopped seeing anything, and that is a red rather than a quiet
 * pass.
 */
const SENTINEL = 'test/parent-derived-reach.test.ts';

/**
 * A file that names the plugin in prose only, and must never be a member.
 * The reason lives in the doc comment above; this constant is what makes the
 * exception falsifiable rather than a note.
 */
const PROSE_ONLY = 'test/sharing-seeding.test.ts';

/**
 * This file, excluded from its own scan.
 *
 * The fixture cases at the bottom spell whole import and mount statements as
 * string data, and the detectors — line-anchored on purpose, so they cannot be
 * fooled by a comment — would read those literals as a boot. This file mounts
 * no kernel and boots no plugin; the fixtures are the specimens the predicate
 * is tested against. Excluding it by name keeps the exclusion a single visible
 * line rather than a cleverness spread through the fixtures (spelling the
 * identifier in pieces to hide it from the regex would defeat the point of
 * having readable specimens).
 */
const SELF = 'test/sharing-posture-declaration.test.ts';

/** Every `.ts` file under `test/`, repo-relative, POSIX-spelled. */
function testSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) out.push(relative(REPO_ROOT, full).split(sep).join('/'));
    }
  };
  walk(TEST_DIR);
  return out.sort();
}

/**
 * Does this source IMPORT `SharingServicePlugin`?
 *
 * Anchored at column 0 (`^import`), so an occurrence inside a block comment
 * (` * …`) or an indented string is not a match. The named-binding list is
 * matched across newlines, so a multi-line import counts.
 */
function importsPlugin(src: string): boolean {
  const re = /^import\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"]@objectstack\/plugin-sharing['"]/gm;
  for (const m of src.matchAll(re)) {
    if (/\bSharingServicePlugin\b/.test(m[1])) return true;
  }
  return false;
}

/** Offset of the first `new SharingServicePlugin(` on a code line, or -1. */
function mountOffset(src: string): number {
  const re = /^(?![ \t]*(?:\*|\/\/))[^\n]*new\s+SharingServicePlugin\s*\(/gm;
  const m = re.exec(src);
  return m ? m.index : -1;
}

/**
 * Offset of the first statement that gives the stack a tenancy posture, or -1.
 *
 * Two spellings are accepted because two exist: the `tenancyProbe` helper (what
 * a reduced harness uses) and the real registrar — `plugin-auth`, or a direct
 * `registerService('tenancy', …)`. A suite that mounts the full auth stack has
 * declared its posture as surely as one that mounts the probe.
 */
function postureOffset(src: string): number {
  const offsets = [
    /^(?![ \t]*(?:\*|\/\/))[^\n]*\btenancyProbe\s*\(/m,
    /^(?![ \t]*(?:\*|\/\/))[^\n]*registerService\(\s*['"]tenancy['"]/m,
    /^import[^\n]*from\s*['"]@objectstack\/plugin-auth['"]/m,
  ]
    .map((re) => re.exec(src))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m.index);
  return offsets.length ? Math.min(...offsets) : -1;
}

const sources = testSources()
  .filter((file) => file !== SELF)
  .map((file) => ({ file, src: readFileSync(join(REPO_ROOT, file), 'utf8') }));

const importers = sources.filter((s) => importsPlugin(s.src)).map((s) => s.file);
const mounters = sources.filter((s) => mountOffset(s.src) >= 0).map((s) => s.file);

describe('SharingServicePlugin suites declare a tenancy posture (#1444)', () => {
  it('sees a non-empty population, including the sentinel suite', () => {
    // Both halves matter: an empty population is a dead rule, and a population
    // that lost the one suite we can name is a detector that has drifted off
    // the shape it was written against.
    expect(mounters.length).toBeGreaterThan(0);
    expect(mounters).toContain(SENTINEL);
    expect(importers).toContain(SENTINEL);
    // And the one file held out of the scan must still be on disk under that
    // name: a rename would otherwise leave the exclusion matching nothing, and
    // this file's own fixtures would report as an offending suite.
    expect(testSources()).toContain(SELF);
  });

  it('has two detectors that agree file-for-file', () => {
    // Importing the symbol and constructing it are independent signals. If they
    // ever disagree, one of them has stopped measuring what it was written for
    // — say the plugin gained a factory function, or a suite imports it for a
    // type and boots the stack some other way. Either is a decision to make
    // deliberately, not a rule that quietly covers one file fewer.
    expect(importers).toEqual(mounters);
  });

  it('finds a posture declared BEFORE the plugin is mounted, in every member', () => {
    // Order is not decoration: `sharingPosture()` is read during the plugin's
    // own boot, so a probe registered afterwards is registered too late and
    // seeds nothing — the same empty catalogue, from a file that looks fixed.
    const offenders = sources
      .filter((s) => mountOffset(s.src) >= 0)
      .map((s) => ({ file: s.file, posture: postureOffset(s.src), mount: mountOffset(s.src) }))
      .filter((r) => r.posture < 0 || r.posture > r.mount)
      .map((r) =>
        r.posture < 0
          ? `${r.file}: mounts SharingServicePlugin without declaring a tenancy posture — ` +
            `mount tenancyProbe('single') from test/helpers/tenancy-probe before it`
          : `${r.file}: declares its tenancy posture AFTER mounting SharingServicePlugin — ` +
            `the posture is read during that plugin's boot, so move the probe above it`,
      );
    expect(offenders).toEqual([]);
  });

  it('leaves the prose-only suite out of the population', () => {
    // The ruled exception, kept as a measurement rather than a comment: this
    // file names the plugin in a quoted boot log and nowhere else, and it must
    // stay out of scope without needing an exemption entry.
    expect(sources.map((s) => s.file)).toContain(PROSE_ONLY);
    expect(mounters).not.toContain(PROSE_ONLY);
    expect(importers).not.toContain(PROSE_ONLY);
  });

  describe('the predicate itself', () => {
    const IMPORT_LINE = "import { SharingServicePlugin } from '@objectstack/plugin-sharing';";

    it('counts a real import and a real mount', () => {
      const src = [IMPORT_LINE, 'await kernel.use(new SharingServicePlugin());'].join('\n');
      expect(importsPlugin(src)).toBe(true);
      expect(mountOffset(src)).toBeGreaterThanOrEqual(0);
    });

    it('counts a multi-line import', () => {
      const src = ['import {', '  SharingServicePlugin,', "} from '@objectstack/plugin-sharing';"].join('\n');
      expect(importsPlugin(src)).toBe(true);
    });

    it('ignores the identifier quoted in a comment — the sharing-seeding case', () => {
      const src = [
        '/**',
        ' *     INFO  SharingServicePlugin: boot rule backfill done {"rules":9}',
        ' * import { SharingServicePlugin } from \'@objectstack/plugin-sharing\';',
        ' */',
        '// await kernel.use(new SharingServicePlugin());',
      ].join('\n');
      expect(importsPlugin(src)).toBe(false);
      expect(mountOffset(src)).toBe(-1);
    });

    it('ignores an unrelated import from the same package', () => {
      const src = "import { ShareLinkService } from '@objectstack/plugin-sharing';";
      expect(importsPlugin(src)).toBe(false);
    });

    it('reads the probe, the auth plugin and a direct service registration as a posture', () => {
      expect(postureOffset("await kernel.use(tenancyProbe('single') as never);")).toBe(0);
      expect(postureOffset("import { AuthPlugin } from '@objectstack/plugin-auth';")).toBe(0);
      expect(postureOffset("ctx.registerService('tenancy', { posture: 'single' });")).toBe(0);
      expect(postureOffset('await kernel.use(new SecurityPlugin({}));')).toBe(-1);
    });

    it('places a posture mounted after the plugin at a later offset than the mount', () => {
      const late = [
        'await kernel.use(new SharingServicePlugin());',
        "await kernel.use(tenancyProbe('single') as never);",
      ].join('\n');
      expect(postureOffset(late)).toBeGreaterThan(mountOffset(late));
    });
  });
});
