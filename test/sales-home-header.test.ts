// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { translateApp, translatePage } from '@objectstack/spec/system';
import composedStack, { localePacks, servedApp, type AnyRec } from './helpers/composed-stack';
import { CrmApp } from '../src/sales/apps/crm.app';

/**
 * The Sales Home heading is the name its sidebar entry gives it (#2125).
 *
 * The page used to head itself "Sales Dashboard" under a sidebar entry
 * reading "Sales Home", so a rep clicked one name and landed on another — and
 * "Sales Performance" is the sidebar entry that opens the `sales_dashboard`
 * dashboard, so the heading also named the wrong destination.
 *
 * The pin compares the two strings AS SERVED in every shipped locale, through
 * the platform's own translators (`translatePage` for the header, `translateApp`
 * for the navigation), rather than comparing source literals: the packs carry
 * no `pages.sales_home_page.title`, so in zh-CN / es-ES / ja-JP the heading is
 * the pack's page `label` standing in for a title that restates the English
 * label. A pack that re-adds a diverging `title`, or a header retitled away
 * from the label, turns this red in every locale it touches.
 */

const PAGE = 'sales_home_page';

const page = (((composedStack as AnyRec).pages ?? []) as AnyRec[]).find((p) => p.name === PAGE);
const bundle = Object.fromEntries(localePacks) as AnyRec;
const app = servedApp((CrmApp as AnyRec).name);

/** Depth-first: the navigation node that opens this page. */
const navEntryFor = (nodes: AnyRec[]): AnyRec | undefined => {
  for (const node of nodes) {
    if (node.type === 'page' && node.pageName === PAGE) return node;
    const hit = navEntryFor((node.children ?? []) as AnyRec[]);
    if (hit) return hit;
  }
  return undefined;
};

const headerOf = (doc: AnyRec): AnyRec | undefined =>
  ((doc.regions ?? []) as AnyRec[])
    .flatMap((r) => (r.components ?? []) as AnyRec[])
    .find((c) => c?.type === 'page:header');

describe('Sales Home heading (#2125)', () => {
  it('the heading equals the sidebar label in every shipped locale', () => {
    expect(page, `${PAGE} is not registered by either package`).toBeDefined();
    expect(navEntryFor((app.navigation ?? []) as AnyRec[]), `no sidebar entry opens ${PAGE}`).toBeDefined();
    const locales = Object.keys(bundle);
    // An empty pack list would make the loop below assert nothing.
    expect(locales).toEqual(expect.arrayContaining(['en', 'zh-CN', 'es-ES', 'ja-JP']));

    const served = locales.map((locale) => {
      const title = headerOf(translatePage(page as never, bundle as never, { locale }) as AnyRec)?.properties?.title;
      const nav = navEntryFor((translateApp(app as never, bundle as never, { locale }) as AnyRec).navigation ?? []);
      return { locale, title, navLabel: nav?.label };
    });
    for (const { locale, title, navLabel } of served) {
      expect(title, `${locale}: heading vs sidebar label`).toBe(navLabel);
    }
    expect(served.find((s) => s.locale === 'en')?.title).toBe('Sales Home');
  });
});
