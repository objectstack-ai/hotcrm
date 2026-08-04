// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import { makeSandboxEngine, runActionBody, type Rec } from './helpers/action-sandbox';

/**
 * `crm_case.first_response_date` finally has a writer (#575 B2).
 *
 * It was the only member of the case SLA family without one. `sla_due_date` and
 * `resolution_time_hours` are stamped by `case.hook`, `is_sla_violated` by the
 * `case_sla_monitor` flow — and first response, the most standard SLA metric a
 * service desk reports, was permanently null while the field, its four
 * translations and its place on the case detail page all advertised otherwise.
 *
 * The writer is the shared `logActivityAction` body in
 * `src/actions/global.actions.ts`: the first `sys_activity` on a case is the
 * first record that the customer heard back from anyone. An earlier proposal —
 * stamp when the status first leaves `new` — was rejected and is worth stating
 * as a non-goal: an agent can move a case to "in progress" and investigate for
 * an hour while the customer hears nothing, so a status-derived number would
 * report a response that never happened.
 *
 * These run the SHIPPED body under the real QuickJS sandbox rather than the
 * handler-as-JS shortcut, because two of the things that can break this stamp
 * only exist there: the `api.read` capability the new lookup needs, and the
 * engine facade's `update(data, options)` signature (`mass_update_stage` is the
 * action in this repo that got that wrong and silently never wrote).
 */

type AnyRec = Record<string, any>;

const stackActions: AnyRec[] = (stack as any).actions ?? [];

/**
 * An action addressed the way the runtime keys its registry —
 * `<objectName>:<name>`.
 *
 * Since #592 five objects each register their own `log_call`, so a bare-name
 * lookup returns whichever one the barrel happens to export first. That is not
 * a detail to leave to export order in a file about which object gets stamped.
 */
const action = (objectName: string, name: string): AnyRec => {
  const found = stackActions.find((a) => a.objectName === objectName && a.name === name);
  if (!found) throw new Error(`no ${objectName}-scoped ${name} action registered`);
  return found;
};

const objects: AnyRec[] = (stack as any).objects ?? [];
const crmCase = objects.find((o) => o.name === 'crm_case') as AnyRec | undefined;

/** Both LOGGING twins are built by the same constructor — both must stamp. */
const TWINS = ['log_call', 'log_meeting'] as const;

const seeded = (first_response_date: string | null = null): Record<string, Rec[]> => ({
  crm_case: [{ id: 'case_1', subject: 'Login issues', status: 'new', first_response_date }],
});

const logOn = (name: string, engine: ReturnType<typeof makeSandboxEngine>, record: Rec = { id: 'case_1' }) =>
  runActionBody(action('crm_case', name), {
    objectName: 'crm_case',
    record,
    input: { subject: 'Called the customer back', duration: 12 },
    engine,
  });

describe('the field is writable at all', () => {
  it('crm_case.first_response_date is not readonly', () => {
    // 16.x drops writes to readonly fields on user-context writes (#2948), and
    // an action body runs as the acting user — so `readonly: true` here would
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

describe.each(TWINS)('%s stamps the first response', (name) => {
  it('declares the read capability the lookup needs', () => {
    // Without it the sandbox denies the `find` at call time and the whole
    // action fails — the capability list is load-bearing metadata, not prose.
    expect(action('crm_case', name).body?.capabilities).toContain('api.read');
    expect(action('crm_case', name).body?.capabilities).toContain('api.write');
  });

  it('writes the current time onto a case that has none', async () => {
    const before = Date.now();
    const engine = makeSandboxEngine(seeded());
    const { result } = await logOn(name, engine);

    expect(result.activityId, 'the activity itself must still be written').toBeTruthy();
    const stamped = engine.rows('crm_case')[0]!.first_response_date as string;
    expect(stamped).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(stamped).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(stamped).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('uses the (data, options) update shape the engine facade requires', async () => {
    const engine = makeSandboxEngine(seeded());
    await logOn(name, engine);
    const [call] = engine.callsFor('crm_case', 'update');
    expect(call!.args[0]).toMatchObject({ id: 'case_1' });
    expect(call!.args[1]).toEqual({ where: { id: 'case_1' } });
  });

  it('never moves a stamp that is already there', async () => {
    const engine = makeSandboxEngine(seeded('2026-01-01T09:00:00.000Z'));
    await logOn(name, engine);
    expect(engine.rows('crm_case')[0]!.first_response_date).toBe('2026-01-01T09:00:00.000Z');
    expect(engine.callsFor('crm_case', 'update'), 'a second write would make it "last response"').toHaveLength(0);
  });

  it('leaves other objects alone', async () => {
    // #592 put the same body on five objects. The lead-scoped twin must not
    // reach for a case field that only exists on `crm_case` — the object check
    // inside the body is what stops the stamp travelling with the family.
    const engine = makeSandboxEngine({ crm_lead: [{ id: 'lead_1' }] });
    await runActionBody(action('crm_lead', name), {
      objectName: 'crm_lead',
      record: { id: 'lead_1' },
      input: { subject: 'Intro call' },
      engine,
    });
    expect(engine.callsFor('crm_case')).toHaveLength(0);
  });

  it('is not stamped by merely BOOKING a meeting', async () => {
    // `schedule_meeting` writes a `planned` event. A meeting on next week's
    // calendar is not a response the customer has received, so it must not
    // start the SLA clock — the same `held` gate the recency bubble uses.
    const engine = makeSandboxEngine(seeded());
    await runActionBody(action('crm_case', 'schedule_meeting'), {
      objectName: 'crm_case',
      record: { id: 'case_1' },
      input: { subject: 'Follow-up', start_date: '2026-09-01', start_time: '09:00' },
      engine,
    });
    expect(engine.rows('crm_case')[0]!.first_response_date).toBeNull();
    expect(engine.callsFor('crm_case', 'update')).toHaveLength(0);
  });
});

describe('the stamp survives the ways a case reaches the body', () => {
  it('is written once across BOTH twins on the same case', async () => {
    // One case, a call and then a meeting: "first response" is a property of
    // the case, not of either action, so the second must find the first.
    const engine = makeSandboxEngine(seeded());
    await logOn('log_call', engine);
    const first = engine.rows('crm_case')[0]!.first_response_date;
    await logOn('log_meeting', engine);
    expect(engine.rows('crm_case')[0]!.first_response_date).toBe(first);
    expect(engine.callsFor('crm_case', 'update')).toHaveLength(1);
  });

  it('reads the stored row, not the record the dispatcher handed it', async () => {
    // `list_item` / `record_related` dispatch can hand the body a PROJECTED
    // record. If the body trusted `ctx.record.first_response_date`, a
    // projection that omits the field would read as blank and re-stamp on
    // every single log — which is precisely the metric being wrong.
    const engine = makeSandboxEngine(seeded('2026-01-01T09:00:00.000Z'));
    await logOn('log_call', engine, { id: 'case_1', display_title: 'CASE-0001' });
    expect(engine.rows('crm_case')[0]!.first_response_date).toBe('2026-01-01T09:00:00.000Z');
    expect(engine.callsFor('crm_case', 'update')).toHaveLength(0);
  });

  it('still logs the activity when the case row cannot be read', async () => {
    // A read that comes back empty must not cost the user their activity entry
    // — the timeline write is the action's actual job.
    const engine = makeSandboxEngine();
    const { result } = await logOn('log_call', engine);
    expect(result.activityId).toBeTruthy();
    expect(engine.rows('sys_activity')).toHaveLength(1);
  });
});
