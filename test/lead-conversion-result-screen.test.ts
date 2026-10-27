// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { templateEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import { LeadConversionFlow } from '../src/sales/flows/lead-conversion.flow';
import { localePacks } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Lead conversion ends on a result screen (#2285 ruling B, second half; #2297).
 *
 * Measured on 18.1.0 before this change: the conversion completed on the
 * console's toast "Lead converted successfully!", the dialog closed, and the
 * rep stayed on the lead with no link to the account, contact or opportunity
 * just created, and no word that the new account had gone to a sales
 * manager's approval inbox.
 *
 * Now the run pauses, after every write, on the `result` screen: one
 * `record_link` field each for the account, the contact and the opportunity
 * (`@objectstack/spec` 18.2.0), and a sentence saying whether the account is
 * waiting on an approval. The business facts pinned here: the links point at
 * the records the lead now names as its conversion, and the approval sentence
 * says what the account itself holds, in every locale.
 */

const flowNodes = LeadConversionFlow.nodes as Rec[];
const flowEdges = LeadConversionFlow.edges as Rec[];
const result = flowNodes.find((n) => n.id === 'result')!;

describe('the result screen is the end of the run (#2297)', () => {
  it('every write is behind it, and it leads only to the end', () => {
    expect(result?.type).toBe('screen');
    // Walk back from `result`: every node that writes must be upstream of it,
    // so a rep who closes the dialog instead of submitting it loses nothing.
    const upstream = new Set<string>(['result']);
    let grew = true;
    while (grew) {
      grew = false;
      for (const e of flowEdges) {
        if (upstream.has(e.target) && !upstream.has(e.source)) { upstream.add(e.source); grew = true; }
      }
    }
    const writers = flowNodes
      .filter((n) => ['create_record', 'update_record', 'delete_record', 'subflow', 'notify'].includes(n.type))
      .map((n) => n.id);
    expect(writers.filter((id) => !upstream.has(id)), 'a write runs after the result screen').toEqual([]);
    expect(flowEdges.filter((e) => e.source === 'result').map((e) => e.target)).toEqual(['end']);
  });
});

/**
 * Every shipped locale renders the approval sentence for both states, through
 * the platform's own template renderer, as `lead-conversion-account-notice`
 * does for the screen ahead of this one.
 */
describe('the result screen reads right in every locale (#2297)', () => {
  const NAME = 'Northwind Energy';
  const translated = localePacks
    .filter(([, pack]) => pack?.flows?.lead_conversion?.screens?.result !== undefined)
    .map(([locale, pack]) => [locale, pack.flows.lead_conversion.screens.result] as [string, Rec]);
  const descriptions: Array<[string, string]> = [
    ['en (authored)', String(result.config.description)],
    ...translated.map(([locale, screen]) => [locale, String(screen.description ?? '')] as [string, string]),
  ];
  const render = (source: string, vars: Rec): string => {
    const r = templateEngine.evaluate({ dialect: 'template', source }, { extra: vars } as Rec);
    if (!r.ok) throw new Error(`does not render: ${r.error.message}`);
    return String(r.value);
  };

  it('every non-English pack translates the title, the sentence and the three links', () => {
    const shipped = localePacks.map(([locale]) => locale).filter((l) => l !== 'en').sort();
    expect(translated.map(([locale]) => locale).sort()).toEqual(shipped);
    const fieldNames = (result.config.fields as Rec[]).map((f) => f.name).sort();
    for (const [locale, screen] of translated) {
      expect(String(screen.title ?? '').length, `${locale}: no title`).toBeGreaterThan(0);
      expect(Object.keys(screen.fields ?? {}).sort(), `${locale}: a link label is missing`).toEqual(fieldNames);
      for (const name of fieldNames) expect(String(screen.fields[name].label ?? '').length).toBeGreaterThan(0);
    }
  });

  it.each(descriptions)('%s: names the account once, and says pending or not', (_locale, source) => {
    const pending = render(source, { pendingApprovalAccountName: NAME, noApprovalAccountName: null });
    const clear = render(source, { pendingApprovalAccountName: null, noApprovalAccountName: NAME });
    for (const text of [pending, clear]) {
      expect(text.split(NAME).length - 1, `the account name is not said exactly once: ${text}`).toBe(1);
    }
    const words = (t: string) => t.replace(NAME, '').trim();
    expect(words(pending)).not.toBe(words(clear));
  });
});

// ── As a sales rep, on the real engine ─────────────────────────────────────

let verify: VerifyStack;
let rep: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@lead-conversion-result-screen.test', {
    name: 'Result Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const leadFor = (company: string) => {
  const n = ++k;
  return verify.hooks.run('crm_lead', 'insert', {
    company, email: `buyer${n}@lead-conversion-result-screen.test`, first_name: 'Pat', last_name: `Result${n}`,
    lead_source: 'web', status: 'qualified', estimated_amount: 42000,
  }, { as: rep.token });
};

const screenOf = (run: Rec): Rec | undefined => run.screen ?? run.output?.screen;

/** Convert as the rep, the way the console does: screen_1's prefilled bag plus the box. */
async function convert(leadId: string, createOpportunity: boolean): Promise<{ run: Rec; screen: Rec }> {
  const started = await verify.flows.run('lead_conversion', { recordId: leadId }, { as: rep.token }) as Rec;
  const first = screenOf(started);
  expect(first?.nodeId).toBe('screen_1');
  const bag: Rec = {};
  for (const f of (first!.fields ?? []) as Rec[]) if (f.defaultValue !== undefined) bag[f.name] = f.defaultValue;
  const run = await verify.flows.resume(started as never, { ...bag, createOpportunity }, { as: rep.token }) as Rec;
  const screen = screenOf(run);
  expect(screen?.nodeId, 'the conversion did not end on the result screen').toBe('result');
  return { run, screen: screen! };
}

const linkOf = (screen: Rec, name: string): Rec => (screen.fields as Rec[]).find((f) => f.name === name)!;
const leadRow = async (id: string) => (await verify.rows('crm_lead', { id }))[0]!;
const accountRow = async (id: string) => (await verify.rows('crm_account', { id }))[0]!;

const PENDING = 'is waiting for account approval by a sales manager.';
const CLEAR = 'No account approval is pending for';

describe('as a sales rep, the result screen links what the conversion made (#2297)', () => {
  it('with an opportunity: links the new account, contact and opportunity the lead now names', async () => {
    const n = ++k;
    const lead = await leadFor(`Result Co ${n}`);
    const { screen } = await convert(lead.id, true);
    const after = await leadRow(lead.id);
    expect(Boolean(after.is_converted), 'the lead was not converted before the result screen').toBe(true);

    expect(['accountLink', 'contactLink', 'opportunityLink'].map((name) => {
      const f = linkOf(screen, name);
      return [f.type, f.reference, f.defaultValue];
    })).toEqual([
      ['record_link', 'crm_account', after.converted_account],
      ['record_link', 'crm_contact', after.converted_contact],
      ['record_link', 'crm_opportunity', after.converted_opportunity],
    ]);
    expect(after.converted_opportunity, 'no opportunity was created').toBeTruthy();

    // The sentence says what the account holds, whichever way the app
    // decides a converted account's approval.
    const account = await accountRow(after.converted_account);
    expect(String(screen.description).trim()).toBe(
      account.approval_status === 'pending' ? `Result Co ${n} ${PENDING}` : `${CLEAR} Result Co ${n}.`,
    );
  });

  it('without an opportunity: the opportunity link carries no record', async () => {
    const lead = await leadFor(`Result Solo ${++k}`);
    const { screen } = await convert(lead.id, false);
    const after = await leadRow(lead.id);
    expect(after.converted_opportunity ?? null).toBeNull();
    expect(linkOf(screen, 'accountLink').defaultValue).toBe(after.converted_account);
    expect(linkOf(screen, 'contactLink').defaultValue).toBe(after.converted_contact);
    expect(linkOf(screen, 'opportunityLink').defaultValue ?? null, 'the opportunity link points at a record').toBeNull();
  });

  it('an existing account waiting on its approval, then one that is not: the sentence follows the account', async () => {
    const n = ++k;
    const account = await verify.hooks.run('crm_account', 'insert', { name: `Waiting Co ${n}`, is_active: true }, { as: rep.token });
    expect((await accountRow(account.id)).approval_status, 'fixture: a rep-created account opens an approval').toBe('pending');
    const first = await convert((await leadFor(`Waiting Co ${n}`)).id, false);
    expect(linkOf(first.screen, 'accountLink').defaultValue).toBe(account.id);
    expect(String(first.screen.description).trim()).toBe(`Waiting Co ${n} ${PENDING}`);

    // The approver decides it (written as the system here; the approval
    // mirror is the only writer of the column in the product).
    await verify.kernel.getService<Rec>('objectql').update(
      'crm_account', { id: account.id, approval_status: 'approved' }, { where: { id: account.id }, context: { isSystem: true } },
    );
    const second = await convert((await leadFor(`WAITING co ${n}`)).id, false);
    expect(linkOf(second.screen, 'accountLink').defaultValue).toBe(account.id);
    expect(String(second.screen.description).trim()).toBe(`${CLEAR} Waiting Co ${n}.`);
  });

  it('Submit completes the run and changes nothing', async () => {
    const lead = await leadFor(`Result Done ${++k}`);
    const { run } = await convert(lead.id, false);
    const before = await leadRow(lead.id);
    const done = await verify.flows.resume(run as never, {}, { as: rep.token }) as Rec;
    expect(screenOf(done), 'the run paused again after the result screen').toBeUndefined();
    expect(await leadRow(lead.id)).toEqual(before);
  });
});
