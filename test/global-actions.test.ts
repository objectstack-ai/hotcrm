// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { validateActionParams } from '@objectstack/spec/ui';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { ACTIVITY_TARGETS } from '../src/sales/actions/activity-actions';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * Behavioral guards for the activity actions in `src/actions/global.actions.ts`.
 *
 * These EXECUTE the action bodies instead of regex-matching them, through the
 * one door that carries the whole action contract: `@objectstack/verify`'s
 * `actions.run` over the shipped app — the dispatcher's permission gate, its
 * param validation, the subject-record load under the caller's scope, and the
 * body in the runtime's QuickJS sandbox, writing through the real engine. Real
 * people run them (a sales rep on the sales objects, a service agent on the
 * case), and everything asserted is read back off the rows the body wrote.
 * None of it is visible to `os validate`, to `build`, or to a structural
 * assertion over the compiled metadata — it lives inside a sandboxed body.
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

// ───────────────────────────────────────────── the cast and the records ──

let verify: VerifyStack;
/** The sales rep every sales-object action runs as. */
let rep: Person;
/** The service agent who works the case. */
let agent: Person;
/** A colleague named in the attendee picker. */
let colleague: Person;
/** One real record per activity target, as stored (formula fields included). */
const records: Record<string, AnyRec> = {};
/** Two contacts on the rep's account, for the attendee picker. */
const pickContacts: string[] = [];
/** Display names by user id, as the people signed up. */
const displayName: Record<string, string> = {};

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'ada@global-actions.test', {
    name: 'Ada Lovelace', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  agent = await signUpPerson(verify, 'sam@global-actions.test', {
    name: 'Sam Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
  colleague = await signUpPerson(verify, 'grace@global-actions.test', { name: 'Grace Hopper' });
  Object.assign(displayName, { [rep.id]: 'Ada Lovelace', [agent.id]: 'Sam Agent' });

  const create = async (object: string, doc: AnyRec, who: Person = rep) =>
    verify.hooks.run(object, 'insert', doc, { as: who.token });
  const account = await create('crm_account', { name: 'Activity Co' });
  const contact = await create('crm_contact', {
    first_name: 'Cora', last_name: 'Contact', email: 'cora@activity.test', crm_account: account.id,
  });
  for (const [first, email] of [['Con', 'con1@activity.test'], ['Cole', 'con2@activity.test']]) {
    pickContacts.push(String((await create('crm_contact', {
      first_name: first, last_name: 'Picked', email, crm_account: account.id,
    })).id));
  }
  const lead = await create('crm_lead', {
    first_name: 'Lena', last_name: 'Lead', company: 'Activity Co', email: 'lena@activity.test',
  });
  const opp = await create('crm_opportunity', {
    name: 'Activity Expansion', crm_account: account.id, stage: 'prospecting', amount: 50000, close_date: '2030-06-30',
  });
  const kase = await create('crm_case', {
    subject: 'Activity follow-up', description: 'The customer asked for a call.', crm_account: account.id,
  }, agent);
  for (const [object, row] of Object.entries({
    crm_account: account, crm_contact: contact, crm_lead: lead, crm_opportunity: opp, crm_case: kase,
  })) {
    records[object] = (await verify.rows(object, { id: row.id }))[0]!;
  }
}, 180_000);

/** Who runs an activity action on `objectName`: the agent on the case, the rep elsewhere. */
const actorFor = (objectName: string): Person => (objectName === 'crm_case' ? agent : rep);

/**
 * Run one activity action through the real action door and read back what the
 * body wrote: the event, its attendee rows, and the timeline row.
 */
async function run(objectName: string, kind: string, opts: { input?: AnyRec; as?: Person } = {}) {
  const who = opts.as ?? actorFor(objectName);
  const result = await verify.actions.run(objectName, kind, {
    as: who.token,
    recordId: records[objectName]!.id,
    params: { subject: 'Quarterly sync', ...(opts.input ?? {}) },
  }) as AnyRec;
  const [event] = await verify.rows('crm_event', { id: result.eventId });
  const attendees = await verify.rows('crm_event_attendee', { crm_event: result.eventId });
  const [activity] = await verify.rows('sys_activity', { id: result.activityId });
  return { result, event: event!, attendees, activity: activity!, who };
}

/**
 * Watch — and optionally fault — the reads the action BODY makes, on the real
 * engine. Everything the route does before the body (resolving the caller,
 * loading the subject record under their scope) happens before that subject
 * load returns, so only engine reads issued after it are the body's. Measured
 * on 17.7.0: a `log_call` makes exactly one such `sys_user` read, at system
 * context, before its first write.
 */
async function watchBodyReads(
  objectName: string,
  body: () => Promise<unknown>,
  fault?: (object: string) => (() => Promise<unknown>) | undefined,
) {
  const ql = verify.kernel.getService<AnyRec>('objectql');
  const realFind = ql.find.bind(ql);
  const realFindOne = ql.findOne.bind(ql);
  let subjectLoaded = false;
  const bodyReads: string[] = [];
  const findOne = vi.spyOn(ql, 'findOne').mockImplementation((async (object: string, ...rest: unknown[]) => {
    const row = await realFindOne(object, ...rest);
    if (object === objectName) subjectLoaded = true;
    return row;
  }) as never);
  const find = vi.spyOn(ql, 'find').mockImplementation((async (object: string, ...rest: unknown[]) => {
    if (subjectLoaded) {
      bodyReads.push(object);
      const injected = fault?.(object);
      if (injected) return injected();
    }
    return realFind(object, ...rest);
  }) as never);
  try {
    const out = await body();
    return { out, bodyReads };
  } finally {
    find.mockRestore();
    findOne.mockRestore();
  }
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
    const { attendees, result } = await run('crm_opportunity', 'log_meeting', {
      input: {
        subject: 'Kickoff',
        attendee_contacts: pickContacts,
        attendee_users: [colleague.id],
      },
    });

    // organiser + two contacts + one colleague
    expect(attendees).toHaveLength(4);
    expect(attendees.every((a) => a.crm_event === result.eventId)).toBe(true);

    const organiser = attendees.find((a) => a.is_organizer === true);
    expect(organiser, 'the acting user is always the organiser').toMatchObject({
      attendee_type: 'user', sys_user: rep.id, response: 'accepted',
    });
    expect(attendees.filter((a) => a.attendee_type === 'contact').map((a) => a.crm_contact).sort())
      .toEqual([...pickContacts].sort());
    expect(attendees.find((a) => a.sys_user === colleague.id)).toMatchObject({ attendee_type: 'user' });
    // Every row is stamped, so "who was invited when" is answerable.
    expect(attendees.every((a) => typeof a.invited_date === 'string')).toBe(true);
  });

  it('a single picked contact lands as an attendee — and the dispatcher wants it as a list', async () => {
    // The body tolerates a bare value where it expects a list, for a Console
    // that renders the lookup unmultiplied. Through the real door that shape
    // never reaches it: the dispatcher's ADR-0104 param contract refuses a
    // string for a `multiple: true` lookup before any body runs. The one-person
    // pick that does reach the body is a one-element list.
    await expect(run('crm_account', 'log_meeting', {
      input: { subject: 'Review', attendee_contacts: pickContacts[1] },
    })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });

    const { attendees } = await run('crm_account', 'log_meeting', {
      input: { subject: 'Review', attendee_contacts: [pickContacts[1]] },
    });
    expect(attendees.some((a) => a.crm_contact === pickContacts[1])).toBe(true);
  });

  it('adds the record itself when it IS a person', async () => {
    for (const [objectName, type, field] of [
      ['crm_contact', 'contact', 'crm_contact'],
      ['crm_lead', 'lead', 'crm_lead'],
    ] as const) {
      const { attendees } = await run(objectName, 'log_call');
      const self = attendees.find((a) => a.attendee_type === type);
      expect(self, `${objectName} did not attend its own call`).toBeTruthy();
      expect(self![field]).toBe(records[objectName]!.id);
    }
  });

  it('invents no attendee for a company, a deal or a ticket', async () => {
    // An account is not a person. The event's `related_to_*` link already
    // records what the call was about; a fabricated attendee row would be a
    // record asserting somebody was in the room.
    for (const objectName of ['crm_account', 'crm_opportunity', 'crm_case']) {
      const { attendees } = await run(objectName, 'log_call');
      expect(attendees, `${objectName} invented attendees`).toHaveLength(1);
      expect(attendees[0]!.is_organizer).toBe(true);
    }
  });

  it('does not write the same person twice', async () => {
    const { attendees } = await run('crm_contact', 'log_meeting', {
      // The contact the action fired from, named AGAIN in the picker, plus the
      // acting user naming themselves.
      input: { subject: 'Sync', attendee_contacts: [records.crm_contact!.id], attendee_users: [rep.id] },
    });
    expect(attendees).toHaveLength(2);
  });
});

// ─────────────────────────────────────────── the event row itself ──

describe('every activity action writes a real crm_event', () => {
  it.each(TARGETS)('%s links the event back to the record it fired from', async (objectName) => {
    const { event, who } = await run(objectName, 'log_call', { input: { subject: 'Intro', duration: 15 } });
    expect(event, `${objectName} wrote no crm_event`).toBeTruthy();
    expect(event.related_to_type).toBe(objectName);
    expect(event[ACTIVITY_TARGETS[objectName]!]).toBe(records[objectName]!.id);
    expect(event.owner_id).toBe(who.id);
    expect(event.duration_minutes).toBe(15);
    expect(event.start_datetime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('a logged call is `held`; a scheduled meeting is `planned`', async () => {
    const logged = (await run('crm_opportunity', 'log_call')).event;
    expect(logged.status).toBe('held');
    expect(logged.type).toBe('call');

    const booked = (await run('crm_opportunity', 'schedule_meeting', {
      input: { subject: 'Deep dive', start_date: '2026-09-01', start_time: '09:00', location: 'Zoom' },
    })).event;
    // The distinction the whole churn signal rests on: a booking must not reset
    // the customer's recency clock (`event.hook.ts` gates its bubble on `held`).
    expect(booked.status).toBe('planned');
    expect(booked.type).toBe('meeting');
    expect(booked.start_datetime).toBe('2026-09-01T09:00:00.000Z');
    expect(booked.location).toBe('Zoom');
  });

  it('never writes a NaN start for an unparseable date — the dispatcher refuses it first', async () => {
    // The body carries a fall-back-to-now branch for a start it cannot parse.
    // Through the real door that input never reaches it: `start_date` is a
    // declared `date` param, and the dispatcher's ADR-0104 param contract
    // refuses a non-date with the route's own envelope before any body runs —
    // so no event, NaN or otherwise, is written.
    const before = (await verify.rows('crm_event', { related_to_lead: records.crm_lead!.id })).length;
    await expect(run('crm_lead', 'schedule_meeting', {
      input: { subject: 'Deep dive', start_date: 'next tuesday-ish', start_time: '09:00' },
    })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect((await verify.rows('crm_event', { related_to_lead: records.crm_lead!.id })).length).toBe(before);
  });

  it('the timeline row points at the event (ADR-0052), not at a blob', async () => {
    const { activity, attendees, result } = await run('crm_account', 'log_meeting', {
      input: { subject: 'QBR', duration: 45, notes: 'Renewal discussed' },
    });
    expect(activity.source_object).toBe('crm_event');
    expect(activity.source_id).toBe(result.eventId);
    const meta = JSON.parse(activity.metadata);
    expect(meta.kind).toBe('meeting');
    expect(meta.duration_minutes).toBe(45);
    expect(meta.notes).toBe('Renewal discussed');
    // A COUNT is a display hint; the attendees themselves are rows.
    expect(meta.attendee_count).toBe(attendees.length);
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
      const { activity } = await run(objectName, kind, {
        input: inputFor(kind),
      });
      const label = records[objectName]![nameField!];
      expect(label, `${objectName}.${nameField} is empty on the stored record — this case proves nothing`).toBeTruthy();
      expect(activity.record_label, `${objectName}:${kind}`).toBe(label);
      expect(activity.object_name).toBe(objectName);
      expect(activity.record_id).toBe(records[objectName]!.id);
    }
  });

  it('writes null rather than throwing when the label field is absent', async () => {
    // Every target's nameField is populated on a stored row (the case's is a
    // formula over its number and subject), so the absent-label input is made
    // the one way the route can hand it over: the subject record arriving
    // without that field. Injected into the real engine's subject load, and
    // nowhere else.
    const ql = verify.kernel.getService<AnyRec>('objectql');
    const realFindOne = ql.findOne.bind(ql);
    const nameField = objectByName.get('crm_case')!.nameField as string;
    const load = vi.spyOn(ql, 'findOne').mockImplementation((async (object: string, ...rest: unknown[]) => {
      const row = await realFindOne(object, ...rest);
      if (object !== 'crm_case' || !row) return row;
      const { [nameField]: _dropped, ...withoutLabel } = row as AnyRec;
      return withoutLabel;
    }) as never);
    try {
      const { result, activity } = await run('crm_case', 'log_call', { input: { subject: 'Follow-up with customer' } });
      expect(result.activityId).toBeTruthy();
      expect(activity.record_label).toBeNull();
    } finally {
      load.mockRestore();
    }
  });

  it('carries the acting user onto the activity', async () => {
    const { activity } = await run('crm_lead', 'log_call');
    expect(activity.actor_id).toBe(rep.id);
    expect(activity.actor_name).toBe('Ada Lovelace');
    expect(activity.type).toBe('completed');
  });

  it('marks a booking as scheduled, not completed', async () => {
    const { activity } = await run('crm_lead', 'schedule_meeting', {
      input: { subject: 'Deep dive', start_date: '2026-09-01', start_time: '09:00' },
    });
    expect(activity.type).toBe('scheduled');
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
 * Which is exactly why a guard written against a hand-built user
 * (`{ id, name: 'Ada Lovelace' }`) stayed green through the whole bug: that is
 * a shape the REST dispatcher never produces. These run through the REAL
 * dispatcher (`actions.run`), which on 17.7.0 still hands the body the id as
 * the name — measured: the body issues its `sys_user` read on every action —
 * and assert on the resolved value.
 */

/**
 * The params each kind takes. The real dispatcher refuses a param the action
 * does not declare, so the schedule-only start pair goes to `schedule_meeting`
 * alone.
 */
const inputFor = (kind: string): AnyRec =>
  kind === 'schedule_meeting' ? { subject: 'Quarterly sync', start_date: '2026-09-01', start_time: '09:00' } : {};

describe('sys_activity.actor_name is a human-readable name (#673)', () => {
  it('resolves the display name for every activity action on every target', async () => {
    for (const objectName of TARGETS) {
      for (const kind of KINDS) {
        const { activity, who } = await run(objectName, kind, { input: inputFor(kind) });
        const where = `${objectName}:${kind}`;
        expect(activity.actor_id, where).toBe(who.id);
        expect(activity.actor_name, where).toBe(displayName[who.id]);
        // The regression itself, stated as its own assertion: whatever else
        // changes, the timeline must never render the opaque id again.
        expect(activity.actor_name, where).not.toBe(who.id);
      }
    }
  });

  it('reads sys_user once — and only because the dispatcher delivered no name', async () => {
    // The lookup is a workaround, and it has to disappear on its own the day
    // the platform starts honouring `ctx.user.name`: the body believes a
    // delivered display name as-is. On 17.7.0 the real dispatcher still
    // delivers the id, so the body reads `sys_user` exactly once per action —
    // the day this reads 0 with the name still right, the dispatcher has been
    // fixed upstream and the workaround can go.
    const { out, bodyReads } = await watchBodyReads('crm_account', () => run('crm_account', 'log_call'));
    expect(bodyReads.filter((o) => o === 'sys_user'), 'the body did not read sys_user once').toHaveLength(1);
    expect((out as Awaited<ReturnType<typeof run>>).activity.actor_name).toBe('Ada Lovelace');
  });

  it('falls back to the id rather than writing a blank actor', async () => {
    // No `sys_user` row for the caller — a deleted user, or a read the caller's
    // context is not allowed to satisfy. An opaque id is bad; an activity whose
    // actor is `null` is worse, because it is not attributable at all. The empty
    // read is injected into the real engine, for the body's read only.
    const { out } = await watchBodyReads(
      'crm_case',
      () => run('crm_case', 'log_meeting'),
      (object) => (object === 'sys_user' ? async () => [] : undefined),
    );
    const { activity } = out as Awaited<ReturnType<typeof run>>;
    expect(activity.actor_name).toBe(agent.id);
    expect(activity.actor_name).not.toBeNull();
  });

  it('never fails the log when the sys_user read throws', async () => {
    const { out } = await watchBodyReads(
      'crm_contact',
      () => run('crm_contact', 'log_call'),
      (object) => (object === 'sys_user'
        ? async () => { throw new Error('FORBIDDEN: no read access to sys_user'); }
        : undefined),
    );
    const { result, activity } = out as Awaited<ReturnType<typeof run>>;
    // The interaction the rep just recorded outranks the label on it.
    expect(result.eventId).toBeTruthy();
    expect(result.activityId).toBeTruthy();
    expect(activity.actor_name).toBe(rep.id);
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

    // A stored row also carries its own identity and clock (`id`, the audit
    // stamps, `timestamp`); those differ between any two rows and say nothing
    // about the twins.
    const shape = (row: AnyRec) => {
      const { summary, metadata, source_id, id, created_at, updated_at, timestamp, ...rest } = row;
      return rest;
    };
    expect(shape(meeting.activity)).toEqual(shape(call.activity));

    expect(call.activity.summary).toBe('Quarterly sync (30 min)');
    expect(meeting.activity.summary).toBe('Meeting: Quarterly sync (30 min)');
    expect(call.event.type).toBe('call');
    expect(meeting.event.type).toBe('meeting');
  });

  it('drops the duration suffix when duration is omitted', async () => {
    for (const kind of LOGGING_KINDS) {
      const { activity, event } = await run('crm_case', kind);
      expect(activity.summary).not.toMatch(/min\)/);
      expect(activity.summary.endsWith('Quarterly sync')).toBe(true);
      expect(JSON.parse(activity.metadata).duration_minutes).toBe(0);
      // …and no zero-length event is written either.
      expect(event.duration_minutes ?? null).toBeNull();
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
   * real action door — dispatcher validation and body together — because a
   * shape that passes one and not the other is precisely the defect being
   * worked around.
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

  /** The Console bag, its picker ids pointing at real people. */
  const consoleBag = () => ({ ...CONSOLE_BAG, attendee_contacts: pickContacts, attendee_users: [colleague.id] });

  it('the console bag writes a planned event at the joined UTC instant, with attendees', async () => {
    const { result, event, attendees } = await run('crm_opportunity', 'schedule_meeting', { input: consoleBag() });

    expect(event.status).toBe('planned');
    expect(event.type).toBe('meeting');
    // 15:00 is read as UTC — the only zone this body can apply deterministically
    // (the sandbox ctx carries no user/org timezone), and the one both param
    // labels state.
    expect(event.start_datetime).toBe('2026-08-10T15:00:00.000Z');
    expect(event.duration_minutes).toBe(45);
    expect(event.location).toBe('Zoom');
    expect(event.related_to_opportunity).toBe(records.crm_opportunity!.id);

    // organiser + two contacts + one colleague, as rows (#592 acceptance)
    expect(attendees).toHaveLength(4);
    expect(attendees.every((a) => a.crm_event === result.eventId)).toBe(true);
    expect(attendees.filter((a) => a.attendee_type === 'contact').map((a) => a.crm_contact).sort())
      .toEqual([...pickContacts].sort());
  });

  it('accepts a seconds-bearing wall clock, which the validator also allows', async () => {
    const { event } = await run('crm_lead', 'schedule_meeting', {
      input: { subject: 'Deep dive', start_date: '2026-08-10', start_time: '15:00:30' },
    });
    expect(event.start_datetime).toBe('2026-08-10T15:00:30.000Z');
  });

  it('booking through the console still does NOT bump recency', async () => {
    // The event the console bag produces, through the REAL recency hook
    // (`event_activity_bubble`, which runs on the event write). A booking that
    // refreshed the customer's clock is how `at_risk_accounts` learns to lie,
    // and the fixed param shape must not have changed that.
    //
    // Two fresh accounts, so neither carries a clock from an earlier case: the
    // booking lands on one, and a LOGGED call — which must bump — on the other.
    // The bubble is `async`, so the logged call is the control that the hook
    // has had its chance to run: once its account moves, the booked one is read.
    const deal = async (name: string) => {
      const account = await verify.hooks.run('crm_account', 'insert', { name }, { as: rep.token });
      const opp = await verify.hooks.run('crm_opportunity', 'insert', {
        name: `${name} deal`, crm_account: account.id, stage: 'prospecting', amount: 1000, close_date: '2030-06-30',
      }, { as: rep.token });
      return { account: String(account.id), opp: String(opp.id) };
    };
    const booked = await deal('Booked Recency Co');
    const logged = await deal('Logged Recency Co');
    const lastActivity = async (account: string) =>
      (await verify.rows('crm_account', { id: account }))[0]?.last_activity_date ?? null;
    expect(await lastActivity(booked.account), 'the fresh account already carries a clock').toBeNull();

    await verify.actions.run('crm_opportunity', 'schedule_meeting', { as: rep.token, recordId: booked.opp, params: consoleBag() });
    await verify.actions.run('crm_opportunity', 'log_call', {
      as: rep.token, recordId: logged.opp, params: { subject: 'Real call' },
    });
    await vi.waitFor(async () => {
      expect(await lastActivity(logged.account), 'a logged call did not bump recency — the control is dead').not.toBeNull();
    }, { timeout: 10_000, interval: 50 });

    expect(await lastActivity(booked.account), 'a booking bumped interaction recency').toBeNull();
  });
});
