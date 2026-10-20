// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { templateEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import { LeadConversionFlow } from '../src/sales/flows/lead-conversion.flow';
import { localePacks } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The Convert Lead screen says which account the lead will join (#2073 item 8).
 *
 * Before, the screen asked only "Create Opportunity?" and `find_account` ran
 * after it, so the account was matched by company name in silence. Measured on
 * 18.0.0-next.5 in the console, as a `sales_rep` in en-US and zh-CN: the
 * dialog read "Conversion Details / Create Opportunity?" on every path.
 *
 * Now `find_account` runs ahead of the screen, `compose_account_notice` binds
 * exactly one of `existingAccountName` / `newAccountName` from that one read,
 * and the screen's body text (one template, translated whole in every pack)
 * names the existing account, or the new account it will create. The submit
 * branches on the same read, so what the screen says is what is done.
 *
 * ⚠️ The match is the converting rep's own view: the flow runs as the user, so
 * an account the rep may not read is never found and never named. The two
 * hidden-account cases below pin what that means, measured on the same
 * engine before and after this change (unchanged by it): with the SAME name,
 * the submit is refused by the per-organization unique account name and
 * nothing is written; with a name that differs only in case or spacing, a
 * second account with the same match key is created. The screen tells the rep
 * a new account will be created in both, which is true from where the rep
 * stands; it can say no more without naming an account the rep cannot read.
 */

const flowNodes = LeadConversionFlow.nodes as Rec[];
const flowEdges = LeadConversionFlow.edges as Rec[];
const screen1 = flowNodes.find((n) => n.id === 'screen_1')!;

/** Node ids reachable from `from`, never walking out of `stopAt`. */
function reachable(from: string, stopAt?: string): Set<string> {
  const seen = new Set<string>([from]);
  const queue = [from];
  while (queue.length) {
    const id = queue.shift()!;
    if (id === stopAt) continue;
    for (const e of flowEdges.filter((x) => x.source === id)) {
      if (!seen.has(e.target)) { seen.add(e.target); queue.push(e.target); }
    }
  }
  return seen;
}

describe('the account match is read before the screen, and only there (#2073 item 8)', () => {
  it('find_account and the notice run ahead of screen_1, and nothing ahead of it writes', () => {
    const before = reachable('start', 'screen_1');
    expect(before.has('screen_1'), 'screen_1 is unreachable').toBe(true);
    expect(before.has('find_account'), 'the match runs after the screen again — it cannot be shown').toBe(true);
    expect(before.has('compose_account_notice')).toBe(true);
    const writers = flowNodes
      .filter((n) => before.has(n.id) && n.id !== 'screen_1')
      .filter((n) => ['create_record', 'update_record', 'delete_record', 'subflow', 'notify'].includes(n.type))
      .map((n) => n.id);
    expect(writers, 'a write now runs before the rep has submitted the screen').toEqual([]);
  });

  it('the submit acts on that one read: no match runs after the screen', () => {
    const after = reachable('screen_1');
    expect(after.has('decision_account'), 'the account branch is unreachable after the screen').toBe(true);
    expect(after.has('find_account'), 'a second match after the screen could pick another account than the one named').toBe(false);
  });
});

/**
 * Every shipped locale renders the notice for both branches, through the
 * platform's own template renderer (`templateEngine`, which the screen
 * executor's `renderTextSlot` calls). The authored template is the English
 * text; each other pack translates the whole template. The business fact
 * pinned: for the SAME company name, the rep can tell an existing account from
 * a new one, in every language.
 */
describe('the account notice reads right for both branches in every locale (#2073 item 8)', () => {
  const NAME = 'Northwind Energy';
  const templates: Array<[string, string]> = [
    ['en (authored)', String(screen1.config.description)],
    ...localePacks
      .filter(([, pack]) => pack?.flows?.lead_conversion !== undefined)
      .map(([locale, pack]) => [locale, String(pack.flows.lead_conversion.screens?.screen_1?.description ?? '')] as [string, string]),
  ];
  const render = (source: string, vars: Rec): string => {
    const r = templateEngine.evaluate({ dialect: 'template', source }, { extra: { duplicateWarning: null, ...vars } } as Rec);
    if (!r.ok) throw new Error(`does not render: ${r.error.message}`);
    return String(r.value);
  };

  it('every non-English pack translates the screen', () => {
    const translated = templates.map(([locale]) => locale).filter((l) => !l.startsWith('en')).sort();
    const shipped = localePacks.map(([locale]) => locale).filter((l) => l !== 'en').sort();
    expect(translated).toEqual(shipped);
  });

  it.each(templates)('%s: names the account, and says existing or new', (_locale, source) => {
    expect(source.startsWith('{{duplicateWarning}}'), 'the duplicate warning no longer leads the body text').toBe(true);
    const existing = render(source, { existingAccountName: NAME, newAccountName: null });
    const created = render(source, { existingAccountName: null, newAccountName: NAME });
    for (const text of [existing, created]) {
      expect(text.split(NAME).length - 1, `the account name is not said exactly once: ${text}`).toBe(1);
    }
    // Strip the name: what is left is the branch's own words, and they must
    // differ, or "existing" and "new" read the same for the same company.
    const words = (t: string) => t.replace(NAME, '').trim();
    expect(words(existing)).not.toBe(words(created));
    expect(words(existing).length).toBeGreaterThan(0);
    expect(words(created).length).toBeGreaterThan(0);
  });

  it('the duplicate warning still shows, ahead of the notice', () => {
    const warning = 'Suspected duplicate — compare first.';
    for (const [, source] of templates) {
      const text = render(source, { duplicateWarning: warning, existingAccountName: NAME, newAccountName: null });
      expect(text.startsWith(warning)).toBe(true);
      expect(text).toContain(NAME);
    }
  });
});

// ── The four paths, as a sales rep, on the real engine ─────────────────────

let verify: VerifyStack;
let rep: Person;
let colleague: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  // Two reps who own their own accounts and nothing else: `crm_account` is
  // `sharingModel: 'private'`, so neither reads the other's.
  rep = await signUpPerson(verify, 'rep@lead-conversion-account-notice.test', {
    name: 'Notice Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  colleague = await signUpPerson(verify, 'colleague@lead-conversion-account-notice.test', {
    name: 'Notice Colleague', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const fold = (v: string): string => v.trim().toLowerCase().replace(/\s+/g, ' ');

const accountAs = (owner: Person, name: string) =>
  verify.hooks.run('crm_account', 'insert', { name, is_active: true }, { as: owner.token });

const leadFor = (company: string) => {
  const n = ++k;
  return verify.hooks.run('crm_lead', 'insert', {
    company, email: `buyer${n}@lead-conversion-account-notice.test`, first_name: 'Pat', last_name: `Notice${n}`,
    lead_source: 'web', status: 'qualified',
  }, { as: rep.token });
};

/** Start the conversion as the rep: the screen it pauses on. */
async function screenFor(leadId: string): Promise<{ started: Rec; description: string }> {
  const started = await verify.flows.run('lead_conversion', { recordId: leadId }, { as: rep.token }) as Rec;
  const screen = started.screen ?? started.output?.screen;
  expect(screen?.nodeId, 'the conversion did not pause on its screen').toBe('screen_1');
  return { started, description: String(screen.description ?? '') };
}

/** Submit the screen as the console does (its prefilled bag), box unticked; the refusal envelope if it threw. */
async function submit(started: Rec): Promise<{ ok: true } | { ok: false; code?: string; status?: number; message: string }> {
  const screen = started.screen ?? started.output?.screen;
  const prefilled: Rec = {};
  for (const f of (screen?.fields ?? []) as Rec[]) if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
  try {
    await verify.flows.resume(started as never, { ...prefilled, createOpportunity: false }, { as: rep.token });
    return { ok: true };
  } catch (err) {
    const e = err as Rec;
    return { ok: false, code: e.code, status: e.status, message: String(e.message) };
  }
}

const keyed = (name: string) => verify.rows('crm_account', { name_normalized: fold(name) });
const leadRow = async (id: string) => (await verify.rows('crm_lead', { id }))[0]!;

const EXISTING = 'is the existing account this lead will join.';
const CREATES = 'No account you can see matches the company on this lead, so converting creates a new account named';

describe('as a sales rep, the screen names the account each path ends on (#2073 item 8)', () => {
  it('an account the rep can see: named as the existing account, and the lead joins it', async () => {
    const n = ++k;
    const account = await accountAs(rep, `Visible Co ${n}`);
    // The lead's spelling differs in case and spacing: the notice names the
    // ACCOUNT's spelling, the one the rep will find in Accounts.
    const lead = await leadFor(`VISIBLE  co ${n}`);
    const { started, description } = await screenFor(lead.id);
    expect(description.trim()).toBe(`Visible Co ${n} ${EXISTING}`);

    expect(await submit(started)).toEqual({ ok: true });
    expect((await leadRow(lead.id)).converted_account, 'the lead joined another account than the one named').toBe(account.id);
    expect((await keyed(`Visible Co ${n}`)).map((a) => a.id), 'a second account was created').toEqual([account.id]);
  });

  it('no account matches: names the new account, and the lead joins the one it creates', async () => {
    const n = ++k;
    const lead = await leadFor(`Fresh Co ${n}`);
    const { started, description } = await screenFor(lead.id);
    expect(description.trim()).toBe(`${CREATES} Fresh Co ${n}.`);

    expect(await submit(started)).toEqual({ ok: true });
    const created = await keyed(`Fresh Co ${n}`);
    expect(created.map((a) => [a.name, a.owner_id]), 'not exactly one new account, owned by the rep').toEqual([[`Fresh Co ${n}`, rep.id]]);
    expect((await leadRow(lead.id)).converted_account).toBe(created[0]!.id);
  });

  it('the account the screen named is deleted before the submit: nothing is written, and no other account is used', async () => {
    // The window this change opens: the match is read when the screen is
    // served, and the submit acts on that read. Measured before the change,
    // the same run matched again at submit, found nothing and created a NEW
    // account the rep was never told about. Now the submit cannot attach the
    // contact to the deleted account, and is refused before any write.
    const n = ++k;
    const account = await accountAs(rep, `Gone Co ${n}`);
    const lead = await leadFor(`Gone Co ${n}`);
    const { started, description } = await screenFor(lead.id);
    expect(description.trim()).toBe(`Gone Co ${n} ${EXISTING}`);
    // An administrator's delete while the dialog is open (a rep may not delete accounts).
    await verify.kernel.getService<Rec>('objectql').delete('crm_account', { where: { id: account.id }, context: { isSystem: true } });

    const answer = await submit(started) as Rec;
    expect({ ok: answer.ok, code: answer.code, status: answer.status }, 'the submit was not refused')
      .toEqual({ ok: false, code: 'FLOW_FAILED', status: 400 });
    expect(Boolean((await leadRow(lead.id)).is_converted), 'the lead was converted').toBe(false);
    expect(await keyed(`Gone Co ${n}`), 'the submit created an account the screen never named').toHaveLength(0);
  });

  it('a colleague\'s account the rep cannot see, same name: the screen says new, the submit is refused, nothing is written', async () => {
    const n = ++k;
    const hidden = await accountAs(colleague, `Hidden Co ${n}`);
    expect(await verify.rows('crm_account', { id: hidden.id }, { as: rep.token }), 'the rep can read the colleague\'s account')
      .toHaveLength(0);
    const lead = await leadFor(`Hidden Co ${n}`);
    const { started, description } = await screenFor(lead.id);
    expect(description.trim()).toBe(`${CREATES} Hidden Co ${n}.`);

    const answer = await submit(started) as Rec;
    expect({ ok: answer.ok, code: answer.code, status: answer.status }, 'the submit was not refused')
      .toEqual({ ok: false, code: 'FLOW_FAILED', status: 400 });
    expect(answer.message, 'refused by something other than the unique account name').toContain('Duplicate record refused');
    expect(Boolean((await leadRow(lead.id)).is_converted), 'the lead was converted').toBe(false);
    expect((await keyed(`Hidden Co ${n}`)).map((a) => a.id)).toEqual([hidden.id]);
  });

  it('a colleague\'s account the rep cannot see, same key only: the screen says new, and a second account is created', async () => {
    const n = ++k;
    const hidden = await accountAs(colleague, `Hidden Near ${n}`);
    const lead = await leadFor(`HIDDEN   near ${n}`);
    const { started, description } = await screenFor(lead.id);
    expect(description.trim()).toBe(`${CREATES} HIDDEN   near ${n}.`);
    expect(description, 'the screen named an account the rep cannot read').not.toContain(`Hidden Near ${n}`);

    expect(await submit(started)).toEqual({ ok: true });
    const accounts = await keyed(`Hidden Near ${n}`);
    const mine = accounts.filter((a) => a.id !== hidden.id);
    expect(mine.map((a) => [a.name, a.owner_id])).toEqual([[`HIDDEN   near ${n}`, rep.id]]);
    expect((await leadRow(lead.id)).converted_account).toBe(mine[0]!.id);
  });
});
