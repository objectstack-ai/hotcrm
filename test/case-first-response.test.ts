// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import eventHooks from '../src/objects/event.hook';
import { makeHarness, makeDeniedApi, makeCtx, hookNamed, type Rec } from './helpers/hook-harness';

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
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const crmCase = objects.find((o) => o.name === 'crm_case') as AnyRec | undefined;
const stackActions: AnyRec[] = (stack as any).actions ?? [];

const hook = hookNamed(eventHooks as AnyRec[], 'event_activity_bubble') as AnyRec;

/** A store holding one case (optionally already stamped) and its account. */
const seeded = (first_response_date: string | null = null): Record<string, Rec[]> => ({
  crm_case: [{ id: 'case_1', subject: 'Login issues', status: 'new', crm_account: 'acct_1', first_response_date }],
  crm_account: [{ id: 'acct_1', name: 'Acme Corporation' }],
});

/** Fire the hook for an event landing on `case_1`. */
const heldEventOnCase = async (
  harness: ReturnType<typeof makeHarness>,
  overrides: Rec = {},
  previous?: Rec,
) =>
  hook.handler(
    makeCtx({
      event: previous ? 'afterUpdate' : 'afterInsert',
      input: {
        id: 'event_1', subject: 'Called the customer back', type: 'call',
        status: 'held', related_to_case: 'case_1', ...overrides,
      },
      previous,
      user: { id: 'user_1' },
      api: harness.api,
    }),
  );

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
    const harness = makeHarness(seeded());
    await heldEventOnCase(harness);

    const stamped = harness.rows('crm_case')[0]!.first_response_date as string;
    expect(stamped).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(stamped).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(stamped).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('uses the (data, options) update shape the engine facade requires', async () => {
    // `update(id, doc)` compiles and no-ops against the real kernel (#616); the
    // harness throws on it, which is the only reason this assertion can exist.
    const harness = makeHarness(seeded());
    await heldEventOnCase(harness);
    const call = harness
      .callsFor('crm_case', 'update')
      .find((c) => (c.args[0] as Rec).first_response_date);
    expect(call!.args[0]).toMatchObject({ id: 'case_1' });
    expect(call!.args[1]).toEqual({ where: { id: 'case_1' } });
  });

  it('never moves a stamp that is already there', async () => {
    const harness = makeHarness(seeded('2026-01-01T09:00:00.000Z'));
    await heldEventOnCase(harness);
    expect(harness.rows('crm_case')[0]!.first_response_date).toBe('2026-01-01T09:00:00.000Z');
    expect(
      harness.callsFor('crm_case', 'update'),
      'a second write would make it "last response"',
    ).toHaveLength(0);
  });

  it('is written once across a call and then a meeting on the same case', async () => {
    // "First response" is a property of the case, not of either action, so the
    // second interaction must find the first one's stamp.
    const harness = makeHarness(seeded());
    await heldEventOnCase(harness, { id: 'event_1', type: 'call' });
    const first = harness.rows('crm_case')[0]!.first_response_date;
    await heldEventOnCase(harness, { id: 'event_2', type: 'meeting' });
    expect(harness.rows('crm_case')[0]!.first_response_date).toBe(first);
    expect(harness.callsFor('crm_case', 'update')).toHaveLength(1);
  });

  it('reads the stored row rather than trusting the event payload', async () => {
    // The event carries no first-response field of its own; a body that
    // inferred "unstamped" from its own input would re-stamp on every log and
    // turn "first response" into "last".
    const harness = makeHarness(seeded('2026-01-01T09:00:00.000Z'));
    await heldEventOnCase(harness, { first_response_date: undefined });
    expect(harness.rows('crm_case')[0]!.first_response_date).toBe('2026-01-01T09:00:00.000Z');
  });
});

describe('what does NOT count as a first response', () => {
  it('a meeting merely BOOKED does not start the clock', async () => {
    // `schedule_meeting` writes `planned`. A meeting on next week's calendar is
    // not a response the customer has received — the same `held` gate the
    // recency bubble uses.
    const harness = makeHarness(seeded());
    await heldEventOnCase(harness, { status: 'planned' });
    expect(harness.rows('crm_case')[0]!.first_response_date).toBeNull();
    expect(harness.callsFor('crm_case', 'update')).toHaveLength(0);
  });

  it('a cancelled or no-show interaction does not either', async () => {
    const harness = makeHarness(seeded());
    for (const status of ['cancelled', 'no_show']) {
      await heldEventOnCase(harness, { status });
    }
    expect(harness.rows('crm_case')[0]!.first_response_date).toBeNull();
  });

  it('an event already held before this write does not re-stamp', async () => {
    // The hook fires once, on the transition INTO held — an unrelated edit to
    // an already-held event must not look like a fresh response.
    const harness = makeHarness(seeded());
    await heldEventOnCase(harness, { subject: 'Corrected the notes' }, { status: 'held' });
    expect(harness.rows('crm_case')[0]!.first_response_date).toBeNull();
  });

  it('an event on some other object leaves cases alone', async () => {
    // The same activity model spans five parents (#592). A call logged on a
    // lead must not reach for a field that only exists on `crm_case`.
    const harness = makeHarness({ ...seeded(), crm_lead: [{ id: 'lead_1' }] });
    await hook.handler(
      makeCtx({
        event: 'afterInsert',
        input: { id: 'event_9', status: 'held', type: 'call', related_to_lead: 'lead_1' },
        user: { id: 'user_1' },
        api: harness.api,
      }),
    );
    expect(harness.callsFor('crm_case')).toEqual([]);
    expect(harness.rows('crm_case')[0]!.first_response_date).toBeNull();
  });
});

describe('the stamp is best-effort, like the rest of the bubble', () => {
  it('a denied case read does not break the event write', async () => {
    // An agent who cannot see the case still gets to record their call; the
    // metric simply does not move. The hook is `onError: 'log'`, but a throw
    // here would still abort the recency writes that share the handler.
    await expect(
      hook.handler(
        makeCtx({
          event: 'afterInsert',
          input: { id: 'event_1', status: 'held', type: 'call', related_to_case: 'case_1' },
          user: { id: 'user_1' },
          api: makeDeniedApi(),
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it('runs at all only when the hook has an api', async () => {
    await expect(
      hook.handler(
        makeCtx({
          event: 'afterInsert',
          input: { id: 'event_1', status: 'held', related_to_case: 'case_1' },
          user: { id: 'user_1' },
        }),
      ),
    ).resolves.toBeUndefined();
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
