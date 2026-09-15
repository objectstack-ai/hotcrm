// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './repo-root';

/**
 * The mechanics behind "a package barrel is only HALF the registration path"
 * (#1938), shared by every hand-maintained list in `objectstack.composition.ts`.
 *
 * That file assembles two kinds of collection. Ten of them go through
 * `byExportName({ ...four barrels })`, where reaching the package barrel IS
 * reaching the registration. Five are explicit ordered arrays — `allHooks`,
 * `allFlows`, `allSkills`, `CrmSharingRules` and `CrmSeedData` — and for those
 * the barrel is necessary and NOT sufficient: the entry must also be imported
 * into that file and written into the array by hand. The five stay hand-
 * maintained because their order interleaves the four packages (see the ORDER
 * note at the top of the composition), so no per-package barrel can carry it.
 *
 * "Missed off the list" is therefore a PERMANENT failure surface, not one a
 * refactor can remove, and it is silent: the symbol is exported, every suite
 * that reads the barrels sees it, `pnpm validate` exits 0 — and `defineStack()`
 * is handed nothing.
 *
 * ## What a spec has to supply, and why each part exists
 *
 * A `RegistrationSpec` is the four things the two-directional rule needs plus
 * the two that keep it from passing over nothing:
 *
 *  - `barrels` + `list` — the two sides to compare, by IDENTITY. Comparing by
 *    name would pass a list that carries a stale copy of a rewritten export.
 *  - `isEntry` — what counts as a registrable entry. Three of the five barrels
 *    legitimately export things that are not entries at all (seed helpers, the
 *    composition knob, the positions roster), so "every export owes a
 *    registration" is false for them and a classifier is what makes the rule
 *    expressible. See `exemptions`.
 *  - `grouped` — whether ONE export may be an array of entries. `allHooks` and
 *    `CrmSharingRules` flatten (`.flatMap()`, `...spread`) so a single export
 *    can carry several entries; `allSkills` and `CrmSeedData` do not, and for
 *    them an array export is a stranger rather than a group.
 *  - `exemptions` — the export names `isEntry` is ALLOWED to reject, each with
 *    a reason. This is the anti-phantom half of the classifier: without it, an
 *    upstream shape change that makes `isEntry` reject EVERYTHING would leave
 *    every rule passing over an empty set. With it, the same change reports
 *    every export as an unclassifiable stranger.
 *
 * The package roster is read off disk rather than taken from a hand-kept list,
 * so a fifth package (`src/psa/`, per `module-split-plan.md`) landing with a
 * barrel of its own fails HERE instead of going quietly unguarded.
 */
export type RegistrationSpec = {
  /** Singular noun for one entry, used in failure prose: `hook`, `seed family`. */
  readonly noun: string;
  /** The composition's export name for the list: `allHooks`. */
  readonly listName: string;
  /** Metadata directory inside a package: `objects`, `skills`, `sharing`, `data`. */
  readonly kind: string;
  /** The barrel file inside that directory: `hooks.ts` or `index.ts`. */
  readonly barrelFile: string;
  /** The barrel module namespaces, keyed by package directory name. */
  readonly barrels: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** The hand-maintained list in `objectstack.composition.ts`. */
  readonly list: readonly unknown[];
  /** Does this value count as one registrable entry? */
  readonly isEntry: (value: unknown) => boolean;
  /** May a single export carry an ARRAY of entries the list flattens? */
  readonly grouped: boolean;
  /** Export name to the reason it is exported but owes no entry in `list`. */
  readonly exemptions: Readonly<Record<string, string>>;
  /** How one entry is named in failure output. */
  readonly label: (value: unknown) => string;
};

/** One export of one package barrel. */
export type BarrelExport = { readonly pkg: string; readonly name: string; readonly value: unknown };

/** Repo-relative path of a package's barrel for this collection. */
export const barrelPath = (spec: RegistrationSpec, pkg: string): string =>
  `src/${pkg}/${spec.kind}/${spec.barrelFile}`;

/**
 * Every directory under `src/` that carries this collection's barrel, read off
 * disk and sorted.
 *
 * Derived from the tree, not from the `PACKAGES` roster in `src-roster.ts`:
 * that roster is hand-kept, so a guard filtering it can only ever find the
 * packages it already knows about — the roster and the guard would go blind
 * together. `docs-src-tree-paths.test.ts` derives its package list the same
 * way, for the same reason.
 */
export const packagesOnDisk = (spec: RegistrationSpec): string[] =>
  readdirSync(join(REPO_ROOT, 'src'), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(REPO_ROOT, 'src', entry.name, spec.kind, spec.barrelFile)),
    )
    .map((entry) => entry.name)
    .sort();

/** `{ pkg, name, value }` for every export of every barrel this spec reads. */
export const barrelExports = (spec: RegistrationSpec): BarrelExport[] =>
  Object.entries(spec.barrels).flatMap(([pkg, namespace]) =>
    Object.entries(namespace).map(([name, value]) => ({ pkg, name, value })),
  );

/**
 * The entries one export carries, or `null` when the export is not entries at
 * all.
 *
 * An empty array is `null` deliberately: it registers nothing, so reading it
 * as "a group with no members" would let an export that has quietly stopped
 * producing anything satisfy the rule.
 */
export const entriesOf = (spec: RegistrationSpec, value: unknown): unknown[] | null => {
  if (spec.grouped && Array.isArray(value)) {
    return value.length > 0 && value.every((item) => spec.isEntry(item)) ? [...value] : null;
  }
  return spec.isEntry(value) ? [value] : null;
};

/** Exports that are neither entries nor named in the exemption roster. */
export const strangers = (spec: RegistrationSpec): string[] =>
  barrelExports(spec)
    .filter(({ name, value }) => !(name in spec.exemptions) && entriesOf(spec, value) === null)
    .map(({ pkg, name }) => `${name} (${barrelPath(spec, pkg)})`)
    .sort();

/** Exemptions whose export IS a registrable entry — the roster excusing real work. */
export const misfiledExemptions = (spec: RegistrationSpec): string[] =>
  barrelExports(spec)
    .filter(({ name, value }) => name in spec.exemptions && entriesOf(spec, value) !== null)
    .map(({ pkg, name }) => `${name} (${barrelPath(spec, pkg)})`)
    .sort();

/** Exemptions naming an export no barrel has any more. */
export const staleExemptions = (spec: RegistrationSpec): string[] => {
  const exported = new Set(barrelExports(spec).map(({ name }) => name));
  return Object.keys(spec.exemptions)
    .filter((name) => !exported.has(name))
    .sort();
};

/** Every entry every barrel exports, each still carrying where it came from. */
export const registrableEntries = (
  spec: RegistrationSpec,
): Array<{ pkg: string; name: string; entry: unknown }> =>
  barrelExports(spec).flatMap(({ pkg, name, value }) =>
    (entriesOf(spec, value) ?? []).map((entry) => ({ pkg, name, entry })),
  );

/** Barrel-exported entries the list does not carry — registered by NOTHING. */
export const unregistered = (spec: RegistrationSpec): string[] => {
  const registered = new Set<unknown>(spec.list);
  return registrableEntries(spec)
    .filter(({ entry }) => !registered.has(entry))
    .map(({ pkg, name, entry }) => `${name} -> ${spec.label(entry)} (${barrelPath(spec, pkg)})`)
    .sort();
};

/** List members no barrel re-exports — registered, but invisible to the suites. */
export const offBarrel = (spec: RegistrationSpec): string[] => {
  const exported = new Set<unknown>(registrableEntries(spec).map(({ entry }) => entry));
  return spec.list.filter((entry) => !exported.has(entry)).map((entry) => spec.label(entry));
};
