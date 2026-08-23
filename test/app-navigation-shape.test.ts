// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CrmApp } from '../src/apps/crm.app';

/**
 * The two standing constraints on `src/apps/crm.app.ts`'s shape (#1259).
 *
 * #1259 cut the sidebar from 7 groups / 31 items back to 6 / 27, and the cut
 * was almost entirely one pattern: the same object surfaced again and again
 * through its own saved views. `crm_event` had four rows — Events, Calendar,
 * Interaction History, My Calendar — while the event list page already carried
 * a tab for every one of them. Nothing noticed it happening. The nav grew a row
 * at a time, each addition defensible on its own, and the only guard on the
 * file compared it against a docs table that was updated in the same commit.
 *
 * So this file guards the two properties that cut rests on, in the two
 * directions they can break:
 *
 *  1. **A FLOOR on variety.** HotCRM is the exemplar app: an author reading it
 *     is reading it to learn what each kind of nav item looks like. Nav items
 *     come in six kinds and every one of them must keep at least one entry —
 *     `page` and `component` are down to a single exemplar each, so the next
 *     slimming pass is one deletion away from removing a demonstration
 *     silently. That is the failure this half exists to make loud.
 *
 *  2. **A CEILING on duplication.** No two entries may open the same
 *     destination, and no object may hold more than one plain list entry.
 *     Deliberately NOT "one entry per object": an object legitimately appears
 *     as its own list AND as a personal view under **My Work** (`crm_task` is
 *     Events-shaped in miniature — My Tasks is `my_open_tasks`, the whole book
 *     is the `all` tab on the page that opens). What #1259 removed was the
 *     third and fourth row for the same object, all landing on the same list
 *     page with a different tab preselected. That is what this half forbids.
 *
 * The count itself is not pinned here — `docs-quick-tour-navigation.test.ts`
 * already holds the group-by-group roster against the tour table, and pinning
 * a number twice would mean two files to edit for every legitimate addition.
 * What is pinned here are the properties a number cannot express.
 */

type AnyRec = Record<string, any>;

const NAV = ((CrmApp as AnyRec).navigation ?? []) as AnyRec[];

/** Every non-group node, depth-first. Groups are containers, not destinations. */
const LEAVES: AnyRec[] = (() => {
  const walk = (nodes: AnyRec[]): AnyRec[] =>
    nodes.flatMap((n) =>
      n.type === 'group' ? walk((n.children ?? []) as AnyRec[]) : [n],
    );
  return walk(NAV);
})();

/**
 * The kind of surface an entry opens.
 *
 * `type` alone does not separate them: an object entry that pins a `viewName`
 * lands on one saved view rather than on the object's own list, and those two
 * are different things to demonstrate — which is exactly the distinction
 * `docs-sales-index-navigation.test.ts` splits its two bullets on.
 */
const kindOf = (n: AnyRec): string =>
  n.type === 'object' && n.viewName ? 'view' : String(n.type);

/** The six kinds the app is meant to demonstrate. */
const REQUIRED_KINDS = ['object', 'view', 'page', 'dashboard', 'report', 'component'] as const;

describe('the app navigation keeps one exemplar of every nav-item kind (#1259)', () => {
  it('the walk finds a real navigation tree', () => {
    // Guard the guard. Every assertion below reads `LEAVES`, and a walk that
    // stopped yielding nodes — a renamed `children`, a `navigation` key that
    // moved — would make the duplication check pass by checking nothing and
    // the exemplar check fail loudly. Only one of those two is safe to leave
    // implicit, so the roster size is asserted first.
    expect(NAV.length, 'the app declares no navigation').toBeGreaterThan(0);
    expect(LEAVES.length, 'the navigation walk found no leaf entries').toBeGreaterThan(20);
    expect(
      NAV.filter((n) => n.type === 'group').length,
      'the navigation walk found no groups',
    ).toBeGreaterThan(3);
  });

  it.each(REQUIRED_KINDS)('still ships at least one `%s` entry', (kind) => {
    const found = LEAVES.filter((n) => kindOf(n) === kind);
    expect(
      found.map((n) => n.id),
      `no nav item of kind '${kind}' is left. HotCRM is the app authors read to learn what ` +
        `each kind of navigation entry looks like, so the last exemplar of a kind is not an ` +
        `ordinary item: removing it deletes a demonstration. Keep one, or change this rule ` +
        `deliberately rather than as a side effect of slimming the nav.`,
    ).not.toEqual([]);
  });

  it('accounts for every entry — no kind escapes the roster unnoticed', () => {
    // If the spec grows a seventh nav-item type and someone uses it here, that
    // is a new thing to demonstrate and this list has to be a deliberate
    // decision about it, not silence.
    const unknown = LEAVES.filter((n) => !(REQUIRED_KINDS as readonly string[]).includes(kindOf(n)));
    expect(
      unknown.map((n) => `${n.id} (${kindOf(n)})`),
      'navigation entries of a kind this rule does not know about',
    ).toEqual([]);
  });
});

describe('the app navigation opens each destination once (#1259)', () => {
  it('no two entries open the same destination', () => {
    const seen = new Map<string, string>();
    const bad: string[] = [];
    for (const n of LEAVES) {
      const target = [
        kindOf(n),
        n.objectName ?? '',
        n.viewName ?? '',
        n.pageName ?? '',
        n.dashboardName ?? '',
        n.reportName ?? '',
        n.componentRef ?? '',
      ].join('|');
      const owner = seen.get(target);
      if (owner) bad.push(`${n.id} opens the same destination as ${owner}`);
      else seen.set(target, n.id as string);
    }
    expect(bad, `duplicate navigation destinations:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('no object holds more than one plain list entry', () => {
    // A saved-view entry alongside the object's own list is fine and
    // deliberate — that is what **My Work** is. Two entries both landing on
    // the same unfiltered list are not: they differ only in the label, and the
    // second one is the row #1259 was filed about.
    const byObject = new Map<string, string[]>();
    for (const n of LEAVES) {
      if (kindOf(n) !== 'object') continue;
      const key = String(n.objectName);
      byObject.set(key, [...(byObject.get(key) ?? []), n.id as string]);
    }
    const bad = [...byObject.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([object, ids]) => `${object}: ${ids.join(', ')}`);
    expect(bad, `objects with more than one plain list entry:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every saved-view entry names a view, and every plain entry names none', () => {
    // The two halves of `kindOf`. An `object` entry carrying an empty-string
    // `viewName`, or a `view` entry whose `viewName` went missing in a rename,
    // would silently reclassify and could take the last `view` exemplar with
    // it while every other assertion here stayed green.
    const bad = LEAVES.filter((n) => n.type === 'object' && 'viewName' in n && !n.viewName).map(
      (n) => n.id as string,
    );
    expect(bad, `object entries with an empty viewName:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});
