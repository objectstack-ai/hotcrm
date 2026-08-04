// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import eventHooks from '../src/objects/event.hook';
import taskHooks from '../src/objects/task.hook';
import { makeHarness, makeDeniedApi, makeCtx, hookNamed, today, type Rec } from './helpers/hook-harness';

/**
 * The activity model's recency contract (#592).
 *
 * `crm_account.last_activity_date` is the signal `at_risk_accounts` and
 * `customer_churn_signals` are entirely built on, and until this issue **it was
 * written by nothing at all**. Two independent defects stacked:
 *
 *  1. The only writer, `task_activity_bubble`, bubbled to the record the task
 *     NAMED. A rep names the opportunity or the contact, never the account, so
 *     the account's clock never moved.
 *  2. Even when it did name the account, the write was silently discarded: the
 *     column was `readonly`, and `stripReadonlyFields` deletes a readonly key
 *     from any payload whose CALLER supplied it for every context that is not
 *     `isSystem` (#2948) — and a hook's `ctx.api` is a `ScopedContext` over the
 *     acting USER's execution context.
 *
 * Neither is visible to a metadata check, and neither is visible to a hook test
 * that watches a stand-in's row change: the stand-in has no readonly semantics.
 * So the second half of this file runs the write through a REAL ObjectQL over
 * the REAL shipped object definitions, under a non-system context, which is the
 * only place the strip actually happens.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const objectByName = new Map(objects.map((o) => [o.name as string, o]));

const eventBubble = hookNamed(eventHooks, 'event_activity_bubble');
const eventDerive = hookNamed(eventHooks, 'event_schedule_derive');
const taskBubble = hookNamed(taskHooks, 'task_activity_bubble');

const USER = { id: 'user_1' };

// ─────────────────────────────────────────────── event_schedule_derive ──

describe('event_schedule_derive keeps start / end / duration coherent', () => {
  it('measures the duration when both ends are known', async () => {
    const input: Rec = {
      start_datetime: '2026-08-04T09:00:00.000Z',
      end_datetime: '2026-08-04T09:45:00.000Z',
    };
    await eventDerive.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.duration_minutes).toBe(45);
  });

  it('recomputes a duration that disagrees with its own timestamps', async () => {
    // A stored duration a report averages must be a MEASUREMENT, not whatever
    // the caller last typed.
    const input: Rec = {
      start_datetime: '2026-08-04T09:00:00.000Z',
      end_datetime: '2026-08-04T10:00:00.000Z',
      duration_minutes: 5,
    };
    await eventDerive.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.duration_minutes).toBe(60);
  });

  it('materialises the end timestamp from a duration — the shape log_call submits', async () => {
    const input: Rec = { start_datetime: '2026-08-04T09:00:00.000Z', duration_minutes: 20 };
    await eventDerive.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.end_datetime).toBe('2026-08-04T09:20:00.000Z');
  });

  it('leaves an all-day event without a minute count', async () => {
    const input: Rec = {
      all_day: true,
      start_datetime: '2026-08-04T00:00:00.000Z',
      end_datetime: '2026-08-04T23:59:00.000Z',
    };
    await eventDerive.handler(makeCtx({ event: 'beforeInsert', input, user: USER }));
    expect(input.duration_minutes).toBeUndefined();
  });

  it('zeroes the duration of a cancelled or no-show meeting', async () => {
    for (const status of ['cancelled', 'no_show']) {
      const input: Rec = {
        status,
        start_datetime: '2026-08-04T09:00:00.000Z',
        end_datetime: '2026-08-04T10:00:00.000Z',
      };
      await eventDerive.handler(makeCtx({ event: 'beforeUpdate', input, user: USER }));
      expect(input.duration_minutes, `${status} still books an hour`).toBe(0);
    }
  });

  it('reads the effective value across input and previous on update', async () => {
    const input: Rec = { end_datetime: '2026-08-04T09:30:00.000Z' };
    await eventDerive.handler(makeCtx({
      event: 'beforeUpdate',
      input,
      previous: { start_datetime: '2026-08-04T09:00:00.000Z' },
      user: USER,
    }));
    expect(input.duration_minutes).toBe(30);
  });
});

// ─────────────────────────────────────────────── event_activity_bubble ──

describe('event_activity_bubble only fires for an interaction that happened', () => {
  const held = (extra: Rec) => ({
    event: 'afterInsert' as const,
    input: { id: 'evt_1', status: 'held', ...extra },
    user: USER,
  });

  it('a held event stamps the related account', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1' }] });
    await eventBubble.handler(makeCtx({ ...held({ related_to_account: 'acc1' }), api: h.api }));
    expect(h.rows('crm_account')[0].last_activity_date).toBe(today());
  });

  it('a PLANNED meeting stamps nothing — a booking is not contact', async () => {
    // This is the whole reason `status` exists on the object. Without the gate,
    // dropping a placeholder on next quarter's calendar would make an account
    // look freshly-touched today, and the churn report would go quiet again.
    const h = makeHarness({ crm_account: [{ id: 'acc1' }] });
    await eventBubble.handler(makeCtx({
      event: 'afterInsert',
      input: { id: 'evt_1', status: 'planned', related_to_account: 'acc1' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls).toHaveLength(0);
  });

  it('a cancelled meeting stamps nothing', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1' }] });
    await eventBubble.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'evt_1', status: 'cancelled', related_to_account: 'acc1' },
      previous: { id: 'evt_1', status: 'planned' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls).toHaveLength(0);
  });

  it('fires once, on the transition into held', async () => {
    const h = makeHarness({ crm_account: [{ id: 'acc1' }] });
    await eventBubble.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 'evt_1', status: 'held', subject: 'renamed' },
      previous: { id: 'evt_1', status: 'held', related_to_account: 'acc1' },
      user: USER,
      api: h.api,
    }));
    expect(h.calls).toHaveLength(0);
  });

  it('stamps the lead it was held with', async () => {
    const h = makeHarness({ crm_lead: [{ id: 'l1' }] });
    await eventBubble.handler(makeCtx({ ...held({ related_to_lead: 'l1' }), api: h.api }));
    expect(typeof h.rows('crm_lead')[0].last_contacted_date).toBe('string');
  });

  it('walks up to the account from a contact, an opportunity and a case', async () => {
    for (const [field, object] of [
      ['related_to_contact', 'crm_contact'],
      ['related_to_opportunity', 'crm_opportunity'],
      ['related_to_case', 'crm_case'],
    ] as const) {
      const h = makeHarness({
        crm_account: [{ id: 'acc1' }],
        [object]: [{ id: 'x1', crm_account: 'acc1' }],
      });
      await eventBubble.handler(makeCtx({ ...held({ [field]: 'x1' }), api: h.api }));
      expect(h.rows('crm_account')[0].last_activity_date, `${object} did not reach its account`)
        .toBe(today());
    }
  });

  it('writes the account only once when two links resolve to the same one', async () => {
    const h = makeHarness({
      crm_account: [{ id: 'acc1' }],
      crm_contact: [{ id: 'c1', crm_account: 'acc1' }],
      crm_opportunity: [{ id: 'o1', crm_account: 'acc1' }],
    });
    await eventBubble.handler(makeCtx({
      ...held({ related_to_account: 'acc1', related_to_contact: 'c1', related_to_opportunity: 'o1' }),
      api: h.api,
    }));
    expect(h.callsFor('crm_account', 'update')).toHaveLength(1);
  });

  it('never propagates a write failure — the bubble is best-effort', async () => {
    await expect(
      eventBubble.handler(makeCtx({
        ...held({ related_to_account: 'acc1' }),
        api: makeDeniedApi('denied'),
      })),
    ).resolves.toBeUndefined();
  });

  it('stamps a DATE on the account and an INSTANT on the people', async () => {
    // `crm_account.last_activity_date` is a `Field.date()` (TEXT YYYY-MM-DD, the
    // shape every churn filter compares against); the two contact columns are
    // datetimes. Passing an ISO instant into the date column is how a `<
    // {60_days_ago}` filter starts comparing '2026-08-04T…' to '2026-06-05'.
    const h = makeHarness({
      crm_account: [{ id: 'acc1' }],
      crm_lead: [{ id: 'l1' }],
    });
    await eventBubble.handler(makeCtx({
      ...held({ related_to_account: 'acc1', related_to_lead: 'l1' }),
      api: h.api,
    }));
    expect(h.rows('crm_account')[0].last_activity_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(h.rows('crm_lead')[0].last_contacted_date).toMatch(/T.*Z$/);
  });
});

// ───────────────────────────────────── the two bubble copies stay twins ──

describe('the task and event bubbles are the same bubble', () => {
  /**
   * `event.hook.ts` carries the canonical copy and `task.hook.ts` a verbatim
   * duplicate, because an L2 hook body ships body-only into QuickJS and a
   * shared module helper arrives `undefined` at runtime. A duplicate that
   * nothing compares is a duplicate that drifts, so both are driven through
   * the same table here.
   */
  const CASES: Array<{ label: string; links: Rec; seed: Rec; expect: (h: ReturnType<typeof makeHarness>) => void }> = [
    {
      label: 'a directly-named account',
      links: { related_to_account: 'acc1' },
      seed: { crm_account: [{ id: 'acc1' }] },
      expect: (h) => expect(h.rows('crm_account')[0].last_activity_date).toBe(today()),
    },
    {
      label: 'a contact and the account above it',
      links: { related_to_contact: 'c1' },
      seed: { crm_account: [{ id: 'acc1' }], crm_contact: [{ id: 'c1', crm_account: 'acc1' }] },
      expect: (h) => {
        expect(h.rows('crm_account')[0].last_activity_date).toBe(today());
        expect(typeof h.rows('crm_contact')[0].last_contacted_date).toBe('string');
      },
    },
    {
      label: 'an opportunity, through to its account',
      links: { related_to_opportunity: 'o1' },
      seed: { crm_account: [{ id: 'acc1' }], crm_opportunity: [{ id: 'o1', crm_account: 'acc1' }] },
      expect: (h) => expect(h.rows('crm_account')[0].last_activity_date).toBe(today()),
    },
    {
      label: 'a lead',
      links: { related_to_lead: 'l1' },
      seed: { crm_lead: [{ id: 'l1' }] },
      expect: (h) => expect(typeof h.rows('crm_lead')[0].last_contacted_date).toBe('string'),
    },
  ];

  it.each(CASES.map((c) => c.label))('%s bubbles identically from a task and from an event', async (label) => {
    const spec = CASES.find((c) => c.label === label)!;

    const viaEvent = makeHarness(JSON.parse(JSON.stringify(spec.seed)));
    await eventBubble.handler(makeCtx({
      event: 'afterInsert',
      input: { id: 'evt_1', status: 'held', ...spec.links },
      user: USER,
      api: viaEvent.api,
    }));
    spec.expect(viaEvent);

    const viaTask = makeHarness(JSON.parse(JSON.stringify(spec.seed)));
    await taskBubble.handler(makeCtx({
      event: 'afterUpdate',
      input: { id: 't1', status: 'completed', ...spec.links },
      previous: { id: 't1', status: 'in_progress' },
      user: USER,
      api: viaTask.api,
    }));
    spec.expect(viaTask);

    // Same objects touched, same fields written.
    const shape = (h: ReturnType<typeof makeHarness>) =>
      h.calls
        .filter((c) => c.op === 'update')
        .map((c) => `${c.object}:${Object.keys(c.args[0] as Rec).sort().join(',')}`)
        .sort();
    expect(shape(viaTask)).toEqual(shape(viaEvent));
  });
});

// ───────────────────── the recency columns must actually accept the write ──

describe('the recency columns are writable by a non-system caller (#2948)', () => {
  /**
   * The regression that made the whole churn story fiction.
   *
   * `stripReadonlyFields` runs `if (!opCtx.context?.isSystem)` and deletes every
   * readonly key the caller supplied, logging `Field 'x' is read-only — ignoring
   * incoming change (#2948)` and continuing. A hook's `ctx.api` is built by
   * `buildHookApi(execCtx)` → `new ScopedContext(execCtx, this)` over the ACTING
   * USER's context, so every bubble the app ever performed was thrown away here.
   *
   * This runs the real engine over the real shipped field definitions, under a
   * plain user context, which is the only configuration where the strip fires.
   * A `readonly: true` creeping back onto any of these three columns fails here.
   */
  const RECENCY: Array<[string, string, string]> = [
    ['crm_account', 'last_activity_date', '2026-08-04'],
    ['crm_lead', 'last_contacted_date', '2026-08-04T09:00:00.000Z'],
    ['crm_contact', 'last_contacted_date', '2026-08-04T09:00:00.000Z'],
  ];

  it('none of the three is declared readonly', () => {
    const bad = RECENCY
      .filter(([object, field]) => objectByName.get(object)?.fields?.[field]?.readonly === true)
      .map(([object, field]) => `${object}.${field}`);
    expect(
      bad,
      'a readonly recency column is a column the activity bubble cannot write — ' +
        `the engine drops the key and logs a warning nobody reads (#2948):\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  let ql: Awaited<ReturnType<typeof ObjectQL.create>>;

  beforeAll(async () => {
    // The shipped field definitions, not a hand-written stand-in: whether the
    // strip fires is decided by `field.readonly` on the REAL schema.
    const shipped = Object.fromEntries(
      RECENCY.map(([object]) => [
        object,
        { name: object, fields: objectByName.get(object)?.fields ?? {} },
      ]),
    );
    ql = await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: shipped as never,
    });
  });

  afterAll(async () => {
    await ql?.close();
  });

  it.each(RECENCY)('%s.%s survives a write from a plain user context', async (object, field, value) => {
    // `isSystem` deliberately absent — this is the context a hook fired by a
    // rep's own save actually runs under.
    const api = ql.createContext({ userId: 'user_1' } as never);
    // `crm_contact.crm_account` is a REQUIRED master-detail and the engine
    // resolves references on insert, so the parent has to genuinely exist.
    const parent = await api.object('crm_account').insert({ name: 'Acme Industrial' });
    const row = await api.object(object).insert(seedFor(object, parent.id as string));
    await api.object(object).update({ id: row.id, [field]: value }, { where: { id: row.id } });
    const after = await api.object(object).findOne({ where: { id: row.id } });
    expect(
      (after as AnyRec)?.[field],
      `${object}.${field} was discarded — the engine stripped it as readonly (#2948)`,
    ).toBe(value);
  });

  /** The minimum a row of each object needs to satisfy its shipped required fields. */
  function seedFor(object: string, accountId: string): AnyRec {
    if (object === 'crm_account') return { name: 'Acme Industrial' };
    if (object === 'crm_lead') {
      return { first_name: 'Ada', last_name: 'Lovelace', company: 'Acme', email: 'ada@acme.test' };
    }
    return {
      first_name: 'Ada', last_name: 'Lovelace',
      email: 'ada@acme.test', crm_account: accountId,
    };
  }
});
