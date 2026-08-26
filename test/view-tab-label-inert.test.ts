// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { type AnyRec, views } from './helpers/metadata-fixtures';

/**
 * `list.tabs[]` is inert in its entirety — nothing may reintroduce it (#1307).
 *
 * The console's object-view switcher (`ViewTabBar`) builds its tab strip from
 * the view definitions, not from `tabs[]`. Measured on the shipped renderer
 * (`@objectstack/console` 17.1.0):
 *
 *   Dm({ definedViews: U.listViews ?? U.list_views ?? {}, primary: U.list,
 *        primaryId, savedViews, viewOverrides, fallbackTab })
 *
 * — every tab is a *view* descriptor: one per `listViews` key, plus the primary
 * `list`, which the builder unshifts to the front of the strip and marks
 * default. So the string rendered into a tab is `view.label`, and the icon
 * beside it is `viewTypeIcons[view.type]` from a map the console hardcodes
 * (`grid` / `kanban` / `calendar` / `gallery` / `timeline` / `gantt` / `map` /
 * `chart`). `list.tabs[]` is read by nothing on any surface: the object-view
 * switcher never consults it, and the page-list tab bar is a *different* key —
 * `userFilters.tabs[]` (ADR-0047), which reuses `ViewTabSchema` and whose
 * `label` IS live and translated. Do not read this pin as a claim about that
 * one, and do not delete `ViewTabSchema.label` on the strength of it.
 *
 * ## Why the whole key, and why a guard rather than a note
 *
 * #1283 removed `label` from all 60 entries across the 12 view files, because
 * 50 of them said something other than what the tab actually reads. #760 was
 * filed on exactly that trap: a tab was believed to say `Closing Soon`, the
 * authored string beside `closing_this_quarter`; the tab says `Closing This
 * Quarter`, the view's own label, and the user-facing defect did not exist.
 *
 * `label` was only the loudest key. Re-measuring the renderer for #1307 found
 * the same hole under every other one: `icon`, and `name`, `order`, `pinned`,
 * `isDefault`, `visible` and `filter` alongside it. All 48 authored `icon:`
 * values were inert — the string is never looked up anywhere, the icon beside
 * a tab is chosen by the view's `type`. Resolved against what each tab's
 * target view renders, 33 of the 48 named an icon that could not appear there
 * at all (`crown`, `inbox`, `git-commit-horizontal`, `user`, `columns-3`, …);
 * the 15 that seemed to match did so by coincidence — 8 exactly (`calendar`,
 * `map`) and 7 by prefix (`gallery-thumbnails` on a `gallery` view,
 * `gantt-chart` on a `gantt` one), which is why the strip read as authored.
 * An author editing `icon: 'crown'` to change what a user sees gets nothing,
 * and has no way to find that out. Under ADR-0049 the honest treatments are
 * enforce or remove; this repo removed — the whole block, from all 12 files.
 *
 * So this pin was re-aimed rather than retired: "carries no `label`" would now
 * pass vacuously, since there are no entries left to carry one. It asserts the
 * stronger property the removal established — `tabs` is ABSENT — and the
 * anti-vacuity face moved with it, from "there are still tabs to inspect" to
 * "the walk really did reach the `list` blocks it claims to have cleared".
 *
 * To rename a tab, rename the LABEL OF THE VIEW IT POINTS AT — that string is
 * the one on screen, and it is the one the locale packs translate. To add one,
 * add a `listViews` entry.
 */

/**
 * The twelve objects whose `list` blocks carried the removed `tabs` arrays —
 * 60 entries, 48 of them with an `icon`.
 *
 * Named rather than counted, because the failure this list exists to catch is
 * a walk that silently stops reaching view bundles: a count could be satisfied
 * by any twelve, and a bundle dropping out of `src/views/index.ts` would take
 * its `list` block out of the assertion above without anything going red.
 */
const OBJECTS_THAT_CARRIED_TABS = [
  'crm_account',
  'crm_campaign',
  'crm_case',
  'crm_contact',
  'crm_contract',
  'crm_event',
  'crm_forecast',
  'crm_knowledge_article',
  'crm_opportunity',
  'crm_product',
  'crm_quote',
  'crm_task',
] as const;

describe('list.tabs[] is absent, not merely label-free (#1307)', () => {
  /** Every place on a view bundle where a `tabs` array could be authored. */
  const tabSites = (v: AnyRec): [string, unknown][] => {
    const name = v.name ?? v.list?.data?.object ?? '(unnamed view)';
    return [
      [`${name}.list`, v.list?.tabs],
      ...(Object.entries(v.listViews ?? {}) as [string, AnyRec][]).map(
        ([key, def]) => [`${name}.listViews.${key}`, def?.tabs] as [string, unknown],
      ),
    ];
  };

  it('no list or listViews block declares `tabs` at all', () => {
    const bad: string[] = [];
    for (const v of views) {
      for (const [where, tabs] of tabSites(v)) {
        if (tabs === undefined) continue;
        const shape = Array.isArray(tabs) ? `${tabs.length} entries` : typeof tabs;
        bad.push(
          `${where}.tabs is authored (${shape}) — the object-view switcher never reads it. ` +
            `A tab is a view: add a \`listViews\` entry, and name it with that view's \`label\`.`,
        );
      }
    }
    expect(bad, `inert tab blocks:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  /**
   * The rule above is a "nothing is there" assertion, so it passes for two very
   * different reasons: the key is gone, or the walk found no view bundles to
   * look in. This half separates them.
   */
  it('the walk really reaches the twelve `list` blocks it cleared', () => {
    const reached = new Map<string, AnyRec>();
    for (const v of views) {
      const object = v.list?.data?.object;
      if (typeof object === 'string' && object) reached.set(object, v.list as AnyRec);
    }

    const missing = OBJECTS_THAT_CARRIED_TABS.filter((o) => !reached.has(o));
    expect(
      missing,
      `these \`list\` blocks were never inspected, so the rule above proved nothing about them:\n  ${missing.join('\n  ')}`,
    ).toEqual([]);

    // …and each one is a real list block, not an empty shell that would make
    // `list?.tabs` undefined for a reason that has nothing to do with #1307.
    const hollow = OBJECTS_THAT_CARRIED_TABS.filter(
      (o) => !Array.isArray(reached.get(o)?.columns) || !reached.get(o)!.columns.length,
    );
    expect(hollow, `\`list\` blocks reached but empty:\n  ${hollow.join('\n  ')}`).toEqual([]);

    // The listViews half of `tabSites` has to be non-trivial too, or the rule
    // is only ever inspecting twelve sites instead of the whole surface.
    const listViewSites = views.reduce(
      (n, v) => n + Object.keys(v.listViews ?? {}).length,
      0,
    );
    expect(listViewSites, 'no listViews entry was inspected at all').toBeGreaterThan(30);
  });
});
