// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './repo-root';

/**
 * Docs URL ↔ source file, across the sidebar sections.
 *
 * The docs site's sidebar sections are Fumadocs folder groups: directories
 * named `(group)` directly under `content/docs/` (`(product)/sales/leads.mdx`).
 * A group's name never reaches the URL, so `/docs/sales/leads` is served from
 * `content/docs/(product)/sales/leads.mdx`. A guard that maps a link to a file
 * by joining the URL onto `content/docs` has to put the group back first —
 * this is the one place that does it.
 */

export const DOCS_ROOT = join(REPO_ROOT, 'content/docs');

const GROUP = /^\(.+\)$/;

/** The `(group)` section directories, in directory order. */
export const DOCS_GROUPS: readonly string[] = readdirSync(DOCS_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && GROUP.test(entry.name))
  .map((entry) => entry.name)
  .sort();

/** Drop the `(group)` segments of a path relative to `content/docs`, as Fumadocs does for slugs. */
export const stripDocsGroups = (path: string): string =>
  path
    .split('/')
    .filter((segment) => !GROUP.test(segment))
    .join('/');

/**
 * The source path, relative to `content/docs` and without `.mdx`, for a URL
 * slug (`sales/leads`, `''` for the docs home). A slug no section holds comes
 * back unchanged, so a link to a missing page still resolves to a missing file.
 */
export const docsSourceForSlug = (slug: string): string => {
  const first = slug.split('/')[0] || 'index';
  const group = DOCS_GROUPS.find(
    (g) =>
      existsSync(join(DOCS_ROOT, g, first)) ||
      existsSync(join(DOCS_ROOT, g, `${first}.mdx`)),
  );
  const path = slug === '' ? 'index' : slug;
  return group ? `${group}/${path}` : path;
};
