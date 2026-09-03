// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import * as PlatformObjects from '@objectstack/platform-objects';
import * as PluginApprovals from '@objectstack/plugin-approvals';
import * as PluginSharing from '@objectstack/plugin-sharing';
import * as ServiceAutomation from '@objectstack/service-automation';
import * as ServiceMessaging from '@objectstack/service-messaging';
import * as ServiceStorage from '@objectstack/service-storage';
import stack from '../../objectstack.config';

/**
 * Derived views of `objectstack.config` shared by the dangling-reference guard
 * suites.
 *
 * `test/metadata-references.test.ts` had grown to 99,872 bytes against the
 * 100KB ceiling in `scripts/check-source-hygiene.mjs`, so #814 split it by
 * family into `metadata-references` (pages, forms, cross-surface),
 * `view-references`, `action-references` and `i18n-references`. All four
 * resolve names against the same derivations, and copying them four times
 * would mean four places to fix when one of them is wrong — which has already
 * happened once, to the locale-pack flatten documented below.
 *
 * This module holds no assertions and is not named `*.test.ts`, so vitest —
 * whose `include` collects only files under `test/` ending in `.test.ts` —
 * does not pick it up as a suite.
 */

export type AnyRec = Record<string, any>;
export const objects: AnyRec[] = (stack as any).objects ?? [];
export const pages: AnyRec[] = (stack as any).pages ?? [];
export const views: AnyRec[] = (stack as any).views ?? [];
export const profiles: AnyRec[] = (stack as any).permissions ?? [];
export const stackActions: AnyRec[] = (stack as any).actions ?? [];

export const objectNames = new Set(objects.map((o) => o.name));
export const profileNames = new Set(profiles.map((p) => p.name));

/**
 * Locale packs, flattened to `[locale, pack]` pairs.
 *
 * `stack.translations` holds ONE `TranslationBundle` keyed by locale
 * (`{ en: {...}, 'zh-CN': {...} }`) — NOT a list of per-locale records. A
 * `translations.find(t => t.locale === 'zh-CN')` therefore matches nothing and
 * silently turns its test into a no-op, which is how the navigation guard in
 * `test/action-references.test.ts` spent its life passing without asserting
 * anything.
 */
export const localePacks: [string, AnyRec][] = ((stack as any).translations ?? []).flatMap(
  (bundle: AnyRec) => Object.entries(bundle) as [string, AnyRec][],
);
export const packFor = (locale: string): AnyRec | undefined =>
  localePacks.find(([name]) => name === locale)?.[1];

/**
 * Audit columns the platform adds to every object. They are real at runtime
 * (`?sort=created_at desc` works) but never appear in the authored `fields`
 * map, so a reference to one is legitimate.
 */
const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by'];

/**
 * System objects the installed platform actually registers — DERIVED from the
 * packages' own rosters rather than hand-copied out of them.
 *
 * Both dangling-reference guards spell a resolvable object as
 * `objectNames.has(n) || PLATFORM_OBJECTS.has(n)`, so this set is the half of
 * that predicate covering names this app does not author. It used to be
 * sixteen names typed out by hand, with the citation *"verified against the
 * 16.1.0 bundles in node_modules"* — against a 17.2.0 pin. A machine roster
 * kept by hand fails in both directions once it drifts, and it had: a
 * registered object missing from the set makes a valid reference look dangling
 * (a false red on an unrelated PR), and a listed name that nothing registers
 * lets a genuinely dangling reference pass — a false green in the guard whose
 * whole job is to catch that. Reading the rosters removes the copy, and with
 * it the version citation that could go stale.
 *
 * ### The predicate, and why `name` + `fields` is the right anchor
 *
 * A roster entry is an `ObjectSchema.create(...)` descriptor, and what makes
 * it an OBJECT rather than some other metadata is that it carries a `fields`
 * map. Measured on 17.2.0 across the six packages below: 62 exported values
 * carry both `name` and `fields`, and all 62 names are `sys_*` — no
 * non-platform name slips in. The control is the near miss: 7 exported values
 * carry a `name` but NO `fields`, and they are exactly the things that are not
 * objects — `ACCOUNT_APP` / `SETUP_APP` / `STUDIO_APP` (apps), the three
 * `sys_*_detail` pages, and `system_overview` (a dashboard). The predicate
 * excludes precisely those. Nothing exports `fields` without a `name`.
 *
 * ### Which packages, and why these
 *
 * Each roster below is loaded by something this stack declares, so a name it
 * registers really does resolve at runtime. The capability→package map lives
 * in the CLI's `CAPABILITY_PROVIDERS` and is not exported, so the packages —
 * not the object names — are the part still written out here.
 *
 * ### The residue, which is expected and not a failure
 *
 * `@objectstack/plugin-audit` registers `sys_audit_log`, `sys_activity` and
 * `sys_comment` by calling `syncObjectSchema()` on each from its
 * `provisionSystemTables()` at plugin init. Its descriptors are module-private
 * — `'SysActivity' in require('@objectstack/plugin-audit')` is `false` — so
 * they are not statically derivable from any public surface, and no deep
 * export subpath offers them (its `exports` map has only `"."`). They stay
 * hand-listed, with that as the reason. `sys_activity` is live app metadata
 * (`ctx.api.object('sys_activity').insert(...)` in two action bodies), so
 * dropping it would be a false red, not a tidy-up.
 *
 * ### Deriving WIDENS this set, deliberately
 *
 * 16 names become 65: 50 enter, and exactly one leaves — `sys_approval`,
 * which NOTHING registers. `@objectstack/plugin-approvals` exports
 * `SysApprovalRequest` / `SysApprovalAction` / `SysApprovalApprover` /
 * `SysApprovalDelegation` and no `SysApproval`; the only occurrence of the
 * bare token in any installed bundle is a `startsWith('sys_approval')` prefix
 * guard. So the old set admitted a name matching nothing at runtime — exactly
 * the class it exists to reject. The widening is the accurate direction, not a
 * relaxation: this set's contract is *"a reference to a `sys_*` name outside
 * it matches nothing at runtime"*, and a name the platform really registers
 * does resolve, so withholding it makes the guard wrong in the false-red
 * direction. Every one of the 50 arrivals is backed by a roster entry read
 * from the installed package, and no `sys_*` reference in today's app metadata
 * changes verdict: the guards were green before this derivation and are green
 * after it.
 */
const ROSTER_MODULES: Record<string, unknown> = {
  '@objectstack/platform-objects': PlatformObjects, //   core roster, always loaded
  '@objectstack/plugin-approvals': PluginApprovals, //   requires: 'approvals'
  '@objectstack/plugin-sharing': PluginSharing, //       requires: 'sharing'
  '@objectstack/service-automation': ServiceAutomation, // requires: 'automation'
  '@objectstack/service-messaging': ServiceMessaging, // always-on slate (email)
  '@objectstack/service-storage': ServiceStorage, //     always-on slate (storage)
};

/** A roster entry is a metadata value carrying both a `name` and a `fields` map. */
const isRegisteredObject = (value: unknown): value is { name: string; fields: AnyRec } => {
  if (!value || typeof value !== 'object') return false;
  const rec = value as AnyRec;
  return typeof rec.name === 'string' && !!rec.fields && typeof rec.fields === 'object';
};

/**
 * Provisioned imperatively by `@objectstack/plugin-audit` and not exported by
 * it — see "The residue" above. Hand-listed because it is not derivable.
 */
const AUDIT_PROVISIONED = ['sys_audit_log', 'sys_activity', 'sys_comment'];

export const PLATFORM_OBJECTS = new Set<string>([
  ...Object.values(ROSTER_MODULES).flatMap((mod) =>
    Object.values(mod as AnyRec)
      .filter(isRegisteredObject)
      .map((obj) => obj.name),
  ),
  ...AUDIT_PROVISIONED,
]);

export const fieldsOf = (obj: string) => [
  ...Object.keys(objects.find((o) => o.name === obj)?.fields ?? {}),
  ...SYSTEM_FIELDS,
];

/** Walk an arbitrary metadata tree, yielding every node that has a `type`. */
export function* walk(node: unknown): Generator<AnyRec> {
  if (Array.isArray(node)) {
    for (const item of node) yield* walk(item);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const rec = node as AnyRec;
  if (typeof rec.type === 'string') yield rec;
  for (const value of Object.values(rec)) yield* walk(value);
}
