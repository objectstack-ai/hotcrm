// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import stack, { type AnyRec } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { QualifyLeadAction } from '../src/sales/actions/lead.actions';

/**
 * The lead's status, and the status bars of the lead, opportunity and case
 * pages (the leads bundle).
 *
 * - #2540 (ruled A): the first logged call, meeting or email moves a New lead
 *   to Contacted; later contacts change nothing, and any other status is left
 *   alone.
 * - #2541 (ruled A by the maintainer): Qualify Lead asks for Need Type and
 *   Estimated Amount; every other path to Qualified is refused while either is
 *   empty. No BANT fields.
 * - #2542 (ruled A): the three status bars move a record by a click, and every
 *   refusal still applies to the click (it is the same PATCH the edit form
 *   sends).
 * - #2591 (ruled A): the opportunity's approval-request fields are hidden while
 *   the approval gate they belong to is off.
 */

type Rec = Record<string, any>;

const pages: AnyRec[] = (stack as AnyRec).pages ?? [];
const objects: AnyRec[] = (stack as AnyRec).objects ?? [];

let verify: VerifyStack;
let rep: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@lead-status-path.test', {
    name: 'Status Path Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const as = () => ({ as: rep.token });
const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_lead', { id }))[0]!;
const refusal = (write: Promise<unknown>): Promise<Rec | null> => write.then(() => null, (e: Rec) => e);

/** The rep's own lead at `status`, written through the engine as the rep. */
const leadAt = (status: string, over: Rec = {}): Promise<Rec> => {
  const n = ++k;
  return verify.hooks.run('crm_lead', 'insert', {
    first_name: 'Lee', last_name: `Path ${n}`, company: `Path Co ${n}`, email: `lee${n}@lead-status-path.test`,
    status, ...over,
  }, as());
};

const QUALIFIED = { need_type: 'new_implementation', estimated_amount: 40_000 };

// ───────────────────────────────────────────────────────────── #2540 ──

describe('the first logged contact moves a New lead to Contacted (#2540)', () => {
  const logCall = (leadId: string) => verify.hooks.run('crm_event', 'insert', {
    subject: `Intro call ${++k}`, type: 'call', status: 'held', start_datetime: '2026-08-04T09:00:00.000Z',
    related_to_lead: leadId,
  }, as());

  const contacted = (id: string) => vi.waitFor(async () => {
    const row = await stored(id);
    expect(row.last_contacted_date, 'the contact was never stamped').toBeTruthy();
    return row;
  }, { timeout: 10_000, interval: 50 });

  it('a held call on a New lead makes it Contacted', async () => {
    const lead = await leadAt('new');
    await logCall(lead.id);
    expect((await contacted(lead.id)).status).toBe('contacted');
  });

  it('a completed task (a logged email) does the same', async () => {
    const lead = await leadAt('new');
    const task = await verify.hooks.run('crm_task', 'insert', {
      subject: `Sent the deck ${++k}`, status: 'in_progress', related_to_lead: lead.id,
    }, as());
    await verify.hooks.run('crm_task', 'update', { id: task.id, status: 'completed' }, as());
    expect((await contacted(lead.id)).status).toBe('contacted');
  });

  it('a later contact changes nothing, and Qualified and Unqualified are left alone', async () => {
    const already = await leadAt('new');
    await logCall(already.id);
    await contacted(already.id);
    await logCall(already.id);

    const qualified = await leadAt('qualified', QUALIFIED);
    const unqualified = await leadAt('unqualified', { disqualification_reason: 'no_budget' });
    await logCall(qualified.id);
    await logCall(unqualified.id);

    expect((await contacted(already.id)).status).toBe('contacted');
    expect((await contacted(qualified.id)).status).toBe('qualified');
    expect((await contacted(unqualified.id)).status).toBe('unqualified');
  });

  it('a write that sets the status itself keeps the status it set', async () => {
    const lead = await leadAt('new');
    await verify.hooks.run('crm_lead', 'update', {
      id: lead.id, status: 'unqualified', disqualification_reason: 'no_budget', last_contacted_date: new Date().toISOString(),
    }, as());
    expect((await stored(lead.id)).status).toBe('unqualified');
  });
});

// ───────────────────────────────────────────────────────────── #2541 ──

describe('Qualified needs a Need Type and an Estimated Amount (#2541)', () => {
  it('Qualify Lead asks for both, required, and writes Qualified', () => {
    expect(QualifyLeadAction).toMatchObject({
      objectName: 'crm_lead', operation: 'update', patch: { status: 'qualified' },
      params: [{ field: 'need_type', required: true }, { field: 'estimated_amount', required: true }],
    });
  });

  // #2754: a lead that already holds a Need Type or an Estimated Amount opens
  // the dialog with it filled in. Without this the rep retypes what the lead
  // already says.
  it('Qualify Lead opens with the values the lead already holds', () => {
    const params = (QualifyLeadAction.params ?? []) as Rec[];
    expect(params.map((p) => [p.field, p.defaultFromRow])).toEqual([
      ['need_type', true], ['estimated_amount', true],
    ]);
  });

  it('is offered on an open New or Contacted lead only', () => {
    const offered = (record: Rec) => {
      const r = ExpressionEngine.evaluate<boolean>(QualifyLeadAction.visible as never, { record } as never);
      expect(r.ok, JSON.stringify(r)).toBe(true);
      return (r as Rec).value === true;
    };
    expect(offered({ is_converted: false, status: 'new' })).toBe(true);
    expect(offered({ is_converted: false, status: 'contacted' })).toBe(true);
    for (const status of ['qualified', 'unqualified', 'converted']) {
      expect(offered({ is_converted: false, status }), status).toBe(false);
    }
    expect(offered({ is_converted: true, status: 'contacted' })).toBe(false);
  });

  it('the button refuses a submit missing either value, and qualifies with both', async () => {
    const lead = await leadAt('contacted');
    const run = (params: Rec) => verify.actions.run('crm_lead', 'qualify_lead', { as: rep.token, recordId: lead.id, params });

    expect(await refusal(run({})), 'qualified with neither value').not.toBeNull();
    expect(await refusal(run({ need_type: 'replacement' })), 'qualified without an amount').not.toBeNull();
    expect((await stored(lead.id)).status).toBe('contacted');

    expect(await refusal(run({ need_type: 'replacement', estimated_amount: 55_000 }))).toBeNull();
    expect(await stored(lead.id)).toMatchObject({ status: 'qualified', need_type: 'replacement', estimated_amount: 55_000 });
  });

  it('every other path to Qualified is refused while either is empty', async () => {
    const lead = await leadAt('contacted');
    for (const half of [{}, { need_type: 'replacement' }, { estimated_amount: 10_000 }]) {
      const err = await refusal(verify.hooks.run('crm_lead', 'update', { id: lead.id, status: 'qualified', ...half }, as()));
      expect(err?.code, `qualified with ${JSON.stringify(half)}`).toBe('VALIDATION_FAILED');
    }
    expect(await refusal(leadAt('qualified')), 'created as Qualified with neither value').not.toBeNull();
    expect((await stored(lead.id)).status).toBe('contacted');

    expect(await refusal(verify.hooks.run('crm_lead', 'update', { id: lead.id, status: 'qualified', ...QUALIFIED }, as()))).toBeNull();
    expect((await stored(lead.id)).status).toBe('qualified');
  });

  it('judges the move into Qualified only: an already qualified lead stays editable', async () => {
    // A lead qualified before the rule (or cleared since) is not locked out of
    // every later edit; the rule judges the transition, as `lead_status_progression` does.
    const lead = await leadAt('qualified', QUALIFIED);
    expect(await refusal(verify.hooks.run('crm_lead', 'update', { id: lead.id, need_type: null, description: 'Re-scoped.' }, as()))).toBeNull();
    expect((await stored(lead.id)).status).toBe('qualified');
  });

  it('is not offered to the assistant', () => {
    expect((QualifyLeadAction as Rec).ai?.exposed ?? false).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────── #2542 ──

describe('the status bars move a record by a click (#2542)', () => {
  // The status path is the default strip's, which turns click-to-advance on
  // for every object (objectstack#30075, ruled A) and draws it on the object's
  // stage field. None of the three objects authors a record page any more:
  // the opportunity's went with #2686, the lead's and the case's with #2740
  // (their banners were the last authored pieces), which leaves the default
  // strip in place by construction. So the pin is that no record page for
  // them comes back, and that the stage field is the one the path is drawn on.
  it.each([
    ['crm_lead', 'status'],
    ['crm_opportunity', 'stage'],
    ['crm_case', 'status'],
  ] as Array<[string, string]>)('the default path on %s.%s allows a stage click', (object, field) => {
    expect(pages.filter((p) => p.type === 'record' && p.object === object).map((p) => p.name), `${object} authors a record page`).toEqual([]);
    const def = objects.find((o) => o.name === object)!;
    expect(def.stageField ?? field).toBe(field);
    expect(def.fields?.[field]?.type, `${object}.${field} is not a select`).toBe('select');
    // The default page picks `status` before `stage` when no `stageField` is
    // declared, so the opportunity must carry no `status` field.
    if (field === 'stage') expect(def.fields?.status).toBeUndefined();
  });

  it('a click is the edit form\'s PATCH, so the Qualified gate refuses it too', async () => {
    const lead = await leadAt('contacted');
    const err = await refusal(verify.hooks.run('crm_lead', 'update', { id: lead.id, status: 'qualified' }, as()));
    expect(err?.code).toBe('VALIDATION_FAILED');
    expect(await refusal(verify.hooks.run('crm_lead', 'update', { id: lead.id, status: 'converted' }, as())), 'Converted by a click').not.toBeNull();
  });
});

// ───────────────────────────────────────────────────────────── #2591 ──

describe('the approval-request fields hide while their gate is off (#2591)', () => {
  const fields = objects.find((o) => o.name === 'crm_opportunity')!.fields as Record<string, AnyRec>;
  const shown = (field: string, record: Rec) => {
    const r = ExpressionEngine.evaluate<boolean>(fields[field]!.visibleWhen, { record } as never);
    expect(r.ok, `${field}.visibleWhen: ${JSON.stringify(r)}`).toBe(true);
    return (r as Rec).value === true;
  };

  it.each([
    ['qualification_requested', 'qualification_approval_status'],
    ['qualification_approval_status', 'qualification_approval_status'],
    ['requested_status', 'status_change_approval_status'],
    ['status_change_approval_status', 'status_change_approval_status'],
  ])('%s shows only when %s is not Not Required', (field, gate) => {
    expect(shown(field, { [gate]: 'not_required' }), 'shown while the gate is off').toBe(false);
    for (const on of ['not_submitted', 'pending', 'approved', 'rejected']) {
      if (!(fields[gate]!.options as AnyRec[]).some((o) => o.value === on)) continue;
      expect(shown(field, { [gate]: on }), `hidden at ${on}`).toBe(true);
    }
  });
});
