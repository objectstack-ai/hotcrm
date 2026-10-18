// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from './helpers/composed-stack';

type AnyRec = Record<string, any>;

/*
 * ─── The Leads card views are about a person (#2122) ─────────────────────────
 *
 * Lead Pipeline (kanban) and Lead Cards (gallery) draw one card per lead. The
 * card is titled by the person's `full_name`, and its body carries business
 * fields — never the `first_name` / `last_name` fragments the title already
 * joins. Before this card the kanban named no title field, so its first card
 * field (`first_name`) became the title and was printed again in the body
 * beside `last_name`; the gallery was titled by the company.
 *
 * Lead Calendar places a lead on its `next_followup_date`, the date a seller
 * plans by. Keyed on `created_at` it stacked every seeded lead on the day of
 * the boot, which shows nothing anyone acts on.
 *
 * Read off the composed stack: the values `defineView` parsed and the artifact
 * serves.
 */

const NAME_FRAGMENTS = ['first_name', 'last_name'];

const leadViews: AnyRec = {};
for (const container of ((stack as AnyRec).views ?? []) as AnyRec[]) {
  for (const view of [container.list, ...Object.values(container.listViews ?? {})] as AnyRec[]) {
    if (view?.data?.object === 'crm_lead' && view.name) leadViews[view.name] = view;
  }
}
const lead = ((stack as AnyRec).objects ?? []).find((o: AnyRec) => o.name === 'crm_lead') as AnyRec;

describe('Leads card views title the card by the person (#2122)', () => {
  it('crm_lead carries the fields the views bind', () => {
    expect(lead?.fields?.full_name?.type).toBe('formula');
    expect(lead?.fields?.next_followup_date?.type).toBe('date');
  });

  it('Lead Pipeline: full_name titles the card; the body is company, email and rating', () => {
    const view = leadViews.kanban_by_status;
    expect(view?.type).toBe('kanban');
    expect(view.kanban.titleField).toBe('full_name');
    expect(view.kanban.columns).toEqual(['company', 'email', 'rating']);
    expect(view.columns[0]).toBe('full_name');
    for (const f of NAME_FRAGMENTS) expect(view.columns).not.toContain(f);
    // The grouping and the lane sum are this board's own facts, unchanged.
    expect(view.kanban.groupByField).toBe('status');
    expect(view.kanban.summarizeField).toBe('annual_revenue');
  });

  it('Lead Cards: full_name titles the card; the company is the first line', () => {
    const view = leadViews.gallery_view;
    expect(view?.type).toBe('gallery');
    expect(view.gallery.titleField).toBe('full_name');
    expect(view.gallery.visibleFields).toEqual(['company', 'title', 'email', 'phone', 'status', 'rating']);
    for (const f of NAME_FRAGMENTS) expect(view.columns).not.toContain(f);
  });

  it('Lead Calendar: a lead sits on its next follow-up date, not on its creation', () => {
    const view = leadViews.calendar_by_created;
    expect(view?.type).toBe('calendar');
    expect(view.calendar.startDateField).toBe('next_followup_date');
  });
});
