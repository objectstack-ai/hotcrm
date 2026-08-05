// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { validateActionParams } from '@objectstack/spec/ui';
import stack from '../objectstack.config';
import { ACTIVITY_TARGETS } from '../src/actions/global.actions';
import eventHooks from '../src/objects/event.hook';
import { runActionBody, makeSandboxEngine, type ActionRunOpts } from './helpers/action-sandbox';
import { makeHarness, makeCtx, hookNamed } from './helpers/hook-harness';

/**
 * Behavioral guards for the activity actions in `src/actions/global.actions.ts`.
 *
 * These EXECUTE the action bodies instead of regex-matching them, through the
 * same `actionBodyRunnerFactory` + QuickJS the runtime binds at boot
 * (`test/helpers/action-sandbox.ts`). Everything pinned here is invisible to
 * `os validate`, to `build`, and to a structural assertion over the compiled
 * metadata — it lives inside a sandboxed body.
 *
 * # What this file is about now (#592)
 *
 * It was about two defects in a pair of twins (#514 items 2 and 15). The pair
 * is now a FAMILY — `log_call`, `log_meeting` and `schedule_meeting`, generated
 * once per sales object — and what they write changed from "a `sys_activity`
 * row with the interesting part in a JSON string" to "a real `crm_event` plus
 * real `crm_event_attendee` rows, with the `sys_activity` row kept as the
 * timeline pointer". So the guards are:
 *
 *   1. the family is complete and reachable on every object a rep sells to
 *      (the #509 workaround scoped everything to `crm_case`);
 *   2. attendees are ROWS — the acceptance criterion of #592;
 *   3. a booking does not masquerade as an interaction;
 *   4. the `record_label` and twin-parity guarantees from #514 still hold.
 */

type AnyRec = Record<string, any>;

const stackActions: AnyRec[] = (stack as any).actions ?? [];
const stackObjects: AnyRec[] = (stack as any).objects ?? [];
const objectByName = new Map(stackObjects.map((o) => [o.name as string, o]));

/** An action addressed by the key the runtime registers it under. */
const action = (objectName: string, name: string): AnyRec => {
  const found = stackActions.find((a) => a.objectName === objectName && a.name === name);
  if (!found) throw new Error(`no ${objectName}-scoped ${name} action registered`);
  return found;
};

const KINDS = ['log_call', 'log_meeting', 'schedule_meeting'] as const;
/** Kinds that record something that HAPPENED, as opposed to a booking. */
const LOGGING_KINDS = ['log_call', 'log_meeting'] as const;
const TARGETS = Object.keys(ACTIVITY_TARGETS);

/** A record of each object, carrying that object's declared nameField. */
const recordFor = (objectName: string): AnyRec => {
  const nameField = objectByName.get(objectName)?.nameField ?? 'name';
  return { id: `${objectName}_1`, [nameField]: `label of ${objectName}` };
};

async function run(objectName: string, kind: string, opts: ActionRunOpts = {}) {
  const engine = opts.engine ?? makeSandboxEngine();
  const { result } = await runActionBody(action(objectName, kind), {
    objectName,
    record: recordFor(objectName),
    ...opts,
    input: { subject: 'Quarterly sync', ...(opts.input ?? {}) },
    engine,
  });
  return { engine, result };
}

// ────────────────────────────────────── the family exists, per object ──

describe('a rep can log an interaction on everything they sell to (#509 / #592)', () => {
  it('registers every kind on every activity target', () => {
    const missing: string[] = [];
    for (const objectName of TARGETS) {
      for (const kind of KINDS) {
        if (!stackActions.some((a) => a.objectName === objectName && a.name === kind)) {
          missing.push(`${objectName}:${kind}`);
        }
      }
    }
    expect(
      missing,
      'a rep cannot log activity here — a body action reachable from no surface ' +
        `is the #509 defect:\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
  });

  it('covers the sales objects the issue names, not just the case', () => {
    // The regression this stops: collapsing back to one crm_case-scoped pair.
    for (const objectName of ['crm_lead', 'crm_contact', 'crm_account', 'crm_opportunity']) {
      expect(TARGETS, `${objectName} is not an activity target`).toContain(objectName);
    }
  });

  it('no activity action is left unscoped', () => {
    // A body action with no `objectName` registers under a 'global' key the
    // dispatcher never probes, which is how these were unreachable before they
    // were pinned to crm_case.
    const unscoped = stackActions
      .filter((a) => (KINDS as readonly string[]).includes(a.name))
      .filter((a) => typeof a.objectName !== 'string' || !a.objectName);
    expect(unscoped.map((a) => a.name), 'unreachable global body actions').toEqual([]);
  });

  it('every target names a real related_to_* lookup on crm_event', () => {
    // The map in `global.actions.ts` decides which `crm_event` column records
    // the link. A stale entry writes an event linked to nothing at all.
    const eventFields = objectByName.get('crm_event')?.fields ?? {};
    const typeOptions = new Set(
      (eventFields.related_to_type?.options ?? []).map((o: AnyRec) => o.value),
    );
    const bad: string[] = [];
    for (const [objectName, field] of Object.entries(ACTIVITY_TARGETS)) {
      if (!eventFields[field]) bad.push(`crm_event has no field "${field}" (for ${objectName})`);
      if (!typeOptions.has(objectName)) {
        bad.push(`crm_event.related_to_type has no option "${objectName}"`);
      }
    }
    expect(bad, `ACTIVITY_TARGETS has drifted from crm_event:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

// ─────────────────────────────── attendees are records, not JSON strings ──

describe('attendees are queryable records (#592 acceptance)', () => {
  it('no activity body stashes an attendee list in metadata', () => {
    // The exact shape the issue rejects: `{"attendees":"Bob, Alice"}` inside
    // `sys_activity.metadata` — unqueryable, unreportable.
    const offenders: string[] = [];
    for (const objectName of TARGETS) {
      for (const kind of KINDS) {
        const source: string = action(objectName, kind).body?.source ?? '';
        if (/attendees:\s*input\.attendees/.test(source)) offenders.push(`${objectName}:${kind}`);
      }
    }
    expect(offenders, `attendee list smuggled into metadata:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('writes one crm_event_attendee row per person, linked to the event', async () => {
    const { engine, result } = await run('crm_opportunity', 'log_meeting', {
      input: {
        subject: 'Kickoff',
        attendee_contacts: ['con_1', 'con_2'],
        attendee_users: ['usr_7'],
      },
    });
    const attendees = engine.inserted('crm_event_attendee');

    // organiser + two contacts + one colleague
    expect(attendees).toHaveLength(4);
    expect(attendees.every((a) => a.crm_event === result.eventId)).toBe(true);

    const organiser = attendees.find((a) => a.is_organizer === true);
    expect(organiser, 'the acting user is always the organiser').toMatchObject({
      attendee_type: 'user', sys_user: 'usr_1', response: 'accepted',
    });
    expect(attendees.filter((a) => a.attendee_type === 'contact').map((a) => a.crm_contact).sort())
      .toEqual(['con_1', 'con_2']);
    expect(attendees.find((a) => a.sys_user === 'usr_7')).toMatchObject({ attendee_type: 'user' });
    // Every row is stamped, so "who was invited when" is answerable.
    expect(attendees.every((a) => typeof a.invited_date === 'string')).toBe(true);
  });

  it('accepts a single value where the console renders the lookup unmultiplied', async () => {
    const { engine } = await run('crm_account', 'log_meeting', {
      input: { subject: 'Review', attendee_contacts: 'con_9' },
    });
    expect(engine.inserted('crm_event_attendee').some((a) => a.crm_contact === 'con_9')).toBe(true);
  });

  it('adds the record itself when it IS a person', async () => {
    for (const [objectName, type, field] of [
      ['crm_contact', 'contact', 'crm_contact'],
      ['crm_lead', 'lead', 'crm_lead'],
    ] as const) {
      const { engine } = await run(objectName, 'log_call');
      const self = engine.inserted('crm_event_attendee').find((a) => a.attendee_type === type);
      expect(self, `${objectName} did not attend its own call`).toBeTruthy();
      expect(self![field]).toBe(`${objectName}_1`);
    }
  });

  it('invents no attendee for a company, a deal or a ticket', async () => {
    // An account is not a person. The event's `related_to_*` link already
    // records what the call was about; a fabricated attendee row would be a
    // record asserting somebody was in the room.
    for (const objectName of ['crm_account', 'crm_opportunity', 'crm_case']) {
      const { engine } = await run(objectName, 'log_call');
      const attendees = engine.inserted('crm_event_attendee');
      expect(attendees, `${objectName} invented attendees`).toHaveLength(1);
      expect(attendees[0]!.is_organizer).toBe(true);
    }
  });

  it('does not write the same person twice', async () => {
    const { engine } = await run('crm_contact', 'log_meeting', {
      // The contact the action fired from, named AGAIN in the picker, plus the
      // acting user naming themselves.
      input: { subject: 'Sync', attendee_contacts: ['crm_contact_1'], attendee_users: ['usr_1'] },
    });
    expect(engine.inserted('crm_event_attendee')).toHaveLength(2);
  });
});

// ─────────────────────────────────────────── the event row itself ──

describe('every activity action writes a real crm_event', () => {
  it.each(TARGETS)('%s links the event back to the record it fired from', async (objectName) => {
    const { engine } = await run(objectName, 'log_call', { input: { subject: 'Intro', duration: 15 } });
    const [event] = engine.inserted('crm_event') as AnyRec[];
    expect(event, `${objectName} wrote no crm_event`).toBeTruthy();
    expect(event.related_to_type).toBe(objectName);
    expect(event[ACTIVITY_TARGETS[objectName]!]).toBe(`${objectName}_1`);
    expect(event.owner_id).toBe('usr_1');
    expect(event.duration_minutes).toBe(15);
    expect(event.start_datetime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('a logged call is `held`; a scheduled meeting is `planned`', async () => {
    const logged = (await run('crm_opportunity', 'log_call')).engine.inserted('crm_event')[0]!;
    expect(logged.status).toBe('held');
    expect(logged.type).toBe('call');

    const booked = (await run('crm_opportunity', 'schedule_meeting', {
      input: { subject: 'Deep dive', start_date: '2026-09-01', start_time: '09:00', location: 'Zoom' },
    })).engine.inserted('crm_event')[0]!;
    // The distinction the whole churn signal rests on: a booking must not reset
    // the customer's recency clock (`event.hook.ts` gates its bubble on `held`).
    expect(booked.status).toBe('planned');
    expect(booked.type).toBe('meeting');
    expect(booked.start_datetime).toBe('2026-09-01T09:00:00.000Z');
    expect(booked.location).toBe('Zoom');
  });

  it('falls back to now for an unparseable start rather than writing NaN', async () => {
    const { engine } = await run('crm_lead', 'schedule_meeting', {
      input: { subject: 'Deep dive', start_date: 'next tuesday-ish' },
    });
    const [event] = engine.inserted('crm_event') as AnyRec[];
    expect(event.start_datetime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(event.start_datetime).getTime()).not.toBeNaN();
  });

  it('the timeline row points at the event (ADR-0052), not at a blob', async () => {
    const { engine, result } = await run('crm_account', 'log_meeting', {
      input: { subject: 'QBR', duration: 45, notes: 'Renewal discussed' },
    });
    const [activity] = engine.inserted('sys_activity') as AnyRec[];
    expect(activity.source_object).toBe('crm_event');
    expect(activity.source_id).toBe(result.eventId);
    const meta = JSON.parse(activity.metadata);
    expect(meta.kind).toBe('meeting');
    expect(meta.duration_minutes).toBe(45);
    expect(meta.notes).toBe('Renewal discussed');
    // A COUNT is a display hint; the attendees themselves are rows.
    expect(meta.attendee_count).toBe(engine.inserted('crm_event_attendee').length);
    expect(meta.attendees).toBeUndefined();
  });
});

// ──────────────────────────── record_label still resolves (#514 item 2) ──

describe('activity actions stamp a real record_label (#514 item 2)', () => {
  it('the codebase still makes this worth guarding — most nameFields are not `name`', () => {
    // If this ever drops to zero the guards below become vacuous: reading
    // `record.name` would be right everywhere and the bug could not recur.
    const withNameField = stackObjects.filter((o) => typeof o.nameField === 'string');
    const notName = withNameField.filter((o) => o.nameField !== 'name');
    expect(withNameField.length, 'no object declares a nameField').toBeGreaterThan(0);
    expect(notName.length).toBeGreaterThan(withNameField.length / 2);
  });

  it.each(TARGETS)('%s resolves its own declared nameField', async (objectName) => {
    const nameField = objectByName.get(objectName)?.nameField;
    expect(nameField, `${objectName} declares no nameField`).toBeTruthy();
    for (const kind of KINDS) {
      const { engine } = await run(objectName, kind, {
        input: { subject: 'Quarterly sync', start_date: '2026-09-01', start_time: '09:00' },
      });
      const [activity] = engine.inserted('sys_activity') as AnyRec[];
      expect(activity.record_label, `${objectName}:${kind}`).toBe(`label of ${objectName}`);
      expect(activity.object_name).toBe(objectName);
      expect(activity.record_id).toBe(`${objectName}_1`);
    }
  });

  it('writes null rather than throwing when the label field is absent', async () => {
    const engine = makeSandboxEngine();
    const { result } = await runActionBody(action('crm_case', 'log_call'), {
      objectName: 'crm_case',
      record: { id: 'case_1' },
      input: { subject: 'Follow-up with customer' },
      engine,
    });
    expect(result.activityId).toBeTruthy();
    expect((engine.inserted('sys_activity')[0] as AnyRec).record_label).toBeNull();
  });

  it('carries the acting user onto the activity', async () => {
    const { engine } = await run('crm_lead', 'log_call');
    const [activity] = engine.inserted('sys_activity') as AnyRec[];
    expect(activity.actor_id).toBe('usr_1');
    expect(activity.actor_name).toBe('Ada Lovelace');
    expect(activity.type).toBe('completed');
  });

  it('marks a booking as scheduled, not completed', async () => {
    const { engine } = await run('crm_lead', 'schedule_meeting', {
      input: { subject: 'Deep dive', start_date: '2026-09-01', start_time: '09:00' },
    });
    expect((engine.inserted('sys_activity')[0] as AnyRec).type).toBe('scheduled');
  });
});

// ──────────────────── actor_name is a name, not a raw user id (#673) ──

/**
 * The timeline used to render a 32-character id where the actor's name belongs.
 *
 * The cause is upstream and worth stating precisely, because the guards below
 * only make sense against it: `@objectstack/runtime`'s REST action dispatcher —
 * the path the Console uses — builds the body's user as
 * `{ id: ec.userId, name: ec.userId, … }` (17.0.0-rc.2, `dist/index.js:5397`),
 * so `ctx.user?.name` is PRESENT and is the id. Not absent, not null: a
 * plausible-looking string that no `??` could catch. (The MCP dispatcher at
 * `dist/index.js:1776` prefers `ec.userName ?? ec.userDisplayName`, but nothing
 * in the platform populates either, so it lands on the id as well.)
 *
 * Which is exactly why the pre-existing "carries the acting user" guard above
 * stayed green through the whole bug: the harness's default user is
 * `{ id: 'usr_1', name: 'Ada Lovelace' }` — a shape the REST dispatcher never
 * produces. So these run with the REAL dispatcher shape (`name === id`) and
 * assert on the resolved value.
 */
const REST_USER_ID = 'grDEyLoIgnunJ2M7Y2muLgcuQbDUT0s2';

/** The user object the REST action dispatcher hands a body, verbatim. */
const restUser = (id: string = REST_USER_ID): AnyRec => ({
  id,
  name: id,
  email: 'admin@objectos.ai',
  roles: [],
  positions: [],
  permissions: [],
});

const withUserRow = (name = 'Dev Admin') =>
  makeSandboxEngine({ sys_user: [{ id: REST_USER_ID, name, email: 'admin@objectos.ai' }] });

/** Schedule params, so `schedule_meeting` runs on the same call as the loggers. */
const ANY_KIND_INPUT = { subject: 'Quarterly sync', start_date: '2026-09-01', start_time: '09:00' };

describe('sys_activity.actor_name is a human-readable name (#673)', () => {
  it('resolves the display name for every activity action on every target', async () => {
    for (const objectName of TARGETS) {
      for (const kind of KINDS) {
        const { engine } = await run(objectName, kind, {
          user: restUser(),
          engine: withUserRow(),
          input: ANY_KIND_INPUT,
        });
        const [activity] = engine.inserted('sys_activity') as AnyRec[];
        const where = `${objectName}:${kind}`;
        expect(activity.actor_id, where).toBe(REST_USER_ID);
        expect(activity.actor_name, where).toBe('Dev Admin');
        // The regression itself, stated as its own assertion: whatever else
        // changes, the timeline must never render the opaque id again.
        expect(activity.actor_name, where).not.toBe(REST_USER_ID);
      }
    }
  });

  it('reads sys_user once — and only because the dispatcher delivered no name', async () => {
    const { engine } = await run('crm_account', 'log_call', {
      user: restUser(),
      engine: withUserRow(),
    });
    expect(engine.callsFor('sys_user', 'find').length).toBe(1);

    // A dispatcher that DOES deliver a display name is believed as-is: the
    // lookup is a workaround, and it has to disappear on its own the day the
    // platform starts honouring `ctx.user.name`.
    const delivered = await run('crm_account', 'log_call', {
      user: { id: 'usr_1', name: 'Ada Lovelace' },
    });
    expect(delivered.engine.callsFor('sys_user', 'find').length).toBe(0);
    expect((delivered.engine.inserted('sys_activity')[0] as AnyRec).actor_name).toBe('Ada Lovelace');
  });

  it('falls back to the id rather than writing a blank actor', async () => {
    // No `sys_user` row for the caller — a deleted user, or a read the caller's
    // context is not allowed to satisfy. An opaque id is bad; an activity whose
    // actor is `null` is worse, because it is not attributable at all.
    const { engine } = await run('crm_case', 'log_meeting', { user: restUser(), input: ANY_KIND_INPUT });
    const [activity] = engine.inserted('sys_activity') as AnyRec[];
    expect(activity.actor_name).toBe(REST_USER_ID);
    expect(activity.actor_name).not.toBeNull();
  });

  it('never fails the log when the sys_user read throws', async () => {
    const sandbox = makeSandboxEngine();
    const passThrough = sandbox.engine.find;
    sandbox.engine.find = async (object: string, options: AnyRec = {}) => {
      if (object === 'sys_user') throw new Error('FORBIDDEN: no read access to sys_user');
      return passThrough(object, options);
    };
    const { engine, result } = await run('crm_contact', 'log_call', {
      user: restUser(),
      engine: sandbox,
    });
    // The interaction the rep just recorded outranks the label on it.
    expect(result.eventId).toBeTruthy();
    expect(result.activityId).toBeTruthy();
    expect((engine.inserted('sys_activity')[0] as AnyRec).actor_name).toBe(REST_USER_ID);
  });
});

// ─────────────────────────────────── the family stays a family (#514/15) ──

describe('the activity actions stay twins (#514 item 15)', () => {
  const paramsOf = (objectName: string, kind: string): AnyRec[] => action(objectName, kind).params ?? [];
  const param = (objectName: string, kind: string, name: string): AnyRec => {
    const p = paramsOf(objectName, kind).find((x) => x.name === name);
    if (!p) throw new Error(`${objectName}:${kind} declares no "${name}" param`);
    return p;
  };

  it('agrees on whether duration is required — and it is not', () => {
    // The asymmetry this pins: `duration` was required for calls and optional
    // for meetings, undocumented either way. Optional everywhere is what the
    // shared body is written for (its `duration ? … : subject` summary branch
    // is dead while the field is mandatory).
    for (const objectName of TARGETS) {
      for (const kind of KINDS) {
        expect(param(objectName, kind, 'duration').required, `${objectName}:${kind}`).toBe(false);
      }
    }
  });

  it('agrees on the shared subject / attendee / notes core', () => {
    for (const objectName of TARGETS) {
      for (const kind of KINDS) {
        expect(param(objectName, kind, 'subject').required).toBe(true);
        expect(param(objectName, kind, 'notes').required).toBe(false);
        expect(param(objectName, kind, 'attendee_contacts')).toMatchObject({
          type: 'lookup', reference: 'crm_contact', multiple: true, required: false,
        });
        expect(param(objectName, kind, 'attendee_users')).toMatchObject({
          type: 'lookup', reference: 'sys_user', multiple: true, required: false,
        });
      }
    }
  });

  it('the schedule variant is the only one that collects a start time', () => {
    for (const objectName of TARGETS) {
      const names = (kind: string) => paramsOf(objectName, kind).map((p) => p.name);
      expect(names('schedule_meeting').filter((n) => !names('log_call').includes(n)))
        .toEqual(['start_date', 'start_time', 'location']);
      expect(names('log_meeting')).toEqual(names('log_call'));
      expect(param(objectName, 'schedule_meeting', 'start_date').required).toBe(true);
      expect(param(objectName, 'schedule_meeting', 'start_time').required).toBe(true);
    }
  });

  it('shares every dispatch-level declaration except icon and labels', () => {
    for (const objectName of TARGETS) {
      const call = action(objectName, 'log_call');
      for (const kind of ['log_meeting', 'schedule_meeting']) {
        const other = action(objectName, kind);
        for (const key of ['type', 'objectName', 'refreshAfter'] as const) {
          expect(other[key], `${objectName}:${kind}.${key}`).toEqual(call[key]);
        }
        expect(other.locations).toEqual(call.locations);
        expect(other.body?.capabilities).toEqual(call.body?.capabilities);
        expect(other.body?.timeoutMs).toEqual(call.body?.timeoutMs);
      }
    }
  });

  it('emits the same rows apart from the summary prefix and the event kind', async () => {
    const input = { subject: 'Quarterly sync', duration: 30, notes: 'Agreed next steps' };
    const call = await run('crm_case', 'log_call', { input });
    const meeting = await run('crm_case', 'log_meeting', { input });

    const shape = (engine: ReturnType<typeof makeSandboxEngine>) => {
      const row = engine.inserted('sys_activity')[0] as AnyRec;
      const { summary, metadata, source_id, ...rest } = row;
      return rest;
    };
    expect(shape(meeting.engine)).toEqual(shape(call.engine));

    expect((call.engine.inserted('sys_activity')[0] as AnyRec).summary).toBe('Quarterly sync (30 min)');
    expect((meeting.engine.inserted('sys_activity')[0] as AnyRec).summary).toBe('Meeting: Quarterly sync (30 min)');
    expect((call.engine.inserted('crm_event')[0] as AnyRec).type).toBe('call');
    expect((meeting.engine.inserted('crm_event')[0] as AnyRec).type).toBe('meeting');
  });

  it('drops the duration suffix when duration is omitted', async () => {
    for (const kind of LOGGING_KINDS) {
      const { engine } = await run('crm_case', kind);
      const activity = engine.inserted('sys_activity')[0] as AnyRec;
      expect(activity.summary).not.toMatch(/min\)/);
      expect(activity.summary.endsWith('Quarterly sync')).toBe(true);
      expect(JSON.parse(activity.metadata).duration_minutes).toBe(0);
      // …and no zero-length event is written either.
      expect((engine.inserted('crm_event')[0] as AnyRec).duration_minutes).toBeUndefined();
    }
  });
});

// ────────────────────── the Console can actually submit it (objectstack#5061) ──

describe('schedule_meeting is submittable from the Console (objectstack#5061)', () => {
  /**
   * The dogfood verification of PR #670 found `schedule_meeting` unusable from
   * the UI, from BOTH entry points: `start` was declared `type: 'datetime'`,
   * which the Console renders as a zone-less `<input type="datetime-local">`
   * and POSTs raw — and the runtime's action-param validator answers 400,
   * `expected an ISO-8601 instant with explicit zone`. The renderer's output
   * shape and the validator's accepted shape did not intersect, so no user
   * input could pass. Filed upstream as objectstack-ai/objectstack#5061; the
   * app's workaround is a `date` + `time` PAIR, joined in the body.
   *
   * These run the EXACT bag the Console produces through the SAME
   * `validateActionParams` the dispatcher rejects with, and then through the
   * real QuickJS body — because a shape that passes one and not the other is
   * precisely the defect being worked around.
   */

  /** The bag the Console POSTs, verbatim: zone-less strings from native pickers. */
  const CONSOLE_BAG = {
    subject: 'Q3 roadmap review',
    start_date: '2026-08-10',
    start_time: '15:00',
    duration: 45,
    location: 'Zoom',
    attendee_contacts: ['con_1', 'con_2'],
    attendee_users: ['usr_7'],
    notes: 'Walk through the rollout plan',
  };

  /** What the dispatcher merges in on top of the submitted params. */
  const dispatchExtras = (objectName: string) => ({
    recordId: `${objectName}_1`,
    objectName,
  });

  const declaredParams = (objectName: string) =>
    (action(objectName, 'schedule_meeting').params ?? []).map((p: AnyRec) => ({
      name: p.name,
      type: p.type,
      multiple: p.multiple,
      required: p.required,
      options: p.options,
    }));

  it.each(TARGETS)('%s accepts the console-produced bag with no validation issue', (objectName) => {
    const issues = validateActionParams(
      declaredParams(objectName) as never,
      { ...CONSOLE_BAG, ...dispatchExtras(objectName) },
    );
    expect(
      issues,
      `the Console cannot submit ${objectName}:schedule_meeting:\n  ` +
        issues.map((i) => `${i.param}: ${i.message}`).join('\n  '),
    ).toEqual([]);
  });

  it('the shape this replaced is still rejected — the workaround is not decorative', () => {
    // If this ever passes, objectstack#5061 has been fixed on the platform and
    // the pair can collapse back to one `type: 'datetime'` param (see the
    // REVERT note in src/actions/global.actions.ts).
    const issues = validateActionParams(
      [{ name: 'start', type: 'datetime', required: true }],
      { start: '2026-08-10T15:00' },
    );
    expect(issues.map((i) => i.code)).toEqual(['invalid_shape']);
    expect(issues[0]!.message).toMatch(/explicit zone/);
  });

  it('a bare wall clock would not pass as a datetime either way round', () => {
    // Both halves are legal on their own declared type, and neither is a legal
    // instant — which is why the join has to happen inside the body.
    expect(validateActionParams(
      [{ name: 'start_date', type: 'date', required: true },
       { name: 'start_time', type: 'time', required: true }],
      { start_date: '2026-08-10', start_time: '15:00' },
    )).toEqual([]);
    expect(validateActionParams(
      [{ name: 'start', type: 'datetime', required: true }],
      { start: '2026-08-10' },
    )).not.toEqual([]);
  });

  it('the console bag writes a planned event at the joined UTC instant, with attendees', async () => {
    const engine = makeSandboxEngine();
    const { result } = await runActionBody(action('crm_opportunity', 'schedule_meeting'), {
      objectName: 'crm_opportunity',
      record: recordFor('crm_opportunity'),
      input: CONSOLE_BAG,
      engine,
    });

    const [event] = engine.inserted('crm_event') as AnyRec[];
    expect(event.status).toBe('planned');
    expect(event.type).toBe('meeting');
    // 15:00 is read as UTC — the only zone this body can apply deterministically
    // (the sandbox ctx carries no user/org timezone), and the one both param
    // labels state.
    expect(event.start_datetime).toBe('2026-08-10T15:00:00.000Z');
    expect(event.duration_minutes).toBe(45);
    expect(event.location).toBe('Zoom');
    expect(event.related_to_opportunity).toBe('crm_opportunity_1');

    // organiser + two contacts + one colleague, as rows (#592 acceptance)
    const attendees = engine.inserted('crm_event_attendee');
    expect(attendees).toHaveLength(4);
    expect(attendees.every((a) => a.crm_event === result.eventId)).toBe(true);
    expect(attendees.filter((a) => a.attendee_type === 'contact').map((a) => a.crm_contact).sort())
      .toEqual(['con_1', 'con_2']);
  });

  it('accepts a seconds-bearing wall clock, which the validator also allows', async () => {
    const { engine } = await run('crm_lead', 'schedule_meeting', {
      input: { subject: 'Deep dive', start_date: '2026-08-10', start_time: '15:00:30' },
    });
    expect((engine.inserted('crm_event')[0] as AnyRec).start_datetime).toBe('2026-08-10T15:00:30.000Z');
  });

  it('booking through the console still does NOT bump recency', async () => {
    // The event the console bag produces, handed to the REAL recency hook. A
    // booking that refreshed the customer's clock is how `at_risk_accounts`
    // learns to lie, and the fixed param shape must not have changed that.
    const engine = makeSandboxEngine();
    await runActionBody(action('crm_opportunity', 'schedule_meeting'), {
      objectName: 'crm_opportunity',
      record: recordFor('crm_opportunity'),
      input: CONSOLE_BAG,
      engine,
    });
    const [event] = engine.inserted('crm_event') as AnyRec[];

    const bubble = hookNamed(eventHooks, 'event_activity_bubble');
    const h = makeHarness({
      crm_account: [{ id: 'acc1' }],
      crm_opportunity: [{ id: 'crm_opportunity_1', crm_account: 'acc1' }],
    });
    await bubble.handler(makeCtx({
      event: 'afterInsert',
      input: { id: 'evt_1', ...event },
      user: { id: 'usr_1' },
      api: h.api,
    }));
    expect(h.calls, 'a booking bumped interaction recency').toHaveLength(0);
    expect(h.rows('crm_account')[0]!.last_activity_date).toBeUndefined();
  });
});
