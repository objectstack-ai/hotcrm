// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import artifact from '../objectstack.config';
import { servedApps, walk } from './helpers/composed-stack';
import { CrmTranslations } from '../src/sales/translations';
import { AccountWorkbenchPage } from '../src/sales/pages/account_workbench.page';

/**
 * Account Workbench is an exhibit, not a sidebar entry (#2286, ruling B).
 *
 * The page is the app's ADR-0047 interface page: a curated, closed screen over
 * `crm_account` that references the **All Accounts** view. In the sidebar it
 * sat directly under **Accounts** and showed the same rows and columns, so
 * every user saw two identical entries. The ruling kept the page and dropped
 * the entry. That leaves two facts that are easy to break apart:
 *
 *  - the page is still SERVED. With no nav entry pointing at it, nothing else
 *    in the app breaks if it falls out of `src/sales/pages/index.ts`, and a
 *    page missing from its barrel is validated and shipped by nothing;
 *  - no nav item opens it, in any app as served (module contributions
 *    included), and no locale pack keeps a label for the retired entry.
 *
 * ⛔ Re-adding a nav item for it is a reversal of the ruling, not a fix.
 */

type AnyRec = Record<string, any>;

const PAGE = AccountWorkbenchPage.name;

/** The app package's body in the artifact the build serializes. */
const appBody = ((((artifact as AnyRec).packages ?? []) as AnyRec[])
  .map((entry) => (entry?.manifest ?? {}) as AnyRec)
  .find((b) => b.id === 'app.objectstack.hotcrm')) as AnyRec | undefined;

describe('Account Workbench stays served as the ADR-0047 exhibit (#2286)', () => {
  it('is a page of the artifact, as authored', () => {
    expect(appBody, 'the artifact carries no app.objectstack.hotcrm package').toBeTruthy();
    const served = ((appBody?.pages ?? []) as AnyRec[]).find((p) => p.name === PAGE);
    expect(served, `the artifact ships no page "${PAGE}" — check src/sales/pages/index.ts`).toBeTruthy();
    expect(served?.object).toBe('crm_account');
    expect(served?.interfaceConfig?.source).toBe('crm_account');
    expect(served?.interfaceConfig?.sourceView).toBe('all_accounts');
  });

  it('keeps its page label in every locale pack', () => {
    // The page's own `pages.account_workbench` entry is still live: the page
    // is served and its title is shown wherever it opens.
    for (const locale of ['zh-CN', 'es-ES', 'ja-JP'] as const) {
      expect(
        (CrmTranslations as AnyRec)[locale]?.pages?.[PAGE]?.label,
        `${locale}: the served page lost its label`,
      ).toBeTruthy();
    }
  });
});

describe('no navigation entry opens it (#2286)', () => {
  it('no nav item of any served app points at the page', () => {
    const apps = servedApps();
    expect(apps.length, 'no served apps — the walk below would check nothing').toBeGreaterThan(0);
    const hits: string[] = [];
    for (const app of apps) {
      for (const node of walk([app.navigation, ...((app.areas ?? []) as AnyRec[]).map((a) => a?.navigation)])) {
        if (node?.pageName === PAGE || node?.id === 'nav_account_workbench') {
          hits.push(`${app.name}: ${node.id}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('no locale pack keeps a label for the retired nav entry', () => {
    const left: string[] = [];
    for (const [locale, pack] of Object.entries(CrmTranslations as AnyRec)) {
      for (const [app, entry] of Object.entries<AnyRec>(pack?.apps ?? {})) {
        if (entry?.navigation && 'nav_account_workbench' in entry.navigation) left.push(`${locale}: apps.${app}`);
      }
    }
    expect(left).toEqual([]);
  });
});
