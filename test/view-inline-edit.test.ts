// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { type AnyRec } from './helpers/composed-stack';

/**
 * ═══ Every table of the app offers cell editing, or says why not (#2048) ════
 *
 * `@objectstack/spec` declares `ListView.userActions.editInline` with
 * `.default(false)` — "the list is read-only unless the author opts in". The
 * console read an ABSENT key as "offer the toggle" until objectui#5144 ruled
 * otherwise; objectui#12036 reads it with the spec default, so a grid view
 * that declares nothing offers no inline-edit toggle at all.
 *
 * On `f0afcbda` none of this app's 40 grid views declared the key, and every
 * one of them is a table of records people edit. So each grid / list view now
 * declares `userActions: { editInline: true }` in its own view file. The
 * console still gates the toggle on the principal's `update` right on top of
 * this, so the key offers editing to no one who could not already edit the
 * record in its form.
 *
 * A view whose records are read-only by nature may leave the key out. It then
 * carries a one-line comment above the view in its file AND an entry in
 * `READ_ONLY_BY_NATURE` below, keyed `object.view` — AGENTS.md rule 11, written
 * down twice. Today the roster is empty: every object behind a grid view grants
 * `update` and has fields people write.
 *
 * Read off the composed stack, the values `defineView` parsed and the artifact
 * serves; `GET /api/v1/meta/view` answers the same `userActions` block.
 */
const READ_ONLY_BY_NATURE: Record<string, string> = {};

const gridViews: { id: string; view: AnyRec }[] = [];
for (const container of ((stack as AnyRec).views ?? []) as AnyRec[]) {
  for (const view of [container.list, ...Object.values(container.listViews ?? {})] as AnyRec[]) {
    if (view && (view.type === 'grid' || view.type === 'list')) {
      gridViews.push({ id: `${view.data?.object}.${view.name}`, view });
    }
  }
}

describe('grid and list views declare userActions.editInline', () => {
  it('the walk reaches the views', () => {
    expect(gridViews.length).toBeGreaterThan(0);
  });

  it('every grid / list view declares editInline: true, or is recorded read-only by nature', () => {
    const missing = gridViews
      .filter(({ id, view }) => view.userActions?.editInline !== true && !(id in READ_ONLY_BY_NATURE))
      .map(({ id }) => id);
    expect(
      missing,
      'declare `userActions: { editInline: true }` on these views (the spec key, not `inlineEdit`), '
        + 'or record why their records are read-only in READ_ONLY_BY_NATURE and above the view',
    ).toEqual([]);
  });

  it('every READ_ONLY_BY_NATURE entry names a grid view that offers no inline editing', () => {
    const stale = Object.entries(READ_ONLY_BY_NATURE)
      .filter(([id, reason]) => {
        const view = gridViews.find((entry) => entry.id === id)?.view;
        return !view || view.userActions?.editInline === true || !reason.trim();
      })
      .map(([id]) => id);
    expect(stale).toEqual([]);
  });
});
