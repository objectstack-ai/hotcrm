// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { CampaignEnrollmentFlow } from '../src/marketing/flows/campaign-enrollment.flow';
import {
  hotcrmStack, signUpPerson, daysFromNow, recordEngineWrites, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Who may enroll a campaign member, through every door the app ships (#2167).
 *
 * Ruled on #2167 (Q1 letter B): every enrollment door writes in the CALLER'S
 * context, so `crm_campaign_member`'s own `allowCreate` is the one gate. The
 * three doors are **Enroll Members** on a campaign (`campaign_enrollment`),
 * and **Add to Campaign** on a lead (`create_campaign`) and on a contact
 * (`add_contact_to_campaign`), both flow actions over the side's one
 * enroll-one-person flow. **Mark Responded** (`mark_responded`) is a
 * caller-context update the same way, so the member's own `allowEdit` decides.
 *
 * `sales_rep` and `sales_manager` declare `allowCreate: false` and
 * `allowEdit: false` on the member object, and say enrollment belongs to
 * marketing; until #2167 two elevated sub-flows and two elevated script
 * bodies let them enroll anyway, and an elevated `mark_responded` let them
 * record a response. `marketing_user` and the administrator hold both rights.
 *
 * Q2 letter a: when anyone was refused, Enroll Members ends with outcome
 * `refused` and a message giving both counts; a clean run ends `completed`
 * with the flow's static `successMessage`, after the result screen (#2371 row 1).
 *
 * Every door is driven the way its caller drives it, through
 * `@objectstack/verify` over the shipped app, and the stored rows are read
 * back. Each refusal is asserted by its envelope (`code` + `status`) and by
 * the row that was NOT written.
 */

const actions: Rec[] = (stack as Rec).actions ?? [];
const actionNamed = (name: string): Rec => {
  const a = actions.find((x) => x.name === name);
  if (!a) throw new Error(`no ${name} action registered`);
  return a;
};

let verify: VerifyStack;
const who: Record<string, Person> = {};
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  for (const set of ['sales_rep', 'sales_manager', 'marketing_user']) {
    who[set] = await signUpPerson(verify, `${set}@campaign-enrollment-doors.test`, {
      name: `Doors ${set}`, positions: [set], permissionSets: [set],
    });
  }
  const adminToken = await verify.signIn();
  who.admin = { token: adminToken, id: String((await verify.contextFor(adminToken)).userId) };
}, 180_000);

/**
 * The budget of the cases whose Enroll Members run writes members: the clean
 * runs and the partly refused one. Such a run enrolls every eligible lead the
 * caller can see, and that set grows with each `world()`. Measured: about 2 s
 * alone, about 4.3 s beside two other booted files under coverage (as CI runs
 * the suite), and the partly refused case ran past the 5 s default on CI once.
 */
const ENROLL_BUDGET_MS = 30_000;

/** The personas whose sets refuse both rights, and those that hold them. */
const REFUSED = ['sales_rep', 'sales_manager'] as const;
const ALLOWED = ['marketing_user', 'admin'] as const;

/**
 * An open campaign, two eligible leads and one eligible contact, owned by
 * `owner` so the caller can see them: `crm_lead` is `sharingModel: 'private'`,
 * and a door loads its subject record under the caller's own scope.
 */
async function world(owner: Person) {
  const n = ++k;
  const [campaign] = await verify.seed('crm_campaign', [{
    name: `Doors ${n}`, status: 'in_progress', start_date: daysFromNow(-3), end_date: daysFromNow(30),
    owner_id: who.marketing_user!.id,
  }]);
  const lead = async (key: string) => (await verify.seed('crm_lead', [{
    first_name: 'Dora', last_name: `${key} ${n}`, company: `Doors ${key} ${n}`,
    email: `${key}.${n}@campaign-enrollment-doors.test`, status: 'new', is_converted: false,
    email_opt_out: false, owner_id: owner.id,
  }]))[0]!;
  const [account] = await verify.seed('crm_account', [{ name: `Doors Account ${n}`, owner_id: owner.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Cora', last_name: `Doors ${n}`, crm_account: account!.id, department: 'engineering',
    email: `contact.${n}@campaign-enrollment-doors.test`, email_opt_out: false, owner_id: owner.id,
  }]);
  return { campaign: campaign!, leadA: await lead('a'), leadB: await lead('b'), contact: contact! };
}

const membersOf = (campaignId: string, where: Rec = {}) =>
  verify.rows('crm_campaign_member', { crm_campaign: campaignId, ...where });

/** Settle a door: its value, or the refusal envelope it answered. */
const settle = async (p: Promise<unknown>): Promise<{ ok: true; value: Rec } | { ok: false; code?: string; status?: number; message: string }> => {
  try {
    return { ok: true, value: (await p) as Rec };
  } catch (err) {
    const e = err as Rec;
    return { ok: false, code: e.code, status: e.status, message: String(e.message) };
  }
};

const addLead = (as: Person, leadId: string, campaignId: string) =>
  verify.actions.run('crm_lead', 'create_campaign', { as: as.token, recordId: leadId, params: { campaignId } });
const addContact = (as: Person, contactId: string, campaignId: string) =>
  verify.actions.run('crm_contact', 'add_contact_to_campaign', { as: as.token, recordId: contactId, params: { campaignId } });

/** Enroll Members, as the console runs it: start on the campaign, submit the screen. */
async function enrollMembers(as: Person, campaignId: string, memberSource: 'leads' | 'contacts' = 'leads'): Promise<Rec> {
  const run = await verify.flows.run('campaign_enrollment', { recordId: campaignId }, { as: as.token });
  expect(run.status, 'campaign_enrollment did not pause on its screen').toBe('paused');
  return (await verify.flows.resume(run, { memberSource, leadStatus: 'new', contactDepartment: 'engineering' }, { as: as.token })) as Rec;
}

/**
 * The counts the refused ending reports, read off its message. Since #2371
 * row 1 it names all four: added, already members, skipped, refused.
 */
const countsIn = (message: unknown): { enrolled: number; already: number; skipped: number; refused: number } => {
  const m = /: (\d+) added, (\d+) already members, (\d+) skipped because they opted out of email or have no email address, (\d+) refused\./.exec(String(message));
  expect(m, `no counts in the refusal message: ${String(message)}`).toBeTruthy();
  return { enrolled: Number(m![1]), already: Number(m![2]), skipped: Number(m![3]), refused: Number(m![4]) };
};

describe('a profile without allowCreate is refused at every enrollment door (#2167)', () => {
  it.each(REFUSED)('%s: the data door itself refuses the insert (the control)', async (persona) => {
    const w = await world(who[persona]!);
    const insert = await settle(verify.hooks.run('crm_campaign_member', 'insert', {
      crm_campaign: w.campaign.id, crm_lead: w.leadA.id, status: 'sent',
    }, { as: who[persona]!.token }));
    expect(insert).toMatchObject({ ok: false, code: 'PERMISSION_DENIED', status: 403 });
  });

  it.each(REFUSED)('%s: Add to Campaign on a lead is refused, and no member is written', async (persona) => {
    const w = await world(who[persona]!);
    const answer = await settle(addLead(who[persona]!, w.leadA.id, w.campaign.id));
    expect(answer).toMatchObject({ ok: false, code: 'FLOW_FAILED', status: 400 });
    // The failed step is the insert itself: the dedupe read ran as the caller
    // and passed, and the member object's own allowCreate said no.
    expect((answer as Rec).message).toContain("Node 'create_campaign_member' failed");
    expect(await membersOf(w.campaign.id)).toHaveLength(0);
  });

  it.each(REFUSED)('%s: Add to Campaign on a contact is refused, and no member is written', async (persona) => {
    const w = await world(who[persona]!);
    const answer = await settle(addContact(who[persona]!, w.contact.id, w.campaign.id));
    expect(answer).toMatchObject({ ok: false, code: 'FLOW_FAILED', status: 400 });
    expect((answer as Rec).message).toContain("Node 'create_contact_member' failed");
    expect(await membersOf(w.campaign.id)).toHaveLength(0);
  });

  it.each(REFUSED)('%s: Enroll Members ends refused, counting every eligible lead as refused and none enrolled', async (persona) => {
    const w = await world(who[persona]!);
    const result = await enrollMembers(who[persona]!, w.campaign.id);
    expect(result).toMatchObject({ success: true, status: 'refused' });
    expect(result.successMessage, 'a refused run has nothing to toast').toBeUndefined();
    const counts = countsIn(result.refusalMessage);
    expect(counts.enrolled).toBe(0);
    // At least this world's two leads; the persona may see other eligible leads too.
    expect(counts.refused).toBeGreaterThanOrEqual(2);
    expect(await membersOf(w.campaign.id), 'a refused run enrolled somebody').toHaveLength(0);
  });

  it.each(REFUSED)('%s: Enroll Members on contacts ends refused the same way', async (persona) => {
    const w = await world(who[persona]!);
    const result = await enrollMembers(who[persona]!, w.campaign.id, 'contacts');
    expect(result).toMatchObject({ success: true, status: 'refused' });
    expect(countsIn(result.refusalMessage)).toMatchObject({ enrolled: 0 });
    expect(await membersOf(w.campaign.id)).toHaveLength(0);
  });
});

describe('a profile with allowCreate enrolls through every door, as itself (#2167)', () => {
  it.each(ALLOWED)('%s: Add to Campaign on a lead enrolls it, and a second run skips it', async (persona) => {
    const w = await world(who[persona]!);
    const first = await addLead(who[persona]!, w.leadA.id, w.campaign.id) as Rec;
    // The success toast's counts (#2371 row 1): one added, none already on it.
    expect(first).toMatchObject({
      success: true, output: { enrolled: true, addedCount: 1, alreadyCount: 0, campaignName: w.campaign.name },
    });
    const rows = await membersOf(w.campaign.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ crm_lead: w.leadA.id, status: 'sent' });
    expect(rows[0]!.crm_contact ?? null).toBeNull();
    expect(rows[0]!.added_date, 'the object default stamps every insert (#2142)').toBeTruthy();
    // Written as the caller: the row names who enrolled it.
    expect(rows[0]!.created_by).toBe(who[persona]!.id);

    const again = await addLead(who[persona]!, w.leadA.id, w.campaign.id) as Rec;
    // A re-run says so instead of "added" (#2371 row 1).
    expect(again).toMatchObject({
      success: true, output: { enrolled: false, addedCount: 0, alreadyCount: 1, campaignName: w.campaign.name },
    });
    expect(await membersOf(w.campaign.id), 'a re-run double-enrolled the lead').toHaveLength(1);
  });

  it.each(ALLOWED)('%s: Add to Campaign on a contact enrolls it with no lead, and a second run skips it', async (persona) => {
    const w = await world(who[persona]!);
    const first = await addContact(who[persona]!, w.contact.id, w.campaign.id) as Rec;
    expect(first).toMatchObject({
      success: true, output: { enrolled: true, addedCount: 1, alreadyCount: 0, campaignName: w.campaign.name },
    });
    const rows = await membersOf(w.campaign.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ crm_contact: w.contact.id, status: 'sent' });
    expect(rows[0]!.crm_lead ?? null, 'a contact member must not also claim a lead').toBeNull();

    const again = await addContact(who[persona]!, w.contact.id, w.campaign.id) as Rec;
    expect(again).toMatchObject({
      success: true, output: { enrolled: false, addedCount: 0, alreadyCount: 1, campaignName: w.campaign.name },
    });
    expect(await membersOf(w.campaign.id)).toHaveLength(1);
  });

  it.each(ALLOWED)('%s: a clean Enroll Members run ends on its result screen, then completes', async (persona) => {
    const w = await world(who[persona]!);
    const paused = await enrollMembers(who[persona]!, w.campaign.id);
    // The counts are on the result screen (#2371 row 1), with a link back to
    // the campaign; Submit completes the run with a neutral sentence.
    expect(paused.status, 'a clean run did not stop on its result screen').toBe('paused');
    const screen = (paused.screen ?? paused.output?.screen) as Rec;
    expect(screen?.nodeId).toBe('result');
    expect(String(screen.description)).toMatch(/^\d+ added to the campaign, \d+ already members, \d+ skipped because they opted out of email or have no email address\.$/);
    expect((screen.fields as Rec[]).find((f) => f.name === 'campaignLink')?.defaultValue).toBe(w.campaign.id);
    const result = (await verify.flows.resume(paused as never, {}, { as: who[persona]!.token })) as Rec;
    expect(result.success).toBe(true);
    expect(result.status, 'a clean run is a terminal success, not a refusal').not.toBe('refused');
    expect(result.refusalMessage).toBeUndefined();
    expect(result.successMessage).toBe(CampaignEnrollmentFlow.successMessage);
    expect(result.successMessage).toBe('Campaign enrollment finished.');
    const enrolled = (await membersOf(w.campaign.id)).map((m) => m.crm_lead);
    expect(enrolled).toEqual(expect.arrayContaining([w.leadA.id, w.leadB.id]));
  }, ENROLL_BUDGET_MS);
});

/**
 * A campaign id that names no campaign is refused at both Add to Campaign
 * doors, and no member row is written (#2073 item 6).
 *
 * Until #2167 both actions were script bodies. A script body runs elevated by
 * platform design, and a system write is exempt from the engine's write-time
 * reference check, so a value that named no campaign was stored as typed. On
 * the 2026-10-12 hosted pass, a campaign NAME typed into the bulk bar's text
 * box answered 200 and wrote a member row that no user could read back. The
 * campaign metric hooks then logged `Record … not found in crm_campaign` on
 * every later write that touched it.
 *
 * Written as the caller now, the flow's insert would meet that check. Since
 * #2336 the run does not reach the insert: the flow reads the campaign first,
 * finds none, and ends refused at its open-campaign gate, saying so. Nothing
 * names the lead at all. The value sent is the campaign's own name, which is
 * the shape the hosted pass typed. The control is the block above: the same
 * door, with the campaign's id, enrolls.
 *
 * The rows are read as the SYSTEM (`verify.rows` without `as`). Such a row is
 * invisible to every user: its access derives from a master that does not
 * exist, so a read as the caller would come back empty either way.
 */
describe('a campaign id that names no campaign is refused at both Add to Campaign doors (#2073 item 6)', () => {
  it.each(ALLOWED)('%s: Add to Campaign on a lead is refused at the campaign gate, and no member is written', async (persona) => {
    const w = await world(who[persona]!);
    const typed = String(w.campaign.name);
    const answer = await addLead(who[persona]!, w.leadA.id, typed) as Rec;
    expect(answer).toMatchObject({ success: true, status: 'refused', output: { enrolled: false } });
    expect(answer.refusalMessage, 'the refusal says why').toBeTruthy();
    expect(await membersOf(typed), 'a member row names a campaign that does not exist').toHaveLength(0);
    expect(await verify.rows('crm_campaign_member', { crm_lead: w.leadA.id })).toHaveLength(0);
  });

  it.each(ALLOWED)('%s: Add to Campaign on a contact is refused at the campaign gate, and no member is written', async (persona) => {
    const w = await world(who[persona]!);
    const typed = String(w.campaign.name);
    const answer = await addContact(who[persona]!, w.contact.id, typed) as Rec;
    expect(answer).toMatchObject({ success: true, status: 'refused', output: { enrolled: false } });
    expect(answer.refusalMessage, 'the refusal says why').toBeTruthy();
    expect(await membersOf(typed), 'a member row names a campaign that does not exist').toHaveLength(0);
    expect(await verify.rows('crm_campaign_member', { crm_contact: w.contact.id })).toHaveLength(0);
  });
});

describe('a partly refused Enroll Members run reports both counts (#2167, Q2 letter a)', { timeout: ENROLL_BUDGET_MS }, () => {
  it('ends refused with the enrolled and refused counts, and writes every member it was allowed to', async () => {
    const marketer = who.marketing_user!;
    const w = await world(marketer);
    // Stage ONE refused insert — the shape a permission refusal takes at the
    // engine — for leadB, and let every other insert through.
    const engine = recordEngineWrites(verify, (op, object, args) => {
      const doc = args[1] as Rec | undefined;
      if (op !== 'insert' || object !== 'crm_campaign_member' || doc?.crm_lead !== w.leadB.id) return undefined;
      return Object.assign(new Error('You do not have permission to perform this action.'), { code: 'PERMISSION_DENIED', status: 403 });
    });
    let result: Rec;
    try {
      result = await enrollMembers(marketer, w.campaign.id);
    } finally {
      engine.restore();
    }
    expect(engine.of('crm_campaign_member', 'insert').some((write) => (write.args[1] as Rec)?.crm_lead === w.leadB.id),
      'the staged refusal never met an insert — the harness did not reach the flow\'s write').toBe(true);

    expect(result!).toMatchObject({ success: true, status: 'refused' });
    const rows = await membersOf(w.campaign.id);
    const counts = countsIn(result!.refusalMessage);
    expect({ enrolled: counts.enrolled, already: counts.already, refused: counts.refused }).toEqual({ enrolled: rows.length, already: 0, refused: 1 });
    expect(result!.refusalMessage).toBe(
      `Enrollment refused for 1 of the people selected: ${rows.length} added, 0 already members, `
        + `${counts.skipped} skipped because they opted out of email or have no email address, 1 refused. `
        + 'A refused person was not added to the campaign; the flow run log records why for each one.',
    );
    const leads = rows.map((m) => m.crm_lead);
    expect(leads).toContain(w.leadA.id);
    expect(leads, 'the refused lead was enrolled anyway').not.toContain(w.leadB.id);
  });
});

describe('Mark Responded is the caller\'s own update (#2167)', () => {
  const sentMember = async (owner: Person) => {
    const w = await world(owner);
    const [member] = await verify.seed('crm_campaign_member', [{ crm_campaign: w.campaign.id, crm_lead: w.leadA.id, status: 'sent' }]);
    return member!;
  };
  const markResponded = (as: Person, memberId: string) =>
    verify.actions.run('crm_campaign_member', 'mark_responded', { as: as.token, recordId: memberId, params: {} });

  it.each(REFUSED)('%s: refused, and the member stays at Sent', async (persona) => {
    const member = await sentMember(who[persona]!);
    const answer = await settle(markResponded(who[persona]!, member.id));
    expect(answer).toMatchObject({ ok: false, code: 'PERMISSION_DENIED', status: 403 });
    const [row] = await verify.rows('crm_campaign_member', { id: member.id });
    expect(row).toMatchObject({ status: 'sent', has_responded: false });
    expect(row!.response_date ?? null).toBeNull();
  });

  it.each(ALLOWED)('%s: records the response, and the member hook stamps the two response fields', async (persona) => {
    const member = await sentMember(who[persona]!);
    await markResponded(who[persona]!, member.id);
    const [row] = await verify.rows('crm_campaign_member', { id: member.id });
    expect(row).toMatchObject({ status: 'responded', has_responded: true });
    expect(typeof row!.response_date, 'a responded member needs a response date').toBe('string');
    expect(row!.updated_by, 'the write is the caller\'s').toBe(who[persona]!.id);
  });
});

/**
 * The console offers each door only where it can succeed: `visible` asks
 * `current_user.can(…)` of the effective object permissions the server
 * publishes at `/auth/me/permissions`, the map the console evaluates it
 * against. The server refusal above is the gate; this is the offer.
 */
describe('each door is offered only to a caller who holds the right it exercises (#2167)', () => {
  const permissionsOf = async (persona: string): Promise<Rec> => {
    const res = await verify.apiAs(who[persona]!.token, 'GET', '/auth/me/permissions');
    expect(res.status, await res.clone().text()).toBe(200);
    const body: Rec = await res.json();
    const objects = (body.data ?? body).objects;
    expect(objects, 'the permissions answer carries no objects map').toBeTruthy();
    return objects;
  };
  const offered = async (actionName: string, persona: string, record: Rec): Promise<boolean> => {
    const result = ExpressionEngine.evaluate<boolean>(actionNamed(actionName).visible, {
      user: { id: who[persona]!.id, positions: [persona] },
      record,
      permissions: (await permissionsOf(persona)) as never,
    });
    expect(result.ok, `${actionName}.visible did not evaluate for ${persona}: ${JSON.stringify(result)}`).toBe(true);
    return (result as Rec).value === true;
  };
  const DOORS: [string, Rec][] = [
    ['enroll_leads', { status: 'in_progress' }],
    ['create_campaign', {}],
    ['add_contact_to_campaign', { email_opt_out: false }],
    ['mark_responded', { status: 'sent' }],
  ];

  it.each(DOORS)('%s is hidden from sales_rep and sales_manager', async (name, record) => {
    for (const persona of REFUSED) expect(await offered(name, persona, record), `${name} offered to ${persona}`).toBe(false);
  });

  it.each(DOORS)('%s is offered to marketing_user and the admin', async (name, record) => {
    for (const persona of ALLOWED) expect(await offered(name, persona, record), `${name} hidden from ${persona}`).toBe(true);
  });
});

/**
 * Where Add to Campaign on a lead is drawn, and that both of its doors still
 * enroll (#2073 item 5).
 *
 * The action runs on exactly one record. Declared at `list_toolbar` as well, it
 * was a header button on every lead view that names it in no `bulkActions` —
 * seven of them, measured on 18.0.0-next.5 — drawn with nothing selected: it
 * ran the whole Campaign dialog, then refused in English and sent nothing. It
 * is drawn at two doors now: each row's menu (`list_item`), and the selection
 * bar All Leads opens by naming it in `bulkActions`. The bar fans out one run
 * per ticked row, each carrying that row's `recordId`, which is the call the
 * row menu makes for its one row.
 */
describe('Add to Campaign on a lead is drawn on the row menu and the selection bar, not the list header (#2073 item 5)', () => {
  const views: Rec[] = (stack as Rec).views ?? [];

  it('declares the row menu as its only location', () => {
    expect(actionNamed('create_campaign').locations).toEqual(['list_item']);
  });

  it('All Leads still opens the selection bar on it, in the per-record bare-string form', () => {
    const allLeads = views.map((v) => v.list).find((l) => l?.name === 'all_leads');
    expect(allLeads, 'no all_leads list view').toBeTruthy();
    expect(allLeads!.bulkActions).toContain('create_campaign');
    expect(actionNamed('create_campaign')).toMatchObject({ type: 'flow', recordIdParam: 'leadId' });
  });

  it('one run per ticked row enrolls every row on the one campaign', async () => {
    const marketer = who.marketing_user!;
    const w = await world(marketer);
    for (const lead of [w.leadA, w.leadB]) {
      expect(await addLead(marketer, lead.id, w.campaign.id)).toMatchObject({ success: true, output: { enrolled: true } });
    }
    const enrolled = (await membersOf(w.campaign.id)).map((m) => m.crm_lead).sort();
    expect(enrolled).toEqual([w.leadA.id, w.leadB.id].sort());
  }, ENROLL_BUDGET_MS);
});

/**
 * Add to Campaign on a contact takes the same two doors (#2073 item 5b).
 *
 * The contact-side twin of the case above. Its header button drew nowhere
 * even while it declared `list_toolbar`, measured on the three contact views
 * on 18.0.0-next.5, but only because its `visible` reads
 * `record.email_opt_out` and a list header binds no record. So the placement
 * is pinned on its own, and not left to that predicate. The row door's run is
 * pinned by the #2167 blocks above (`addContact`).
 */
describe('Add to Campaign on a contact is declared on the row menu only, like the lead action (#2073 item 5b)', () => {
  const views: Rec[] = (stack as Rec).views ?? [];

  it('declares the row menu as its only location', () => {
    expect(actionNamed('add_contact_to_campaign').locations).toEqual(['list_item']);
  });

  it('All Contacts still opens the selection bar on it, in the per-record bare-string form', () => {
    const allContacts = views.map((v) => v.list).find((l) => l?.name === 'all_contacts');
    expect(allContacts, 'no all_contacts list view').toBeTruthy();
    expect(allContacts!.bulkActions).toContain('add_contact_to_campaign');
    expect(actionNamed('add_contact_to_campaign')).toMatchObject({ type: 'flow', recordIdParam: 'contactId' });
  });
});
