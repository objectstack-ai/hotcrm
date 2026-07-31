// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';

/**
 * Behavioral guards for the activity-logging actions in
 * `src/actions/global.actions.ts` (issue #514, items 2 and 15).
 *
 * These EXECUTE the action bodies instead of regex-matching them. Both bugs
 * pinned here are invisible to `os validate`, to `build`, and to a structural
 * assertion over the compiled metadata: the first lived in a field read inside
 * the sandboxed body (`ctx.record?.name` on objects that have no `name`
 * column), the second in two param lists that had quietly stopped agreeing
 * with each other. A source-text assertion would have pinned the fix's
 * spelling; running the body pins its behavior.
 *
 * The harness is deliberately tiny — the bodies' only host surface is
 * `ctx.api.object(...).insert(...)`, so a recording stub covers it. This is
 * NOT a sandbox-accurate harness (the real runtime executes the source under
 * QuickJS); it is a plain `new Function` over the same source string, which is
 * enough to prove what the body computes.
 */

type AnyRec = Record<string, any>;

const stackActions: AnyRec[] = (stack as any).actions ?? [];
const stackObjects: AnyRec[] = (stack as any).objects ?? [];

/** An action by name, or a thrown error naming the miss. */
const action = (name: string): AnyRec => {
  const found = stackActions.find((a) => a.name === name);
  if (!found) throw new Error(`no ${name} action registered`);
  return found;
};

/** The two twins this file is about, always exercised as a pair. */
const TWINS = ['log_call', 'log_meeting'] as const;

type RunOpts = {
  /** Modal params the user submitted. */
  input?: AnyRec;
  /** The record the action was invoked on, as the dispatcher loaded it. */
  record?: AnyRec;
  /** The object the action was dispatched against. */
  objectName?: string;
};

type RunResult = {
  result: any;
  /** Every `ctx.api.object(o).insert(doc)` the body performed, in order. */
  inserted: { object: string; doc: AnyRec }[];
};

/**
 * Execute an action's metadata body against a recording `ctx`.
 *
 * Mirrors the runtime's action sandbox context (`buildActionSandboxContext`):
 * the body sees `input` (the submitted params, into which the dispatcher
 * merges `recordId` / `objectName`) and `ctx` (`recordId`, `record`, `object`,
 * `user`, `api`).
 */
async function runActionBody(a: AnyRec, opts: RunOpts = {}): Promise<RunResult> {
  const source: string = a.body?.source ?? '';
  if (!source) throw new Error(`action ${a.name} has no body source to run`);

  const inserted: RunResult['inserted'] = [];
  const recordId = opts.record?.id ?? null;
  const ctx = {
    recordId,
    record: opts.record,
    object: opts.objectName,
    user: { id: 'usr_1', name: 'Ada Lovelace' },
    api: {
      object: (object: string) => ({
        insert: async (doc: AnyRec) => {
          inserted.push({ object, doc });
          return { id: `${object}_1` };
        },
      }),
    },
  };
  const input = { ...(opts.input ?? {}), recordId, objectName: opts.objectName };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function('input', 'ctx', `return (async () => {${source}})();`) as (
    i: AnyRec,
    c: AnyRec,
  ) => Promise<any>;
  const result = await run(input, ctx);
  return { result, inserted };
}

/** The single `sys_activity` row an activity action is expected to write. */
async function loggedActivity(actionName: string, opts: RunOpts = {}): Promise<AnyRec> {
  const { inserted } = await runActionBody(action(actionName), opts);
  const activities = inserted.filter((i) => i.object === 'sys_activity');
  expect(activities, `${actionName} wrote ${activities.length} sys_activity rows, expected 1`).toHaveLength(1);
  return activities[0]!.doc;
}

/** Objects that declare a `nameField`, i.e. that have a resolvable display name. */
const objectsWithNameField = stackObjects.filter((o) => typeof o.nameField === 'string');

describe('activity actions stamp a real record_label (#514 item 2)', () => {
  it('the codebase still makes this worth guarding — most nameFields are not `name`', () => {
    // If this ever drops to zero the guards below become vacuous: reading
    // `record.name` would be right everywhere and the bug could not recur.
    const notName = objectsWithNameField.filter((o) => o.nameField !== 'name');
    expect(objectsWithNameField.length, 'no object declares a nameField').toBeGreaterThan(0);
    expect(
      notName.map((o) => o.name),
      'expected most objects to declare a nameField other than `name`',
    ).not.toEqual([]);
    expect(notName.length).toBeGreaterThan(objectsWithNameField.length / 2);
  });

  it.each(TWINS)('%s resolves the declared nameField on every object', async (name) => {
    const bad: string[] = [];
    for (const object of objectsWithNameField) {
      const nameField: string = object.nameField;
      const expected = `label of ${object.name}`;
      const doc = await loggedActivity(name, {
        objectName: object.name,
        // A record as the dispatcher loads it: stored columns plus the
        // materialised formula fields, of which `nameField` may be one.
        record: { id: 'rec_1', [nameField]: expected },
        input: { subject: 'Quarterly sync' },
      });
      if (doc.record_label !== expected) {
        bad.push(`${object.name}: nameField=${nameField} → record_label=${JSON.stringify(doc.record_label)}`);
      }
    }
    expect(bad, `${name} failed to resolve the display name:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it.each(TWINS)('%s labels a crm_case by display_title, the field it is scoped to', async (name) => {
    // Both actions declare objectName: 'crm_case', whose nameField is the
    // `display_title` formula — there is no `name` column on the object at
    // all, so the old hardcoded read produced null on every single dispatch.
    const doc = await loggedActivity(name, {
      objectName: 'crm_case',
      record: { id: 'case_1', display_title: 'CASE-00042 - Printer offline', subject: 'Printer offline' },
      input: { subject: 'Follow-up with customer' },
    });
    expect(doc.record_label).toBe('CASE-00042 - Printer offline');
    expect(doc.object_name).toBe('crm_case');
    expect(doc.record_id).toBe('case_1');
  });

  it.each(TWINS)('%s writes null rather than throwing when the label field is absent', async (name) => {
    const doc = await loggedActivity(name, {
      objectName: 'crm_case',
      record: { id: 'case_1' },
      input: { subject: 'Follow-up with customer' },
    });
    expect(doc.record_label).toBeNull();
  });

  it.each(TWINS)('%s survives an unknown object with no declared nameField', async (name) => {
    const doc = await loggedActivity(name, {
      objectName: 'not_a_registered_object',
      record: { id: 'x_1' },
      input: { subject: 'Follow-up' },
    });
    expect(doc.record_label).toBeNull();
  });
});

describe('log_call and log_meeting stay twins (#514 item 15)', () => {
  const paramsOf = (name: string): AnyRec[] => action(name).params ?? [];
  const param = (actionName: string, paramName: string): AnyRec => {
    const p = paramsOf(actionName).find((x) => x.name === paramName);
    if (!p) throw new Error(`${actionName} declares no "${paramName}" param`);
    return p;
  };

  it('agrees on whether duration is required — and it is not', () => {
    // The asymmetry this pins: `duration` was required for calls and optional
    // for meetings, undocumented either way. Optional on both is what the
    // shared body is written for (its `duration ? … : subject` summary branch
    // is dead while the field is mandatory).
    for (const name of TWINS) {
      expect(param(name, 'duration').required, `${name}.duration requiredness`).toBe(false);
    }
  });

  it('agrees on the shared subject/notes core', () => {
    expect(param('log_call', 'subject').required).toBe(true);
    expect(param('log_meeting', 'subject').required).toBe(true);
    expect(param('log_call', 'notes').required).toBe(false);
    expect(param('log_meeting', 'notes').required).toBe(false);
    for (const [a, b] of [
      ['log_call', 'log_meeting'],
      ['log_meeting', 'log_call'],
    ] as const) {
      expect(param(a, 'subject').type).toBe(param(b, 'subject').type);
      expect(param(a, 'notes').type).toBe(param(b, 'notes').type);
      expect(param(a, 'duration').type).toBe(param(b, 'duration').type);
    }
  });

  it('attendees is the only param the meeting adds', () => {
    const callParams = paramsOf('log_call').map((p) => p.name);
    const meetingParams = paramsOf('log_meeting').map((p) => p.name);
    expect(meetingParams.filter((p) => !callParams.includes(p))).toEqual(['attendees']);
    expect(callParams.filter((p) => !meetingParams.includes(p))).toEqual([]);
  });

  it('shares every dispatch-level declaration except icon and labels', () => {
    const call = action('log_call');
    const meeting = action('log_meeting');
    for (const key of ['type', 'objectName', 'refreshAfter'] as const) {
      expect(meeting[key], `log_meeting.${key}`).toEqual(call[key]);
    }
    expect(meeting.locations).toEqual(call.locations);
    expect(meeting.body?.capabilities).toEqual(call.body?.capabilities);
    expect(meeting.body?.timeoutMs).toEqual(call.body?.timeoutMs);
  });

  it('emits the same activity row apart from the summary prefix and metadata', async () => {
    const opts: RunOpts = {
      objectName: 'crm_case',
      record: { id: 'case_1', display_title: 'CASE-00042 - Printer offline' },
      input: { subject: 'Quarterly sync', duration: 30, notes: 'Agreed next steps' },
    };
    const call = await loggedActivity('log_call', opts);
    const meeting = await loggedActivity('log_meeting', opts);

    const shape = (doc: AnyRec) => {
      const { summary, metadata, ...rest } = doc;
      return rest;
    };
    expect(shape(meeting)).toEqual(shape(call));

    expect(call.summary).toBe('Quarterly sync (30 min)');
    expect(meeting.summary).toBe('Meeting: Quarterly sync (30 min)');

    const callMeta = JSON.parse(call.metadata);
    const meetingMeta = JSON.parse(meeting.metadata);
    expect(callMeta.kind).toBe('call');
    expect(meetingMeta.kind).toBe('meeting');
    // The shared metadata core must agree; only the per-kind extras differ.
    for (const key of ['duration_minutes', 'notes'] as const) {
      expect(meetingMeta[key], `metadata.${key}`).toEqual(callMeta[key]);
    }
    expect(callMeta.direction).toBe('outbound');
    expect(meetingMeta.attendees).toBe('');
  });

  it.each(TWINS)('%s drops the duration suffix when duration is omitted', async (name) => {
    // Reachable only because duration is optional on both — the branch this
    // asserts was dead code for log_call while the param was required.
    const doc = await loggedActivity(name, {
      objectName: 'crm_case',
      record: { id: 'case_1', display_title: 'CASE-00042 - Printer offline' },
      input: { subject: 'Quarterly sync' },
    });
    expect(doc.summary).not.toMatch(/min\)/);
    expect(doc.summary.endsWith('Quarterly sync')).toBe(true);
    expect(JSON.parse(doc.metadata).duration_minutes).toBe(0);
  });

  it.each(TWINS)('%s carries the acting user onto the activity', async (name) => {
    const doc = await loggedActivity(name, {
      objectName: 'crm_case',
      record: { id: 'case_1', display_title: 'CASE-00042 - Printer offline' },
      input: { subject: 'Quarterly sync' },
    });
    expect(doc.actor_id).toBe('usr_1');
    expect(doc.actor_name).toBe('Ada Lovelace');
    expect(doc.type).toBe('completed');
  });
});
