// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpressionEngine, templateEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import { LeadConversionFlow } from '../src/sales/flows/lead-conversion.flow';
import { localePacks } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * Converting a lead whose email address a contact already holds (#2572, ruled
 * A by the maintainer; #2571 fixed with it).
 *
 * `crm_contact.email` is unique, so such a lead can only join that contact.
 * The ruling keeps that reuse and makes it visible:
 *   1. the dialog says by name which contact is reused;
 *   2. when the lead's name differs from the contact's, a second screen asks
 *      for a tick, and an unticked submit converts nothing;
 *   3. the conversion fills only the contact's EMPTY Phone, Mobile and Title.
 * #2571: the duplicate note is the pack's own sentence, in every locale, and
 * says what this run does rather than "creates a second account, contact and
 * opportunity".
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@lead-conversion-contact-reuse.test', {
    name: 'Reuse Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const screenOf = (r: Rec): Rec | undefined => r.screen ?? r.output?.screen;
const prefilledOf = (screen: Rec | undefined): Rec => {
  const out: Rec = {};
  // A `record_link` shows a record and takes no value: the console leaves it out.
  for (const f of (screen?.fields ?? []) as Rec[]) {
    if (f.defaultValue !== undefined && f.type !== 'record_link') out[f.name] = f.defaultValue;
  }
  return out;
};

/** The rep's account, a contact on it holding `email`, and a qualified lead with the same email. */
async function fixture(contact: Rec, lead: Rec) {
  const n = ++k;
  const email = `buyer${n}@lead-conversion-contact-reuse.test`;
  const account = await verify.hooks.run('crm_account', 'insert', { name: `Reuse Works ${n}`, is_active: true }, { as: rep.token });
  const existing = await verify.hooks.run('crm_contact', 'insert', {
    first_name: 'Dee', last_name: `Dupe ${n}`, email, crm_account: account.id, ...contact,
  }, { as: rep.token });
  const created = await verify.hooks.run('crm_lead', 'insert', {
    first_name: 'Dee', last_name: `Dupe ${n}`, company: account.name, email, lead_source: 'web',
    phone: '+1-555-0100', mobile: '+1-555-0199', title: 'CTO',
    status: 'qualified', need_type: 'new_implementation', estimated_amount: 40_000, ...lead,
  }, { as: rep.token });
  return { account, contact: existing, lead: created, n };
}

const start = async (leadId: string) => {
  const started = await verify.flows.run('lead_conversion', { recordId: leadId }, { as: rep.token }) as Rec;
  const screen = screenOf(started);
  expect(screen?.nodeId, 'the conversion did not pause on its screen').toBe('screen_1');
  return { started, screen: screen!, description: String(screen!.description ?? '') };
};

const next = (started: Rec, answers: Rec) =>
  verify.flows.resume(started as never, answers, { as: rep.token }).then((r) => r as Rec, (e: Rec): Rec => ({ refused: e }));

describe('the dialog names the contact the lead joins (#2572)', () => {
  it('same name: says which contact, converts onto it without a second question, and fills only its blanks', async () => {
    const { contact, lead } = await fixture({ phone: '+1-555-0000' }, {});
    const { started, screen, description } = await start(lead.id);
    expect(description).toContain(`${contact.first_name} ${contact.last_name} is the existing contact with this lead's email address`);

    const done = await next(started, { ...prefilledOf(screen), createOpportunity: false });
    expect(done.refused ?? null).toBeNull();
    expect(screenOf(done)?.nodeId ?? null, 'a same-name contact asked for confirmation').not.toBe('confirm_contact');

    expect((await row('crm_lead', lead.id)).converted_contact).toBe(contact.id);
    // Phone was the contact's own: kept. Mobile and Title were empty: filled.
    expect(await row('crm_contact', contact.id)).toMatchObject({
      phone: '+1-555-0000', mobile: '+1-555-0199', title: 'CTO',
      first_name: contact.first_name, last_name: contact.last_name,
    });
  });

  it('no contact holds the email: says a new contact is created, named for the lead', async () => {
    const n = ++k;
    const account = await verify.hooks.run('crm_account', 'insert', { name: `Fresh Reuse ${n}`, is_active: true }, { as: rep.token });
    const lead = await verify.hooks.run('crm_lead', 'insert', {
      first_name: 'Ivy', last_name: `New ${n}`, company: account.name, email: `ivy${n}@lead-conversion-contact-reuse.test`,
      status: 'qualified', need_type: 'new_implementation', estimated_amount: 40_000,
    }, { as: rep.token });
    const { description } = await start(lead.id);
    expect(description).toContain(`so converting creates a new contact named Ivy New ${n}.`);
  });
});

describe('a different name needs a tick (#2572)', () => {
  it('unticked: refused with the way out named, and nothing is written', async () => {
    const { contact, lead } = await fixture({}, { first_name: 'Pat', last_name: 'Lin' });
    const { started, screen } = await start(lead.id);

    const confirm = await next(started, { ...prefilledOf(screen), createOpportunity: false });
    const second = screenOf(confirm);
    expect(second?.nodeId).toBe('confirm_contact');
    expect(String(second?.description)).toContain(`This lead is Pat Lin, but the contact with the same email address is ${contact.first_name} ${contact.last_name}`);
    expect((second?.fields as Rec[]).find((f) => f.name === 'matchedContactLink')?.defaultValue).toBe(contact.id);

    const refused = await next(confirm, { ...prefilledOf(second), reuseContactConfirmed: false });
    const message = String(refused.refused?.message ?? refused.refusalMessage ?? refused.output?.message ?? JSON.stringify(refused));
    expect(message).toContain('you did not confirm joining this lead to the existing contact');

    expect(await row('crm_lead', lead.id)).toMatchObject({ is_converted: false, status: 'qualified' });
    expect(await row('crm_contact', contact.id)).toMatchObject({ phone: null, mobile: null, title: null });
  });

  it('ticked: converts onto the named contact and fills only its blanks', async () => {
    const { contact, lead } = await fixture({ title: 'Head of IT' }, { first_name: 'Pat', last_name: 'Lin' });
    const { started, screen } = await start(lead.id);
    const confirm = await next(started, { ...prefilledOf(screen), createOpportunity: false });
    expect(screenOf(confirm)?.nodeId).toBe('confirm_contact');

    const done = await next(confirm, { ...prefilledOf(screenOf(confirm)), reuseContactConfirmed: true });
    expect(done.refused ?? null).toBeNull();
    expect(await row('crm_lead', lead.id)).toMatchObject({ is_converted: true, converted_contact: contact.id });
    // Names stay the contact's: the conversion never renames a person.
    expect(await row('crm_contact', contact.id)).toMatchObject({
      first_name: contact.first_name, last_name: contact.last_name,
      phone: '+1-555-0100', mobile: '+1-555-0199', title: 'Head of IT',
    });
  });
});

/**
 * The NAMES are compared, not the parts one by one (#2685). Each side is the
 * name every surface shows (`personNameSource`), so a person whose name was
 * split differently between the two fields — 姓「张伟」 with no given name,
 * 姓「欧」名「阳娜娜」 — is the contact 「张伟」 / 「欧阳娜娜」 the first screen
 * already named, and the rep is not asked to confirm it.
 */
describe('the same name split another way asks nothing (#2685)', () => {
  const differs = (LeadConversionFlow.nodes as Rec[])
    .find((n) => n.id === 'compose_account_notice')!.config.assignments.contactNameDiffers;
  const evaluate = (matchedContact: Rec | null, leadRecord: Rec): unknown => {
    const r = ExpressionEngine.evaluate(differs, { extra: { matchedContact, leadRecord } } as never) as Rec;
    if (!r.ok) throw new Error(`contactNameDiffers does not evaluate: ${r.error?.message}`);
    return r.value;
  };
  // [case, contact, lead, differs]. Both name columns are NOT NULL today, so
  // an empty side reaches this binding only once #2684 makes them optional;
  // the expression is pinned for it now, empty and null alike.
  const CASES: ReadonlyArray<readonly [string, Rec, Rec, boolean]> = [
    ['「张伟」 + empty given name = 「张」 + 「伟」', { last_name: '张', first_name: '伟' }, { last_name: '张伟', first_name: '' }, false],
    ['「张伟」 + null given name = 「张」 + 「伟」', { last_name: '张', first_name: '伟' }, { last_name: '张伟', first_name: null }, false],
    ['empty family name + given 「张伟」 = 「张」 + 「伟」', { last_name: '张', first_name: '伟' }, { last_name: '', first_name: '张伟' }, false],
    ['「欧」 + 「阳娜娜」 = 「欧阳」 + 「娜娜」', { last_name: '欧阳', first_name: '娜娜' }, { last_name: '欧', first_name: '阳娜娜' }, false],
    ['Mary / Ann Smith = Mary Ann / Smith', { first_name: 'Mary Ann', last_name: 'Smith' }, { first_name: 'Mary', last_name: 'Ann Smith' }, false],
    ['「李伟」 is not 「张伟」', { last_name: '张', first_name: '伟' }, { last_name: '李', first_name: '伟' }, true],
    ['Pat Lin is not Dee Dupe', { first_name: 'Dee', last_name: 'Dupe' }, { first_name: 'Pat', last_name: 'Lin' }, true],
  ];
  it.each(CASES)('%s', (_case, contact, lead, expected) => {
    expect(evaluate(contact, lead)).toBe(expected);
  });

  it('no contact matched: nothing to confirm', () => {
    expect(evaluate(null, { last_name: '张', first_name: '伟' })).toBe(false);
  });

  it('a lead entered as 姓「欧」名「阳娜娜」 converts onto the contact 「欧阳娜娜」 without the confirm screen', async () => {
    const tag = `${++k}`;
    const { contact, lead } = await fixture(
      { last_name: '欧阳', first_name: `娜娜${tag}` },
      { last_name: '欧', first_name: `阳娜娜${tag}` },
    );
    const { started, screen, description } = await start(lead.id);
    expect(description).toContain(`欧阳娜娜${tag}`);
    const done = await next(started, { ...prefilledOf(screen), createOpportunity: false });
    expect(done.refused ?? null).toBeNull();
    expect(screenOf(done)?.nodeId ?? null, 'the same name asked for confirmation').not.toBe('confirm_contact');
    expect((await row('crm_lead', lead.id)).converted_contact).toBe(contact.id);
    // The conversion never renames a person: the contact keeps its own split.
    expect(await row('crm_contact', contact.id)).toMatchObject({ last_name: '欧阳', first_name: `娜娜${tag}`, full_name: `欧阳娜娜${tag}` });
  });
});

/**
 * The text, in every locale (#2571). Rendered through the platform's own
 * template renderer, as `lead-conversion-account-notice.test.ts` does.
 */
describe('the dialog text is translated and matches the branch (#2571)', () => {
  const nodes = LeadConversionFlow.nodes as Rec[];
  const node = (id: string) => nodes.find((n) => n.id === id)!;
  const render = (source: string, vars: Rec): string => {
    const r = templateEngine.evaluate({ dialect: 'template', source }, { extra: vars } as Rec);
    if (!r.ok) throw new Error(`does not render: ${r.error.message}`);
    return String(r.value);
  };
  const packs = localePacks.filter(([locale]) => locale !== 'en');

  it('the duplicate note is a template default, not a flow variable a pack cannot reach', () => {
    const warn = node('warn_duplicate');
    expect(warn.config.assignments.duplicateWarning).toBeNull();
    expect(String(node('screen_1').config.description)).not.toContain('{{duplicateWarning}}');
  });

  it.each(packs)('%s: the note, the confirm screen and the refusal are translated', (locale, pack: Rec) => {
    const conv = pack.flows?.lead_conversion;
    const body = String(conv?.screens?.screen_1?.description ?? '');
    const warned = render(body, { duplicateWarning: null, existingAccountName: 'Acme', existingContactName: 'Dee Dupe' });
    const clean = render(body, { duplicateWarning: ' ', existingAccountName: 'Acme', existingContactName: 'Dee Dupe' });
    expect(warned.length, `${locale}: no duplicate note`).toBeGreaterThan(clean.length + 10);
    expect(warned, `${locale}: English duplicate note`).not.toContain('Suspected duplicate');
    expect(clean).toContain('Dee Dupe');
    expect(render(body, { duplicateWarning: ' ', existingAccountName: 'Acme', newContactName: 'Ivy New' })).toContain('Ivy New');

    expect(conv?.screens?.confirm_contact?.title, `${locale}: confirm screen title`).toBeTruthy();
    const confirm = render(String(conv?.screens?.confirm_contact?.description ?? ''), { leadPersonName: 'Pat Lin', existingContactName: 'Dee Dupe' });
    expect(confirm).toContain('Pat Lin');
    expect(confirm).toContain('Dee Dupe');
    expect(conv?.screens?.confirm_contact?.fields?.reuseContactConfirmed?.label, `${locale}: tick label`).toBeTruthy();
    expect(conv?.refusals?.refuse_contact_not_confirmed?.message, `${locale}: refusal`).toBeTruthy();
  });
});
