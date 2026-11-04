// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack, { hookNamed } from './helpers/composed-stack';
import { AccountApprovalFlow } from '../src/sales/flows/account-approval.flow';
import { hotcrmStack, conditionHolds as holdsOn, signUpPerson, runShippedHook, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * An account Convert Lead creates skips `account_approval`; every other new
 * account still enters it (#2285, maintainer ruling B).
 *
 * The exemption is the marker `crm_account.converted_from_lead_id`, and a
 * marker that exempts from an approval is only as good as the guard on who
 * may write it. It cannot be `readonly` (the platform strips a readonly key
 * from every non-system write, the flow's included), so the guard is
 * `account_protection`: a value on insert must come from a flow run
 * (`ctx.provenance.flowRunId`, server-stamped), and a stored value never
 * changes. Both sides are pinned here against the booted app, with the
 * `approvals` capability composed, so "starts no approval" is read off the
 * approval engine's own request table.
 *
 * ## Rule 11 roster: the deliberate deviation
 *
 * A column whose only legitimate writer is the platform would be `readonly`
 * by convention. This one is writable on purpose, for the reason on the
 * field; `WRITABLE_MARKERS` names it so the next agent does not "tidy" it to
 * `readonly`, which would silently put every converted account back into
 * approval (the conversion's write would be stripped).
 */

const WRITABLE_MARKERS = ['converted_from_lead_id'] as const;

const objects: Rec[] = (stack as any).objects ?? [];
const account = objects.find((o) => o.name === 'crm_account') as Rec | undefined;
const flows: Rec[] = (stack as any).flows ?? [];

const startCondition = (AccountApprovalFlow.nodes as Rec[]).find((n) => n.id === 'start')?.config?.condition;

let verify: VerifyStack;
let rep: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@account-conversion-approval.test', {
    name: 'Conversion Approval Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const identity = () => {
  const n = ++k;
  return { company: `Nimbus Aerospace ${n}`, email: `hugo${n}@nimbus.example.com` };
};

/** A qualified lead the rep owns, for a company no account carries yet. */
const qualifiedLead = async (who: { company: string; email: string }): Promise<Rec> => {
  const [lead] = await verify.seed('crm_lead', [{
    company: who.company, email: who.email, first_name: 'Hugo', last_name: 'Dubois', status: 'qualified',
    owner_id: rep.id,
  }]);
  return lead!;
};

/** Convert Lead as the rep, resumed on top of what the screen prefilled, as the console does. */
const convert = async (leadId: string): Promise<void> => {
  const started = (await verify.flows.run('lead_conversion', { recordId: leadId }, { as: rep.token })) as Rec;
  const prefilled: Rec = {};
  for (const f of ((started.screen ?? started.output?.screen)?.fields ?? []) as Rec[]) {
    if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
  }
  const done = (await verify.flows.resume(started as any, { ...prefilled, createOpportunity: false }, { as: rep.token })) as Rec;
  expect(done.error ?? null, 'the conversion failed').toBeNull();
};

const requestsFor = (id: string): Promise<Rec[]> => verify.rows('sys_approval_request', { record_id: id });

/** A REST create as the rep — the New form's door. Returns the response and the new id, if any. */
const createByForm = async (doc: Rec): Promise<{ status: number; body: Rec; id?: string }> => {
  const res = await verify.apiAs(rep.token, 'POST', '/data/crm_account', doc);
  const body: Rec = await res.json();
  const id = (body.record ?? body.data ?? body)?.id;
  return { status: res.status, body, ...(id ? { id: String(id) } : {}) };
};

describe('the marker and the start condition (#2285)', () => {
  it('crm_account declares the marker as a lookup to the lead, writable on purpose (rule 11)', () => {
    for (const name of WRITABLE_MARKERS) {
      const field = account?.fields?.[name];
      expect(field, `crm_account.${name} is missing`).toBeTruthy();
      expect(field.type).toBe('lookup');
      expect(field.reference).toBe('crm_lead');
      // `readonly` would strip the conversion's own write: every converted
      // account would silently go back into approval.
      expect(field.readonly ?? false).toBe(false);
    }
  });

  it('lead_conversion is the only flow that writes the marker, from the lead it converts', () => {
    const writers = flows.flatMap((flow) => ((flow.nodes ?? []) as Rec[])
      .filter((n) => n.config?.objectName === 'crm_account' && n.config?.fields && 'converted_from_lead_id' in n.config.fields)
      .map((n) => `${flow.name}.${n.id}`));
    expect(writers).toEqual(['lead_conversion.create_account']);
    const node = (flows.find((f) => f.name === 'lead_conversion')?.nodes as Rec[]).find((n) => n.id === 'create_account');
    expect(node?.config?.fields?.converted_from_lead_id?.source).toBe('recordId');
  });

  it('the approval starts on a blank account without the marker, and not on one carrying it', () => {
    expect(holdsOn(verify, startCondition, { record: { name: 'Acme' } })).toBe(true);
    expect(holdsOn(verify, startCondition, { record: { converted_from_lead_id: null } })).toBe(true);
    expect(holdsOn(verify, startCondition, { record: { converted_from_lead_id: '' } })).toBe(true);
    expect(holdsOn(verify, startCondition, { record: { converted_from_lead_id: 'lead-1' } })).toBe(false);
    // The install's off switch still holds on its own.
    expect(holdsOn(verify, startCondition, { record: { approval_status: 'approved' } })).toBe(false);
  });
});

describe('an account Convert Lead creates starts no approval (#2285 ruling B)', () => {
  it('carries the lead it came from, stays blank, and has no approval request behind it', async () => {
    const who = identity();
    const lead = await qualifiedLead(who);
    await convert(lead.id);
    const [created] = await verify.rows('crm_account', { name: who.company });
    expect(created, 'Convert Lead created no account').toBeTruthy();
    expect(created!.converted_from_lead_id).toBe(lead.id);
    expect(created!.approval_status ?? null).toBeNull();
    expect(await requestsFor(String(created!.id)), 'a converted account was sent to approval').toHaveLength(0);
  });

  it('an account the rep creates by hand still goes to approval', async () => {
    const made = await createByForm({ name: `${identity().company} Hand Made` });
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    const [row] = await verify.rows('crm_account', { id: made.id });
    expect(row!.approval_status).toBe('pending');
    expect(await requestsFor(made.id!)).toHaveLength(1);
  });
});

describe('a rep cannot write the marker to skip the approval (#2285 design condition)', () => {
  it('a REST create carrying the marker is refused, and nothing is written', async () => {
    const who = identity();
    const lead = await qualifiedLead(who);
    const made = await createByForm({ name: who.company, converted_from_lead_id: lead.id });
    expect([made.status, made.body?.code]).toEqual([400, 'VALIDATION_FAILED']);
    expect(await verify.rows('crm_account', { name: who.company })).toHaveLength(0);
  });

  it('setting the marker on a hand-created account is refused', async () => {
    const lead = await qualifiedLead(identity());
    const made = await createByForm({ name: `${identity().company} Later Marked` });
    expect(made.status).toBe(201);
    const res = await verify.apiAs(rep.token, 'PATCH', `/data/crm_account/${made.id}`, { converted_from_lead_id: lead.id });
    const body: Rec = await res.json();
    expect([res.status, body?.code]).toEqual([400, 'VALIDATION_FAILED']);
    expect((await verify.rows('crm_account', { id: made.id }))[0]?.converted_from_lead_id ?? null).toBeNull();
  });

  it('a converted account keeps its marker: pointing it at another lead is refused, re-sending it is not', async () => {
    const who = identity();
    const lead = await qualifiedLead(who);
    await convert(lead.id);
    const [created] = await verify.rows('crm_account', { name: who.company });
    const other = await qualifiedLead(identity());

    const moved = await verify.apiAs(rep.token, 'PATCH', `/data/crm_account/${created!.id}`, { converted_from_lead_id: other.id });
    expect([moved.status, ((await moved.json()) as Rec)?.code]).toEqual([400, 'VALIDATION_FAILED']);
    // An edit form that sends the stored value back unchanged is an ordinary edit.
    const resent = await verify.apiAs(rep.token, 'PATCH', `/data/crm_account/${created!.id}`, {
      converted_from_lead_id: lead.id, phone: '+1-555-0100',
    });
    expect(resent.status, await resent.clone().text()).toBe(200);
    expect((await verify.rows('crm_account', { id: created!.id }))[0]?.converted_from_lead_id).toBe(lead.id);
  });
});

describe('the guard holds in the body that ships (#2285, 18.2.0)', () => {
  // The boot above runs `account_protection` in-process. The artifact ships
  // its lowered body and runs it in the runtime's QuickJS sandbox, which on
  // 18.1.0 never saw `ctx.provenance`; these run that body.
  const guard = hookNamed('account_protection');
  const insert = async (provenance?: Rec): Promise<Rec | null> => {
    const lead = await qualifiedLead(identity());
    return runShippedHook(verify, guard, {
      event: 'beforeInsert', as: rep.token, provenance,
      input: { name: `${identity().company} Shipped`, converted_from_lead_id: lead.id },
    }).then(() => null, (e: Rec) => e);
  };

  it('lets a flow run write the marker', async () => {
    expect(await insert({ flowRunId: 'run-2285' })).toBeNull();
  });

  it('refuses the marker on a write that carries no flow run', async () => {
    for (const provenance of [undefined, {}, { attributedUserId: 'someone' }]) {
      const err = await insert(provenance);
      expect(err?.name, JSON.stringify(provenance)).toBe('SandboxError');
      expect([err?.code, err?.status]).toEqual(['VALIDATION_FAILED', 400]);
    }
  });
});
