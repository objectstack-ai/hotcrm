// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { type AnyRec, views } from './helpers/metadata-fixtures';

/**
 * `list.tabs[].label` is inert — nothing may reintroduce it (#1283).
 *
 * The console's object-view switcher (`ViewTabBar`) builds its tab strip from
 * the view definitions, not from `tabs[]`. Measured on the shipped renderer
 * (`@objectstack/console` 17.1.0):
 *
 *   Dm({ definedViews: U.listViews, primary: U.list, primaryId, savedViews, … })
 *
 * — every tab is a *view* descriptor, so the string rendered into the tab is
 * `view.label`, and the icon beside it is `viewTypeIcons[view.type]` from a map
 * the console hardcodes (`grid` / `kanban` / `calendar` / `gallery` /
 * `timeline` / `gantt` / `map` / `chart`). `list.tabs[]` is read by nothing on
 * any surface: the object-view switcher never consults it, and the page-list
 * tab bar is a *different* key — `userFilters.tabs[]` (ADR-0047), which reuses
 * `ViewTabSchema` and whose `label` IS live and translated. Do not read this
 * pin as a claim about that one.
 *
 * Why a guard rather than a note: all 60 entries across the 12 view files
 * carried a `label`, and 50 of them said something other than what the tab
 * actually reads. That is not a cosmetic drift — it is a trap. #760 was filed
 * because a tab was believed to say `Closing Soon`, the authored string beside
 * `closing_this_quarter`; the tab says `Closing This Quarter`, the view's own
 * label, and the user-facing defect did not exist. An author who "fixes" a tab
 * name here changes nothing and has no way to find that out. Under ADR-0049 the
 * honest treatments are enforce or remove; this repo removed.
 *
 * To rename a tab, rename the LABEL OF THE VIEW IT POINTS AT — that string is
 * the one on screen, and it is the one the locale packs translate.
 */
describe('list.tabs[] carries no inert `label` (#1283)', () => {
  const tabBlocks = (v: AnyRec): [string, AnyRec[]][] => {
    const out: [string, AnyRec[]][] = [];
    const push = (where: string, tabs: unknown) => {
      if (Array.isArray(tabs) && tabs.length) out.push([where, tabs as AnyRec[]]);
    };
    const name = v.name ?? v.list?.data?.object ?? '(unnamed view)';
    push(`${name}.list`, v.list?.tabs);
    for (const [key, def] of Object.entries(v.listViews ?? {}) as [string, AnyRec][]) {
      push(`${name}.listViews.${key}`, def?.tabs);
    }
    return out;
  };

  it('no switcher tab declares a label the console cannot render', () => {
    const bad: string[] = [];
    for (const v of views) {
      for (const [where, tabs] of tabBlocks(v)) {
        tabs.forEach((t, i) => {
          if (t?.label !== undefined) {
            bad.push(
              `${where}.tabs[${i}] (name: "${t.name}") declares label ${JSON.stringify(t.label)} — ` +
                `the tab renders the label of view "${t.view}" instead. Rename that view.`,
            );
          }
        });
      }
    }
    expect(bad, `inert tab labels:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * The guard above is only meaningful while there are tabs to guard. If a
   * refactor empties every `tabs[]` array, the assertion passes vacuously and
   * stops protecting anything — so pin that it is still measuring something.
   */
  it('is still measuring a non-empty set of tabs', () => {
    const total = views.reduce(
      (n, v) => n + tabBlocks(v).reduce((m, [, tabs]) => m + tabs.length, 0),
      0,
    );
    expect(total).toBeGreaterThan(0);
  });
});
