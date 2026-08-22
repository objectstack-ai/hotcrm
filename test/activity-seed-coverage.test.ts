// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { AnalyticsService } from '@objectstack/service-analytics';
import { resolveSeedRecord } from '@objectstack/formula';
import stack from '../objectstack.config';
import { CrmSeedData } from '../src/data/index';

/**
 * The activity model's demo data (#671).
 *
 * #592 / PR #670 shipped `crm_event`, `crm_event_attendee`, the per-object
 * activity actions, the `event_metrics` cube and the Sales Activity dashboard —
 * and no rows. Every widget on that dashboard read 0, the calendar and
 * interaction-history views were empty, and the three churn tiles had nothing
 * to stratify because `crm_account.last_activity_date` was null on every seeded
 * customer. The acceptance criterion for this issue is a BROWSER one ("every
 * widget non-zero after `pnpm demo:reset && pnpm dev`"), so this file translates
 * it into the two things a test can actually hold:
 *
 *   1. the seed book's own structure — every event resolves to a real parent,
 *      the churn bands are each populated, and (the load-bearing one) no `held`
 *      event bubbles onto an account the churn tiles depend on;
 *   2. the dashboard's own widget bindings, executed through the real dataset
 *      compiler, the real filter-token resolver and a real engine over the real
 *      seed records — which is the same harness `forecast-period-scope.test.ts`
 *      uses, for the same reason: "the filter is present" is not the claim, "a
 *      non-zero number comes back" is.
 *
 * # Why the bubble invariant is the important half
 *
 * Lifecycle hooks run over seed writes (#617). `event_activity_bubble` stamps
 * `crm_account.last_activity_date` with the SEED MOMENT on any `held` event,
 * walking up from the event's contact / opportunity / case — it never reads the
 * event's own timestamp. `task_activity_bubble` does the same for a task seeded
 * already completed. So a `held` interaction and an account that looks quiet
 * are mutually exclusive by construction, and an author who adds one held event
 * to the wrong parent silently empties a churn tile — with the seed file still
 * saying 104 days. Nothing else in the suite can see that, so it is recomputed
 * here from the hooks' own reachability rule.
 */

type AnyRec = Record<string, any>;
type Dataset = { object: string; externalId: string | string[]; mode: string; records: AnyRec[] };

const datasets = CrmSeedData as unknown as Dataset[];
const recordsOf = (object: string): AnyRec[] =>
  datasets.filter((d) => d.object === object).flatMap((d) => d.records);

/**
 * Seed records with their `cel` expressions resolved, exactly as the loader
 * resolves them at boot. Every date in this file goes through here rather than
 * being re-derived, so a change of expression cannot pass a test that reads the
 * old intent.
 */
const resolve = (rows: AnyRec[]): AnyRec[] =>
  rows.map((r) => {
    const out = resolveSeedRecord(r, {} as never) as { ok: boolean; value?: AnyRec; error?: AnyRec };
    if (!out.ok) throw new Error(`seed record does not resolve: ${JSON.stringify(out.error)}`);
    return out.value as AnyRec;
  });

const eventRows = resolve(recordsOf('crm_event'));
const attendeeRows = resolve(recordsOf('crm_event_attendee'));
const accountRows = resolve(recordsOf('crm_account'));
const contactRows = recordsOf('crm_contact');
const leadRows = recordsOf('crm_lead');
const opportunityRows = recordsOf('crm_opportunity');
const caseRows = recordsOf('crm_case');
const taskRows = resolve(recordsOf('crm_task'));

/** `related_to_type` → the lookup that carries the record, as the hooks read it. */
const RELATED_FIELD: Record<string, string> = {
  crm_account: 'related_to_account',
  crm_contact: 'related_to_contact',
  crm_opportunity: 'related_to_opportunity',
  crm_lead: 'related_to_lead',
  crm_case: 'related_to_case',
};

/** Natural keys per object — each dataset's own `externalId`. */
const KEYS = {
  crm_account: new Set(accountRows.map((r) => String(r.name))),
  crm_contact: new Set(contactRows.map((r) => String(r.email))),
  crm_lead: new Set(leadRows.map((r) => String(r.email))),
  crm_opportunity: new Set(opportunityRows.map((r) => String(r.name))),
  crm_case: new Set(caseRows.map((r) => String(r.subject))),
} as const;

/**
 * `resolveSeedRecord` hands a CEL temporal back as a real `Date`, not a string
 * — `String(date)` is "Wed Aug 05 2026 …", which slices into nonsense and makes
 * a date comparison pass for the wrong reason. Everything below goes through
 * these two.
 */
const isoOf = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value);
const isoDay = (value: unknown): string => isoOf(value).slice(0, 10);
const dayOffset = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

// ─── 1. The seed book's structure ───────────────────────────────────────

describe('the activity seeds resolve against real records (#671)', () => {
  it('ships events and attendees at all', () => {
    // Guard the guard: every case below iterates these, so an empty set would
    // make the whole file vacuously green — which is precisely the state #671
    // exists to end.
    expect(eventRows.length, 'no crm_event seed records').toBeGreaterThanOrEqual(20);
    expect(attendeeRows.length, 'no crm_event_attendee seed records').toBeGreaterThanOrEqual(20);
  });

  it('gives every event a related record that the loader can resolve', () => {
    const bad: string[] = [];
    for (const e of eventRows) {
      const type = String(e.related_to_type ?? '');
      const field = RELATED_FIELD[type];
      if (!field) {
        bad.push(`${e.subject}: related_to_type "${type}" is not one of ${Object.keys(RELATED_FIELD).join(', ')}`);
        continue;
      }
      const key = e[field];
      if (typeof key !== 'string' || !key) {
        bad.push(`${e.subject}: related_to_type is ${type} but ${field} is empty`);
        continue;
      }
      if (!(KEYS as Record<string, Set<string>>)[type].has(key)) {
        bad.push(`${e.subject}: ${field} "${key}" matches no seeded ${type}`);
      }
      // The account link is optional, but when present it must resolve too —
      // an unresolvable natural key is stored verbatim and silently links to
      // nothing.
      if (e.related_to_account && !KEYS.crm_account.has(String(e.related_to_account))) {
        bad.push(`${e.subject}: related_to_account "${e.related_to_account}" matches no seeded account`);
      }
    }
    expect(bad, `events whose parent does not resolve:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('keys every event on a unique subject — the upsert identity', () => {
    // `externalId: 'subject'`. Two rows sharing one means the second overwrites
    // the first on every boot, and the demo silently loses an interaction.
    const seen = new Map<string, number>();
    for (const e of eventRows) seen.set(String(e.subject), (seen.get(String(e.subject)) ?? 0) + 1);
    const dupes = [...seen].filter(([, n]) => n > 1).map(([s]) => s);
    expect(dupes, `duplicate event subjects: ${dupes.join(', ')}`).toEqual([]);
  });

  it('never authors owner_id — a seed cannot name a user', () => {
    const authored = [...eventRows, ...attendeeRows].filter((r) => 'owner_id' in r);
    expect(
      authored.map((r) => String(r.subject ?? r.crm_event)),
      'ownership is demo_bootstrap\'s job (src/data/index.ts); an authored owner_id would ' +
        'store a literal string, not an id',
    ).toEqual([]);
  });

  it('hangs every attendee off a seeded event and a seeded person', () => {
    const subjects = new Set(eventRows.map((r) => String(r.subject)));
    const bad: string[] = [];
    for (const a of attendeeRows) {
      if (!subjects.has(String(a.crm_event))) bad.push(`attendee of unknown event "${a.crm_event}"`);
      if (a.attendee_type === 'contact' && !KEYS.crm_contact.has(String(a.crm_contact))) {
        bad.push(`attendee "${a.crm_contact}" on "${a.crm_event}" matches no seeded contact`);
      }
      if (a.attendee_type === 'lead' && !KEYS.crm_lead.has(String(a.crm_lead))) {
        bad.push(`attendee "${a.crm_lead}" on "${a.crm_event}" matches no seeded lead`);
      }
      // `attendee_resolves` (an ERROR-severity rule) rejects a row that points
      // at nobody, so a blank party would be refused at seed time.
      if (!a.crm_contact && !a.crm_lead && !a.sys_user && !a.external_name) {
        bad.push(`attendee on "${a.crm_event}" resolves to nobody`);
      }
    }
    expect(bad, `attendee rows that do not resolve:\n  ${bad.join('\n  ')}`).toEqual([]);

    // Both halves of the split are populated: two datasets exist only because
    // the loader's composite key is empty when a component is null, and a
    // lead-less book would leave the second one unexercised.
    expect(attendeeRows.filter((a) => a.attendee_type === 'contact').length).toBeGreaterThan(0);
    expect(attendeeRows.filter((a) => a.attendee_type === 'lead').length).toBeGreaterThan(0);
  });

  it('gives every event a duration that equals its own start/end gap', () => {
    // `event_schedule_derive` MEASURES the duration when both ends are known,
    // then zeroes it for cancelled / no-show. A seeded figure that disagrees is
    // rewritten at seed time and the demo shows something nobody authored
    // (`src/data/_shared.ts`, doctrine rule 2).
    const bad: string[] = [];
    for (const e of eventRows) {
      const start = new Date(isoOf(e.start_datetime)).getTime();
      const end = new Date(isoOf(e.end_datetime)).getTime();
      expect(Number.isFinite(start) && Number.isFinite(end), `${e.subject}: unparseable timestamps`).toBe(true);
      const measured = Math.max(0, Math.round((end - start) / 60000));
      const expectedDuration =
        e.status === 'cancelled' || e.status === 'no_show' ? 0 : measured;
      if (e.duration_minutes !== expectedDuration) {
        bad.push(`${e.subject}: authored ${e.duration_minutes}, hook computes ${expectedDuration}`);
      }
      if (end < start) bad.push(`${e.subject}: ends before it starts — end_after_start rejects it`);
    }
    expect(bad, `durations the hook would rewrite:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('puts a real wall clock on every slot, not UTC midnight', () => {
    // `daysAgo(n)` alone returns midnight, which would make the calendar view —
    // one of the two surfaces #671 is about — a column of 00:00 rows. The
    // duration term in the seed expression is what avoids that.
    const midnight = eventRows.filter((e) => isoOf(e.start_datetime).slice(11, 16) === '00:00');
    expect(midnight.map((e) => String(e.subject)), 'events starting at UTC midnight').toEqual([]);
  });

  it('covers both statuses, all five parents and a spread of types and weeks', () => {
    const held = eventRows.filter((e) => e.status === 'held');
    const planned = eventRows.filter((e) => e.status === 'planned');
    expect(held.length, 'no held events — "Interactions Logged" reads 0').toBeGreaterThan(0);
    expect(planned.length, 'no planned events — "Meetings Booked" reads 0').toBeGreaterThan(0);

    // The dashboard groups HELD interactions by `related_to_type` and by `type`.
    expect(new Set(held.map((e) => String(e.related_to_type)))).toEqual(
      new Set(Object.keys(RELATED_FIELD)),
    );
    expect(new Set(held.map((e) => String(e.type))).size, 'the activity mix donut needs more than a couple of slices')
      .toBeGreaterThanOrEqual(4);

    // The volume chart buckets by week; a single week draws a spike, not a trend.
    const weeks = new Set(
      held.map((e) => Math.floor(new Date(isoOf(e.start_datetime)).getTime() / (7 * 86_400_000))),
    );
    expect(weeks.size, 'held interactions all land in one or two weeks').toBeGreaterThanOrEqual(5);

    // A booked MEETING specifically — "Meetings Booked" filters on the pair.
    expect(planned.filter((e) => e.type === 'meeting').length).toBeGreaterThan(0);
  });
});

// ─── 2. The churn bands, and the bubble that can empty them ─────────────

/**
 * The accounts a seeded activity stamps `last_activity_date` on, recomputed the
 * way `event_activity_bubble` / `task_activity_bubble` compute it: the directly
 * named account, plus the walk-up through the contact / opportunity / case the
 * activity names. Anything in this set is at TODAY after a seed load, whatever
 * the account record says.
 */
const bubbleTargets = (): Set<string> => {
  const accountOfContact = new Map(contactRows.map((c) => [String(c.email), String(c.crm_account)]));
  const accountOfOpportunity = new Map(opportunityRows.map((o) => [String(o.name), String(o.crm_account)]));
  const accountOfCase = new Map(caseRows.map((c) => [String(c.subject), String(c.crm_account)]));

  const out = new Set<string>();
  const walk = (r: AnyRec) => {
    if (r.related_to_account) out.add(String(r.related_to_account));
    const viaContact = accountOfContact.get(String(r.related_to_contact));
    if (viaContact) out.add(viaContact);
    const viaOpportunity = accountOfOpportunity.get(String(r.related_to_opportunity));
    if (viaOpportunity) out.add(viaOpportunity);
    const viaCase = accountOfCase.get(String(r.related_to_case));
    if (viaCase) out.add(viaCase);
  };

  // Only `held` moves the clock — that is the whole point of the status split.
  for (const e of eventRows) if (e.status === 'held') walk(e);
  // A task that arrives already completed bubbles on insert, exactly like a
  // held event. This has been true since before #671 and is why Stark Medical
  // is authored at today().
  for (const t of taskRows) if (t.status === 'completed' || t.is_completed === true) walk(t);
  return out;
};

describe('the churn tiles have something to count (#671)', () => {
  // `last_activity_date` comes back from `resolveSeedRecord` as a `Date`, so
  // the presence test is a null check, not a `typeof … === 'string'` one.
  const withDate = accountRows.filter((a) => a.last_activity_date != null);

  it('gives every seeded account a last_activity_date', () => {
    // A null column matches no `$lt` window at all, so a missing value hides an
    // account from all three tiles rather than putting it in the oldest one.
    const missing = accountRows.filter((a) => !a.last_activity_date).map((a) => String(a.name));
    expect(missing, `accounts with no last_activity_date: ${missing.join(', ')}`).toEqual([]);
  });

  it('populates each of the 30 / 60 / 90-day bands', () => {
    const bands = {
      '30-60': withDate.filter((a) => isoDay(a.last_activity_date) < dayOffset(30) && isoDay(a.last_activity_date) >= dayOffset(60)),
      '60-90': withDate.filter((a) => isoDay(a.last_activity_date) < dayOffset(60) && isoDay(a.last_activity_date) >= dayOffset(90)),
      '90+': withDate.filter((a) => isoDay(a.last_activity_date) < dayOffset(90)),
    };
    const summary = Object.entries(bands)
      .map(([k, v]) => `${k}=[${v.map((a) => String(a.name)).join(', ')}]`)
      .join(' · ');

    // The three tiles are CUMULATIVE (`< 30 days ago` contains everything older),
    // so one 90-day account would light all three while showing 1 / 1 / 1. A
    // member per band is what makes them read 3 / 2 / 1 — the layering the
    // dashboard is for.
    for (const [band, members] of Object.entries(bands)) {
      expect(members.length, `churn band ${band} is empty — ${summary}`).toBeGreaterThan(0);
    }
  });

  it('keeps every held interaction away from the quiet accounts', () => {
    // The invariant this whole file exists for. An author who hangs one held
    // event off (say) an Initech opportunity moves Initech to today, empties the
    // 60-day band, and leaves `daysAgo(72)` sitting in the seed file as a
    // comment about something that is no longer true.
    const targets = bubbleTargets();
    const quiet = withDate
      .filter((a) => isoDay(a.last_activity_date) < dayOffset(30))
      .map((a) => String(a.name));
    const contradicted = quiet.filter((name) => targets.has(name));
    expect(
      contradicted,
      'these accounts are authored as quiet but a seeded `held` event (or completed task)\n' +
        'bubbles onto them, so `event_activity_bubble` stamps them with TODAY at seed time and\n' +
        'the churn tile they were authored for comes up empty:\n  ' + contradicted.join('\n  '),
    ).toEqual([]);
  });

  it('authors today() on every account a seeded activity does bubble to', () => {
    // The other direction, and the one that keeps the file honest rather than
    // merely non-empty: an account the bubble reaches ends at today whatever the
    // seed says, so any other authored value is a number nobody will ever see.
    const today = dayOffset(0);
    const targets = bubbleTargets();
    const stale = accountRows
      .filter((a) => targets.has(String(a.name)) && isoDay(a.last_activity_date) !== today)
      .map((a) => `${String(a.name)}: authored ${isoDay(a.last_activity_date)}, bubble writes ${today}`);
    expect(
      stale,
      'a seeded held event / completed task bubbles onto these accounts, so the authored age is\n' +
        'overwritten at seed time (src/data/_shared.ts, doctrine rule 2):\n  ' + stale.join('\n  '),
    ).toEqual([]);
  });

  it('books a re-engagement meeting on each quiet account — planned, not held', () => {
    // #592's semantic, shown rather than asserted: these three accounts have
    // something on the calendar and their clock has not moved.
    const quiet = new Set(
      withDate.filter((a) => isoDay(a.last_activity_date) < dayOffset(30)).map((a) => String(a.name)),
    );
    const accountOfOpportunity = new Map(opportunityRows.map((o) => [String(o.name), String(o.crm_account)]));
    const booked = new Set(
      eventRows
        .filter((e) => e.status === 'planned')
        .flatMap((e) => [
          e.related_to_account ? String(e.related_to_account) : '',
          accountOfOpportunity.get(String(e.related_to_opportunity)) ?? '',
        ]),
    );
    const unbooked = [...quiet].filter((name) => !booked.has(name));
    expect(unbooked, `quiet accounts with nothing on the calendar: ${unbooked.join(', ')}`).toEqual([]);
  });

  it('keeps the leads a held event names at today, and the rest historical', () => {
    // `event_activity_bubble` stamps `crm_lead.last_contacted_date` too, and the
    // generated leads' ages are what `lead_inflow_by_month_source` buckets by
    // month — so a held event on the wrong lead silently moves a report cell.
    const today = dayOffset(0);
    const named = new Set(
      eventRows.filter((e) => e.status === 'held' && e.related_to_lead).map((e) => String(e.related_to_lead)),
    );
    expect(named.size, 'no held event names a lead — the crm_lead bar is missing from the dashboard').toBeGreaterThan(0);

    const resolvedLeads = resolve(leadRows);
    const drifted = resolvedLeads
      .filter((l) => named.has(String(l.email)) && isoDay(l.last_contacted_date) !== today)
      .map((l) => `${String(l.email)}: authored ${isoDay(l.last_contacted_date)}`);
    expect(drifted, `leads a held event bubbles to, authored with a stale age:\n  ${drifted.join('\n  ')}`).toEqual([]);

    // And the history the monthly report needs is still there.
    const historical = resolvedLeads.filter(
      (l) => l.last_contacted_date != null && isoDay(l.last_contacted_date) < dayOffset(60),
    );
    expect(historical.length, 'every lead now reads as freshly contacted — the inflow report flattens')
      .toBeGreaterThan(3);
  });
});

// ─── 3. The dashboard's own widgets, over the real seeds ────────────────

const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
const datasetDefs: AnyRec[] = (stack as any).datasets ?? [];
const objects: AnyRec[] = (stack as any).objects ?? [];

const activityDashboard = dashboards.find((d) => d.name === 'sales_activity_dashboard') as AnyRec;
const datasetByName = new Map(datasetDefs.map((d) => [String(d.name), d]));
const objectByName = new Map(objects.map((o) => [String(o.name), o]));

/**
 * The claim `demo_bootstrap` performs on first boot, modelled as the one thing
 * this file needs from it: a seeded event reaches the database ownerless, and
 * the sweep stamps the first user onto it (#671 added `crm_event` to
 * CLAIMED_OBJECTS — `test/flow-scheduled.test.ts` owns the sweep's behaviour).
 * Without it the "Activity by Rep" bar groups every interaction under a null
 * owner, which is the defect that claim exists to prevent.
 */
const OWNER = 'usr_first';

/** `crm_account.is_active` is not authored in the seeds; the field default is. */
const accountIsActiveDefault = (): boolean => {
  const field = objectByName.get('crm_account')?.fields?.is_active as AnyRec | undefined;
  expect(field, 'crm_account declares no is_active field — the churn tiles filter on it').toBeTruthy();
  return field!.defaultValue === true;
};

const makeEngine = () =>
  ObjectQL.create({
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: {
      // Only the columns the four datasets read. The object suite owns the full
      // schemas; the contract under test here is "which rows do the widget
      // filters select, and what do they sum to".
      crm_event: {
        name: 'crm_event',
        fields: {
          id: { type: 'text' },
          owner_id: { type: 'text' },
          subject: { type: 'text' },
          type: { type: 'text' },
          status: { type: 'text' },
          start_datetime: { type: 'datetime' },
          duration_minutes: { type: 'number' },
          related_to_type: { type: 'text' },
        },
      },
      crm_account: {
        name: 'crm_account',
        fields: {
          id: { type: 'text' },
          name: { type: 'text' },
          is_active: { type: 'boolean' },
          last_activity_date: { type: 'date' },
          annual_revenue: { type: 'number' },
          industry: { type: 'text' },
          type: { type: 'text' },
        },
      },
      crm_task: {
        name: 'crm_task',
        fields: {
          id: { type: 'text' },
          subject: { type: 'text' },
          status: { type: 'text' },
          is_completed: { type: 'boolean' },
          progress_percent: { type: 'number' },
        },
      },
      crm_opportunity: {
        name: 'crm_opportunity',
        fields: {
          id: { type: 'text' },
          name: { type: 'text' },
          stage: { type: 'text' },
          amount: { type: 'number' },
        },
      },
    } as never,
  });

describe('every Sales Activity widget returns a number over the shipped seeds (#671)', () => {
  let ql: Awaited<ReturnType<typeof makeEngine>>;
  let analytics: AnalyticsService;

  beforeAll(async () => {
    ql = await makeEngine();
    const api = ql.createContext({ isSystem: true });

    const isActive = accountIsActiveDefault();
    for (const a of accountRows) {
      await api.object('crm_account').insert({
        name: a.name,
        // Mirrors the schema default rather than restating it — the seeds do
        // not author `is_active`, so the engine's default is what the tiles see.
        is_active: a.is_active ?? isActive,
        last_activity_date: isoDay(a.last_activity_date),
        annual_revenue: a.annual_revenue ?? 0,
        industry: a.industry ?? null,
        type: a.type ?? null,
      });
    }
    for (const e of eventRows) {
      await api.object('crm_event').insert({
        // The sweep's stamp — see OWNER above.
        owner_id: OWNER,
        subject: e.subject,
        type: e.type,
        status: e.status,
        start_datetime: isoOf(e.start_datetime),
        duration_minutes: e.duration_minutes ?? 0,
        related_to_type: e.related_to_type ?? null,
      });
    }
    for (const t of taskRows) {
      await api.object('crm_task').insert({
        subject: t.subject,
        status: t.status,
        is_completed: t.is_completed === true,
        progress_percent: t.progress_percent ?? 0,
      });
    }
    for (const o of opportunityRows) {
      await api.object('crm_opportunity').insert({
        name: o.name,
        stage: o.stage,
        amount: o.amount ?? 0,
      });
    }

    analytics = new AnalyticsService({
      // The same bridge `AnalyticsServicePlugin` auto-wires at boot, so the
      // filter observed here is the filter the engine really receives.
      executeAggregate: async (objectName, { groupBy, aggregations, filter, timezone, context }) =>
        (ql as any).aggregate(objectName, {
          where: filter,
          groupBy,
          aggregations: aggregations?.map((a: AnyRec) => ({
            function: a.method, field: a.field, alias: a.alias,
          })),
          timezone,
          context,
        }),
      queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
    });
  });

  afterAll(async () => {
    await ql?.close();
  });

  /** One widget, executed exactly as the dashboard declares it. */
  const runWidget = async (widget: AnyRec): Promise<AnyRec[]> => {
    const dataset = datasetByName.get(String(widget.dataset));
    expect(dataset, `widget ${widget.id} names an undeclared dataset "${widget.dataset}"`).toBeTruthy();
    const result = await analytics.queryDataset(
      dataset as never,
      {
        ...(widget.dimensions ? { dimensions: widget.dimensions } : {}),
        measures: widget.values,
        ...(widget.filter ? { runtimeFilter: widget.filter as never } : {}),
      },
      { isSystem: true } as never,
    );
    return result.rows as AnyRec[];
  };

  const totalOf = (rows: AnyRec[], measure: string): number =>
    rows.reduce((sum, r) => sum + (Number(r[measure]) || 0), 0);

  it('the dashboard is the one this file thinks it is', () => {
    expect(activityDashboard, 'sales_activity_dashboard is not registered').toBeTruthy();
    expect((activityDashboard.widgets ?? []).length).toBeGreaterThanOrEqual(12);
  });

  it('returns a non-zero total for every widget on the dashboard', async () => {
    const zero: string[] = [];
    for (const widget of activityDashboard.widgets as AnyRec[]) {
      const rows = await runWidget(widget);
      const total = (widget.values as string[]).reduce(
        (sum, measure) => sum + totalOf(rows, measure),
        0,
      );
      if (total <= 0) {
        zero.push(`${widget.id} (${widget.dataset} ${JSON.stringify(widget.values)}): ${total}`);
      }
    }
    expect(
      zero,
      'these widgets read zero over the shipped seed data — the exact state #671 was filed for:\n  ' +
        zero.join('\n  '),
    ).toEqual([]);
  });

  it('groups the charted widgets across more than one column', async () => {
    // A one-bar bar chart is technically non-zero and useless. The three
    // grouped widgets are the ones a demo is actually read from.
    const grouped = (activityDashboard.widgets as AnyRec[]).filter((w) => (w.dimensions ?? []).length > 0);
    expect(grouped.length).toBeGreaterThanOrEqual(4);

    for (const widget of grouped) {
      const rows = await runWidget(widget);
      // `activity_by_rep` groups by owner, and every seeded row is claimed by
      // the same first user, so ONE row is the correct answer there.
      const floor = widget.id === 'activity_by_rep' ? 1 : 3;
      expect(rows.length, `${widget.id} groups into ${rows.length} column(s)`).toBeGreaterThanOrEqual(floor);
    }
  });

  it('lands every interaction under a real owner — the demo_bootstrap claim', async () => {
    const rows = await runWidget(
      (activityDashboard.widgets as AnyRec[]).find((w) => w.id === 'activity_by_rep')!,
    );
    const ownerless = rows.filter((r) => r.owner == null || r.owner === '');
    expect(
      ownerless,
      'the "Activity by Rep" bar has a null-owner column: a seeded event that demo_bootstrap ' +
        'never claimed (#671 added crm_event to CLAIMED_OBJECTS)',
    ).toEqual([]);
  });

  it('stratifies the three churn tiles instead of repeating one number', async () => {
    const tile = async (id: string) => {
      const widget = (activityDashboard.widgets as AnyRec[]).find((w) => w.id === id)!;
      return totalOf(await runWidget(widget), 'account_count');
    };
    const [q30, q60, q90] = await Promise.all([
      tile('quiet_accounts_30'),
      tile('quiet_accounts_60'),
      tile('quiet_accounts_90'),
    ]);
    const summary = `30+=${q30} 60+=${q60} 90+=${q90}`;

    // Each tile non-empty is the issue's acceptance criterion; the strict
    // ordering is what proves the seeds SPAN the bands rather than piling one
    // very old account into all three.
    expect(q90, `the 90-day tile is empty — ${summary}`).toBeGreaterThan(0);
    expect(q60, `the 60-day tile does not exceed the 90-day one — ${summary}`).toBeGreaterThan(q90);
    expect(q30, `the 30-day tile does not exceed the 60-day one — ${summary}`).toBeGreaterThan(q60);
  });
});
