// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { extractHookBody } from '@objectstack/cli/hook-body';
import type { VerifyStack } from '@objectstack/verify';
import stack, { hookNamed } from './helpers/composed-stack';
import { ACTOR_NAME_RESOLUTION_SOURCE } from '../src/sales/actions/activity-actions';
import { createLineItemPriceFill } from '../src/revenue/objects/_line-item-price-fill';
import {
  hotcrmStack, signUpPerson, recordEngineWrites, today, type Person,
} from './helpers/verify-stack';

/**
 * Every sandboxed body this app ships, executed — and what each one writes.
 *
 * The action bodies run through the one door that carries the whole action
 * contract: `@objectstack/verify`'s `actions.run` over the shipped app (the
 * dispatcher's permission gate, its param validation, the subject-record load
 * under the caller's scope, then the body in the runtime's QuickJS sandbox,
 * writing through the real engine). The hook bodies run where every hook runs —
 * inside a real write through `hooks.run`. What is asserted is read back off
 * the rows the engine stored, or off the writes it received.
 *
 * Real people run them: a sales rep on the sales objects, a marketing user on
 * campaign enrolment, a service agent on the case and the knowledge base.
 *
 * What lowering each body is the BUILD's to refuse: `os lint --strict`
 * (`pnpm lint`) fails a hook that no longer lowers to a metadata-only body
 * (`hook-body/not-lowerable`), so that sweep is not repeated here. The price
 * fill's lowering is kept below because its factory is this app's own shape.
 */

type AnyRec = Record<string, any>;

const stackActions: AnyRec[] = (stack as AnyRec).actions ?? [];

/** The key the runtime registers an action under — object-scoped actions repeat names. */
const keyOf = (a: AnyRec): string => `${a.objectName ?? 'global'}:${a.name}`;

/** Every action the runtime will execute as a sandboxed body. */
const SCRIPT_ACTIONS = stackActions.filter((a) => a.body?.language === 'js');

let verify: VerifyStack;
let rep: Person;
let marketer: Person;
let agent: Person;
/** One real record per object an action is dispatched against. */
const record: Record<string, AnyRec> = {};
let k = 0;

const create = async (object: string, doc: AnyRec, who: Person = rep): Promise<AnyRec> =>
  verify.hooks.run(object, 'insert', doc, { as: who.token });
const stored = async (object: string, id: string): Promise<AnyRec> =>
  (await verify.rows(object, { id }))[0]!;

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@script-bodies.test', {
    name: 'Ada Lovelace', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  marketer = await signUpPerson(verify, 'marketer@script-bodies.test', {
    name: 'Mara Keting', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
  agent = await signUpPerson(verify, 'agent@script-bodies.test', {
    name: 'Sam Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });

  record.crm_account = await create('crm_account', { name: 'Script Body Co' });
  record.crm_contact = await create('crm_contact', {
    first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', crm_account: record.crm_account.id,
  });
  record.crm_lead = await create('crm_lead', {
    first_name: 'Lena', last_name: 'Lead', company: 'Script Body Co', email: 'lena@script-bodies.test',
  });
  record.crm_opportunity = await create('crm_opportunity', {
    name: 'Acme Expansion', crm_account: record.crm_account.id, primary_contact: record.crm_contact.id,
    stage: 'qualification', amount: 50_000, close_date: '2030-06-30',
  });
  record.crm_case = await create('crm_case', {
    subject: 'Script body case', description: 'Raised for the activity bodies.', crm_account: record.crm_account.id,
  }, agent);
  record.crm_campaign = await create('crm_campaign', {
    name: 'Script Body Campaign', status: 'planning', start_date: '2030-01-01', end_date: '2030-02-01',
  }, marketer);
  const [article] = await verify.seed('crm_knowledge_article', [{
    title: 'Reset your password', status: 'published', audience: 'public',
    body: 'Open Settings › Security and choose Reset password.', summary: 'How to reset a password.',
  }]);
  record.crm_knowledge_article = article!;
  // The member `mark_responded` stamps: a lead on the campaign, still `sent`.
  const [member] = await verify.seed('crm_campaign_member', [{
    crm_campaign: record.crm_campaign.id, crm_lead: record.crm_lead.id, status: 'sent',
  }]);
  record.crm_campaign_member = member!;
}, 180_000);

/** Who dispatches each action: marketing enrols, the agent works the case and the articles. */
const actorFor = (key: string): Person => {
  if (/add_contact_to_campaign|create_campaign|mark_responded/.test(key)) return marketer;
  if (key.startsWith('crm_case:') || key.startsWith('crm_knowledge_article:')) return agent;
  return rep;
};

/** Run an action through the real door, as its actor, on its object's record. */
const runAction = (key: string, opts: { recordId?: string; params?: AnyRec; as?: Person } = {}) => {
  const [objectName, name] = key.split(':') as [string, string];
  return verify.actions.run(objectName, name, {
    as: (opts.as ?? actorFor(key)).token,
    ...('recordId' in opts ? (opts.recordId === undefined ? {} : { recordId: opts.recordId }) : { recordId: record[objectName]!.id }),
    params: opts.params ?? {},
  }) as Promise<AnyRec>;
};

describe('every script action body executes under QuickJS', () => {
  /**
   * One invocation per action, shaped the way its own doc comment says it is
   * dispatched. The bar is deliberately the runtime's: a body that references a
   * missing identifier, uses a construct the sandbox forbids, or calls the
   * engine with an argument shape it rejects fails here — none of which
   * `os validate`, `build`, or a metadata assertion can see.
   */
  const INVOCATIONS: Record<string, () => AnyRec> = {
    'crm_opportunity:clone_opportunity': () => ({}),
    'crm_lead:create_campaign': () => ({ crm_campaign: record.crm_campaign!.id }),
    // The contact-side mirror of `create_campaign` (#597) — the writer that
    // finally populates `crm_campaign_member.crm_contact`.
    'crm_contact:add_contact_to_campaign': () => ({ crm_campaign: record.crm_campaign!.id }),
    // The `responded` status's writer (#597), on the member seeded above.
    'crm_campaign_member:mark_responded': () => ({}),
    'crm_contact:mark_primary': () => ({}),
    'crm_contact:send_email': () => ({ subject: 'Hello', body: 'Body text' }),
    'crm_opportunity:mass_update_stage': () => ({ stage: 'needs_analysis' }),
    // The knowledge-article counters' writers (#601): both INSERT a
    // `crm_article_feedback` row keyed by the voter.
    'crm_knowledge_article:mark_article_helpful': () => ({}),
    'crm_knowledge_article:mark_article_not_helpful': () => ({}),
    // The activity family (#592): the same three bodies, generated once per
    // sales object, each dispatched against ITS OWN object.
    ...Object.fromEntries(['crm_lead', 'crm_contact', 'crm_account', 'crm_opportunity', 'crm_case'].flatMap((o) => [
      [`${o}:log_call`, () => ({ subject: 'Intro call', duration: 15 })],
      [`${o}:log_meeting`, () => ({ subject: 'Kickoff' })],
      [`${o}:schedule_meeting`, () => ({ subject: 'Deep dive', start_date: '2026-09-01', start_time: '09:00', duration: 60, location: 'Zoom' })],
    ])),
  };

  it('covers every action the runtime will sandbox', () => {
    // Keyed the way the runtime keys its own registry, so fifteen distinct
    // activity bodies are fifteen distinct cases rather than three.
    const covered = new Set(Object.keys(INVOCATIONS));
    const uncovered = SCRIPT_ACTIONS.filter((a) => !covered.has(keyOf(a))).map(keyOf);
    expect(uncovered, `script bodies nothing executes:\n  ${uncovered.join('\n  ')}`).toEqual([]);
    const stale = [...covered].filter((key) => !SCRIPT_ACTIONS.some((a) => keyOf(a) === key));
    expect(stale, `INVOCATIONS names actions that no longer exist:\n  ${stale.join('\n  ')}`).toEqual([]);
  });

  it.each(SCRIPT_ACTIONS.map(keyOf))('%s', async (key) => {
    const result = await runAction(key, { params: INVOCATIONS[key]!() });
    expect(result, `${key} returned nothing`).toBeTruthy();
  });
});

describe('mass_update_stage writes the stage it was given (#508, CRM half)', () => {
  /**
   * The defect this executor was built to be able to find, fixed and pinned the
   * other way round: the body used to call `update(id, { stage })`, but
   * `ctx.api` is the engine repo facade, whose update takes `(data, options)` —
   * so the id landed in the `data` slot and the engine refused the write. Live,
   * that was an HTTP 400 on every single-row dispatch.
   *
   * The MULTI-record leg: the opportunity list declares `bulkActionDefs: [{
   * name: 'mass_update_stage', operation: 'custom', execution: 'aggregate' }]`,
   * and the renderer delivers the whole selection in the builtin
   * `params._selectedIds` — which a script body reads as `input._selectedIds`.
   */
  const deal = async (stage: string) => create('crm_opportunity', {
    name: `Stage deal ${++k}`, crm_account: record.crm_account!.id, stage, amount: 1_000, close_date: '2030-06-30',
  });

  it('calls the facade with (data, options) — and the stored row moves', async () => {
    const opp = await deal('qualification');
    const engine = recordEngineWrites(verify);
    let result: AnyRec;
    try {
      result = await runAction('crm_opportunity:mass_update_stage', { recordId: opp.id, params: { stage: 'needs_analysis' } });
    } finally {
      engine.restore();
    }
    const [call] = engine.of('crm_opportunity', 'update');
    // The document in the `data` slot, the predicate in `options` — the id is
    // never a positional argument.
    expect(call!.args[1]).toEqual({ id: opp.id, stage: 'needs_analysis' });
    expect((call!.args[2] as AnyRec).where).toEqual({ id: opp.id });
    expect((await stored('crm_opportunity', opp.id)).stage).toBe('needs_analysis');
    expect(result!).toEqual({ stage: 'needs_analysis', updated: 1 });
  });

  it('moves the STORED stage — the single-row path end to end', async () => {
    // The exact live 400 from the rc.2 acceptance run: a `qualification` deal
    // dispatched single-row to `needs_analysis`, which never applied.
    const opp = await deal('qualification');
    const result = await runAction('crm_opportunity:mass_update_stage', { recordId: opp.id, params: { stage: 'needs_analysis' } });
    expect(result).toEqual({ stage: 'needs_analysis', updated: 1 });
    // Read back from the store, not from the body's return value: the return
    // value was always honest about what the body INTENDED.
    expect((await stored('crm_opportunity', opp.id)).stage, 'the stage move never reached the store').toBe('needs_analysis');
  });

  it('moves every STORED row of an aggregate selection — the multi-row path end to end', async () => {
    const a = await deal('prospecting');
    const b = await deal('proposal');
    // No recordId: an aggregate dispatch carries the whole selection under the
    // builtin `_selectedIds` — the shape the grid renderer POSTs, underscore included.
    const result = await runAction('crm_opportunity:mass_update_stage', {
      recordId: undefined, params: { stage: 'negotiation', _selectedIds: [a.id, b.id] },
    });
    expect(result).toEqual({ stage: 'negotiation', updated: 2 });
    for (const id of [a.id, b.id]) expect((await stored('crm_opportunity', id)).stage).toBe('negotiation');
  });

  it('rejects an aggregate run it cannot cover, instead of counting the miss', async () => {
    // All-or-nothing (objectui#3139): the selection bar offers no per-row
    // retry, so a handler that covers only part of the selection must reject
    // rather than return a success the bar will toast.
    const live = await deal('prospecting');
    await expect(runAction('crm_opportunity:mass_update_stage', {
      recordId: undefined, params: { stage: 'negotiation', _selectedIds: [live.id, 'opp_deleted_between_select_and_submit'] },
    })).rejects.toThrow(/1 of 2 selected opportunities could not be updated/);
    // The honest half of "all-or-nothing without a transaction": the row that
    // WAS written keeps its new stage; re-running is the retry.
    expect((await stored('crm_opportunity', live.id)).stage).toBe('negotiation');
  });

  it('covers_live_rows_after_a_stale_id — a miss does not abandon the rest of the selection', async () => {
    // The stale id goes FIRST: a body that let the miss escape the loop would
    // never attempt `live` at all.
    const live = await deal('prospecting');
    await expect(runAction('crm_opportunity:mass_update_stage', {
      recordId: undefined, params: { stage: 'negotiation', _selectedIds: ['opp_deleted_before_the_live_row', live.id] },
    })).rejects.toThrow(/1 of 2 selected opportunities could not be updated/);
    expect((await stored('crm_opportunity', live.id)).stage, 'the live row behind a stale id was never attempted').toBe('negotiation');
  });
});

describe('what the record actions write', () => {
  it('clone_opportunity copies the required fields onto a fresh prospecting deal', async () => {
    const result = await runAction('crm_opportunity:clone_opportunity');
    const clone = await stored('crm_opportunity', result.id);
    expect(clone.name).toBe('Copy of Acme Expansion');
    expect(clone.crm_account).toBe(record.crm_account!.id);
    expect(clone.amount).toBe(50_000);
    expect(clone.stage).toBe('prospecting');
    expect(clone.owner_id).toBe(rep.id);
    // A 90-day horizon computed INSIDE the VM — `Date` is one of the few host
    // globals a body may rely on, and this proves it is really there.
    expect(clone.close_date).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(new Date(clone.close_date).getTime()).toBeGreaterThan(Date.now());
  });

  it('mark_primary calls update with the engine facade’s (data, options) shape', async () => {
    const contact = await create('crm_contact', {
      first_name: 'Prim', last_name: 'Ary', email: `prim${++k}@script-bodies.test`, crm_account: record.crm_account!.id,
    });
    const engine = recordEngineWrites(verify);
    try {
      await runAction('crm_contact:mark_primary', { recordId: contact.id });
    } finally {
      engine.restore();
    }
    const [call] = engine.of('crm_contact', 'update');
    expect(call!.args[1]).toEqual({ id: contact.id, is_primary: true });
    expect((call!.args[2] as AnyRec).where).toEqual({ id: contact.id });
    expect((await stored('crm_contact', contact.id)).is_primary).toBe(true);
  });

  /**
   * The behaviour pin for #813's lead half — a NON-regression nail: a
   * dispatch carrying only a recordId WRITES a membership row (the per-record
   * fan-out shape `bulkActions: ['create_campaign']` uses).
   */
  it('create_campaign enrols the dispatched lead from ctx.recordId alone', async () => {
    const lead = await create('crm_lead', {
      first_name: 'Ena', last_name: 'Rolled', company: 'Script Body Co', email: `enrol${++k}@script-bodies.test`,
    });
    const result = await runAction('crm_lead:create_campaign', { recordId: lead.id, params: { crm_campaign: record.crm_campaign!.id } });
    expect(result).toMatchObject({ campaignId: record.crm_campaign!.id, count: 1, skipped: 0 });
    const members = await verify.rows('crm_campaign_member', { crm_campaign: record.crm_campaign!.id, crm_lead: lead.id });
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ crm_campaign: record.crm_campaign!.id, crm_lead: lead.id, status: 'sent' });
  });

  /**
   * The contact side of the same fan-out (#597): `crm_campaign_member.crm_contact`
   * was a lookup no writer populated, so a campaign could only ever reach leads.
   */
  it('add_contact_to_campaign enrols the dispatched contact, keeping crm_lead null', async () => {
    const contact = await create('crm_contact', {
      first_name: 'Cam', last_name: 'Paign', email: `cam${++k}@script-bodies.test`, crm_account: record.crm_account!.id,
    });
    const result = await runAction('crm_contact:add_contact_to_campaign', { recordId: contact.id, params: { crm_campaign: record.crm_campaign!.id } });
    expect(result).toMatchObject({ campaignId: record.crm_campaign!.id, count: 1, skipped: 0 });
    const members = await verify.rows('crm_campaign_member', { crm_campaign: record.crm_campaign!.id, crm_contact: contact.id });
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ crm_campaign: record.crm_campaign!.id, crm_contact: contact.id, status: 'sent' });
    expect(members[0]!.crm_lead ?? null, 'a contact member must not also claim a lead').toBeNull();
  });

  it('add_contact_to_campaign skips a contact already on the campaign', async () => {
    const contact = await create('crm_contact', {
      first_name: 'Twi', last_name: 'Ce', email: `twice${++k}@script-bodies.test`, crm_account: record.crm_account!.id,
    });
    const params = { crm_campaign: record.crm_campaign!.id };
    await runAction('crm_contact:add_contact_to_campaign', { recordId: contact.id, params });
    const again = await runAction('crm_contact:add_contact_to_campaign', { recordId: contact.id, params });
    expect(again).toMatchObject({ count: 0, skipped: 1 });
    expect(await verify.rows('crm_campaign_member', { crm_campaign: record.crm_campaign!.id, crm_contact: contact.id })).toHaveLength(1);
  });

  /**
   * `mark_responded` is the only writer of the `responded` status, and it
   * stamps all three response fields together rather than leaving two of them
   * for `campaign_member_lifecycle` to back-fill.
   */
  it('mark_responded stamps status, has_responded and response_date together', async () => {
    const [member] = await verify.seed('crm_campaign_member', [{
      crm_campaign: record.crm_campaign!.id, crm_contact: record.crm_contact!.id, status: 'sent',
    }]);
    const result = await runAction('crm_campaign_member:mark_responded', { recordId: member!.id });
    expect(result).toMatchObject({ id: member!.id, status: 'responded' });
    const row = await stored('crm_campaign_member', member!.id);
    expect(row.status).toBe('responded');
    expect(row.has_responded).toBe(true);
    expect(typeof row.response_date).toBe('string');
  });

  it('create_campaign skips a lead already enrolled on the campaign', async () => {
    const lead = await create('crm_lead', {
      first_name: 'Al', last_name: 'Ready', company: 'Script Body Co', email: `already${++k}@script-bodies.test`,
    });
    const params = { crm_campaign: record.crm_campaign!.id };
    await runAction('crm_lead:create_campaign', { recordId: lead.id, params });
    const engine = recordEngineWrites(verify);
    let again: AnyRec;
    try {
      again = await runAction('crm_lead:create_campaign', { recordId: lead.id, params });
    } finally {
      engine.restore();
    }
    expect(again!).toMatchObject({ campaignId: record.crm_campaign!.id, count: 0, skipped: 1 });
    expect(engine.of('crm_campaign_member', 'insert')).toHaveLength(0);
  });

  it('send_email writes the email and its timeline pointer', async () => {
    const engine = recordEngineWrites(verify);
    let result: AnyRec;
    try {
      result = await runAction('crm_contact:send_email', { params: { subject: 'Hello', body: 'Body text' } });
    } finally {
      engine.restore();
    }
    const email = await stored('sys_email', result!.emailId);
    const activity = await stored('sys_activity', result!.activityId);
    expect(email.to_addresses).toBe('ada@example.com');
    // The body hands the mail over QUEUED; delivering it is the email service's
    // job, and with the platform's service mounted it may already have moved
    // the row on (the dev transport sends at once).
    const [handedOver] = engine.of('sys_email', 'insert');
    expect((handedOver!.args[1] as AnyRec).status).toBe('queued');
    expect(['queued', 'sent']).toContain(email.status);
    expect(activity.source_object).toBe('sys_email');
    // The pointer is the id the FIRST insert returned — so this also proves the
    // body's two awaits really sequenced across the VM boundary.
    expect(activity.source_id).toBe(email.id);
    expect(activity.record_label).toBe(record.crm_contact!.full_name);
    expect(activity.record_label).toBe('Ada Lovelace');
    expect(result!).toEqual({ emailId: email.id, activityId: activity.id });
  });
});

// ─────────────── send_email's actor is a name, not a raw user id (#678) ──

/**
 * The twin of #673, on the same `sys_activity.actor_name` column.
 *
 * `send_email` stamped `actor_name: ctx.user?.name ?? null`, and on the
 * dispatch path the Console uses that key is not a display name: the REST
 * action dispatcher builds the body's user as `{ id: ec.userId, name: ec.userId,
 * … }`, so the key is PRESENT and carries the id. These run through the REAL
 * dispatcher, which on 17.7.0 still does that (measured: the body issues its
 * `sys_user` read on every send), and the fault cases inject into the real
 * engine — for the body's reads only, which are the reads issued after the
 * route has loaded the subject record.
 */
async function watchBodyReads(
  objectName: string,
  body: () => Promise<AnyRec>,
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
    return { result: await body(), bodyReads };
  } finally {
    find.mockRestore();
    findOne.mockRestore();
  }
}

const sendEmail = () => runAction('crm_contact:send_email', { params: { subject: 'Hello', body: 'Body text' } });

describe('send_email writes a human-readable sys_activity.actor_name (#678)', () => {
  it('resolves the display name from sys_user instead of stamping the id', async () => {
    const result = await sendEmail();
    const activity = await stored('sys_activity', result.activityId);
    expect(activity.actor_id).toBe(rep.id);
    expect(activity.actor_name).toBe('Ada Lovelace');
    // The regression itself, as its own assertion: whatever else changes, the
    // contact timeline must never render the opaque id again.
    expect(activity.actor_name).not.toBe(rep.id);
  });

  it('reads sys_user once — and only because the dispatcher delivered no name', async () => {
    // A dispatcher that DOES deliver a display name is believed as-is: the
    // lookup is a workaround and has to retire itself the day the platform
    // starts honouring `ctx.user.name` (objectstack-ai/objectstack#5372). On
    // 17.7.0 it does not, so the body reads `sys_user` exactly once — the day
    // this reads 0 with the name still right, the platform has been fixed.
    const { result, bodyReads } = await watchBodyReads('crm_contact', sendEmail);
    expect(bodyReads.filter((o) => o === 'sys_user')).toHaveLength(1);
    expect((await stored('sys_activity', result.activityId)).actor_name).toBe('Ada Lovelace');
  });

  it('falls back to the id rather than writing a blank actor', async () => {
    // No `sys_user` row for the sender — a deleted user, or a read this context
    // is not allowed to satisfy. An opaque id is bad; an activity whose actor is
    // `null` is worse, because it is not attributable at all.
    const { result } = await watchBodyReads('crm_contact', sendEmail, (o) => (o === 'sys_user' ? async () => [] : undefined));
    const activity = await stored('sys_activity', result.activityId);
    expect(activity.actor_name).toBe(rep.id);
    expect(activity.actor_name).not.toBeNull();
  });

  it('never fails the send when the sys_user read throws', async () => {
    const { result } = await watchBodyReads('crm_contact', sendEmail, (o) => (o === 'sys_user'
      ? async () => { throw new Error('FORBIDDEN: no read access to sys_user'); }
      : undefined));
    // The email the rep just sent outranks the label on its timeline row.
    expect(result.emailId).toBeTruthy();
    expect(result.activityId).toBeTruthy();
    expect((await stored('sys_activity', result.activityId)).actor_name).toBe(rep.id);
  });

  /**
   * The anti-drift guard: the resolution is shared as body SOURCE TEXT
   * (`ACTOR_NAME_RESOLUTION_SOURCE`), spliced into every writer at authoring
   * time, because a body runs body-only inside QuickJS and cannot call an
   * imported helper.
   */
  it('every actor_name writer splices the SAME resolution block', () => {
    const writers = stackActions.filter((a) => String(a.body?.source ?? '').includes('actor_name:'));
    // `send_email` plus the fifteen generated activity bodies.
    expect(writers.map(keyOf).sort()).toContain('crm_contact:send_email');
    expect(writers.length).toBeGreaterThan(1);

    const divergent = writers
      .filter((a) => !String(a.body.source).includes(ACTOR_NAME_RESOLUTION_SOURCE))
      .map(keyOf);
    expect(
      divergent,
      'these bodies write sys_activity.actor_name without the shared resolution ' +
        `block — a second copy is a second thing to forget (#673 / #678):\n  ${divergent.join('\n  ')}`,
    ).toEqual([]);

    // And nobody stamps the raw `ctx.user.name` beside it. Comment lines are
    // excluded on purpose: the shared block QUOTES that expression in its own
    // retirement note.
    const raw = writers.filter((a) =>
      String(a.body.source)
        .split('\n')
        .some((line) => !line.trim().startsWith('//') && /actor_name:\s*ctx\.user/.test(line)),
    );
    expect(raw.map(keyOf), 'actor_name is being stamped from ctx.user again').toEqual([]);
  });
});

// ──────────────────── the constraint the shared price-fill factory rests on ──

describe('the shared line-item price fill stays shippable body-only', () => {
  const HOOKS = [
    { label: 'opportunity', object: 'crm_opportunity_line_item', parentKey: 'crm_opportunity', hook: hookNamed('opportunity_line_item_price_fill') },
    { label: 'quote', object: 'crm_quote_line_item', parentKey: 'crm_quote', hook: hookNamed('quote_line_item_price_fill') },
  ];

  /**
   * The factory's doc comment says the sharing is safe because it happens at
   * AUTHORING time — `objectName` / `hookName` end up as plain metadata and the
   * handler body closes over nothing but its own `ctx`. `extractHookBody` is
   * the build's own lowering pass, and it throws when the handler references an
   * identifier that will not exist at runtime, so calling it IS the check.
   */
  it.each(HOOKS)('$label lowers to a body with no free identifiers', ({ hook }) => {
    expect(() => extractHookBody(hook.handler, `hook '${hook.name}'`)).not.toThrow();
  });

  it('lowers to the same source and the same inferred capabilities on both objects', () => {
    const [opp, quote] = HOOKS.map(({ hook }) => extractHookBody(hook.handler, `hook '${hook.name}'`));
    expect(quote!.source).toBe(opp!.source);
    // Inferred from the `findOne` the body performs — and `api.write` is
    // correctly absent: the hook mutates `ctx.input`, it does not write.
    expect(opp!.capabilities).toEqual(['api.read']);
  });

  /** A parent of each kind, and a product at 250 — the rep's own. */
  const parent: Record<string, string> = {};
  let product: string;
  beforeAll(async () => {
    const contact = await create('crm_contact', {
      first_name: 'Pri', last_name: 'Ce', email: 'price@script-bodies.test', crm_account: record.crm_account!.id,
    });
    parent.crm_opportunity = record.crm_opportunity!.id;
    parent.crm_quote = (await create('crm_quote', {
      name: 'Price quote', crm_account: record.crm_account!.id, crm_contact: contact.id,
      crm_opportunity: record.crm_opportunity!.id, quote_date: today(), expiration_date: '2030-12-31',
    })).id;
    const [p] = await verify.seed('crm_product', [{ name: 'Price fill widget', list_price: 250, is_active: true }]);
    product = String(p!.id);
  }, 120_000);

  it.each(HOOKS)('$label stamps list_price and defaults unit_price on insert', async ({ object, parentKey }) => {
    const line = await create(object, { [parentKey]: parent[parentKey], crm_product: product, quantity: 1 });
    expect(line.list_price).toBe(250);
    expect(line.unit_price).toBe(250);
  });

  it.each(HOOKS)('$label re-syncs list_price but never clobbers a negotiated unit_price', async ({ object, parentKey }) => {
    const line = await create(object, { [parentKey]: parent[parentKey], crm_product: product, quantity: 1 });
    await verify.hooks.run(object, 'update', { id: line.id, crm_product: product, unit_price: 199 }, { as: rep.token });
    const row = await stored(object, line.id);
    expect(row.list_price).toBe(250);
    expect(row.unit_price).toBe(199);
  });

  it.each(HOOKS)('$label is a no-op when no product is part of the write', async ({ object, parentKey }) => {
    // A line always carries a product (`crm_product` is required), so "no
    // product in the write" is an edit that does not touch it — the hook must
    // read nothing and stamp nothing.
    const line = await create(object, { [parentKey]: parent[parentKey], crm_product: product, quantity: 1 });
    const ql = verify.kernel.getService<AnyRec>('objectql');
    const reads = vi.spyOn(ql, 'findOne');
    try {
      await verify.hooks.run(object, 'update', { id: line.id, quantity: 2 }, { as: rep.token });
      expect(reads.mock.calls.filter(([o]) => o === 'crm_product'), 'the price fill read a product for a write that names none').toHaveLength(0);
    } finally {
      reads.mockRestore();
    }
    expect((await stored(object, line.id)).list_price).toBe(250);
  });

  /**
   * The negative control. Without it the guard above is just "the current code
   * passes"; with it we know the check can still fail.
   */
  it('rejects a factory whose handler reads a factory parameter', () => {
    const leaky = createLeakyPriceFill('crm_quote_line_item', 'leaky_price_fill');
    expect(() => extractHookBody(leaky.handler as never, `hook '${leaky.name}'`)).toThrow(/objectName/);
    // And the real factory is the same shape apart from that one read, so the
    // guard is discriminating rather than allergic to factories in general.
    const real = createLineItemPriceFill('crm_quote_line_item', 'quote_line_item_price_fill');
    expect(() => extractHookBody(real.handler as never, `hook '${real.name}'`)).not.toThrow();
  });
});

/**
 * The territory derivation on a real write (#621 the projection, #639 the
 * classification). `crm_account.territory` is what the two territory sharing
 * rules filter on, `billing_country` is the value it is classified from, and
 * `account_protection` is the only writer of both.
 */
describe('account_protection derives billing_country and territory on a real write', () => {
  const account = (doc: AnyRec) => create('crm_account', { name: `Territory Co ${++k}`, ...doc });

  it('normalises the address country onto billing_country and classifies it', async () => {
    const row = await account({ billing_address: { street: '1 Main', country: ' de ' } });
    expect(row.billing_country).toBe('DE');
    expect(row.territory).toBe('emea');
  });

  it('classifies a full country name the old free-text match would have dropped', async () => {
    // The #639 defect in one case: `United States` used to belong to no
    // territory at all, silently.
    const row = await account({ billing_address: { country: 'United  States' } });
    expect(row.billing_country).toBe('UNITED STATES');
    expect(row.territory).toBe('na');
  });

  it('yields null for an address carrying no country, and a stated `other`', async () => {
    const row = await account({ billing_address: { city: 'Austin' } });
    expect(row.billing_country).toBeNull();
    expect(row.territory).toBe('other');
  });

  it('leaves both derived columns untouched when the write omits the address', async () => {
    const row = await account({ billing_address: { country: 'US' } });
    await verify.hooks.run('crm_account', 'update', { id: row.id, phone: '+1-512-555-0100' }, { as: rep.token });
    const after = await stored('crm_account', row.id);
    expect(after.billing_country).toBe('US');
    expect(after.territory).toBe('na');
  });
});

/**
 * A price fill written the way the factory's doc comment forbids: the handler
 * reads `objectName`, which is a closure here and nothing at all once the body
 * is lowered. Kept next to the test that rejects it so the forbidden shape is
 * legible rather than described.
 */
function createLeakyPriceFill(objectName: string, hookName: string): AnyRec {
  return {
    name: hookName,
    object: objectName,
    events: ['beforeInsert'],
    handler: async (ctx: AnyRec) => {
      ctx.input.stamped_object = objectName;
    },
  };
}
