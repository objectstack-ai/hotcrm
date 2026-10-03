// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './repo-root';

import * as salesObjects from '../../src/sales/objects';
import * as serviceObjects from '../../src/service/objects';
import * as revenueObjects from '../../src/revenue/objects';
import * as marketingObjects from '../../src/marketing/objects';

import * as salesFlows from '../../src/sales/flows';
import * as serviceFlows from '../../src/service/flows';
import * as revenueFlows from '../../src/revenue/flows';
import * as marketingFlows from '../../src/marketing/flows';

import * as salesViews from '../../src/sales/views';
import * as serviceViews from '../../src/service/views';
import * as revenueViews from '../../src/revenue/views';
import * as marketingViews from '../../src/marketing/views';

import * as salesDashboards from '../../src/sales/dashboards';
import * as serviceDashboards from '../../src/service/dashboards';

import * as salesDatasets from '../../src/sales/datasets';
import * as serviceDatasets from '../../src/service/datasets';
import * as revenueDatasets from '../../src/revenue/datasets';

import * as salesReports from '../../src/sales/reports';
import * as serviceReports from '../../src/service/reports';

import * as salesSharing from '../../src/sales/sharing';
import * as serviceSharing from '../../src/service/sharing';
import * as marketingSharing from '../../src/marketing/sharing';

/**
 * The package directories under `src/`, and the whole-app views of what they
 * hold — the single place a test learns the ADR-0130 layout.
 *
 * Since the layout PR a directory under `src/` IS a package (`src/sales/` the
 * `type: 'app'` one, `src/service/` · `src/revenue/` · `src/marketing/` its
 * modules) and each carries its own per-type barrel. A test that asserts a fact
 * about THE APP — "every object declares X", "no flow does Y" — wants them all
 * merged, and about a hundred suites want exactly that. They get it here rather
 * than each re-deriving the package list.
 *
 * ⚠️ A suite that is genuinely about ONE package still imports that package's
 * barrel directly. This helper is for the app-wide question; using it to ask a
 * package-scoped one is how a per-module assertion goes quietly app-wide.
 */

/**
 * What counts as a package: a directory under `src/` that carries an
 * `objects/` directory.
 *
 * READ OFF DISK. Until #1940 this was a hand-kept four-element list, and
 * `metadataDirs()` below filtered THAT — so a fifth package landing on disk was
 * invisible to it and to every app-wide suite built on it, silently, with
 * nothing anywhere going red. A roster and the guards standing on it went blind
 * together. `src/psa/` is that fifth package (`docs/architecture/psa-module-plan.md`),
 * and its plan promises every guard walking the package directories covers PSA
 * metadata "from the first file … with no new guard written". This function is
 * where that promise is kept.
 *
 * The `objects/` predicate is the one `docs-src-tree-paths.test.ts` uses, in the
 * same words and for the same reason; `registration-lists.ts` derives its own
 * roster the same way, per collection. It answers "what is a package" without
 * anyone having to name an exception: `src/docs/` is the platform's ADR-0046
 * in-product documentation path, holds `.md` files and no `objects/`, so it
 * falls out of the predicate rather than out of a hand-kept exclusion list —
 * which is the whole point, since a hand-kept exclusion list is the thing that
 * just failed.
 *
 * The DIRECTORY, not the `objects/index.ts` barrel, is deliberate. A package
 * whose object files have not reached a barrel yet is precisely the state
 * AGENTS.md warns about — registered by nothing, validated by nothing, `pnpm
 * validate` still at exit 0 — so the file-walking exports below have to see it
 * THEN, not after someone remembers the barrel.
 */
const derivePackages = (): string[] =>
  readdirSync(join(REPO_ROOT, 'src'), { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && existsSync(join(REPO_ROOT, 'src', entry.name, 'objects')),
    )
    .map((entry) => entry.name)
    .sort();

/**
 * Every package directory under `src/`, sorted.
 *
 * Derived once at module load: the tree does not change under a running test
 * process, and one reading keeps {@link metadataDirs} and the barrel check
 * below answering about the same set.
 */
export const PACKAGES: readonly string[] = derivePackages();

/** Repo-relative path into a package's metadata directory. */
export const srcPath = (pkg: string, kind: string, file = ''): string =>
  file ? `src/${pkg}/${kind}/${file}` : `src/${pkg}/${kind}`;

/** The package directories that actually hold this metadata type, repo-relative. */
export const metadataDirs = (kind: string): string[] =>
  PACKAGES.map((pkg) => srcPath(pkg, kind)).filter((dir) => existsSync(join(REPO_ROOT, dir)));

/**
 * Every file of one metadata type across the packages, repo-relative and
 * sorted — the replacement for a `readdirSync` of a single top-level directory.
 */
export const metadataFiles = (kind: string, suffix = '.ts'): string[] =>
  metadataDirs(kind)
    .flatMap((dir) =>
      readdirSync(join(REPO_ROOT, dir))
        .filter((f) => f.endsWith(suffix))
        .map((f) => `${dir}/${f}`),
    )
    .sort();

/**
 * One metadata file by its BASENAME, whichever package now carries it.
 *
 * The replacement for joining a fixed directory with a file name in a suite
 * that knows a file by name but not by package. A basename that matches no
 * file, or more than one, throws rather than returning something plausible: a
 * drift guard that silently reads the wrong file is the failure mode these
 * suites exist to prevent.
 */
export const resolveMetadataFile = (kind: string, basename: string): string => {
  const hits = metadataDirs(kind)
    .map((dir) => `${dir}/${basename}`)
    .filter((rel) => existsSync(join(REPO_ROOT, rel)));
  if (hits.length !== 1) {
    throw new Error(
      `src-roster: '${basename}' resolves to ${hits.length} file(s) under the ${kind} ` +
        `directories${hits.length ? ` (${hits.join(', ')})` : ''} — expected exactly one.`,
    );
  }
  return hits[0]!;
};

/** `*.object.ts` across every package. */
export const objectFiles = (): string[] => metadataFiles('objects', '.object.ts');

/** `*.hook.ts` across every package — they sit beside their objects now. */
export const hookFiles = (): string[] => metadataFiles('objects', '.hook.ts');

/**
 * The barrels this file merges, keyed by metadata directory and then by
 * package — the provenance the merged views below are built from.
 *
 * These are STATIC imports and there is no honest way around that: an ES module
 * cannot widen its own import list at run time, so a fifth package's barrel
 * joins `CrmObjects` only when someone edits the import block at the top of
 * this file. {@link PACKAGES} is derived and sees that package the moment its
 * directory lands, so the two halves of this helper can disagree — and if they
 * did so quietly, #1940 would be fixed for the file-walking exports and moved
 * one export along for the rest: suites reading `objectFiles()` measuring five
 * packages while every suite reading `CrmObjects` kept measuring four.
 * {@link assertBarrelsCoverTheTree} is what stops that being quiet.
 *
 * Only one direction needs asserting. A package that loses a directory named
 * here cannot be silent: the `import * as` for it stops resolving and this
 * module fails to load at all.
 */
const BARRELS: Readonly<
  Record<string, Readonly<Record<string, Readonly<Record<string, unknown>>>>>
> = {
  objects: {
    sales: salesObjects,
    service: serviceObjects,
    revenue: revenueObjects,
    marketing: marketingObjects,
  },
  flows: {
    sales: salesFlows,
    service: serviceFlows,
    revenue: revenueFlows,
    marketing: marketingFlows,
  },
  views: {
    sales: salesViews,
    service: serviceViews,
    revenue: revenueViews,
    marketing: marketingViews,
  },
  dashboards: { sales: salesDashboards, service: serviceDashboards },
  datasets: { sales: salesDatasets, service: serviceDatasets, revenue: revenueDatasets },
  reports: { sales: salesReports, service: serviceReports },
  sharing: { sales: salesSharing, service: serviceSharing, marketing: marketingSharing },
};

/**
 * One kind's barrels merged into a single export-name map.
 *
 * Insertion order of the `BARRELS` entry decides which export wins a name
 * collision, exactly as the hand-written spread it replaces did.
 *
 * The merged value is typed `Record<string, unknown>` rather than the
 * intersection of the four namespaces. That is a measured trade, not an
 * oversight: every consumer in `test/` reaches these through
 * `Object.values(... as Record<string, unknown>)` or `Object.keys(...)`, so the
 * per-export types were already being discarded at the call sites, and keeping
 * them would mean writing the package list a second time per kind — a second
 * hand-kept list, in the file whose first one just went blind.
 */
const mergeBarrels = (kind: string): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};
  for (const namespace of Object.values(BARRELS[kind] ?? {})) Object.assign(merged, namespace);
  return merged;
};

/** The packages on disk that hold one metadata directory, by name and sorted. */
const packagesHolding = (kind: string): string[] =>
  metadataDirs(kind)
    .map((dir) => dir.split('/')[1]!)
    .sort();

/**
 * The metadata-directory names the packages actually use, read off the packages
 * themselves rather than listed here.
 *
 * Derived for the same reason the roster is: a hand-kept list of metadata kinds
 * would stop recognising the first kind a new package introduces, which is the
 * failure this file was rewritten to end.
 */
const metadataKinds = (): Set<string> =>
  new Set(
    PACKAGES.flatMap((pkg) =>
      readdirSync(join(REPO_ROOT, 'src', pkg), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    ),
  );

/**
 * The derived roster and the static import block, pinned to each other at
 * module load.
 *
 * Loud, and in every suite at once, because that is the only volume that
 * matches the blast radius: fourteen suites import this helper directly and
 * `hook-harness.ts` carries `CrmObjects` into some forty more, so a merged view
 * that has quietly stopped covering the tree is a wrong answer given to most of
 * the test run. The failure this replaces gave no answer at all.
 */
const assertBarrelsCoverTheTree = (): void => {
  if (PACKAGES.length === 0) {
    throw new Error(
      'src-roster: no directory under src/ carries an objects/ directory. The package layout ' +
        'moved, and every app-wide suite built on this helper would now measure an empty tree ' +
        'and pass. Teach derivePackages() the new shape rather than leaving it green over ' +
        'nothing.',
    );
  }

  const unmerged = Object.keys(BARRELS)
    .flatMap((kind) => {
      const imported = Object.keys(BARRELS[kind]!);
      return packagesHolding(kind)
        .filter((pkg) => !imported.includes(pkg))
        .map((pkg) => `  ${srcPath(pkg, kind)} -> BARRELS.${kind}`);
    })
    .sort();

  if (unmerged.length > 0) {
    throw new Error(
      'src-roster: a package holds a metadata directory that no merged view above reads.\n' +
        `${unmerged.join('\n')}\n` +
        'Add an `import * as` for each barrel at the top of test/helpers/src-roster.ts and ' +
        'list it in BARRELS. Until then the file-walking exports (objectFiles, metadataFiles) ' +
        'see this package and the merged views (CrmObjects, CrmFlows, …) do not, so a suite ' +
        "asserting about 'the whole app' would be asserting about part of it.",
    );
  }

  // The criterion's own anti-phantom half. An `objects/` directory is what
  // makes a directory under `src/` a package here, and a predicate nobody
  // checks is a claim nobody checks: a directory carrying flows or views but no
  // objects/ would be metadata every sweep in this file walks straight past, in
  // silence — #1940 again, one predicate further down. The ADR-0046 in-product
  // docs path holds `.md` files and no subdirectory at all, so it stays out of
  // this without being named, which is the same reason the roster predicate
  // does not name it either.
  const kinds = metadataKinds();
  const orphans = readdirSync(join(REPO_ROOT, 'src'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !PACKAGES.includes(entry.name))
    .flatMap((entry) =>
      readdirSync(join(REPO_ROOT, 'src', entry.name), { withFileTypes: true })
        .filter((sub) => sub.isDirectory() && kinds.has(sub.name))
        .map((sub) => `  src/${entry.name}/${sub.name}`),
    )
    .sort();

  if (orphans.length > 0) {
    throw new Error(
      'src-roster: a directory under src/ carries metadata but no objects/ directory, so ' +
        'nothing here counts it as a package and every app-wide sweep walks past it:\n' +
        `${orphans.join('\n')}\n` +
        'Give the package its objects/ directory, or — if it genuinely owns no objects — ' +
        'widen derivePackages() deliberately and say why. ⛔ Do not leave it half-seen.',
    );
  }
};

assertBarrelsCoverTheTree();

/** Every object definition the app registers, keyed by export name. */
export const CrmObjects = mergeBarrels('objects');

/** Every flow the app registers, keyed by export name. */
export const CrmFlows = mergeBarrels('flows');

/** Every list-view group, keyed by export name. */
export const CrmViews = mergeBarrels('views');

/** Every dashboard, keyed by export name. */
export const CrmDashboards = mergeBarrels('dashboards');

/** Every analytics dataset, keyed by export name. */
export const CrmDatasets = mergeBarrels('datasets');

/** Every report, keyed by export name. */
export const CrmReports = mergeBarrels('reports');

/** Every sharing-rule export, keyed by export name (positions included). */
export const CrmSharing = mergeBarrels('sharing');
