// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, recordEngineWrites, today, type Person, type EngineWrite } from './helpers/verify-stack';

type Rec = Record<string, any>;

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
 * So every case here is a real write on the shipped app booted by
 * `@objectstack/verify`: a sales rep (or a service agent) logging an
 * interaction or completing a task through the engine's write door
 * (`hooks.run`), under their own — non-system — context; the parents are
 * written as the system and what is asserted is the stored row. The bubbles
 * are `async: true` hooks, so a stamp is waited for, and a claim that one wrote
 * NOTHING is read off the writes the engine received.
 *
 * A third defect, #2014: the bubbles wrote as the person who logged the
 * interaction, so the person's own grants decided whether the clock moved — a
 * service agent (no edit right on accounts) never moved it. They declare
 * `runAs: 'system'` now; the agent cases below pin that.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const objectByName = new Map(objects.map((o) => [o.name as string, o]));

let verify: VerifyStack;
let rep: Person;
let agent: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@activity-recency.test', {
    name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  agent = await signUpPerson(verify, 'agent@activity-recency.test', {
    name: 'Service Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
}, 120_000);

const as = () => ({ as: rep.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;

/** The rep's account, a contact and a deal under it, and a lead — written as the system. */
const parents = async () => {
  const n = ++k;
  const [account] = await verify.seed('crm_account', [{ name: `Recency Co ${n}`, owner_id: rep.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Ada', last_name: `Recency ${n}`, email: `ada${n}@activity-recency.test`, crm_account: account!.id, owner_id: rep.id,
  }]);
  const [opportunity] = await verify.seed('crm_opportunity', [{
    name: `Recency Deal ${n}`, amount: 10_000, stage: 'qualification', close_date: '2030-06-30', crm_account: account!.id, owner_id: rep.id,
  }]);
  const [kase] = await verify.seed('crm_case', [{
    subject: `Recency case ${n}`, description: 'Asked about renewal.', crm_account: account!.id, owner_id: rep.id,
  }]);
  const [lead] = await verify.seed('crm_lead', [{
    first_name: 'Lee', last_name: `Recency ${n}`, company: `Lead Co ${n}`, email: `lee${n}@activity-recency.test`, owner_id: rep.id,
  }]);
  return { account: account!, contact: contact!, opportunity: opportunity!, kase: kase!, lead: lead! };
};

/** The rep logging an interaction. */
const logEvent = (doc: Rec): Promise<Rec> =>
  verify.hooks.run('crm_event', 'insert', {
    subject: `Interaction ${++k}`, type: 'call', status: 'held', start_datetime: '2026-08-04T09:00:00.000Z', ...doc,
  }, as());

/** Wait for `object`'s row to carry `field`. */
const stamped = (object: string, id: string, field: string): Promise<unknown> =>
  vi.waitFor(async () => {
    const value = (await stored(object, id))[field];
    expect(value, `${object}.${field} was never stamped`).toBeTruthy();
    return value;
  }, { timeout: 10_000, interval: 50 });

/** The recency updates the engine received while `write` ran and the bubble had time to. */
const recencyWrites = async (write: () => Promise<unknown>, settleMs = 400): Promise<EngineWrite[]> => {
  const recorder = recordEngineWrites(verify);
  try {
    await write();
    await new Promise((r) => setTimeout(r, settleMs));
    await Promise.all(recorder.writes.map((w) => w.settled));
    return recorder.writes.filter((w) => w.op === 'update'
      && ['crm_account', 'crm_lead', 'crm_contact'].includes(w.object)
      && ['last_activity_date', 'last_contacted_date'].some((f) => f in (w.args[1] as Rec)));
  } finally {
    recorder.restore();
  }
};

const sameInstant = (a: unknown, b: string) => expect(new Date(String(a)).toISOString()).toBe(new Date(b).toISOString());

// ─────────────────────────────────────────────── event_schedule_derive ──

describe('event_schedule_derive keeps start / end / duration coherent', () => {
  /** The rep's event on their account, read back as the engine stored it. */
  const eventWith = async (doc: Rec): Promise<Rec> => {
    const { account } = await parents();
    const written = await logEvent({ status: 'planned', related_to_account: account.id, ...doc });
    return stored('crm_event', written.id);
  };

  it('measures the duration when both ends are known', async () => {
    const event = await eventWith({ start_datetime: '2026-08-04T09:00:00.000Z', end_datetime: '2026-08-04T09:45:00.000Z' });
    expect(event.duration_minutes).toBe(45);
  });

  it('recomputes a duration that disagrees with its own timestamps', async () => {
    // A stored duration a report averages must be a MEASUREMENT, not whatever
    // the caller last typed.
    const event = await eventWith({
      start_datetime: '2026-08-04T09:00:00.000Z', end_datetime: '2026-08-04T10:00:00.000Z', duration_minutes: 5,
    });
    expect(event.duration_minutes).toBe(60);
  });

  it('materialises the end timestamp from a duration — the shape log_call submits', async () => {
    const event = await eventWith({ start_datetime: '2026-08-04T09:00:00.000Z', duration_minutes: 20 });
    sameInstant(event.end_datetime, '2026-08-04T09:20:00.000Z');
  });

  it('leaves an all-day event without a minute count', async () => {
    const event = await eventWith({
      all_day: true, start_datetime: '2026-08-04T00:00:00.000Z', end_datetime: '2026-08-04T23:59:00.000Z',
    });
    expect(event.duration_minutes ?? null).toBeNull();
  });

  it('zeroes the duration of a cancelled or no-show meeting', async () => {
    for (const status of ['cancelled', 'no_show']) {
      const event = await eventWith({ start_datetime: '2026-08-04T09:00:00.000Z', end_datetime: '2026-08-04T10:00:00.000Z' });
      await verify.hooks.run('crm_event', 'update', { id: event.id, status }, as());
      expect((await stored('crm_event', event.id)).duration_minutes, `${status} still books an hour`).toBe(0);
    }
  });

  it('reads the effective value across input and previous on update', async () => {
    const event = await eventWith({ start_datetime: '2026-08-04T09:00:00.000Z' });
    await verify.hooks.run('crm_event', 'update', { id: event.id, end_datetime: '2026-08-04T09:30:00.000Z' }, as());
    expect((await stored('crm_event', event.id)).duration_minutes).toBe(30);
  });
});

// ─────────────────────────────────────────────── event_activity_bubble ──

describe('event_activity_bubble only fires for an interaction that happened', () => {
  it('a held event stamps the related account', async () => {
    const { account } = await parents();
    await logEvent({ related_to_account: account.id });
    expect(await stamped('crm_account', account.id, 'last_activity_date')).toBe(today());
  });

  it('a PLANNED meeting stamps nothing — a booking is not contact', async () => {
    // This is the whole reason `status` exists on the object. Without the gate,
    // dropping a placeholder on next quarter's calendar would make an account
    // look freshly-touched today, and the churn report would go quiet again.
    const { account } = await parents();
    const writes = await recencyWrites(() => logEvent({ type: 'meeting', status: 'planned', related_to_account: account.id }));
    expect(writes).toHaveLength(0);
    expect((await stored('crm_account', account.id)).last_activity_date ?? null).toBeNull();
  });

  it('a cancelled meeting stamps nothing', async () => {
    const { account } = await parents();
    const booked = await logEvent({ type: 'meeting', status: 'planned', related_to_account: account.id });
    const writes = await recencyWrites(() =>
      verify.hooks.run('crm_event', 'update', { id: booked.id, status: 'cancelled' }, as()));
    expect(writes).toHaveLength(0);
  });

  it('fires once, on the transition into held', async () => {
    const { account } = await parents();
    const held = await logEvent({ related_to_account: account.id });
    await stamped('crm_account', account.id, 'last_activity_date');
    const writes = await recencyWrites(() =>
      verify.hooks.run('crm_event', 'update', { id: held.id, subject: 'renamed' }, as()));
    expect(writes).toHaveLength(0);
  });

  it('stamps the lead it was held with', async () => {
    const { lead } = await parents();
    await logEvent({ related_to_lead: lead.id });
    expect(typeof await stamped('crm_lead', lead.id, 'last_contacted_date')).toBe('string');
  });

  it('walks up to the account from a contact, an opportunity and a case', async () => {
    for (const field of ['related_to_contact', 'related_to_opportunity', 'related_to_case'] as const) {
      const p = await parents();
      const target = { related_to_contact: p.contact, related_to_opportunity: p.opportunity, related_to_case: p.kase }[field];
      await logEvent({ [field]: target.id });
      expect(await stamped('crm_account', p.account.id, 'last_activity_date'), `${field} did not reach its account`).toBe(today());
    }
  });

  it('writes the account only once when two links resolve to the same one', async () => {
    const { account, contact, opportunity } = await parents();
    const writes = await recencyWrites(async () => {
      await logEvent({ related_to_account: account.id, related_to_contact: contact.id, related_to_opportunity: opportunity.id });
      await stamped('crm_account', account.id, 'last_activity_date');
    });
    expect(writes.filter((w) => w.object === 'crm_account')).toHaveLength(1);
  });

  it('never propagates a write failure — the bubble is best-effort', async () => {
    // The engine refuses the account stamp — staged on the real engine, since
    // the elevated bubble (#2014) is no longer refused by the logger's own
    // grants — and the call is still recorded.
    const { account } = await parents();
    const refused = recordEngineWrites(verify, (op, object) =>
      (op === 'update' && object === 'crm_account' ? new Error('write rejected') : undefined));
    let event: Rec;
    try {
      event = await logEvent({ subject: 'Called a stranger', related_to_account: account.id });
      await vi.waitFor(() => expect(refused.of('crm_account', 'update').length, 'the bubble never reached the account').toBeGreaterThan(0),
        { timeout: 10_000, interval: 25 });
      await Promise.all(refused.writes.map((w) => w.settled));
    } finally {
      refused.restore();
    }
    expect((await verify.rows('crm_event', { id: event.id }))[0], 'the event write was lost').toBeTruthy();
  });

  /**
   * #2014. A service agent holds no edit right on accounts, and the bubble used
   * to write as the person who logged the interaction — so an agent's held
   * call on their own case never reached the account's activity clock (the
   * refusal swallowed best-effort), while an admin's identical call stamped
   * it. Measured on 17.7.0 before the bubble declared `runAs: 'system'`.
   */
  it('a service agent’s held call on their own case stamps the case account', async () => {
    const [account] = await verify.seed('crm_account', [{ name: `Agent Recency Co ${++k}`, owner_id: rep.id }]);
    const kase = await verify.hooks.run('crm_case', 'insert', {
      subject: `Agent call ${k}`, description: 'Customer rang about an invoice.', crm_account: account!.id, status: 'in_progress',
    }, { as: agent.token });
    await verify.hooks.run('crm_event', 'insert', {
      subject: `Called back ${k}`, type: 'call', status: 'held', start_datetime: '2026-08-04T09:00:00.000Z', related_to_case: kase.id,
    }, { as: agent.token });
    expect(await stamped('crm_account', account!.id, 'last_activity_date')).toBe(today());
    expect((await stored('crm_account', account!.id)).updated_by, 'the stamp was recorded as nobody’s write').toBe(agent.id);
  });

  it('stamps a DATE on the account and an INSTANT on the people', async () => {
    // `crm_account.last_activity_date` is a `Field.date()` (TEXT YYYY-MM-DD, the
    // shape every churn filter compares against); the two contact columns are
    // datetimes. Passing an ISO instant into the date column is how a `<
    // {60_days_ago}` filter starts comparing '2026-08-04T…' to '2026-06-05'.
    const { account, lead } = await parents();
    await logEvent({ related_to_account: account.id, related_to_lead: lead.id });
    expect(await stamped('crm_account', account.id, 'last_activity_date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await stamped('crm_lead', lead.id, 'last_contacted_date')).toMatch(/T.*Z$/);
  });
});

// ───────────────────────────────────── the two bubble copies stay twins ──

describe('the task and event bubbles are the same bubble', () => {
  /**
   * `event.hook.ts` carries the canonical copy and `task.hook.ts` a verbatim
   * duplicate, because an L2 hook body ships body-only into QuickJS and a
   * shared module helper arrives `undefined` at runtime. A duplicate that
   * nothing compares is a duplicate that drifts, so both are driven through
   * the same table here: a held event, and a task the rep completes.
   */
  type Parents = Awaited<ReturnType<typeof parents>>;
  const CASES: Array<{ label: string; links: (p: Parents) => Rec; check: (p: Parents) => Promise<void> }> = [
    {
      label: 'a directly-named account',
      links: (p) => ({ related_to_account: p.account.id }),
      check: async (p) => expect(await stamped('crm_account', p.account.id, 'last_activity_date')).toBe(today()),
    },
    {
      label: 'a contact and the account above it',
      links: (p) => ({ related_to_contact: p.contact.id }),
      check: async (p) => {
        expect(await stamped('crm_account', p.account.id, 'last_activity_date')).toBe(today());
        expect(typeof await stamped('crm_contact', p.contact.id, 'last_contacted_date')).toBe('string');
      },
    },
    {
      label: 'an opportunity, through to its account',
      links: (p) => ({ related_to_opportunity: p.opportunity.id }),
      check: async (p) => expect(await stamped('crm_account', p.account.id, 'last_activity_date')).toBe(today()),
    },
    {
      label: 'a lead',
      links: (p) => ({ related_to_lead: p.lead.id }),
      check: async (p) => expect(typeof await stamped('crm_lead', p.lead.id, 'last_contacted_date')).toBe('string'),
    },
  ];

  /** Same objects touched, same fields written. */
  const shape = (writes: EngineWrite[]) =>
    writes.map((w) => `${w.object}:${Object.keys(w.args[1] as Rec).filter((f) => f !== 'id').sort().join(',')}`).sort();

  it.each(CASES.map((c) => c.label))('%s bubbles identically from a task and from an event', async (label) => {
    const spec = CASES.find((c) => c.label === label)!;

    const viaEventParents = await parents();
    const viaEvent = await recencyWrites(async () => {
      await logEvent(spec.links(viaEventParents));
      await spec.check(viaEventParents);
    });

    const viaTaskParents = await parents();
    const task = await verify.hooks.run('crm_task', 'insert', {
      subject: `Follow up ${++k}`, status: 'in_progress', ...spec.links(viaTaskParents),
    }, as());
    const viaTask = await recencyWrites(async () => {
      await verify.hooks.run('crm_task', 'update', { id: task.id, status: 'completed' }, as());
      await spec.check(viaTaskParents);
    });

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
   * Since #2014 the bubbles write elevated, so the strip no longer reaches
   * them; the columns stay plain so that a person's own edit of them lands as
   * well. This writes each column as the rep, directly, so a `readonly: true`
   * creeping back onto any of the three fails here by name.
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

  it.each(RECENCY)('%s.%s survives a write from a plain user context', async (object, field, value) => {
    // The rep's own save — `isSystem` absent, the context a hook fired by a
    // rep's save actually runs under.
    const p = await parents();
    const row = { crm_account: p.account, crm_lead: p.lead, crm_contact: p.contact }[object as 'crm_account']!;
    await verify.hooks.run(object, 'update', { id: row.id, [field]: value }, as());
    const after = (await stored(object, row.id))[field];
    if (field === 'last_activity_date') {
      expect(after, `${object}.${field} was discarded — the engine stripped it as readonly (#2948)`).toBe(value);
    } else {
      sameInstant(after, value);
    }
  });
});
