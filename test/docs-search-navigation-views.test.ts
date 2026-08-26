// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { SysApprovalRequest } from '@objectstack/plugin-approvals';
import { REPO_ROOT } from './helpers/repo-root';
import { type AnyRec, packFor, views } from './helpers/metadata-fixtures';

/**
 * `guides/search-and-navigation` › *Built-in vs personal vs shared*, pinned to
 * source (#973).
 *
 * The bullet that teaches what a **built-in** view IS carried two examples and
 * neither existed:
 *
 *  - *All Open Opportunities* — a conflation of two real ones. The opportunity
 *    view set ships **Open Deals** (`open_opportunities`, the default and
 *    pinned tab) and **All Opportunities** (`all_opportunities`, unfiltered);
 *    the page spliced them into a third name that greps 0 in `src/`.
 *  - *Pending My Approval* — the same phantom PR #969 removed from
 *    `revenue/approvals` and #960 from `getting-started/quick-tour`. This page
 *    was its last landing place. The approvals plugin ships **My Pending** /
 *    **I Submitted** / **Completed** / **All** on `sys_approval_request`.
 *
 * The zh pages were wrong in two further ways, each its own kind of wrong:
 * zh-Hans said 「待我审批」, which at the time was real but was the **navigation**
 * label of `nav_approval_requests`, not a view; zh-Hant said 「待我審核」, which is
 * neither — this app ships en / zh-CN / ja-JP / es-ES and no Hant pack, so no
 * surface can display it.
 *
 * ObjectStack 17.0.0-rc.6 then relabelled the `my_pending` view itself, from
 * 我的待办 to 待我审批 — so the string #973 retired here as "a sidebar entry, not
 * a view" is now precisely this bullet's correct answer, and the pages quote it
 * again. The gloss check below is what keeps that honest: it resolves every
 * 「…」 against the shipped bundle rather than against a spelling written down
 * once.
 *
 * Both were fixed by naming the real views, not by adding a denial: unlike
 * `revenue/approvals`, this bullet is an *example*, not a navigation roster, so
 * there is no wrong list for a reader to reconcile — hence this guard pins the
 * names and the retired spellings, and asserts no prose.
 *
 * Nothing else checks this: `os validate` and `pnpm lint` walk authored
 * metadata and never open `content/docs`, so — as with
 * `docs-revenue-approvals-navigation.test.ts` (#963) — the check lives where
 * the claim lives.
 */

/**
 * Every label a list view of this app shows a user.
 *
 * A tab on the object-view switcher is a VIEW, so this set is already every
 * string the strip can show (#1307). This used to add `list.tabs[].label` on
 * top, on the belief that `my_open_deals` was labelled *My Open Deals* on the
 * view and *My Deals* on its tab — the #760 misreading. The console labels a
 * tab with the view's own `label`, `tabs[].label` was removed from every entry
 * by #1304 (leaving this map yielding `undefined` for all of them, discarded by
 * the `filter(Boolean)` below), and `list.tabs` is now gone entirely. Nothing
 * is lost either way: a tab pointed only ever at the primary `list` or at a
 * `listViews` entry, so its label was always already in this set.
 */
const APP_VIEW_LABELS: string[] = views.flatMap((set: AnyRec) => {
  const list = (set.list ?? {}) as AnyRec;
  const extra = Object.values((set.listViews ?? {}) as Record<string, AnyRec>);
  return [list.label, ...extra.map((v) => v.label)].filter(Boolean) as string[];
});

/** Built-in list-view labels the approvals plugin ships for the request object. */
const APPROVAL_VIEW_LABELS: string[] = Object.values(
  ((SysApprovalRequest as AnyRec).listViews ?? {}) as Record<string, AnyRec>,
).map((v) => v.label as string);

const REAL_VIEW_LABELS = new Set([...APP_VIEW_LABELS, ...APPROVAL_VIEW_LABELS]);

/** zh-CN labels for this app's own views, from the pack the console resolves. */
const APP_ZH_VIEW_LABELS = new Set<string>(
  Object.values(((packFor('zh-CN') as AnyRec)?.objects ?? {}) as Record<string, AnyRec>).flatMap(
    (obj) =>
      Object.values((obj._views ?? {}) as Record<string, AnyRec>)
        .map((v) => v.label as string)
        .filter(Boolean),
  ),
);

/**
 * The approvals plugin's shipped bundle, with `\uXXXX` escapes decoded.
 *
 * The package exports its schemas (`SysApprovalRequest`) but not its locale
 * packs, so the zh-CN view labels the zh pages quote — 「待我审批」 for
 * `my_pending` — are only reachable as text in the built bundle, where the
 * bundler emits every non-ASCII character as an escape (the same reason a
 * plain `grep 待我审批 dist/index.js` returns nothing and reads as "the plugin
 * ships no zh-CN"). Decoding once here keeps the gloss check honest instead of
 * unpinned.
 */
const PLUGIN_BUNDLE: string = (() => {
  const require = createRequire(import.meta.url);
  const entry = require.resolve('@objectstack/plugin-approvals');
  const raw = readFileSync(entry, 'utf8');
  return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
})();

/** Does some surface of this app or its plugins ship `label` in zh-CN? */
const shipsZhLabel = (label: string): boolean =>
  APP_ZH_VIEW_LABELS.has(label) || PLUGIN_BUNDLE.includes(`"${label}"`);

const PAGES = [
  {
    file: 'content/docs/guides/search-and-navigation.mdx',
    lang: 'en',
    heading: '### Built-in vs personal vs shared',
    /** Verbatim fragments of the wrong bullet. None may return. */
    retired: ['All Open Opportunities', 'Pending My Approval'],
  },
  {
    file: 'content/docs/guides/search-and-navigation.zh-Hans.mdx',
    lang: 'zh-Hans',
    heading: '### 内置 vs 个人 vs 共享',
    // 待我审批 used to be retired HERE: it was the zh-CN label of the
    // `nav_approval_requests` SIDEBAR entry, and the bullet is about views.
    // ObjectStack 17.0.0-rc.6 relabelled the `my_pending` VIEW from 我的待办 to
    // 待我审批 and the string now occurs exactly once in the approvals bundle —
    // as that view's label — so the collision the pin guarded against is gone
    // and the spelling is the correct one for this bullet. 所有未结商机 stays:
    // it still names nothing.
    retired: ['所有未结商机'],
  },
  {
    file: 'content/docs/guides/search-and-navigation.zh-Hant.mdx',
    lang: 'zh-Hant',
    heading: '### 內建 vs 個人 vs 共享',
    retired: ['所有未結商機', '待我審核'],
  },
] as const;

/** The `### …` section named by `heading`, up to the next heading of any level. */
const sectionOf = (file: string, heading: string): string => {
  const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === heading);
  expect(start, `${file}: heading '${heading}' not found`).toBeGreaterThanOrEqual(0);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{1,6} /.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

/** The one bullet in the section that defines the built-in category. */
const builtInBullet = (file: string, heading: string): string => {
  const bullet = sectionOf(file, heading)
    .split('\n')
    .find((l) => l.startsWith('- **'));
  expect(bullet, `${file}: the built-in bullet is gone from '${heading}'`).toBeTruthy();
  return bullet!;
};

/**
 * Emphasised runs after the leading category word (**Built-in** / **内置** /
 * **內建**) — the names the bullet holds up as examples.
 *
 * Bold *and* italic, deliberately: the two phantoms #973 removed were written
 * in italics (`*All Open Opportunities*`), so a bold-only reader would go green
 * on the very shape the defect took and catch a reintroduction only through the
 * verbatim `retired` list below.
 */
const namesIn = (bullet: string): string[] =>
  [...bullet.matchAll(/\*+([^*]+)\*+/g)].map((m) => m[1].trim()).slice(1);

/** `「…」` glosses — the zh pages' way of quoting a zh-CN interface string. */
const glossesIn = (bullet: string): string[] =>
  [...bullet.matchAll(/「([^」]+)」/g)].map((m) => m[1].trim());

describe('the source facts the built-in-views example rests on (#973)', () => {
  it('sees a non-trivial view set, a plugin that ships views, and a zh-CN pack', () => {
    // Guards the guard: any of these coming back empty would make every
    // assertion below pass by checking nothing.
    expect(REAL_VIEW_LABELS.size, 'no view labels found at all').toBeGreaterThan(20);
    expect(APPROVAL_VIEW_LABELS.length, 'sys_approval_request ships no list views').toBeGreaterThanOrEqual(4);
    expect(APP_ZH_VIEW_LABELS.size, 'zh-CN pack exposes no view labels').toBeGreaterThan(20);
    expect(PLUGIN_BUNDLE.length, 'approvals bundle read as empty').toBeGreaterThan(100_000);
  });

  it('Opportunities opens on Open Deals and keeps All Opportunities one tab over', () => {
    // "Opens on" is a property of being the PRIMARY list, not of a tab flag
    // (#1307): the switcher moves `list` to the front of the strip and marks
    // it default, so `open_opportunities` being `opp.list` is the whole claim.
    // This used to read `isDefault` off the `list.tabs[]` entry naming it —
    // an inert key on an array the console never looked at.
    const opp = views.find((v: AnyRec) => v.list?.name === 'open_opportunities') as AnyRec;
    expect(opp, 'the opportunity view set is gone — this pin is out of date').toBeTruthy();
    expect(opp.list.label).toBe('Open Deals');
    const all = (opp.listViews as AnyRec).all_opportunities as AnyRec;
    expect(all.label).toBe('All Opportunities');
    // "unfiltered" is a claim the bullet makes in all three locales.
    expect(all.filter, 'All Opportunities grew a filter — the bullet says it has none').toBeUndefined();
  });

  it('the approvals plugin ships My Pending on approval requests', () => {
    expect(APPROVAL_VIEW_LABELS).toContain('My Pending');
  });

  it('*All Open Opportunities* and *Pending My Approval* are labels of nothing', () => {
    // The reason the bullet changed. Either name becoming real is a product
    // decision that should reopen this text, not something to discover from a
    // reader's bug report.
    expect([...REAL_VIEW_LABELS].filter((l) => /All Open Opportunities|Pending My Approval/.test(l))).toEqual([]);
  });

  it('zh-CN labels the two opportunity views 进行中商机 / 全部商机', () => {
    const oppPack = ((packFor('zh-CN') as AnyRec)?.objects ?? {})['crm_opportunity'] as AnyRec;
    expect(oppPack?._views?.open_opportunities?.label).toBe('进行中商机');
    expect(oppPack?._views?.all_opportunities?.label).toBe('全部商机');
  });

  it('the approvals plugin labels my_pending 待我审批 in zh-CN', () => {
    expect(shipsZhLabel('待我审批')).toBe(true);
  });
});

describe('guides/search-and-navigation names only views that exist (#973)', () => {
  for (const { file, lang, heading, retired } of PAGES) {
    it(`${lang}: every view the built-in bullet names is one this app ships`, () => {
      const named = namesIn(builtInBullet(file, heading));
      // Vacuity guard: a bullet that stopped naming any view teaches the
      // category with no anchor at all — a reader's only handle on the
      // definition is the example. Held at two, not three, so that a bullet
      // carrying the two wrong names is judged by the membership check below
      // (which says WHICH name is fictional) rather than dismissed here.
      expect(named.length, `${file}: the built-in bullet names no view`).toBeGreaterThanOrEqual(2);
      const bad = named
        .filter((n) => !REAL_VIEW_LABELS.has(n))
        .map((n) => `${file}: names a view "${n}" that nothing in this app ships`);
      expect(
        bad,
        `documented views that do not exist:\n  ${bad.join('\n  ')}\n` +
          'Use a label off `src/views/*.view.ts` or a plugin\'s `listViews` — do not ' +
          'invent a name that reads plausible.',
      ).toEqual([]);
    });

    if (lang !== 'en') {
      it(`${lang}: every 「…」 gloss is a zh-CN string some surface really shows`, () => {
        const glosses = glossesIn(builtInBullet(file, heading));
        expect(glosses.length, `${file}: the bullet quotes no zh-CN label`).toBeGreaterThanOrEqual(2);
        const bad = glosses
          .filter((g) => !shipsZhLabel(g))
          .map((g) => `${file}: quotes 「${g}」, which no zh-CN pack carries`);
        expect(bad, `invented zh-CN labels:\n  ${bad.join('\n  ')}`).toEqual([]);
      });
    }

    it(`${lang}: the retired spellings stay retired`, () => {
      const section = sectionOf(file, heading);
      const back = retired.filter((r) => section.includes(r));
      expect(
        back,
        `${file}: '${back.join("', '")}' is back in the built-in bullet. ` +
          'These name no view: *All Open Opportunities* and *Pending My Approval* exist ' +
          'nowhere, 所有未结商机 / 所有未結商機 name no view, and 待我審核 ' +
          'is in no locale pack at all.',
      ).toEqual([]);
    });
  }
});
