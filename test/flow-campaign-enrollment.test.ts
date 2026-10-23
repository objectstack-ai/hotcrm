// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import { CampaignEnrollmentFlow } from '../src/marketing/flows/campaign-enrollment.flow';
import { hotcrmStack, signUpPerson, daysFromNow, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * campaign_enrollment runtime tests.
 *
 * This is the console's bulk "enroll leads" screen action. Its dedupe gate sits
 * inside a `loop` body, so until the nested condition was authored as an
 * explicit CEL envelope it never opened and the action enrolled nobody at all —
 * see the regression guard in test/flow-scheduled.test.ts.
 *
 * Three things here are silently breakable and none is visible to metadata
 * validation: the `recordId` input contract, the eligibility filter (an
 * opted-out lead must never be enrolled in an email campaign), and the dedupe
 * that makes a re-run top up rather than double-enrol.
 *
 * Runs on the shipped app booted by `@objectstack/verify`: a marketer starts
 * the screen flow on a campaign (`flows.run`) and submits the screen
 * (`flows.resume`); the enrolment INSERT happens in the registered callees,
 * resolved by name off the real registry, which run as the marketer too since
 * #2167 (who may enroll, door by door, is
 * `test/campaign-enrollment-doors.test.ts`). The boot
 * replays the app's seed leads and contacts, and the eligibility filter rightly
 * enrols the eligible ones among them too — so every assertion about WHO was
 * enrolled is read over this file's own fixture people, and every assertion
 * that NOBODY was enrolled is read over the whole campaign.
 */

let verify: VerifyStack;
let marketer: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  marketer = await signUpPerson(verify, 'marketer@flow-campaign-enrollment.test', {
    name: 'Enrolment Marketer', positions: ['marketing_user'], permissionSets: ['marketing_user'],
  });
}, 120_000);

/**
 * One campaign and the people who could be enrolled in it — the eligible ones
 * and one of every ineligible shape — written as the system, owned by the
 * marketer.
 */
async function world(campaignOver: Rec = {}) {
  const n = ++k;
  const [campaign] = await verify.seed('crm_campaign', [{
    name: `Spring Push ${n}`, status: 'in_progress', start_date: daysFromNow(-7), end_date: daysFromNow(30),
    owner_id: marketer.id, ...campaignOver,
  }]);
  const [account] = await verify.seed('crm_account', [{ name: `Acme ${n}`, owner_id: marketer.id }]);
  // The contact the converted lead became: a converted lead points at the
  // account and the contact Convert Lead left it (#2219: the flag stands only
  // with both). In no department, so no contact run enrols it.
  const [became] = await verify.seed('crm_contact', [{
    first_name: 'Cy', last_name: `became ${n}`, crm_account: account!.id,
    email: `became.${n}@acme.flow-campaign-enrollment.test`, email_opt_out: false, owner_id: marketer.id,
  }]);
  const lead = async (key: string, over: Rec) => {
    const [row] = await verify.seed('crm_lead', [{
      first_name: 'Lee', last_name: `${key} ${n}`, company: `Acme ${key} ${n}`,
      email: `${key}.${n}@acme.flow-campaign-enrollment.test`, status: 'new', is_converted: false,
      email_opt_out: false, owner_id: marketer.id, ...over,
    }]);
    return [key, row!] as const;
  };
  const leads = Object.fromEntries(await Promise.all([
    lead('l_new', {}),
    lead('l_new2', {}),
    // Ineligible for various reasons — none may be enrolled.
    lead('l_optout', { email_opt_out: true }),
    lead('l_converted', { is_converted: true, converted_account: account!.id, converted_contact: became!.id }),
    lead('l_other', { status: 'qualified' }),
  ])) as Record<string, Rec>;
  /**
   * Contacts, the #597 mirror of the lead roster above.
   *
   * `crm_campaign_member.crm_contact` was a lookup no writer populated, so a
   * campaign could only ever reach LEADS — the existing customer base, which is
   * most of what a CRM knows, was unreachable by marketing. Same ineligibility
   * shapes as the leads: opted out, no email, wrong segment. There is no
   * `is_converted` twin — a contact IS the converted end state.
   */
  const contact = async (key: string, over: Rec) => {
    const [row] = await verify.seed('crm_contact', [{
      first_name: 'Cy', last_name: `${key} ${n}`, crm_account: account!.id, department: 'engineering',
      email: `${key}.${n}@acme.flow-campaign-enrollment.test`, email_opt_out: false, owner_id: marketer.id, ...over,
    }]);
    return [key, row!] as const;
  };
  const contacts = Object.fromEntries(await Promise.all([
    contact('c_eng', {}),
    contact('c_eng2', {}),
    contact('c_optout', { email_opt_out: true }),
    contact('c_other', { department: 'finance' }),
  ])) as Record<string, Rec>;
  return { campaign: campaign!, leads, contacts, account: account! };
}
type World = Awaited<ReturnType<typeof world>>;

/** Every screen field the flow declares, all three answered (each criterion is `required` only on its own side, #2241). */
const SCREEN = { memberSource: 'leads', leadStatus: 'new', contactDepartment: 'engineering' };

/** Run the screen action on `w`'s campaign as the marketer, and return its member rows. */
async function enrol(w: World, screen: Rec = SCREEN): Promise<Rec[]> {
  const run = await verify.flows.run('campaign_enrollment', { recordId: w.campaign.id }, { as: marketer.token });
  expect(run.runId, 'campaign_enrollment did not start').toBeTruthy();
  // Screen fields ONLY. `recordId` is a start-time input the console seeds on
  // the trigger, and from 17.0.0-rc.2 the engine holds a resume to the screen's
  // declared field contract (#4477) — re-sending it here is refused with
  // `INVALID_SCREEN_INPUT: Unknown screen field "recordId"`, which is the
  // engine correctly rejecting a signal the console never sends.
  await verify.flows.resume(run, screen, { as: marketer.token });
  return verify.rows('crm_campaign_member', { crm_campaign: w.campaign.id });
}

/** The fixture keys of the `side` (`crm_lead` / `crm_contact`) people among `members`. */
const enrolledKeys = (w: World, members: Rec[], side: 'crm_lead' | 'crm_contact'): string[] => {
  const people = side === 'crm_lead' ? w.leads : w.contacts;
  const byId = new Map(Object.entries(people).map(([key, row]) => [row.id, key]));
  return members.map((m) => byId.get(m[side])).filter((key): key is string => key !== undefined).sort();
};

/**
 * The email-less shape of `object`, attempted as the system: `email` is
 * `required` on both `crm_lead` and `crm_contact`, so no such person can be
 * written and the filter's `email: { $ne: null }` clause guards a row the
 * engine refuses to hold. Pinned as that refusal — the reason the clause can
 * select nobody.
 */
const emailLess = (object: 'crm_lead' | 'crm_contact', w: World) =>
  verify.seed(object, [object === 'crm_lead'
    ? { first_name: 'No', last_name: `Email ${k}`, company: `No Email ${k}`, status: 'new', email: null, owner_id: marketer.id }
    : { first_name: 'No', last_name: `Email ${k}`, crm_account: w.account.id, department: 'engineering', email: null, owner_id: marketer.id }]);

/** An existing member row on `campaign` — the state a re-run starts from. */
const existingMember = async (campaign: Rec, doc: Rec) =>
  verify.seed('crm_campaign_member', [{ crm_campaign: campaign.id, status: 'sent', ...doc }]);

describe('campaign_enrollment — screen action', () => {
  it('enrols each person through the two per-person subflows, as registered on the app', () => {
    // The enrolment the cases below read back is written by these two flows,
    // which the screen calls by name: a `subflow` node resolves its callee off
    // the engine's registry, so both must be registered on the booted app.
    const called = JSON.stringify(CampaignEnrollmentFlow).match(/"flowName":"([a-z_]+)"/g)?.map((m) => m.split('"')[3]);
    expect(called).toEqual(['campaign_lead_member_enroll', 'campaign_contact_member_enroll']);
    const registered = verify.metadata.items('flow').map((f) => String((f as Rec).name));
    expect(registered).toEqual(expect.arrayContaining(['campaign_lead_member_enroll', 'campaign_contact_member_enroll']));
  });

  it('seeds its input from the console’s `recordId` contract', () => {
    const names = (CampaignEnrollmentFlow.variables ?? []).map((v) => v.name);
    expect(names, 'the console only seeds `recordId`').toContain('recordId');
  });

  it('enrols the eligible leads in the chosen status', async () => {
    const w = await world();
    const members = await enrol(w);
    expect(enrolledKeys(w, members, 'crm_lead')).toEqual(['l_new', 'l_new2']);
    for (const m of members) {
      expect(m.crm_campaign).toBe(w.campaign.id);
      expect(m.status).toBe('sent');
      expect(m.added_date, 'added_date should be stamped').toBeTruthy();
    }
  });

  it('never enrols an opted-out, converted or off-status lead, and an email-less one cannot be stored', async () => {
    const w = await world();
    await expect(emailLess('crm_lead', w), 'an email-less lead cannot exist').rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    const enrolled = enrolledKeys(w, await enrol(w), 'crm_lead');
    for (const key of ['l_optout', 'l_converted', 'l_other']) {
      expect(enrolled, `${key} must not be enrolled`).not.toContain(key);
    }
  });

  it('tops up rather than double-enrolling on a re-run', async () => {
    // Duplicate member rows inflated num_sent and the response rate.
    const w = await world();
    await existingMember(w.campaign, { crm_lead: w.leads.l_new!.id });
    const members = await enrol(w);
    expect(members.filter((m) => m.crm_lead === w.leads.l_new!.id), 'l_new was enrolled twice').toHaveLength(1);
    // …and the not-yet-enrolled lead still gets added.
    expect(enrolledKeys(w, members, 'crm_lead')).toContain('l_new2');
  });

  it('does not treat an enrolment in ANOTHER campaign as a duplicate', async () => {
    const w = await world();
    const other = await world();
    await existingMember(other.campaign, { crm_lead: w.leads.l_new!.id });
    const members = await enrol(w);
    expect(
      members.filter((m) => m.crm_lead === w.leads.l_new!.id),
      'a member row for a different campaign blocked enrolment',
    ).toHaveLength(1);
  });

  it('enrols into a campaign still in planning', async () => {
    const w = await world({ status: 'planning' });
    expect(enrolledKeys(w, await enrol(w), 'crm_lead').length).toBeGreaterThan(0);
  });
});

describe('campaign_enrollment — contacts (#597)', () => {
  const asContacts = (over: Rec = {}) => ({ ...SCREEN, memberSource: 'contacts', ...over });

  it('enrols the eligible contacts in the chosen department', async () => {
    const w = await world();
    const members = await enrol(w, asContacts());
    expect(enrolledKeys(w, members, 'crm_contact')).toEqual(['c_eng', 'c_eng2']);
    for (const m of members) {
      expect(m.crm_campaign).toBe(w.campaign.id);
      expect(m.crm_lead, 'a contact member must not also claim a lead').toBeNull();
      expect(m.status).toBe('sent');
      expect(m.added_date, 'added_date should be stamped').toBeTruthy();
    }
  });

  it('never enrols an opted-out or off-segment contact, and an email-less one cannot be stored', async () => {
    const w = await world();
    await expect(emailLess('crm_contact', w), 'an email-less contact cannot exist').rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    const enrolled = enrolledKeys(w, await enrol(w, asContacts()), 'crm_contact');
    for (const key of ['c_optout', 'c_other']) {
      expect(enrolled, `${key} must not be enrolled`).not.toContain(key);
    }
  });

  it('tops up rather than double-enrolling a contact on a re-run', async () => {
    const w = await world();
    await existingMember(w.campaign, { crm_contact: w.contacts.c_eng!.id });
    const members = await enrol(w, asContacts());
    expect(
      members.filter((m) => m.crm_contact === w.contacts.c_eng!.id),
      'c_eng was enrolled twice',
    ).toHaveLength(1);
    expect(enrolledKeys(w, members, 'crm_contact')).toContain('c_eng2');
  });

  it('does not treat a LEAD enrolment as a duplicate of a contact enrolment', async () => {
    // Two different records of two different relationships; the seed datasets
    // in src/data/marketing.seed.ts key them separately for the same reason.
    // The lead member carries the SAME id string as the contact — a lead row
    // written under the contact's id — so only the relationship tells them apart.
    const w = await world();
    const [twin] = await verify.seed('crm_lead', [{
      id: w.contacts.c_eng!.id, first_name: 'Twin', last_name: `Lead ${k}`, company: `Twin ${k}`,
      email: `twin.${k}@acme.flow-campaign-enrollment.test`, status: 'contacted', owner_id: marketer.id,
    }]);
    expect(twin!.id).toBe(w.contacts.c_eng!.id);
    await existingMember(w.campaign, { crm_lead: twin!.id });
    const members = await enrol(w, asContacts());
    expect(members.filter((m) => m.crm_contact === w.contacts.c_eng!.id)).toHaveLength(1);
  });

  it('the two branches are exclusive — picking contacts enrols no leads', async () => {
    const w = await world();
    expect((await enrol(w, asContacts())).filter((m) => m.crm_lead)).toHaveLength(0);
  });

  it('…and picking leads enrols no contacts', async () => {
    const w = await world();
    expect((await enrol(w)).filter((m) => m.crm_contact)).toHaveLength(0);
  });
});

/**
 * A campaign that is not open, or no longer exists, is refused (#2121).
 *
 * `check_campaign_open` takes `e4` (leads) or `e7` (contacts) only for a
 * campaign in Planning or In Progress. Every other case takes its default
 * edge to the refusing `end` `refuse_not_open`: a Completed or Aborted
 * campaign (enrolling would corrupt its final metrics), and a `recordId` that
 * names no campaign (deleted after the click, or never one). Until #2121 the
 * decision had no edge for those cases, so the run ended on the clean path
 * and the console showed the static "Eligible members enrolled in campaign."
 * over a run that enrolled nobody.
 *
 * Each claim is the run's ending, the member queries it ran and the
 * campaign's member rows, compared in one object. The queries come off the
 * run's terminal `summary` (a refusing `end` records no step of its own
 * there); the refusal is the node's own `config.message`, read off the flow
 * rather than retyped, so what is pinned is WHICH ending fired.
 */
describe('campaign_enrollment — a campaign that is not open, or no longer exists, is refused (#2121)', () => {
  const refusal = (CampaignEnrollmentFlow.nodes.find((n) => n.id === 'refuse_not_open')?.config as Rec | undefined)?.message;

  /** Start the screen on `recordId` as the marketer, submit it, and read what the run did. */
  async function ending(recordId: string, screen: Rec) {
    const run = await verify.flows.run('campaign_enrollment', { recordId }, { as: marketer.token });
    expect(run.status, 'campaign_enrollment did not pause on its screen').toBe('paused');
    const result = (await verify.flows.resume(run, screen, { as: marketer.token })) as Rec;
    const ran = new Set(((result.summary?.nodes ?? []) as Rec[]).filter((n) => n.runs > 0).map((n) => String(n.nodeId)));
    return {
      success: result.success,
      // Set on a refusal only: the clean ending answers `success` and the
      // flow's `successMessage`, with no `status`.
      status: result.status,
      refusalMessage: result.refusalMessage,
      successMessage: result.successMessage,
      ran: { query_leads: ran.has('query_leads'), query_contacts: ran.has('query_contacts') },
      members: (await verify.rows('crm_campaign_member', { crm_campaign: recordId })).length,
    };
  }

  const REFUSED = {
    success: true, status: 'refused', successMessage: undefined,
    ran: { query_leads: false, query_contacts: false }, members: 0,
  };

  it('the refusing ending exists and says something', () => {
    expect(typeof refusal === 'string' && refusal.length > 0, 'no `refuse_not_open` end node with a message').toBe(true);
  });

  it.each([
    ['completed', 'leads'], ['completed', 'contacts'], ['aborted', 'leads'], ['aborted', 'contacts'],
  ] as const)('a %s campaign (%s) is refused, and nobody is enrolled', async (status, memberSource) => {
    const w = await world({ status });
    expect(await ending(w.campaign.id, { ...SCREEN, memberSource }))
      .toEqual({ ...REFUSED, refusalMessage: refusal });
  });

  it.each(['leads', 'contacts'] as const)('a campaign id that names no campaign (%s) is refused, and nobody is enrolled', async (memberSource) => {
    const missing = `no-such-campaign-${++k}`;
    expect(await verify.rows('crm_campaign', { id: missing }), 'the missing campaign exists').toHaveLength(0);
    expect(await ending(missing, { ...SCREEN, memberSource }))
      .toEqual({ ...REFUSED, refusalMessage: refusal });
  });

  it.each([
    ['in_progress', 'leads', { query_leads: true, query_contacts: false }],
    ['in_progress', 'contacts', { query_leads: false, query_contacts: true }],
    ['planning', 'leads', { query_leads: true, query_contacts: false }],
  ] as const)('control: a %s campaign (%s) takes its open edge and enrols', async (status, memberSource, ran) => {
    const w = await world({ status });
    const out = await ending(w.campaign.id, { ...SCREEN, memberSource });
    expect({ ...out, members: out.members > 0 }).toEqual({
      success: true, status: undefined, refusalMessage: undefined,
      successMessage: CampaignEnrollmentFlow.successMessage, ran, members: true,
    });
  });
});

/**
 * `check_refused` routes on one conditional and its default (#2227).
 *
 * `e10` carries the only predicate (`refusedCount != 0`, to `end_refused`);
 * `e11`, to the clean `end`, is the decision's `isDefault` edge with no
 * condition of its own, the form `check_campaign_open`'s `e12` takes above.
 * The two endings it chooses between are pinned on the real engine in
 * `test/campaign-enrollment-doors.test.ts`: "a clean Enroll Members run
 * completes with the static success message" and "a partly refused Enroll
 * Members run reports both counts". This case pins the edge shape those runs
 * cannot tell apart, both measured: with `e11` deleted, a clean run still
 * ends on the clean path, because a decision whose guards all fail simply
 * ends the run; with `e11` left without `isDefault`, it is an unconditional
 * sibling that also runs after `end_refused`, and the refused run still
 * reports `refused`.
 */
describe('campaign_enrollment — `check_refused` takes its default edge on a clean run (#2227)', () => {
  it('has `e10` as its one conditional edge and `e11` as its condition-free default', () => {
    const out = CampaignEnrollmentFlow.edges
      .filter((e) => e.source === 'check_refused')
      .map((e) => ({ id: e.id, target: e.target, isDefault: e.isDefault === true, conditional: e.condition !== undefined }));
    expect(out).toEqual([
      { id: 'e10', target: 'end_refused', isDefault: false, conditional: true },
      { id: 'e11', target: 'end', isDefault: true, conditional: false },
    ]);
  });
});

/**
 * Each segment criterion shows, and is required, only for its own side (#2241).
 *
 * Until #2241 "Enroll leads in status" and "Enroll contacts in department"
 * both showed and both were `required` whatever "Enroll" was set to, so a
 * contacts run had to name a lead status its query never reads. Now each
 * field carries the `visibleWhen` of the branch edge that reads it (`e4` /
 * `e7`). The console draws the fields whose predicate holds over the values
 * on the screen and checks `required` over those only; the server's resume
 * contract skips a hidden field's `required` the same way. Both halves are
 * pinned here: which fields each choice shows, and that a run submitting only
 * what it showed enrols. The control is the visible side's own `required`,
 * which still refuses a submission that leaves it out.
 */
describe('campaign_enrollment — only the chosen source\'s criterion shows, and only it is required (#2241)', () => {
  const visibleFields = (screen: Rec, values: Rec): string[] => {
    const fields = (screen.fields ?? []) as Rec[];
    // The console's scope: every declared field (null when unanswered), then
    // the values on the screen over it.
    const scope: Rec = Object.fromEntries(fields.map((f) => [f.name, null]));
    Object.assign(scope, values);
    return fields.filter((f) => {
      if (!f.visibleWhen) return true;
      const result = ExpressionEngine.evaluate<boolean>({ dialect: 'cel', source: String(f.visibleWhen) } as never, { extra: scope });
      expect(result.ok, `${f.name}.visibleWhen did not evaluate: ${JSON.stringify(result)}`).toBe(true);
      return (result as Rec).value === true;
    }).map((f) => String(f.name));
  };

  it.each([
    ['leads', ['memberSource', 'leadStatus']],
    ['contacts', ['memberSource', 'contactDepartment']],
  ] as const)('Enroll = %s shows only that side\'s criterion', async (memberSource, shown) => {
    const w = await world();
    const run = await verify.flows.run('campaign_enrollment', { recordId: w.campaign.id }, { as: marketer.token });
    expect(run.status, 'campaign_enrollment did not pause on its screen').toBe('paused');
    const screen = ((run as Rec).screen ?? (run as Rec).output?.screen) as Rec | undefined;
    expect(screen?.fields, 'the paused run carries no screen descriptor').toBeTruthy();
    expect(visibleFields(screen!, { memberSource })).toEqual(shown);
  });

  it('a contacts run with no lead status submits and enrols the chosen department', async () => {
    const w = await world();
    const members = await enrol(w, { memberSource: 'contacts', contactDepartment: 'engineering' });
    expect(enrolledKeys(w, members, 'crm_contact')).toEqual(['c_eng', 'c_eng2']);
    expect(members.filter((m) => m.crm_lead), 'a contacts run enrolled a lead').toHaveLength(0);
  });

  it('a leads run with no department submits and enrols the chosen status', async () => {
    const w = await world();
    const members = await enrol(w, { memberSource: 'leads', leadStatus: 'new' });
    expect(enrolledKeys(w, members, 'crm_lead')).toEqual(['l_new', 'l_new2']);
    expect(members.filter((m) => m.crm_contact), 'a leads run enrolled a contact').toHaveLength(0);
  });

  it.each([
    ['contacts', 'contactDepartment', { memberSource: 'contacts', leadStatus: 'new' }],
    ['leads', 'leadStatus', { memberSource: 'leads', contactDepartment: 'engineering' }],
  ] as const)('control: a %s run without its own criterion is still refused, and nobody is enrolled', async (_side, missing, screen) => {
    const w = await world();
    const run = await verify.flows.run('campaign_enrollment', { recordId: w.campaign.id }, { as: marketer.token });
    let refusal: Rec | undefined;
    try {
      const answer = (await verify.flows.resume(run, screen, { as: marketer.token })) as Rec;
      refusal = answer;
    } catch (err) {
      refusal = err as Rec;
    }
    expect(JSON.stringify({ code: refusal?.code, error: refusal?.error, message: refusal?.message }))
      .toContain(`Screen field \\"${missing}\\" is required`);
    expect(await verify.rows('crm_campaign_member', { crm_campaign: w.campaign.id })).toHaveLength(0);
  });
});
