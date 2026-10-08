// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, recordEngineWrites, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * `crm_case.first_response_date` — one writer, every path (#575 B2, #595).
 *
 * It was the only member of the case SLA family without a writer at all
 * (#575 B2), and the fix then was to stamp it from the `log_call` /
 * `log_meeting` action body. That covered the two buttons and nothing else: an
 * interaction recorded any other way — the Activity tab, an import, an
 * integration, a future action — left the most standard metric a service desk
 * reports permanently null. The body carried a comment asking every future
 * author to remember to stamp it too, which is the shape of a rule that gets
 * forgotten rather than enforced.
 *
 * #595 moved the stamp to `event_activity_bubble` (`src/objects/event.hook.ts`).
 * That hook already fires on exactly the right condition — a `crm_event` on its
 * transition into `held` — and already resolves `related_to_case` for the
 * recency walk-up. Both actions still stamp the case, because step 1 of their
 * body writes the event this hook watches; they just no longer each carry their
 * own copy of the rule. Two writers racing on a "first" timestamp is how it
 * quietly becomes a "last" one.
 *
 * Non-goals, restated because both were proposed and rejected:
 *
 *   - **A status change is not a first response.** An agent can move a case to
 *     "in progress" and investigate for an hour while the customer hears
 *     nothing, so a status-derived number reports a response that never
 *     happened. #595's scope note lists "first agent status transition" as a
 *     candidate touchpoint; it is deliberately still not one.
 *   - **A meeting merely BOOKED is not a response either.** `schedule_meeting`
 *     writes a `planned` event, and the `held` gate is what keeps next
 *     quarter's placeholder from starting the clock.
 *
 * Every case is a real write on the shipped app booted by
 * `@objectstack/verify`: a service agent recording an interaction on a case
 * they work, through the engine's write door (`hooks.run`). The hook is
 * `async: true` — the engine runs it after the event write has returned — so a
 * stamp is waited for, and a claim that it wrote NOTHING is read off the
 * writes the engine received (`recordEngineWrites`) once it has had time to.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const crmCase = objects.find((o) => o.name === 'crm_case') as AnyRec | undefined;
const stackActions: AnyRec[] = (stack as any).actions ?? [];

let verify: VerifyStack;
let agent: Person;
let accountId: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  agent = await signUpPerson(verify, 'agent@case-first-response.test', {
    name: 'Service Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Acme Corporation (first response)' }]);
  accountId = String(account!.id);
}, 120_000);

/** A case the agent opened (optionally already stamped by the system). */
const openCase = async (first_response_date: string | null = null): Promise<Rec> => {
  const kase = await verify.hooks.run('crm_case', 'insert', {
    subject: `Login issues ${++k}`, description: 'Cannot sign in.', crm_account: accountId,
  }, { as: agent.token });
  if (first_response_date) await systemUpdate(verify, 'crm_case', { id: kase.id, first_response_date });
  return kase;
};

/** The agent recording an interaction on `caseId`. */
const eventOnCase = (caseId: string, overrides: Rec = {}): Promise<Rec> =>
  verify.hooks.run('crm_event', 'insert', {
    subject: `Called the customer back ${++k}`, type: 'call', status: 'held',
    start_datetime: new Date().toISOString(), related_to_type: 'crm_case', related_to_case: caseId, ...overrides,
  }, { as: agent.token });

const stampOf = async (caseId: string): Promise<string | null> =>
  ((await verify.rows('crm_case', { id: caseId }))[0]!.first_response_date as string | null) ?? null;

/** Wait for the case's stamp to land. */
const stamped = (caseId: string): Promise<string> =>
  vi.waitFor(async () => {
    const stamp = await stampOf(caseId);
    expect(stamp, 'no first response was stamped').toBeTruthy();
    return stamp!;
  }, { timeout: 10_000, interval: 50 });

/**
 * Run `write` with a recorder attached, give the hook time to run, and return
 * the `crm_case` updates it handed the engine that carry a first response.
 */
const firstResponseWrites = async (write: () => Promise<unknown>) => {
  const recorder = recordEngineWrites(verify);
  try {
    await write();
    await new Promise((r) => setTimeout(r, 400));
    await Promise.all(recorder.writes.map((w) => w.settled));
    return recorder.of('crm_case', 'update').filter((w) => 'first_response_date' in (w.args[1] as Rec));
  } finally {
    recorder.restore();
  }
};

describe('the field is writable at all', () => {
  it('crm_case.first_response_date is not readonly', () => {
    // 16.x drops writes to readonly fields on user-context writes (#2948), and
    // this hook runs under the acting user — so `readonly: true` here would
    // make every assertion below pass in this harness and write nothing in
    // production. Same reason `is_sla_violated` and `escalated_date` dropped it.
    const field = crmCase?.fields?.first_response_date;
    expect(field, 'crm_case.first_response_date missing').toBeTruthy();
    expect(field.readonly ?? false).toBe(false);
  });

  it('the rest of the SLA family still has its writers', () => {
    // Guard against "fixed" by deletion: this test exists because the field is
    // part of a set, and the set is the argument for keeping it.
    for (const name of ['sla_due_date', 'resolution_time_hours', 'is_sla_violated', 'closed_date']) {
      expect(crmCase?.fields?.[name], `crm_case.${name} missing`).toBeTruthy();
    }
  });
});

describe('a held event on a case stamps the first response', () => {
  it('writes the current time onto a case that has none', async () => {
    const before = Date.now();
    const kase = await openCase();
    await eventOnCase(kase.id);

    const stamp = await stamped(kase.id);
    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(stamp).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(stamp).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('uses the (data, options) update shape the engine facade requires', async () => {
    // `update(id, doc)` compiles and no-ops against the real kernel (#616): the
    // stamp landing at all is the proof, and the write the engine received is
    // the shape.
    const kase = await openCase();
    const writes = await firstResponseWrites(async () => {
      await eventOnCase(kase.id);
      await stamped(kase.id);
    });
    expect(writes).toHaveLength(1);
    expect(writes[0]!.args[1]).toMatchObject({ id: kase.id });
    expect((writes[0]!.args[2] as Rec).where).toEqual({ id: kase.id });
  });

  it('never moves a stamp that is already there', async () => {
    const kase = await openCase('2026-01-01T09:00:00.000Z');
    const writes = await firstResponseWrites(() => eventOnCase(kase.id));
    expect(await stampOf(kase.id)).toBe('2026-01-01T09:00:00.000Z');
    expect(writes, 'a second write would make it "last response"').toHaveLength(0);
  });

  it('is written once across a call and then a meeting on the same case', async () => {
    // "First response" is a property of the case, not of either action, so the
    // second interaction must find the first one's stamp.
    const kase = await openCase();
    const writes = await firstResponseWrites(async () => {
      await eventOnCase(kase.id, { type: 'call' });
      const first = await stamped(kase.id);
      await eventOnCase(kase.id, { type: 'meeting' });
      await new Promise((r) => setTimeout(r, 400));
      expect(await stampOf(kase.id)).toBe(first);
    });
    expect(writes).toHaveLength(1);
  });

  it('reads the stored row rather than trusting the event payload', async () => {
    // The event carries no first-response field of its own; a body that
    // inferred "unstamped" from its own input would re-stamp on every log and
    // turn "first response" into "last". The stamp here arrived on the CASE
    // after it was opened, by another writer.
    const kase = await openCase();
    await systemUpdate(verify, 'crm_case', { id: kase.id, first_response_date: '2026-02-01T09:00:00.000Z' });
    const writes = await firstResponseWrites(() => eventOnCase(kase.id));
    expect(writes).toHaveLength(0);
    expect(await stampOf(kase.id)).toBe('2026-02-01T09:00:00.000Z');
  });

  it('an imported held event stamps the case too — every writer reaches it', async () => {
    // #595's point: the stamp lives on the event's transition, not in one
    // button. A held event written by the system (an import, an integration)
    // reaches the case as surely as the agent's own.
    const kase = await openCase();
    await verify.seed('crm_event', [{
      subject: `Imported call ${++k}`, type: 'call', status: 'held', start_datetime: new Date().toISOString(),
      related_to_type: 'crm_case', related_to_case: kase.id,
    }]);
    expect(await stamped(kase.id)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('what does NOT count as a first response', () => {
  it('a meeting merely BOOKED does not start the clock', async () => {
    // `schedule_meeting` writes `planned`. A meeting on next week's calendar is
    // not a response the customer has received — the same `held` gate the
    // recency bubble uses.
    const kase = await openCase();
    const writes = await firstResponseWrites(() => eventOnCase(kase.id, { type: 'meeting', status: 'planned' }));
    expect(await stampOf(kase.id)).toBeNull();
    expect(writes).toHaveLength(0);
  });

  it('a cancelled or no-show interaction does not either', async () => {
    const kase = await openCase();
    const writes = await firstResponseWrites(async () => {
      for (const status of ['cancelled', 'no_show']) await eventOnCase(kase.id, { status });
    });
    expect(writes).toHaveLength(0);
    expect(await stampOf(kase.id)).toBeNull();
  });

  it('an event already held before this write does not re-stamp', async () => {
    // The hook fires once, on the transition INTO held — an unrelated edit to
    // an already-held event must not look like a fresh response. The case's
    // stamp from that first transition is cleared first, so a re-stamp would
    // show.
    const kase = await openCase();
    const held = await eventOnCase(kase.id);
    await stamped(kase.id);
    await systemUpdate(verify, 'crm_case', { id: kase.id, first_response_date: null });
    const writes = await firstResponseWrites(() =>
      verify.hooks.run('crm_event', 'update', { id: held.id, subject: 'Corrected the notes' }, { as: agent.token }));
    expect(writes).toHaveLength(0);
    expect(await stampOf(kase.id)).toBeNull();
  });

  it('an event on some other object leaves cases alone', async () => {
    // The same activity model spans five parents (#592). A call logged on a
    // lead must not reach for a field that only exists on `crm_case`.
    const [lead] = await verify.seed('crm_lead', [{
      first_name: 'Lee', last_name: `Caller ${++k}`, company: 'Lead Co', email: `lead${k}@case-first-response.test`, owner_id: agent.id,
    }]);
    const recorder = recordEngineWrites(verify);
    try {
      await verify.hooks.run('crm_event', 'insert', {
        subject: 'Called the lead', type: 'call', status: 'held', start_datetime: new Date().toISOString(),
        related_to_type: 'crm_lead', related_to_lead: lead!.id,
      }, { as: agent.token });
      await new Promise((r) => setTimeout(r, 400));
      expect(recorder.of('crm_case')).toEqual([]);
    } finally {
      recorder.restore();
    }
  });
});

describe('the stamp is best-effort, like the rest of the bubble', () => {
  it('a case the writer cannot read does not break the event write', async () => {
    // An agent who cannot see the case still gets to record their call; the
    // metric simply does not move. On the real engine an unreadable case is not
    // a THROWN read but a filtered one — the hook finds nothing to stamp.
    const outsider = await signUpPerson(verify, `outsider${++k}@case-first-response.test`, {
      name: 'Other Agent', permissionSets: ['service_agent'],
    });
    const kase = await openCase();
    expect(await verify.rows('crm_case', { id: kase.id }, { as: outsider.token }), 'the outsider can read the case').toEqual([]);
    const event = await verify.hooks.run('crm_event', 'insert', {
      subject: 'Called about a case I cannot see', type: 'call', status: 'held', start_datetime: new Date().toISOString(),
      related_to_type: 'crm_case', related_to_case: kase.id,
    }, { as: outsider.token });
    expect((await verify.rows('crm_event', { id: event.id }))[0], 'the event write was lost').toBeTruthy();
    await new Promise((r) => setTimeout(r, 400));
    expect(await stampOf(kase.id)).toBeNull();
  });
});

describe('the action bodies no longer carry their own copy', () => {
  const activityAction = (objectName: string, name: string): AnyRec => {
    const found = stackActions.find((a) => a.objectName === objectName && a.name === name);
    if (!found) throw new Error(`no ${objectName}-scoped ${name} action registered`);
    return found;
  };

  it.each(['log_call', 'log_meeting'])('%s writes the event and stops there', (name) => {
    // The regression this guards is a re-added stamp in the action body: two
    // writers, both guarding on "is it blank", both reading before the other
    // writes. Whichever lands second is the one the metric keeps.
    const source = String(activityAction('crm_case', name).body?.source ?? '');
    expect(source, `${name} still stamps first_response_date itself`).not.toMatch(
      /first_response_date:\s/,
    );
    // …and it must still write the `crm_event` the hook watches, or the stamp
    // has no path at all.
    expect(source).toMatch(/object\('crm_event'\)\.insert/);
  });
});
