// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import taskHooks from '../src/objects/task.hook';
import eventHooks from '../src/objects/event.hook';
import { ScheduleFollowUpFlow } from '../src/flows/schedule-followup.flow';
import { makeSandboxEngine, runHookBody, type Rec } from './helpers/action-sandbox';
import { hookNamed } from './helpers/hook-harness';

/**
 * `do_not_call` is enforced (#1180).
 *
 * The field was declared on `crm_lead` and `crm_contact`, rendered in forms and
 * on detail pages, labelled "Do Not Call" in four locales — and read by nothing.
 * Its twin `email_opt_out` is honoured in three places, so the app demonstrably
 * knew how to keep a communication promise; it just only kept the email one.
 * ADR-0049 enforce-or-remove, ruled **enforce**.
 *
 * # What is pinned here, and why at this layer
 *
 * The enforcement is a REFUSAL ON THE WRITE (`task_do_not_call_guard`,
 * `event_do_not_call_guard`), not a `visible:` predicate on a button. The
 * predicate route — the shape `send_email` uses for `email_opt_out` — hides a
 * button in the Console and leaves the write reachable over REST, from an AI
 * tool call, from a flow and from an import. For a compliance-shaped promise in
 * the reference app every marketplace fork copies, "enforced unless you use the
 * mouse" is the same defect in a smaller font. The guards' own doc blocks carry
 * the full argument.
 *
 * # The line this file defends
 *
 * SCHEDULING a phone touch is refused; RECORDING one that already happened is
 * not. A `completed` Call task and a `held` Call event are evidence — refusing
 * them would delete the record of the call rather than prevent it, and would
 * punish exactly the rep who is being honest. That judgment call is the
 * substance of #1180, so both halves are pinned: the refusals AND the
 * deliberate non-refusals. A future author who "tightens" this by blocking
 * `log_call` breaks a test that explains why.
 *
 * # Which code path these assertions drive
 *
 * These run the hooks' SHIPPED bodies — the lowered `body.source` the build
 * emits — through the same QuickJS runner + `hookBodyRunnerFactory` the runtime
 * binds at boot (`runHookBody`, `test/helpers/action-sandbox.ts`). Repo issue
 * #1167 records that guard assertions here drive the in-process handler instead;
 * that is true of the `hook-harness.ts` tests, and NOT of this file. Running the
 * lowered body matters for these two guards specifically: both are body-only
 * closures over nothing, and a body that reached for an import or a module
 * constant would be a `ReferenceError` at runtime while a handler-level test
 * stayed green.
 */

type AnyRec = Record<string, any>;

const taskGuard = hookNamed(taskHooks, 'task_do_not_call_guard');
const eventGuard = hookNamed(eventHooks, 'event_do_not_call_guard');

const FLAGGED_LEAD = 'lead_dnc';
const OK_LEAD = 'lead_ok';
const FLAGGED_CONTACT = 'contact_dnc';
const OK_CONTACT = 'contact_ok';

/**
 * People, as the driver hands them back.
 *
 * `lead_ok` carries `do_not_call: false` and `contact_ok` OMITS the key
 * entirely — the two shapes a real driver produces for "not flagged"
 * (`driver-memory` and `driver-mongodb` return a column that was never written
 * as ABSENT, not null; see AGENTS.md on predicate totality). Both must pass, or
 * the guard blocks every ordinary call in the app.
 */
const seed = (): Rec => ({
  crm_lead: [
    { id: FLAGGED_LEAD, do_not_call: true },
    { id: OK_LEAD, do_not_call: false },
  ],
  crm_contact: [
    { id: FLAGGED_CONTACT, do_not_call: true },
    { id: OK_CONTACT },
  ],
});

const runTask = (input: Rec, previous?: Rec, event = 'beforeInsert') =>
  runHookBody(taskGuard, { event, input, previous, engine: makeSandboxEngine(seed()) });

const runEvent = (input: Rec, previous?: Rec, event = 'beforeInsert') =>
  runHookBody(eventGuard, { event, input, previous, engine: makeSandboxEngine(seed()) });

// ───────────────────────────────────────── the refusals, on both objects ──

describe('scheduling a phone touch against a Do Not Call person is refused', () => {
  it('refuses an open Call task on a flagged LEAD', async () => {
    await expect(
      runTask({ type: 'call', status: 'not_started', related_to_lead: FLAGGED_LEAD }),
    ).rejects.toThrow(/flagged Do Not Call/);
  });

  it('refuses an open Call task on a flagged CONTACT', async () => {
    await expect(
      runTask({ type: 'call', status: 'not_started', related_to_contact: FLAGGED_CONTACT }),
    ).rejects.toThrow(/flagged Do Not Call/);
  });

  it('refuses a planned Call event on a flagged LEAD', async () => {
    await expect(
      runEvent({ type: 'call', status: 'planned', related_to_lead: FLAGGED_LEAD }),
    ).rejects.toThrow(/flagged Do Not Call/);
  });

  it('refuses a planned Call event on a flagged CONTACT', async () => {
    await expect(
      runEvent({ type: 'call', status: 'planned', related_to_contact: FLAGGED_CONTACT }),
    ).rejects.toThrow(/flagged Do Not Call/);
  });

  /**
   * The two ways into a forbidden state that supply only ONE of the two keys.
   *
   * A guard reading `input` alone passes both: the first write never mentions
   * the parent, the second never mentions the type. Reading the EFFECTIVE value
   * (`input` falling back to `previous`) is what closes them, and it is the only
   * reason the guards carry an `effective()` helper rather than reading `input`.
   */
  it('refuses retyping an existing meeting task to Call under a flagged lead', async () => {
    await expect(
      runTask(
        { id: 't1', type: 'call' },
        { id: 't1', type: 'meeting', status: 'not_started', related_to_lead: FLAGGED_LEAD },
        'beforeUpdate',
      ),
    ).rejects.toThrow(/flagged Do Not Call/);
  });

  it('refuses re-parenting an existing Call task onto a flagged contact', async () => {
    await expect(
      runTask(
        { id: 't1', related_to_contact: FLAGGED_CONTACT },
        { id: 't1', type: 'call', status: 'not_started', related_to_contact: OK_CONTACT },
        'beforeUpdate',
      ),
    ).rejects.toThrow(/flagged Do Not Call/);
  });
});

// ─────────────────────────────── what the refusal exposes to a REST caller ──

describe('the shape of the refusal (repo issue #1075)', () => {
  /**
   * #1180 asks for `code` and `status` assertions on the rejection. They are
   * asserted at the level that is REAL, which is currently neither.
   *
   * Every business rejection in this app is a bare `throw new Error(msg)` — 17
   * of them across `src/objects/*.hook.ts`, and these two guards match that
   * idiom deliberately rather than inventing a private error class for one
   * field. Repo issue #1075 (open) records the consequence: such rejections
   * reach REST with `code` and `status` undefined. Fixing that is #1075's job,
   * not this card's.
   *
   * So this test MEASURES both properties instead of assuming them, and pins
   * the message — which, until #1075 lands, is the entire contract a caller
   * gets. When #1075 does land, this test is the one that should go red and be
   * strengthened; the `toBeUndefined()` assertions are a deliberate tripwire,
   * not an endorsement.
   */
  it('carries a precise message, and (until #1075) no code or status', async () => {
    const err = await runTask({
      type: 'call',
      status: 'not_started',
      related_to_lead: FLAGGED_LEAD,
    }).then(
      () => null,
      (e: AnyRec) => e,
    );

    expect(err, 'the write was expected to be refused').toBeTruthy();
    expect(String(err.message)).toMatch(/flagged Do Not Call/);
    // Names the remedy, not just the refusal — a rep who cannot act on the
    // message will clear the flag, which is the outcome the field exists to
    // prevent.
    expect(String(err.message)).toMatch(/Log a completed call|non-phone activity type/);

    // Measured, not assumed. See the block comment: this is #1075's wall.
    expect(err.code, '#1075 has landed — tighten this assertion').toBeUndefined();
    expect(err.status, '#1075 has landed — tighten this assertion').toBeUndefined();
  });
});

// ─────────────────────────────────── recording a call is NEVER refused ──

describe('recording a call that already happened stays reachable', () => {
  it('allows a COMPLETED Call task on a flagged lead', async () => {
    await expect(
      runTask({ type: 'call', status: 'completed', related_to_lead: FLAGGED_LEAD }),
    ).resolves.toBeTruthy();
  });

  it('allows a HELD Call event on a flagged contact — this is what log_call writes', async () => {
    await expect(
      runEvent({ type: 'call', status: 'held', related_to_contact: FLAGGED_CONTACT }),
    ).resolves.toBeTruthy();
  });

  /**
   * The judgment call of #1180, pinned against the metadata rather than
   * restated in prose: `log_call` writes `status: 'held'`, so the guard above
   * cannot catch it — and it carries no `visible:` predicate either. Both
   * halves are asserted, because either one alone could be "fixed" by a future
   * author without noticing the other.
   */
  it('leaves every log_call action ungated, on every object', () => {
    const actions: AnyRec[] = (stack as AnyRec).actions ?? [];
    const logCalls = actions.filter((a) => a.name === 'log_call');
    expect(logCalls.length, 'no log_call action is registered').toBeGreaterThan(0);
    for (const a of logCalls) {
      expect(a.visible, `log_call on ${a.objectName} acquired a visibility gate`).toBeUndefined();
      expect(String(a.body?.source)).toContain("const EVENT_STATUS = \"held\"");
    }
  });
});

// ───────────────────────────────────────── the flag is about the PHONE ──

describe('do_not_call does not widen into do_not_contact', () => {
  it('allows a Meeting task on a flagged lead', async () => {
    await expect(
      runTask({ type: 'meeting', status: 'not_started', related_to_lead: FLAGGED_LEAD }),
    ).resolves.toBeTruthy();
  });

  it('allows an Email task on a flagged contact — that is email_opt_out\'s promise', async () => {
    await expect(
      runTask({ type: 'email', status: 'not_started', related_to_contact: FLAGGED_CONTACT }),
    ).resolves.toBeTruthy();
  });

  /**
   * `schedule_meeting` hardcodes `type: 'meeting'` (not a user choice), so a
   * planned meeting is out of the guard's reach BY CONSTRUCTION, not by
   * oversight. A person who will not take calls may still be met in person or
   * over video. Pinned so a later "consistency" pass cannot quietly widen the
   * field's meaning.
   */
  it('allows a planned Meeting event on a flagged lead, and schedule_meeting still books one', async () => {
    await expect(
      runEvent({ type: 'meeting', status: 'planned', related_to_lead: FLAGGED_LEAD }),
    ).resolves.toBeTruthy();

    const actions: AnyRec[] = (stack as AnyRec).actions ?? [];
    const scheduleMeetings = actions.filter((a) => a.name === 'schedule_meeting');
    expect(scheduleMeetings.length).toBeGreaterThan(0);
    for (const a of scheduleMeetings) {
      expect(String(a.body?.source)).toContain('const EVENT_TYPE = "meeting"');
    }
  });
});

// ───────────────────────────────────────── an unflagged person is untouched ──

describe('an unflagged person is unaffected', () => {
  it('allows an open Call task on a lead with do_not_call: false', async () => {
    await expect(
      runTask({ type: 'call', status: 'not_started', related_to_lead: OK_LEAD }),
    ).resolves.toBeTruthy();
  });

  it('allows an open Call task on a contact whose do_not_call key is ABSENT', async () => {
    await expect(
      runTask({ type: 'call', status: 'not_started', related_to_contact: OK_CONTACT }),
    ).resolves.toBeTruthy();
  });

  it('allows a Call task parented to a non-person (an account), reading nothing', async () => {
    const engine = makeSandboxEngine(seed());
    await expect(
      runHookBody(taskGuard, {
        event: 'beforeInsert',
        input: { type: 'call', status: 'not_started', related_to_account: 'acc_1' },
        engine,
      }),
    ).resolves.toBeTruthy();
    // `do_not_call` lives on people only; an account parent must not cost a read.
    expect(engine.calls.filter((c) => c.op === 'find')).toHaveLength(0);
  });
});

// ─────────────────────────── the entry point the card named reaches the guard ──

describe('the schedule_followup screen flow is covered by the task guard', () => {
  /**
   * The card asked whether the phone OPTION could be gated in the follow-up
   * screen instead. It cannot: a screen field's `options` are static metadata
   * (`plainOptions(TASK_TYPE_OPTIONS)`), evaluated with no record in scope, so
   * there is no expression in which "hide Call for THIS lead" can be written.
   * Refusing at the point the phone type is chosen is what the metadata can
   * express — and it costs the flow no change at all, because the flow reaches
   * `crm_task` through the same write the guard sits on.
   *
   * This pins the linkage, so a refactor that moved the flow off `crm_task`
   * (or stopped forwarding the picked type) would surface here rather than
   * silently reopening the hole.
   */
  it('creates a crm_task carrying the user-picked activity type', () => {
    const create = ScheduleFollowUpFlow.nodes.find((n) => n.id === 'create_task') as AnyRec;
    expect(create).toBeTruthy();
    expect(create.config.objectName).toBe('crm_task');
    expect(create.config.fields.type).toBe('{activityType}');

    const screen = ScheduleFollowUpFlow.nodes.find((n) => n.id === 'screen_1') as AnyRec;
    const typeField = screen.config.fields.find((f: AnyRec) => f.name === 'activityType');
    expect(
      typeField.options.some((o: AnyRec) => o.value === 'call'),
      'the follow-up screen no longer offers Call — this guard may be dead',
    ).toBe(true);
  });
});
