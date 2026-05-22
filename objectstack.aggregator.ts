/**
 * Filesystem-based metadata aggregator.
 *
 * Walks each `packages/<pkg>/dist/` directory and dynamically imports every
 * `*.<suffix>.js` file, grouping the named exports by suffix so the root
 * `objectstack.config.ts` can declare top-level `pages`, `views`,
 * `dashboards`, `flows`, etc. arrays (matching the framework CRM example).
 *
 * Source-of-truth for object/action/hook/workflow/app/data/translation
 * arrays remains the per-package `plugin.ts` bundles.
 */

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Resolve packages dir from process.cwd() (the repo root when invoked by
// the `objectstack` CLI). Avoid `import.meta.url` so that when this module
// is bundled into `dist/objectstack-runtime.<hash>.mjs` it does not look for
// `dist/packages` at runtime.
const PACKAGES_DIR = resolve(process.cwd(), 'packages');

/** Map file suffix (`.page.js`) → top-level `defineStack` field name. */
const SUFFIX_TO_FIELD: Record<string, string> = {
  page: 'pages',
  view: 'views',
  dashboard: 'dashboards',
  form: 'views',        // FormViewSchema is a `View` variant
  flow: 'flows',
  permission: 'permissions',
  report: 'reports',
  agent: 'agents',
};

const SUFFIXES = Object.keys(SUFFIX_TO_FIELD);

function isViewLike(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  // ViewSchema variants
  if (v.list || v.form || v.kanban || v.calendar || v.gallery ||
      v.timeline || v.gantt || v.chart || v.map) return true;
  // FormViewSchema (top-level { type, data, sections })
  if (Array.isArray(v.sections) && v.data) return true;
  return false;
}

function isPlainObjectWithName(value: unknown): value is { name: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { name?: unknown }).name === 'string' &&
    (value as { name: string }).name.length > 0
  );
}

function listJsFiles(dir: string, suffix: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      listJsFiles(full, suffix, out);
    } else if (entry.endsWith(`.${suffix}.js`)) {
      out.push(full);
    }
  }
  return out;
}

export type AggregatedMetadata = Record<string, unknown[]>;

export async function aggregatePackageMetadata(): Promise<AggregatedMetadata> {
  const result: AggregatedMetadata = {};
  for (const field of new Set(Object.values(SUFFIX_TO_FIELD))) result[field] = [];

  const packageDirs = readdirSync(PACKAGES_DIR)
    .map((name) => join(PACKAGES_DIR, name, 'dist'))
    .filter((p) => existsSync(p));

  for (const pkgDist of packageDirs) {
    for (const suffix of SUFFIXES) {
      const field = SUFFIX_TO_FIELD[suffix];
      const files = listJsFiles(pkgDist, suffix);
      for (const file of files) {
        try {
          const mod = await import(pathToFileURL(file).href);
          const seen = new WeakSet<object>();
          for (const key of Object.keys(mod)) {
            const val = (mod as Record<string, unknown>)[key];
            if (!val || typeof val !== 'object') continue;
            if (seen.has(val as object)) continue;
            const accept = (suffix === 'view' || suffix === 'form')
              ? isViewLike(val)
              : isPlainObjectWithName(val);
            if (accept) {
              seen.add(val as object);
              result[field].push(val);
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            `[aggregator] Failed to load ${file}: ${(err as Error).message}`,
          );
        }
      }
    }
  }
  return result;
}
