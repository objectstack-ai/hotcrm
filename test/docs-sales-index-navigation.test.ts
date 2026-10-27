// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { servedApp } from './helpers/composed-stack';
import { CrmApp } from '../src/sales/apps/crm.app';
import { AccountWorkbenchPage } from '../src/sales/pages/account_workbench.page';

/**
 * The sales index page's "Where to find things" section, pinned to the Sales
 * navigation group (#997).
 *
 * The section's whole job is "here is what the sidebar's Sales group holds",
 * and it held eight of the group's nine entries. The missing one was
 * **Account Workbench** — an ADR-0047 interface page
 * (`src/pages/account_workbench.page.ts`), with a real label in every locale
 * bundle, sitting third in the group — so the page told a new reader it does
 * not exist, or that the sidebar they were looking at was broken.
 *
 * The same fact was already right one page over:
 * `content/docs/getting-started/quick-tour.mdx` lists all nine, and
 * `docs-quick-tour-navigation.test.ts` (#960) pins that list item-for-item. Two
 * pages, one question, two answers — and only one of them had a guard. This
 * file is the other guard, and it is why the same drift cannot recur here: add
 * a nav item to the Sales group without touching this section and it goes red,
 * in all three locales, the way #938 (marketing/index, Products) and #927
 * (service/index, Knowledge) each had to be found by hand.
 *
 * #2286 (ruling B) then took Account Workbench OUT of the group: it showed
 * the same rows and columns as Accounts, so the sidebar carried two identical
 * entries. The page still ships as the ADR-0047 exhibit; the section now says
 * there is no such entry, in italics, the way it says there is no Pipeline
 * entry. That the page is served and that no nav item opens it is pinned in
 * `account-workbench-exhibit.test.ts`.
 *
 * The rules are shaped around the section's own layout, which differs by
 * locale in exactly one respect worth knowing:
 *
 *  - the six OBJECT entries share one `·`-separated bullet. The zh pages
 *    translate those six names, so they cannot be matched against the English
 *    labels — what is pinned instead is the COUNT, which catches a seventh
 *    object entry landing in the group in every locale. The en page is checked
 *    label-for-label on top of that.
 *  - the NON-object entries get a bullet each, and every locale spells
 *    the English label there (bare on en, in parentheses on the zh pages), so
 *    those are matched by label everywhere.
 *  - the group size is stated in prose and must match the group.
 */

type AnyRec = Record<string, any>;

/**
 * The navigation AS SERVED — the app's own groups with each module's
 * contributions folded in (`servedApp`). Quotes, Contracts and Products are
 * the revenue module's since #2270 and Campaigns the marketing module's, so the
 * app's authored tree alone no longer holds them; a reader's sidebar does.
 */
const NAV = ((servedApp('crm_enterprise').navigation ?? []) as AnyRec[]);

const SALES = (() => {
  const g = NAV.find((n) => n.type === 'group' && n.label === 'Sales');
  if (!g) throw new Error('the app has no Sales navigation group — this pin is out of date');
  return g;
})();

const SALES_CHILDREN = ((SALES.children ?? []) as AnyRec[]);

/**
 * The entries that open an object's own list, and the ones that open something
 * else.
 *
 * The split is `viewName`, not `type`: an entry can be `type: 'object'` and
 * still land on one specific saved view rather than on the object's list. The
 * group carried exactly one of those — `nav_pipeline`, the kanban board — and
 * #1259 removed it (the board is the `pipeline` tab on the Opportunities list
 * page). The `!c.viewName` test is kept anyway: it is what makes the two
 * bullets mean different things, and a view entry landing back in this group
 * must go in the second bullet, not the `·`-separated run.
 */
const OBJECT_ENTRIES = SALES_CHILDREN.filter((c) => c.type === 'object' && !c.viewName);
const OTHER_ENTRIES = SALES_CHILDREN.filter((c) => c.type !== 'object' || !!c.viewName);

/** `·`-separated list items in the section's first bullet. */
const OBJECT_BULLET_ITEMS = (section: string): string[] => {
  const line = section.split('\n').find((l) => l.trim().startsWith('- ') && l.includes(' · '));
  expect(line, 'the section has no `·`-separated bullet of object entries').toBeTruthy();
  return (line as string)
    .trim()
    .replace(/^-\s+/, '')
    .split(' · ')
    .map((s) => s.trim());
};

const PAGES = [
  {
    file: 'content/docs/sales/index.mdx',
    lang: 'en',
    heading: '## Where to find things',
    /** The group size, stated in prose. */
    count: /nine entries/,
    /** The en page names the object entries in English, so they are checked verbatim. */
    checkObjectLabels: true,
  },
  {
    file: 'content/docs/sales/index.zh-Hans.mdx',
    lang: 'zh-Hans',
    heading: '## 在哪里找到这些功能',
    count: /九个条目/,
    checkObjectLabels: false,
  },
  {
    file: 'content/docs/sales/index.zh-Hant.mdx',
    lang: 'zh-Hant',
    heading: '## 在哪裡找到這些功能',
    count: /九個條目/,
    checkObjectLabels: false,
  },
] as const;

/** The `## …` section named by `heading`, up to the next `## `. */
const sectionOf = (file: string, heading: string): string => {
  const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === heading);
  expect(start, `${file}: heading '${heading}' not found`).toBeGreaterThanOrEqual(0);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

describe('sales/index lists the whole Sales navigation group (#997)', () => {
  describe.each(PAGES)('$file', ({ file, heading, count, checkObjectLabels }) => {
    const section = () => sectionOf(file, heading);

    it('states the group size the app really ships', () => {
      expect(
        section(),
        `${file}: the entry count in prose does not match the Sales group ` +
          `(${SALES_CHILDREN.length} children)`,
      ).toMatch(count);
    });

    it('carries one item per object entry in the shared bullet', () => {
      expect(
        OBJECT_BULLET_ITEMS(section()).length,
        `${file}: the object bullet lists a different number of entries than the Sales group ` +
          'has object children. Add a nav item, list it here.',
      ).toBe(OBJECT_ENTRIES.length);
    });

    it('names every non-object entry by the label the app carries', () => {
      const text = section();
      const missing = OTHER_ENTRIES.map((c) => c.label as string).filter((l) => !text.includes(l));
      expect(
        missing,
        `${file}: Sales entries that open something other than an object list, and that this ` +
          'section does not name. This is the first place a reader looks for them.',
      ).toEqual([]);
    });

    it('says Account Workbench is not a sidebar entry, and never bolds it (#2286)', () => {
      const text = section();
      expect(
        text,
        `${file}: a reader who knew the Account Workbench entry is told where it went`,
      ).toContain('Account Workbench');
      // Bold is for names the sidebar carries; the zh pages bold the
      // translated name, so both spellings are refused.
      for (const bold of ['**Account Workbench**', '**客户工作台**', '**客戶工作台**']) {
        expect(text, `${file}: Account Workbench is no longer a Sales entry`).not.toContain(bold);
      }
    });

    if (checkObjectLabels) {
      it('spells each object entry with its own navigation label', () => {
        expect(OBJECT_BULLET_ITEMS(section())).toEqual(OBJECT_ENTRIES.map((c) => c.label));
      });
    }
  });
});

describe('the source facts that section now rests on (#997)', () => {
  it('the Sales group holds nine entries, in this order', () => {
    expect(SALES_CHILDREN.map((c) => c.label)).toEqual([
      'Leads',
      'Accounts',
      'Contacts',
      'Opportunities',
      'Sales Performance',
      'Quotes',
      'Contracts',
      'Products',
      'Price Books',
    ]);
  });

  it('Quotes, Contracts, Products and Price Books are contributed by the revenue module, after the app\'s own entries (#2270)', () => {
    // A contributed item lands after the group's own children (the rule that
    // put My Cases last in My Work, #1907), which is why Sales Performance now
    // precedes them.
    const authored = ((CrmApp as AnyRec).navigation as AnyRec[]).find((n) => n.id === 'group_sales');
    expect(((authored?.children ?? []) as AnyRec[]).map((c) => c.id)).toEqual([
      'nav_lead', 'nav_account', 'nav_contact', 'nav_opportunity', 'nav_sales_dashboard',
    ]);
    expect(SALES_CHILDREN.slice(-4).map((c) => c.id)).toEqual(['nav_quote', 'nav_contract', 'nav_product', 'nav_price_book']);
  });

  it('eight of them open an object list; one opens something else', () => {
    expect(OBJECT_ENTRIES.map((c) => c.label)).toEqual([
      'Leads',
      'Accounts',
      'Contacts',
      'Opportunities',
      'Quotes',
      'Contracts',
      'Products',
      'Price Books',
    ]);
    expect(OTHER_ENTRIES.map((c) => c.label)).toEqual(['Sales Performance']);
  });

  it('Products is a Sales entry, not a Marketing one (#1259)', () => {
    // The catalogue is the master data quote lines and opportunity line items
    // point at — revenue, not campaigns. It sat under Marketing because that
    // is where it was first filed, and the sales index said nothing about it.
    const marketing = NAV.find((n) => n.type === 'group' && n.label === 'Marketing');
    expect(((marketing?.children ?? []) as AnyRec[]).map((c) => c.id)).toEqual(['nav_campaign']);
    const product = SALES_CHILDREN.find((c) => c.id === 'nav_product');
    expect(product?.objectName).toBe('crm_product');
    expect(product?.viewName, 'Products opens the object list, so it belongs in the shared bullet')
      .toBeUndefined();
  });

  it('the Account Workbench page reuses the accounts view rather than restating it, as the section says', () => {
    const cfg = (AccountWorkbenchPage as AnyRec).interfaceConfig ?? {};
    expect(cfg.source).toBe('crm_account');
    expect(cfg.sourceView).toBe('all_accounts');
    expect(cfg.userActions?.filter).toBe(false);
    expect((cfg.userFilters?.fields ?? []).map((f: AnyRec) => f.field)).toEqual([
      'industry',
      'type',
      'owner_id',
    ]);
  });
});
