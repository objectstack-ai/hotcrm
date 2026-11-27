// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VerifyStack } from '@objectstack/verify';
import { Lead } from '../src/sales/objects/lead.object';
import { AccountImportMapping, ContactImportMapping, LeadImportMapping } from '../src/sales/mappings';
import { InvoiceImportMapping, PaymentImportMapping } from '../src/o2c/mappings';
import { REPO_ROOT } from './helpers/repo-root';
import { hotcrmStack } from './helpers/verify-stack';

/**
 * What an import mapping PRODUCES, the target object ACCEPTS (#2780).
 *
 * `import-mappings.test.ts` proves a mapped cell is a legal option of its
 * field. That is not the same as a row the object accepts: `crm_lead` has
 * rules that ask for a second field when the status is Unqualified or
 * Qualified, and the lead mapping produced both statuses with no column for
 * either companion. Measured through the real import before the fix:
 *
 *   - `Lead Status = Disqualified` → refused, "A disqualification reason is
 *     required…", and no column of the saved mapping could carry the reason.
 *   - 8 of the shipped template's own 50 rows (the `Qualified` ones) → refused
 *     by `qualified_needs_qualification`.
 *
 * So everything here goes through the door a user's file goes through:
 * `POST /data/<object>/import` with the mapping's name and CSV text.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let admin: string;
let n = 0;

const TEMPLATES = join(REPO_ROOT, 'assets/import-templates');
const template = (file: string): string => readFileSync(join(TEMPLATES, file), 'utf8');

const cell = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const toCsv = (rows: Array<Record<string, string>>): string => {
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return `${[headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))].map((l) => l.map(cell).join(',')).join('\n')}\n`;
};

const importCsv = async (object: string, mappingName: string, csv: string): Promise<Rec> => {
  const res = await verify.apiAs(admin, 'POST', `/data/${object}/import`, { mappingName, format: 'csv', csv });
  expect(res.status, await res.clone().text()).toBeLessThan(300);
  return (await res.json()) as Rec;
};
const refusals = (body: Rec): string[] =>
  ((body.results ?? []) as Rec[]).filter((r) => !r.ok).map((r) => `row ${r.row}: ${r.error}`);

/** One lead row of the template's columns; `over` names the cells under test. */
const leadRow = (over: Record<string, string>): Record<string, string> => ({
  'First Name': 'Imp', 'Last Name': `Lead ${++n}`, Company: 'Import Values Co', Email: `lead${n}@import-values.test`, ...over,
});
const importLead = async (over: Record<string, string>): Promise<{ body: Rec; stored: Rec | undefined }> => {
  const row = leadRow(over);
  const body = await importCsv('crm_lead', 'crm_lead_import', toCsv([row]));
  const [stored] = await verify.rows('crm_lead', { email: row.Email });
  return { body, stored };
};
const ruleMessage = (name: string): string => {
  const rule = ((Lead.validations ?? []) as Rec[]).find((v) => v.name === name);
  expect(rule, `crm_lead.${name} missing`).toBeTruthy();
  return String(rule!.message);
};

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
}, 180_000);

describe('the shipped CRM templates import whole', () => {
  // In the order the guide gives: contacts name their account.
  it.each([
    ['accounts.csv', 'crm_account', 'crm_account_import'],
    ['contacts.csv', 'crm_contact', 'crm_contact_import'],
    ['leads.csv', 'crm_lead', 'crm_lead_import'],
  ])('%s: every row is written, none refused', async (file, object, mappingName) => {
    const body = await importCsv(object, mappingName, template(file));
    expect(refusals(body), `${file} rows the app refuses`).toEqual([]);
    expect(body.total).toBeGreaterThanOrEqual(50);
    expect(body.created + body.updated).toBe(body.total);
  }, 120_000);
});

describe('an unqualified lead imports with its reason (#2780)', () => {
  it.each(['Unqualified', 'Disqualified', 'Closed - Not Converted'])(
    'Lead Status "%s" with a Disqualification Reason is stored unqualified, with that reason',
    async (status) => {
      const { body, stored } = await importLead({ 'Lead Status': status, 'Disqualification Reason': 'No Budget' });
      expect(refusals(body)).toEqual([]);
      expect(stored).toMatchObject({ status: 'unqualified', disqualification_reason: 'no_budget' });
    },
  );

  it.each([
    ['Not a Fit', 'not_a_fit'], ['no_budget', 'no_budget'], ['wrong persona', 'wrong_persona'], ['Unreachable', 'unreachable'],
    ['Competitor', 'competitor'], ['Other', 'other'],
    ['Bad Fit', 'not_a_fit'], ['Not Interested', 'other'], ['Budget', 'no_budget'], ['Wrong Contact', 'wrong_persona'],
    ['No Response', 'unreachable'], ['Lost to Competitor', 'competitor'],
  ])('the reason "%s" lands as %s', async (reason, value) => {
    const { body, stored } = await importLead({ 'Lead Status': 'Disqualified', 'Disqualification Reason': reason });
    expect(refusals(body)).toEqual([]);
    expect(stored?.disqualification_reason).toBe(value);
  });

  it('without a reason the row is refused with the lead\'s own rule, and nothing is stored', async () => {
    // Decided, not defaulted: a blank reason is never filled in (with Other,
    // say). The rule exists to record why the lead was dropped.
    const { body, stored } = await importLead({ 'Lead Status': 'Disqualified', 'Disqualification Reason': '' });
    expect(body.created).toBe(0);
    expect(String(body.results?.[0]?.error)).toContain(ruleMessage('disqualification_reason_required'));
    expect(stored).toBeUndefined();
  });

  it('a reason no option matches refuses the row instead of dropping the reason', async () => {
    const { body, stored } = await importLead({ 'Lead Status': 'Disqualified', 'Disqualification Reason': 'Went quiet after the demo' });
    expect(body.created).toBe(0);
    const [result] = (body.results ?? []) as Rec[];
    expect(result).toMatchObject({ ok: false, field: 'disqualification_reason' });
    expect(String(result?.error)).toContain('Went quiet after the demo');
    expect(stored).toBeUndefined();
  });

  it('the reason Duplicate stays refused: the surviving record is named on the lead, not in a file', async () => {
    const { body, stored } = await importLead({ 'Lead Status': 'Disqualified', 'Disqualification Reason': 'Duplicate' });
    expect(body.created).toBe(0);
    expect(String(body.results?.[0]?.error)).toContain(ruleMessage('duplicate_disqualification_requires_survivor'));
    expect(stored).toBeUndefined();
  });

  it('a lead at any other status needs no reason', async () => {
    const { body, stored } = await importLead({ 'Lead Status': 'Working', 'Disqualification Reason': '' });
    expect(refusals(body)).toEqual([]);
    expect(stored).toMatchObject({ status: 'contacted' });
    expect(stored?.disqualification_reason ?? null).toBeNull();
  });
});

describe('a qualified lead imports with its need and estimate', () => {
  it('Lead Status Qualified with Need Type and Estimated Amount is stored qualified', async () => {
    const { body, stored } = await importLead({ 'Lead Status': 'Qualified', 'Need Type': 'Support & Maintenance', 'Estimated Amount': '24000' });
    expect(refusals(body)).toEqual([]);
    expect(stored).toMatchObject({ status: 'qualified', need_type: 'support' });
    expect(Number(stored?.estimated_amount)).toBe(24000);
  });

  it.each([
    ['no Need Type', { 'Need Type': '', 'Estimated Amount': '24000' }],
    ['no Estimated Amount', { 'Need Type': 'Expansion', 'Estimated Amount': '' }],
  ])('with %s the row is refused with the lead\'s own rule', async (_what, cells) => {
    const { body, stored } = await importLead({ 'Lead Status': 'Qualified', ...cells });
    expect(body.created).toBe(0);
    expect(String(body.results?.[0]?.error)).toContain(ruleMessage('qualified_needs_qualification'));
    expect(stored).toBeUndefined();
  });

  it('Converted is never importable: conversion is what creates the account, contact and deal', async () => {
    const { body, stored } = await importLead({ 'Lead Status': 'Converted' });
    expect(body.created).toBe(0);
    expect(String(body.results?.[0]?.error)).toContain(ruleMessage('converted_only_by_conversion'));
    expect(stored).toBeUndefined();
  });
});

/**
 * The general form of #2780: for every spelling a mapping's `valueMap`
 * translates, a row carrying it is accepted — given only cells the SAME mapping
 * has columns for. `COMPANIONS` lists the translated values that need a second
 * cell; a new rule that a translated value trips fails here until the mapping
 * grows the column and this table names it.
 *
 * Only `valueMap` spellings are walked. A value that passes through untouched
 * and matches an option by its label or code (Lead Status `Qualified`,
 * `Converted`) is not covered here; those are pinned by the dedicated
 * Qualified / Converted tests above.
 */
const COMPANIONS: Record<string, Record<string, Record<string, Record<string, string>>>> = {
  crm_lead_import: {
    status: {
      unqualified: { 'Disqualification Reason': 'Not a Fit' },
    },
  },
};

describe('every spelling a mapping translates is a row the object accepts', () => {
  type Case = { mapping: Rec; object: string; base: () => Record<string, string> };
  const cases: Case[] = [
    {
      mapping: AccountImportMapping, object: 'crm_account',
      base: () => ({ 'Account Name': `Import Values Account ${++n}` }),
    },
    {
      mapping: ContactImportMapping, object: 'crm_contact',
      base: () => ({ 'First Name': 'Imp', 'Last Name': `Contact ${++n}`, Email: `contact${n}@import-values.test`, 'Account Name': 'Acme Corporation' }),
    },
    { mapping: LeadImportMapping, object: 'crm_lead', base: () => leadRow({}) },
    {
      mapping: InvoiceImportMapping, object: 'crm_invoice',
      base: () => ({ 'ERP Reference': `IMPV-INV-${++n}`, 'Invoice Number': `IMPV-INV-${n}`, Account: 'Acme Corporation', 'Issue Date': '2026-10-01', Amount: '100' }),
    },
    {
      mapping: PaymentImportMapping, object: 'crm_payment',
      base: () => ({ 'ERP Reference': `IMPV-PAY-${++n}`, Account: 'Acme Corporation', 'Payment Date': '2026-10-02', Amount: '100' }),
    },
  ];

  it.each(cases.map((c) => [c.mapping.name as string, c] as const))('%s', async (name, { mapping, object, base }) => {
    const columns = new Set((mapping.fieldMapping as Rec[]).map((e) => String(e.source)));
    const rows: Array<Record<string, string>> = [];
    const labels: string[] = [];
    for (const entry of (mapping.fieldMapping as Rec[]).filter((e) => e.transform === 'map')) {
      for (const [spelling, value] of Object.entries((entry.params?.valueMap ?? {}) as Record<string, string>)) {
        const companions = COMPANIONS[name]?.[String(entry.target)]?.[value] ?? {};
        for (const column of Object.keys(companions)) {
          expect(columns.has(column), `companion column '${column}' is not a column of ${name}`).toBe(true);
        }
        rows.push({ ...base(), ...companions, [String(entry.source)]: spelling });
        labels.push(`${entry.source} = ${spelling}`);
      }
    }
    expect(rows.length, `${name} translates no spelling: the walker stopped matching`).toBeGreaterThan(0);
    const body = await importCsv(object, name, toCsv(rows));
    const refused = ((body.results ?? []) as Rec[]).filter((r) => !r.ok).map((r) => `${labels[r.row - 1]}: ${r.error}`);
    expect(refused, `spellings ${name} translates into a row ${object} refuses`).toEqual([]);
    expect(body.created).toBe(rows.length);
  }, 120_000);
});
