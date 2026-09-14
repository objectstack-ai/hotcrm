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
 * The four package directories under `src/`, and the whole-app views of what
 * they hold — the single place a test learns the ADR-0130 layout.
 *
 * Since the layout PR a directory under `src/` IS a package (`src/sales/` the
 * `type: 'app'` one, `src/service/` · `src/revenue/` · `src/marketing/` its
 * modules) and each carries its own per-type barrel. A test that asserts a fact
 * about THE APP — "every object declares X", "no flow does Y" — wants all four
 * merged, and about a hundred suites want exactly that. They get it here rather
 * than each re-deriving the package list, so the day a fifth package lands
 * (`src/psa/`, per the plan) there is one file to extend and no suite that
 * silently keeps measuring four.
 *
 * ⚠️ A suite that is genuinely about ONE package still imports that package's
 * barrel directly. This helper is for the app-wide question; using it to ask a
 * package-scoped one is how a per-module assertion goes quietly app-wide.
 */
export const PACKAGES = ['sales', 'service', 'revenue', 'marketing'] as const;

export type PackageDir = (typeof PACKAGES)[number];

/** Repo-relative path into a package's metadata directory. */
export const srcPath = (pkg: PackageDir, kind: string, file = ''): string =>
  file ? `src/${pkg}/${kind}/${file}` : `src/${pkg}/${kind}`;

/** The package directories that actually hold this metadata type, repo-relative. */
export const metadataDirs = (kind: string): string[] =>
  PACKAGES.map((pkg) => srcPath(pkg, kind)).filter((dir) => existsSync(join(REPO_ROOT, dir)));

/**
 * Every file of one metadata type across the four packages, repo-relative and
 * sorted — the replacement for `readdirSync('src/<kind>')`.
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
 * The replacement for `join(REPO_ROOT, 'src/<kind>', file)` in a suite that
 * knows a file by name but not by package. A basename that matches no file, or
 * more than one, throws rather than returning something plausible: a drift
 * guard that silently reads the wrong file is the failure mode these suites
 * exist to prevent.
 */
export const resolveMetadataFile = (kind: string, basename: string): string => {
  const hits = metadataDirs(kind)
    .map((dir) => `${dir}/${basename}`)
    .filter((rel) => existsSync(join(REPO_ROOT, rel)));
  if (hits.length !== 1) {
    throw new Error(
      `src-roster: '${basename}' resolves to ${hits.length} file(s) under src/*/${kind}/` +
        `${hits.length ? ` (${hits.join(', ')})` : ''} — expected exactly one.`,
    );
  }
  return hits[0]!;
};

/** `*.object.ts` across every package. */
export const objectFiles = (): string[] => metadataFiles('objects', '.object.ts');

/** `*.hook.ts` across every package — they sit beside their objects now. */
export const hookFiles = (): string[] => metadataFiles('objects', '.hook.ts');

/** Every object definition the app registers, keyed by export name. */
export const CrmObjects = {
  ...salesObjects,
  ...serviceObjects,
  ...revenueObjects,
  ...marketingObjects,
};

/** Every flow the app registers, keyed by export name. */
export const CrmFlows = { ...salesFlows, ...serviceFlows, ...revenueFlows, ...marketingFlows };

/** Every list-view group, keyed by export name. */
export const CrmViews = { ...salesViews, ...serviceViews, ...revenueViews, ...marketingViews };

/** Every dashboard, keyed by export name. */
export const CrmDashboards = { ...salesDashboards, ...serviceDashboards };

/** Every analytics dataset, keyed by export name. */
export const CrmDatasets = { ...salesDatasets, ...serviceDatasets, ...revenueDatasets };

/** Every report, keyed by export name. */
export const CrmReports = { ...salesReports, ...serviceReports };

/** Every sharing-rule export, keyed by export name (positions included). */
export const CrmSharing = { ...salesSharing, ...serviceSharing, ...marketingSharing };
