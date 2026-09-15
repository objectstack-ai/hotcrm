// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { allFlows } from '../objectstack.composition';
import { metadataDirs, srcPath } from './helpers/src-roster';

import * as salesFlows from '../src/sales/flows';
import * as serviceFlows from '../src/service/flows';
import * as revenueFlows from '../src/revenue/flows';
import * as marketingFlows from '../src/marketing/flows';

/**
 * Flow registration completeness — the barrel is only HALF the path (#1930).
 *
 * `objectstack.composition.ts` assembles two kinds of collection, and they do
 * not take the same authoring step:
 *
 *   - `byExportName({ ...four barrels })` for objects, views, pages, actions,
 *     datasets, reports, dashboards, mappings, apps and translations. Reaching
 *     the package barrel IS reaching the registration.
 *   - an explicit ordered list for `allHooks`, `allFlows`, `allSkills`,
 *     `CrmSharingRules` and `CrmSeedData`. The barrel is necessary and NOT
 *     sufficient: the entry must also be imported into that file and written
 *     into the array by hand. That list exists because the registration order
 *     interleaves the four packages (see the ORDER note at the top of
 *     `objectstack.composition.ts`), so no per-package barrel can carry it.
 *
 * Nothing failed on the second kind. A flow exported from its package barrel
 * but absent from `allFlows` is handed to `defineStack()` by nobody: it is
 * registered by nothing, it never binds a trigger, and `pnpm validate` still
 * exits 0 and names it nowhere. `content/docs/customization/extending-objects`
 * taught only the barrel step until this card, so an author following the
 * documentation shipped automation that never runs — the silent-ignore shape
 * `AGENTS.md` warns about, with no gate behind it.
 *
 * Worse, the app's own test helper calls the merged barrels "every flow the
 * app registers" (`CrmFlows` in `test/helpers/src-roster.ts`), and about a
 * hundred suites assert against it. An unregistered flow would be asserted
 * about by all of them and run by none. This guard is what makes that helper's
 * sentence true.
 *
 * FALSE-POSITIVE MEASUREMENT (before writing the rule, on 6f9f9ff): all four
 * barrels export 30 flows between them and `allFlows` carries exactly those 30
 * — no flow is deliberately exported-but-unregistered, so the rule needs no
 * exemption roster. The same measurement on the sibling collections: `allSkills`
 * 6/6 and `allHooks` 19/19 are likewise complete, while the sales sharing barrel
 * legitimately exports `CrmPositions`, which is positions metadata rather than a
 * sharing rule and belongs in no `CrmSharingRules` entry. That asymmetry is why
 * this file is scoped to flows: the other collections are a separate card's
 * measurement, not a widening of this one.
 *
 * Both directions are asserted, because the two failure modes are opposite:
 * a flow the barrel exports and `allFlows` drops (registered by nothing), and a
 * flow `allFlows` carries straight from its `*.flow.ts` file without the barrel
 * (registered, but invisible to every suite that reads the barrels — and the
 * composition already imports `TenantAdminProfile` that way, so the shape is
 * not hypothetical).
 */

/** The flow barrel of each package, keyed by package directory name. */
const BARRELS: Record<string, Record<string, unknown>> = {
  sales: salesFlows,
  service: serviceFlows,
  revenue: revenueFlows,
  marketing: marketingFlows,
};

/** `[package, export name, exported value]` for every flow barrel export. */
const barrelExports = (): Array<[string, string, unknown]> =>
  Object.entries(BARRELS).flatMap(([pkg, ns]) =>
    Object.entries(ns).map(([name, value]) => [pkg, name, value] as [string, string, unknown]),
  );

const barrelIndex = (pkg: string): string => `${srcPath(pkg, 'flows')}/index.ts`;

describe('flow registration completeness', () => {
  /**
   * Anti-phantom. Every assertion below is "this set has no gaps", which an
   * empty set satisfies: a barrel that stopped resolving, or a fifth package
   * whose flows directory nobody added to `BARRELS`, would leave the rule
   * passing over nothing.
   *
   * `metadataDirs('flows')` is therefore the other side of the comparison, and
   * since #1940 it is read off disk: the roster it filters is derived from the
   * directories under `src/`, not hand-kept. So a fifth package landing with a
   * flows directory of its own fails HERE.
   *
   * ⚠️ That sentence was false when this guard landed, and the correction is
   * worth keeping visible. `metadataDirs()` then filtered a hand-written
   * four-element `PACKAGES` list, so this assertion compared one hand-written
   * roster against another and could only ever catch "a package `PACKAGES`
   * already names holds flows but is missing from `BARRELS`". Seeding a fifth
   * package left it green (#1940, reproduced). Only the derivation makes the
   * claim true; ⛔ do not restore a hand-kept roster on either side.
   */
  it('reads every package that holds a flows/ directory, and each holds flows', () => {
    const onDisk = metadataDirs('flows').map((dir) => dir.split('/')[1]!);
    expect(onDisk.length, 'no src/*/flows/ directory resolved — the tree moved, or the roster helper did').toBeGreaterThan(0);
    expect(
      [...onDisk].sort(),
      'a package holds flows but this guard does not read its barrel — add it to BARRELS above',
    ).toEqual(Object.keys(BARRELS).sort());

    for (const pkg of Object.keys(BARRELS)) {
      expect(
        Object.keys(BARRELS[pkg]!).length,
        `${barrelIndex(pkg)} exports no flow — the barrel stopped resolving`,
      ).toBeGreaterThan(0);
    }
    expect(allFlows.length, 'allFlows is empty — objectstack.composition.ts did not load').toBeGreaterThan(0);
  });

  it('a flows barrel re-exports flows and nothing else', () => {
    // Shared flow sources (`_billing-endpoint.ts`, `_guarded-iteration.ts`) are
    // imported directly by the flows that use them and are deliberately NOT in
    // any barrel. Keeping it that way is what lets the rule below read every
    // barrel export as a flow that owes a registration.
    const strangers = barrelExports()
      .filter(([, , value]) => typeof (value as { name?: unknown })?.name !== 'string')
      .map(([pkg, name]) => `${name} (${barrelIndex(pkg)})`);
    expect(
      strangers,
      'a flows barrel re-exports something that is not a flow; a shared helper is imported ' +
        `directly by the flows that need it, not re-exported:\n  ${strangers.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every flow a package barrel exports is registered in allFlows', () => {
    const registered = new Set<unknown>(allFlows);
    const unregistered = barrelExports()
      .filter(([, , value]) => !registered.has(value))
      .map(([pkg, name]) => `${name} (${barrelIndex(pkg)})`);
    expect(
      unregistered,
      'exported from a package barrel but missing from `allFlows` — registered by NOTHING, and ' +
        '`pnpm validate` stays at exit 0 while the flow never binds its trigger:\n  ' +
        `${unregistered.join('\n  ')}\n` +
        'Import each one in objectstack.composition.ts and add it to the allFlows array.',
    ).toEqual([]);
  });

  it('every flow registered in allFlows comes from a package barrel', () => {
    const exported = new Set<unknown>(barrelExports().map(([, , value]) => value));
    const offBarrel = allFlows
      .filter((flow) => !exported.has(flow))
      .map((flow) => String((flow as { name?: unknown }).name ?? '<unnamed>'));
    expect(
      offBarrel,
      'registered in `allFlows` but re-exported by no package barrel — the app runs it, and every ' +
        'suite that reads the barrels (test/helpers/src-roster.ts `CrmFlows`) is blind to it:\n  ' +
        `${offBarrel.join('\n  ')}\n` +
        "Re-export each one from its package's flows/index.ts.",
    ).toEqual([]);
  });
});
