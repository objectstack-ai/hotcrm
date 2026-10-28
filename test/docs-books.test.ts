// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveBookClaimedDocs, resolveDocAudiences, type AudienceBook } from '@objectstack/spec/system';
import { REPO_ROOT } from './helpers/repo-root';
import stack, { servedApp } from './helpers/composed-stack';
import { packageStacks } from '../objectstack.composition';
import { CrmApp } from '../src/sales/apps/crm.app';
import { SystemAdminProfile } from '../src/sales/profiles/system-admin.profile';

/**
 * The in-app manuals hold together (#2327, ADR-0046 §6).
 *
 * A book is a SPINE: its groups name rules, and a page files itself by its name.
 * That keeps a new page from needing an edit to the book — and it means nothing
 * stops a page from matching no rule at all. The platform does not drop such a
 * page, it sweeps it into a synthetic *Uncategorized* group, which is where a
 * misnamed page would quietly end up. So this file asks the questions the
 * layout rests on, over the pages on disk and the books the packages register:
 *
 *  - every page is claimed by a group of some book, and has a Chinese sibling;
 *  - every book is opened by exactly one `type: 'doc'` entry under *Help*;
 *  - the administrator pages are published to the administrator's set alone,
 *    and every other page to every member — a doc's audience is the UNION over
 *    the books that claim it (§6.7), so one stray group rule would widen the
 *    Admin Manual to everyone, and one stray gate would hide a user page;
 *  - the app package's pages never link to a revenue or marketing page: those
 *    modules can be uninstalled, the app's pages stay.
 *
 * Membership and audience are computed with the platform's own resolvers
 * (`@objectstack/spec/system`), the ones the REST read layer serves the tree
 * and the gate through — ⛔ never a re-implementation of the rule here.
 */

type AnyRec = Record<string, any>;

/** The package that owns a docs directory: `src/docs/` is the app's, `src/<dir>/docs/` the package whose id ends in `<dir>`. */
const PACKAGES = (packageStacks as AnyRec[]).map((s) => String(s.manifest.id));
const APP_ID = String((packageStacks as AnyRec[]).find((s) => s.manifest.type === 'app')!.manifest.id);
const packageOfDir = (dir: string): string => {
  if (dir === 'docs') return APP_ID;
  const owner = PACKAGES.find((id) => id.split('.').pop() === dir.split('/')[0]);
  if (!owner) throw new Error(`no package answers to src/${dir}`);
  return owner;
};

interface Page { name: string; packageId: string; file: string }

const DOC_DIRS = ['docs', ...readdirSync(join(REPO_ROOT, 'src'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(REPO_ROOT, 'src', e.name, 'docs')))
  .map((e) => `${e.name}/docs`)];

const PAGES: Page[] = DOC_DIRS.flatMap((dir) =>
  readdirSync(join(REPO_ROOT, 'src', dir))
    .filter((f) => f.endsWith('.md') && !/\.[a-z]{2}(-[A-Z]{2})?\.md$/.test(f))
    .map((f) => ({ name: f.replace(/\.md$/, ''), packageId: packageOfDir(dir), file: `src/${dir}/${f}` })));

const BOOKS: AudienceBook[] = (packageStacks as AnyRec[]).flatMap((s) =>
  ((s.books ?? []) as AnyRec[]).map((b) => ({ ...(b as AudienceBook), packageId: String(s.manifest.id) })));

const RESOLVER_DOCS = PAGES.map((p) => ({ name: p.name, packageId: p.packageId }));

const docEntries = (): AnyRec[] => {
  const walk = (nodes: AnyRec[]): AnyRec[] =>
    nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as AnyRec[]) : [n]));
  return walk((servedApp((CrmApp as AnyRec).name).navigation ?? []) as AnyRec[]).filter((n) => n.type === 'doc');
};

describe('the in-app manuals claim every page (#2327)', () => {
  it('reads real pages and real books', () => {
    expect(PAGES.length, 'no package docs found under src/').toBeGreaterThanOrEqual(9);
    expect(BOOKS.map((b) => b.name).sort()).toEqual(['crm_admin_manual', 'crm_manual', 'crm_revenue_manual']);
    // The three packages that ship pages, so the module directories are really read.
    expect(new Set(PAGES.map((p) => p.packageId)).size).toBeGreaterThanOrEqual(3);
  });

  it('every page is claimed by a group of some book — none falls to Uncategorized', () => {
    const claimed = new Set(BOOKS.flatMap((b) => [...resolveBookClaimedDocs(b, RESOLVER_DOCS, b.packageId)]));
    expect(PAGES.filter((p) => !claimed.has(p.name)).map((p) => p.file)).toEqual([]);
  });

  it('every page has a Chinese sibling', () => {
    const missing = PAGES.map((p) => p.file.replace(/\.md$/, '.zh.md')).filter((f) => !existsSync(join(REPO_ROOT, f)));
    expect(missing).toEqual([]);
  });

  it('every book is opened by exactly one `doc` entry, and every `doc` entry opens a registered book', () => {
    const entries = docEntries();
    for (const book of BOOKS) {
      expect(entries.filter((e) => e.book === book.name).map((e) => e.id), `entries opening ${book.name}`).toHaveLength(1);
    }
    expect(entries.filter((e) => !BOOKS.some((b) => b.name === e.book)).map((e) => e.id)).toEqual([]);
  });
});

describe('who reads which manual (#2327, ADR-0046 §6.7)', () => {
  const audiences = resolveDocAudiences(BOOKS, RESOLVER_DOCS);
  const ADMIN = { permissionSet: SystemAdminProfile.name };

  it('the administrator pages are published to the administrator set and nobody else', () => {
    const adminPages = PAGES.filter((p) => p.name.startsWith('crm_admin_'));
    expect(adminPages.length).toBeGreaterThan(0);
    for (const page of adminPages) expect(audiences.get(page.name), page.file).toEqual([ADMIN]);
  });

  it('every other page is published to every member', () => {
    for (const page of PAGES.filter((p) => !p.name.startsWith('crm_admin_'))) {
      expect(audiences.get(page.name), page.file).toContain('org');
    }
  });

  it('the administrator set the Admin Manual names is one this composition registers', () => {
    const sets = ((stack as AnyRec).permissions as AnyRec[]).map((s) => s.name);
    expect(sets).toContain(ADMIN.permissionSet);
  });
});

describe("the app package's pages stand without the add-on modules (#2327)", () => {
  it('no app-package page links to a revenue or marketing page', () => {
    const moduleDocs = new Set(PAGES.filter((p) => /\.(revenue|marketing)$/.test(p.packageId)).map((p) => p.name));
    const bad: string[] = [];
    for (const page of PAGES.filter((p) => p.packageId === APP_ID)) {
      for (const file of [page.file, page.file.replace(/\.md$/, '.zh.md')]) {
        for (const [, target] of readFileSync(join(REPO_ROOT, file), 'utf8').matchAll(/\]\(\.\/([a-z0-9_]+)\.md/g)) {
          if (moduleDocs.has(target)) bad.push(`${file} → ${target}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
