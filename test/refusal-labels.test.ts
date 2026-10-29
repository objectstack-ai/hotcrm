// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { extractHookBody } from '@objectstack/cli/hook-body';
import { allHooks } from '../objectstack.composition';
import { Opportunity } from '../src/sales/objects/opportunity.object';
import { Contract } from '../src/sales/objects/contract.object';
import { Quote } from '../src/revenue/objects/quote.object';
import { Lead } from '../src/sales/objects/lead.object';
import { commerce as zhCommerce } from '../src/sales/translations/zh-CN/objects.commerce';
import { commerce as esCommerce } from '../src/sales/translations/es-ES/objects.commerce';
import { commerce as jaCommerce } from '../src/sales/translations/ja-JP/objects.commerce';

/**
 * Six freeze refusals name fields and states by the labels the user sees
 * (#2338 items 12, 14, 15 and 16).
 *
 * They used to show API names: "…is accepted; only internal_notes may be
 * edited. Attempted: discount.", "Cannot shrink end_date (…)", "closed
 * (closed_won); only description, next_step, notes may be edited", "Cannot
 * edit converted lead … (attempted: company)", "closed (closed_won), so its
 * line items can no longer be added, changed or removed", and "Quote … is
 * accepted, so its line items can no longer be added, changed or removed". A lowered
 * hook body cannot read the object's metadata, so each body writes its labels
 * out — the same route `campaign_validation` took for #2060 item 12. This file
 * reads those written-out labels back out of the LOWERED bodies and holds them
 * to the objects, so a label renamed on the object without its refusal turns
 * this red instead of showing the old word.
 */

type AnyRec = Record<string, any>;

const lowered = (name: string): string => {
  const hook = (allHooks as AnyRec[]).find((h) => h.name === name);
  expect(hook, `hook '${name}' is not registered`).toBeTruthy();
  return extractHookBody(hook!.handler, `hook '${name}'`).source;
};

/** `NAME = { key: 'Label', … }` out of a lowered body, as `[key, label]` pairs. */
const table = (source: string, name: string): Array<[string, string]> => {
  const m = new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`).exec(source);
  expect(m, `${name} is not in the lowered body`).toBeTruthy();
  return [...m![1]!.matchAll(/(\w+)\s*:\s*['"]([^'"]+)['"]/g)].map((e) => [e[1]!, e[2]!]);
};

const fieldLabel = (obj: AnyRec, field: string): string => obj.fields[field]?.label;
const optionLabel = (obj: AnyRec, field: string, value: string): string =>
  (obj.fields[field].options as AnyRec[]).find((o) => o.value === value)?.label;

describe('freeze refusals use the labels the user sees (#2338 item 12)', () => {
  it('opportunity_lifecycle: the closed stages and the editable fields', () => {
    const source = lowered('opportunity_lifecycle');
    const stages = table(source, 'STAGE_LABELS');
    expect(stages.map(([k]) => k).sort()).toEqual(['closed_lost', 'closed_won']);
    for (const [value, label] of stages) expect(label, value).toBe(optionLabel(Opportunity, 'stage', value));
    const fields = table(source, 'NARRATIVE_LABELS');
    expect(fields.length).toBeGreaterThan(0);
    for (const [field, label] of fields) expect(label, field).toBe(fieldLabel(Opportunity, field));
  });

  it('quote_workflow: the frozen statuses and the one editable field', () => {
    const source = lowered('quote_workflow');
    // One table for both freezes, the quote's and its lines' (item 16): a
    // second copy would be read by neither assertion below.
    expect(source.match(/STATUS_LABELS\s*=/g)).toHaveLength(1);
    const statuses = table(source, 'STATUS_LABELS');
    expect(statuses.map(([k]) => k).sort()).toEqual(['accepted', 'expired', 'rejected']);
    for (const [value, label] of statuses) expect(label, value).toBe(optionLabel(Quote, 'status', value));
    expect(source).toContain(`only its ${fieldLabel(Quote, 'internal_notes')} can still be edited`);
    // A Rejected quote's own sentence (#2366): the way out, then the one field.
    expect(source).toContain(`only its ${fieldLabel(Quote, 'internal_notes')} can be edited`);
  });

  it('contract_validation: the end date', () => {
    expect(lowered('contract_validation')).toContain(`contract's ${fieldLabel(Contract, 'end_date')} cannot move earlier`);
  });
});

describe('freeze refusals use the labels the user sees (#2338 items 14 and 15)', () => {
  it('lead_automation: every field the converted-lead lock holds', () => {
    const source = lowered('lead_automation');
    const labels = table(source, 'FIELD_LABELS');
    // The lock holds every field outside its ALLOWED set, so the table has to
    // name exactly those: a field added to crm_lead without a label here would
    // reach the user as its API key.
    const allowed = [.../ALLOWED\s*=\s*new Set\(\[([^\]]*)\]/.exec(source)![1]!.matchAll(/['"](\w+)['"]/g)].map((m) => m[1]!);
    expect(allowed).toEqual(expect.arrayContaining(['description', 'notes']));
    const held = Object.keys(Lead.fields).filter((f) => !allowed.includes(f));
    expect(labels.map(([k]) => k).sort()).toEqual(held.sort());
    for (const [field, label] of labels) expect(label, field).toBe(fieldLabel(Lead, field));
    // The two the user may still edit, named in the sentence by their labels.
    expect(source).toContain(`only its ${fieldLabel(Lead, 'description')} and ${fieldLabel(Lead, 'notes')} can still be edited`);
  });

  it('opportunity_line_item_freeze: the closed stages', () => {
    const stages = table(lowered('opportunity_line_item_freeze'), 'STAGE_LABELS');
    expect(stages.map(([k]) => k).sort()).toEqual(['closed_lost', 'closed_won']);
    for (const [value, label] of stages) expect(label, value).toBe(optionLabel(Opportunity, 'stage', value));
  });
});

describe('the large-deal close-won refusal uses the labels the user sees (#2350)', () => {
  it('opportunity_lifecycle: the stage, the verdict field and every verdict that refuses', () => {
    const source = lowered('opportunity_lifecycle');
    const verdicts = table(source, 'VERDICT_LABELS');
    // Every verdict but `approved` refuses, so the table names exactly those.
    expect(verdicts.map(([k]) => k).sort()).toEqual(['not_required', 'pending', 'rejected']);
    for (const [value, label] of verdicts) expect(label, value).toBe(optionLabel(Opportunity, 'approval_status', value));
    expect(source).toContain(`and its ${fieldLabel(Opportunity, 'approval_status')} is \${shown}`);
    expect(source).toContain(`before it can be ${optionLabel(Opportunity, 'stage', 'closed_won')}`);
  });

  it('quote_workflow: the deal verdicts its acceptance mirror names', () => {
    const source = lowered('quote_workflow');
    const values = table(source, 'VALUE_LABELS');
    expect(values.map(([k]) => k).sort()).toEqual(['not_required', 'pending', 'rejected']);
    for (const [value, label] of values) expect(label, value).toBe(optionLabel(Opportunity, 'approval_status', value));
    // The lowered body is reprinted, so the quote style is not the source's.
    expect(source).toMatch(new RegExp(`\\[\\s*['"]approval_status['"],\\s*['"]${fieldLabel(Opportunity, 'approval_status')}['"]\\s*\\]`));
  });
});

/**
 * The quote's status warning states the path by the status labels (#2371 row
 * 7). It read "Invalid quote status transition", which named neither the move
 * nor the moves allowed. A state-machine message takes no holes on 18.2.0, so
 * it names every status of the graph instead; each locale pack restates it in
 * its own option labels. A status renamed on the object or in a pack without
 * the sentence turns this red.
 */
describe('the quote status warning names the statuses by their labels (#2371 row 7)', () => {
  const rule = (Quote.validations as AnyRec[]).find((v) => v.name === 'quote_status_progression')!;
  const statuses = (Quote.fields.status.options as AnyRec[]).map((o) => String(o.value));

  it('is still the warning-severity machine over status, with every status in its table', () => {
    expect({ type: rule.type, field: rule.field, severity: rule.severity })
      .toEqual({ type: 'state_machine', field: 'status', severity: 'warning' });
    expect(Object.keys(rule.transitions).sort()).toEqual([...statuses].sort());
  });

  it('names every status by its label in the authored sentence', () => {
    for (const value of statuses) expect(rule.message, value).toContain(optionLabel(Quote, 'status', value));
    expect(rule.message).not.toMatch(/invalid|transition|in_review/i);
  });

  it.each([['zh-CN', zhCommerce], ['es-ES', esCommerce], ['ja-JP', jaCommerce]] as const)(
    '%s: the pack sentence names every status by the pack\'s own option label',
    (_locale, pack) => {
      const quote = (pack as AnyRec).crm_quote;
      const message = String(quote._validations.quote_status_progression.message);
      for (const value of statuses) expect(message, value).toContain(quote.fields.status.options[value]);
    },
  );
});
