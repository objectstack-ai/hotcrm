// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { type AnyRec } from './helpers/composed-stack';

/**
 * ═══ Leads, Accounts and Opportunities grids offer the column chooser (#2123) ═══
 *
 * `@objectstack/spec` declares `ListView.userActions.hideFields` with
 * `.default(false)` ("column hiding is opt-in"), and the console reads it the
 * same way: the Display menu offers **Hide fields** only on a view that turns
 * it on. Until #2123 every grid view of these three objects declared
 * `userActions: { editInline: true }` and nothing else, so a rep who wanted the
 * empty "Need Type" column out of the way had no control for it.
 *
 * The choice is the USER's, not the view's. Measured on 18.0.0-next.3 in the
 * browser with two users: the console keeps it on that user's own list state
 * (`sys_user_preference`, key `ui.list.<object>`, objectui#12474) and never
 * writes the shared view, so it survives a reload and changes no one else's
 * list. That holds on a view that declares `columns`, which every view below
 * does; on a system view that declares none, the console source keeps the
 * choice for the session only (objectui#12505), so a pin below keeps the
 * projection.
 *
 * `rowColor` stays OFF on purpose. The row tint is authored per view, and only
 * the exception row is tinted (the ruling on #2107); a toolbar control that
 * lets each user re-tint the list would undo that. A pin below holds it.
 *
 * Kanban, calendar, gallery, map and timeline views are not tables and take no
 * column chooser, so only `type: 'grid'` is walked. Read off the composed
 * stack: the values `defineView` parsed and the artifact serves.
 */
const OBJECTS = ['crm_lead', 'crm_account', 'crm_opportunity'] as const;

const gridViews: { object: string; id: string; view: AnyRec }[] = [];
for (const container of ((stack as AnyRec).views ?? []) as AnyRec[]) {
  for (const view of [container.list, ...Object.values(container.listViews ?? {})] as AnyRec[]) {
    const object = view?.data?.object;
    if (view?.type === 'grid' && (OBJECTS as readonly string[]).includes(object)) {
      gridViews.push({ object, id: `${object}.${view.name}`, view });
    }
  }
}

describe('Leads, Accounts and Opportunities grid views offer Hide fields', () => {
  it('the walk reaches a grid view of each object', () => {
    expect(new Set(gridViews.map(({ object }) => object))).toEqual(new Set(OBJECTS));
  });

  it('every grid view declares userActions.hideFields: true', () => {
    const missing = gridViews.filter(({ view }) => view.userActions?.hideFields !== true).map(({ id }) => id);
    expect(missing, 'declare `userActions: { editInline: true, hideFields: true }` on these views').toEqual([]);
  });

  it('every grid view declares columns, so the choice is kept per user rather than for the session', () => {
    const unprojected = gridViews
      .filter(({ view }) => !Array.isArray(view.columns) || view.columns.length === 0)
      .map(({ id }) => id);
    expect(unprojected).toEqual([]);
  });

  it('no grid view turns on the rowColor toolbar control (#2107: the tint is authored, exception rows only)', () => {
    const recolourable = gridViews.filter(({ view }) => view.userActions?.rowColor === true).map(({ id }) => id);
    expect(recolourable).toEqual([]);
  });
});
