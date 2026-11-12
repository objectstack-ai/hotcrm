// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { VerifyStack } from '@objectstack/verify';
import { CJK_FAMILY_NAME_CLASS, personNameSource } from '../src/sales/objects/_person-name';
import { en } from '../src/sales/email-templates/en';
import { zhCN } from '../src/sales/email-templates/zh-CN';
import { esES } from '../src/sales/email-templates/es-ES';
import { jaJP } from '../src/sales/email-templates/ja-JP';
import { ContactWelcomeFlow } from '../src/sales/flows/contact-welcome.flow';
import { LeadAssignmentFlow } from '../src/sales/flows/lead-assignment.flow';
import { LeadConversionFlow } from '../src/sales/flows/lead-conversion.flow';
import { LeadConversionApprovalFlow } from '../src/sales/flows/lead-conversion-approval.flow';
import { hotcrmStack, signUpPerson, notificationsTo, type Person } from './helpers/verify-stack';

/**
 * A person's name reads the way its owner writes it (#2431).
 *
 * Measured on staging (HotCRM 6.1.2, zh-CN): a lead entered as 姓「张」名「伟」
 * showed as 「伟 张」 in its header, and so did the contact its conversion
 * made — every title joined `first_name last_name` with a space. The rule
 * (`src/sales/objects/_person-name.ts`): a family name that starts with a CJK
 * character goes first, with no space; any other name keeps `first last`.
 *
 * Pinned here against the booted app, one case per surface the card names:
 * the lead's header title and full name, the contact's stored title, a
 * search for the name as the header writes it, the contact a conversion
 * makes, the sentences the hooks write, and the notices the flows send.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let manager: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  manager = await signUpPerson(verify, 'manager@person-name-order.test', {
    name: 'Name Order Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 180_000);

const insert = (object: string, doc: Rec) => verify.hooks.run(object, 'insert', doc, { as: manager.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const rest = async (method: string, path: string, body?: unknown): Promise<{ status: number; body: Rec }> => {
  const res = await verify.apiAs(manager.token, method, path, body);
  const text = await res.text();
  let parsed: Rec = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
};

/** A fresh account for one case, owned by the manager. */
const account = async (): Promise<string> => {
  const [row] = await verify.seed('crm_account', [{ name: `Name Order Co ${++k}`, owner_id: manager.id }]);
  return String(row!.id);
};

/** given, family → the name every surface must show. */
const NAMES: ReadonlyArray<readonly [string, string, string, string]> = [
  ['Chinese', '伟', '张', '张伟'],
  ['Japanese', '太郎', '山田', '山田太郎'],
  ['Korean', '민준', '김', '김민준'],
  ['English', 'Ada', 'Lovelace', 'Ada Lovelace'],
  ['English given name, Chinese family name', 'Wei', '张', '张Wei'],
  ['Chinese given name, Latin family name', '伟', 'Zhang', '伟 Zhang'],
];

describe('the lead: header title and full name', () => {
  it.each(NAMES)('%s: 名「%s」姓「%s」is titled %s', async (_case, given, family, shown) => {
    const company = `Name Order Lead Co ${++k}`;
    const lead = await insert('crm_lead', {
      first_name: given, last_name: family, company, email: `lead${k}@person-name-order.test`, status: 'new',
    });
    const row = await stored('crm_lead', String(lead.id));
    expect(row.display_title, 'the stored header title').toBe(`${shown} - ${company}`);
    const read = await rest('GET', `/data/crm_lead/${lead.id}`);
    expect(read.status, JSON.stringify(read.body)).toBe(200);
    const record = (read.body.record ?? read.body.data ?? read.body) as Rec;
    expect(record.full_name, 'the full name formula, read through REST').toBe(shown);
  });

  it('a rename recomputes the stored title with the same rule', async () => {
    const company = `Renamed Lead Co ${++k}`;
    const lead = await insert('crm_lead', {
      first_name: 'Ada', last_name: 'Lovelace', company, email: `rename${k}@person-name-order.test`, status: 'new',
    });
    const res = await rest('PATCH', `/data/crm_lead/${lead.id}`, { first_name: '伟', last_name: '张' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect((await stored('crm_lead', String(lead.id))).display_title).toBe(`张伟 - ${company}`);
  });
});

describe('the contact: stored title, search, and a conversion', () => {
  it.each(NAMES)('%s: 名「%s」姓「%s」is titled %s', async (_case, given, family, shown) => {
    const contact = await insert('crm_contact', {
      first_name: given, last_name: family, email: `contact${++k}@person-name-order.test`, crm_account: await account(),
    });
    expect((await stored('crm_contact', String(contact.id))).full_name).toBe(shown);
  });

  it('a search for 「张伟」, the name as the header writes it, finds the contact and the lead', async () => {
    const tag = `${++k}`;
    // A family name no other row carries, so the hit is this case's own.
    const family = `欧阳${'一二三四五六七八九十'[k % 10]}`;
    const contact = await insert('crm_contact', {
      first_name: `伟${tag}`, last_name: family, email: `search${tag}@person-name-order.test`, crm_account: await account(),
    });
    const lead = await insert('crm_lead', {
      first_name: `伟${tag}`, last_name: family, company: `Search Co ${tag}`, email: `searchlead${tag}@person-name-order.test`, status: 'new',
    });
    const term = encodeURIComponent(`${family}伟${tag}`);
    for (const [object, id] of [['crm_contact', contact.id], ['crm_lead', lead.id]] as const) {
      const res = await rest('GET', `/data/${object}?search=${term}`);
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      const rows = (res.body.records ?? res.body.data ?? res.body.value ?? []) as Rec[];
      expect(rows.map((r) => r.id), `${object}: search "${family}伟${tag}"`).toContain(id);
    }
  });

  it('the contact a lead conversion makes is titled 「张伟」', async () => {
    const company = `Converted Name Co ${++k}`;
    const lead = await insert('crm_lead', {
      first_name: '伟', last_name: '张', company, email: `convert${k}@person-name-order.test`,
      phone: '555', title: 'Buyer', lead_source: 'web', status: 'qualified',
    });
    const started = await verify.flows.run('lead_conversion', { recordId: lead.id }, { as: manager.token });
    const paused = started as Rec;
    const prefilled: Rec = {};
    for (const f of ((paused.screen ?? paused.output?.screen)?.fields ?? []) as Rec[]) {
      if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
    }
    await verify.flows.resume(started, { ...prefilled, createOpportunity: false }, { as: manager.token });
    const [acct] = await verify.rows('crm_account', { name: company });
    expect(acct, 'the conversion made the account').toBeDefined();
    const contacts = await verify.rows('crm_contact', { crm_account: acct!.id });
    expect(contacts.map((c) => c.full_name)).toEqual(['张伟']);
  });
});

describe('the sentences the hooks write name the person the same way', () => {
  it('a duplicate-email refusal names 「张伟」', async () => {
    const email = `dup${++k}@person-name-order.test`;
    const accountId = await account();
    await insert('crm_contact', { first_name: '伟', last_name: '张', email, crm_account: accountId });
    const err = await insert('crm_contact', { first_name: 'Ada', last_name: 'Lovelace', email, crm_account: accountId })
      .then(() => undefined, (e: unknown) => e as Rec);
    expect(err, 'the second contact with the same email was refused').toBeDefined();
    expect(err!.code).toBe('DUPLICATE_VALUE');
    expect(String(err!.message)).toContain('(张伟)');
    expect(String(err!.message)).not.toContain('伟 张');
  });

  // The hooks run body-only in QuickJS and cannot import the class, so each
  // writes it as a regex literal. Every literal must be the shared class.
  it('every hook copy of the CJK class equals CJK_FAMILY_NAME_CLASS', () => {
    const escaped = CJK_FAMILY_NAME_CLASS.replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
    expect(escaped).toBe('[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uac00-\\ud7af]');
    const copies: Record<string, number> = { 'src/sales/objects/lead.hook.ts': 3, 'src/sales/objects/contact.hook.ts': 2 };
    for (const [file, count] of Object.entries(copies)) {
      const source = readFileSync(resolve(__dirname, '..', file), 'utf8');
      const literals = [...source.matchAll(/\/\^(\[[^\]]*\])\/\.test\(family\)/g)].map((m) => m[1]);
      expect(literals, `${file}: one literal per person sentence`).toHaveLength(count);
      for (const literal of literals) expect(literal, file).toBe(escaped);
    }
  });
});

describe('the notices print person_name, and every shipped flow passes it', () => {
  const PACKS: Record<string, Record<string, { subject: string; bodyHtml: string }>> = {
    en, 'zh-CN': zhCN, 'es-ES': esES, 'ja-JP': jaJP,
  };
  const PERSON_TEMPLATES = [
    'crm.contact_welcome', 'crm.lead_conversion_approved', 'crm.lead_conversion_rejected',
    'crm.lead_converted', 'crm.lead_routing_hot', 'crm.lead_routing_new',
  ];

  it.each(Object.entries(PACKS))('%s: the six person templates read {{person_name}}, never first/last', (_locale, pack) => {
    const named = Object.entries(pack)
      .filter(([, t]) => /\{\{\s*(person_name|first_name|last_name)\s*\}\}/.test(t.subject + t.bodyHtml))
      .map(([name]) => name).sort();
    expect(named).toEqual(PERSON_TEMPLATES);
    for (const name of PERSON_TEMPLATES) {
      const text = pack[name]!.subject + pack[name]!.bodyHtml;
      expect(text, name).toContain('{{person_name}}');
      expect(text, name).not.toMatch(/\{\{\s*(first_name|last_name)\s*\}\}/);
    }
  });

  // A hole cannot fall back on 18.3.0: a template sent without `person_name`
  // prints an empty name. So each of the six is held to a shipped flow that
  // passes it, composed by the one rule, beside the old two values.
  it.each(PERSON_TEMPLATES)('%s is sent by a shipped flow that passes person_name', (template) => {
    const flows = [ContactWelcomeFlow, LeadAssignmentFlow, LeadConversionFlow, LeadConversionApprovalFlow];
    const senders = flows.flatMap((flow) => (flow.nodes as Rec[])
      .filter((n) => n.type === 'notify' && n.config?.template === template)
      .map((n) => ({ flow: flow.name, data: n.config.templateData as Rec })));
    expect(senders.length, `a shipped flow sends ${template}`).toBeGreaterThan(0);
    for (const { flow, data } of senders) {
      const row = String(data.first_name?.source ?? '').split('.')[0];
      expect(data.person_name?.source, `${flow} → ${template}`).toBe(personNameSource(row));
      expect(data.first_name, `${flow} still passes first_name`).toBeDefined();
      expect(data.last_name, `${flow} still passes last_name`).toBeDefined();
    }
  });

  it('a new contact named 张伟 prompts its owner with person_name 「张伟」', async () => {
    const contact = await insert('crm_contact', {
      first_name: '伟', last_name: '张', email: `welcome${++k}@person-name-order.test`,
      crm_account: await account(), email_opt_out: false,
    });
    const prompts = (await notificationsTo(verify, manager.id, 'contact_welcome'))
      .filter((n) => n.payload?.actionUrl === `/crm_contact/${contact.id}`);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]!.payload.templateData.person_name).toBe('张伟');
  });
});
