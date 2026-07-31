// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';

/**
 * `crm_opportunity` has one creation stamp, and the platform owns it (#575 B2).
 *
 * The object declared a `readonly` `created_date` beside the `created_at` the
 * platform injects on every record. Nothing wrote it — not the seed loader,
 * which legitimately backdates readonly fields to give the demo reports
 * history, not a hook, not a flow — so it was null on every row, and the
 * `deal_timeline` view that used it as `startDateField` had no start dates at
 * all. Four locale packs translated a label for it.
 *
 * The field is deleted rather than given a writer, because the writer already
 * exists and is the platform's. `crm_lead`'s activity calendar had already
 * settled the spelling: `startDateField: 'created_at'`.
 *
 * `crm_case.created_date` is a different field with the same name and is NOT
 * affected — the case seeds write it deliberately (see the seed note in
 * `src/data/index.ts`) and the Service dashboard windows on it.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const views: AnyRec[] = (stack as any).views ?? [];
const opportunity = objects.find((o) => o.name === 'crm_opportunity') as AnyRec | undefined;

/** A view names its object on its default list (cf. metadata-references.test.ts). */
const objectOf = (v: AnyRec): string | undefined =>
  v.list?.data?.object ?? v.form?.data?.object ?? v.object;
const opportunityView = views.find((v) => objectOf(v) === 'crm_opportunity') as AnyRec | undefined;

/**
 * Every locale pack the stack ships, as `[locale, pack]`.
 *
 * `stack.translations` is a list of bundles each keyed BY locale, not a list of
 * per-locale records — see the longer note in metadata-references.test.ts. Get
 * this wrong and the staleness check below walks an empty list and passes
 * forever, which is why it is paired with a non-vacuity assertion.
 */
const localePacks: [string, AnyRec][] = ((stack as any).translations ?? []).flatMap(
  (bundle: AnyRec) => Object.entries(bundle) as [string, AnyRec][],
);

describe('the duplicate creation field is gone', () => {
  it('found the opportunity object and its views', () => {
    expect(opportunity, 'crm_opportunity not registered').toBeTruthy();
    expect(opportunityView?.listViews, 'no crm_opportunity listViews found').toBeTruthy();
  });

  it('crm_opportunity declares no created_date', () => {
    expect(Object.keys(opportunity?.fields ?? {})).not.toContain('created_date');
  });

  it('crm_case keeps its own created_date — this was not a global rename', () => {
    const crmCase = objects.find((o) => o.name === 'crm_case') as AnyRec | undefined;
    expect(crmCase?.fields?.created_date, 'crm_case.created_date was collateral damage').toBeTruthy();
  });

  it('no locale pack still translates it', () => {
    const stale = localePacks
      .filter(([, pack]) => pack?.objects?.crm_opportunity?.fields?.created_date)
      .map(([locale]) => locale);
    expect(
      stale,
      `locales still labelling crm_opportunity.created_date: ${stale.join(', ')}`,
    ).toEqual([]);
  });

  it('the locale packs were actually walked', () => {
    // The flatten above is easy to get wrong (see the bundle-shape note in
    // metadata-references.test.ts); without this the assertion above is vacuous.
    expect(localePacks.length).toBeGreaterThan(3);
    expect(localePacks.some(([, p]) => p?.objects?.crm_opportunity?.fields?.close_date)).toBe(true);
  });
});

describe('the deal timeline starts from a date that exists', () => {
  const timelineViews = Object.values<AnyRec>(opportunityView?.listViews ?? {}).filter(
    (v) => v?.timeline || v?.calendar,
  );

  it('finds the timeline / calendar views to check', () => {
    expect(timelineViews.length, 'no timeline or calendar view on crm_opportunity').toBeGreaterThan(0);
  });

  it('deal_timeline reads created_at', () => {
    const timeline = (opportunityView?.listViews ?? {}).deal_timeline as AnyRec | undefined;
    expect(timeline, 'deal_timeline view missing').toBeTruthy();
    expect(timeline!.timeline?.startDateField).toBe('created_at');
  });

  it('no date-driven opportunity view points at a field the object does not have', () => {
    // The generalisation: a `startDateField` naming a dropped field produces no
    // error anywhere — the bars just have no start. `created_at` and friends
    // are real, sortable columns the platform injects but never lists in
    // `fields` (same allowance metadata-references.test.ts makes).
    const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by'];
    const known = new Set([...Object.keys(opportunity?.fields ?? {}), ...SYSTEM_FIELDS]);
    const bad = timelineViews.flatMap((v) =>
      [v.timeline?.startDateField, v.timeline?.endDateField, v.calendar?.startDateField, v.calendar?.endDateField]
        .filter((f): f is string => typeof f === 'string')
        .filter((f) => !known.has(f))
        .map((f) => `${String(v.name)}: ${f}`),
    );
    expect(bad, `opportunity views anchored on non-existent date fields:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});
