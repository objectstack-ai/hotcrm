// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { extractHookBody } from '@objectstack/cli/hook-body';
import { allHooks } from '../objectstack.composition';
import { Opportunity } from '../src/sales/objects/opportunity.object';
import { Contract } from '../src/sales/objects/contract.object';
import { Quote } from '../src/revenue/objects/quote.object';

/**
 * Three freeze refusals name fields and states by the labels the user sees
 * (#2338 item 12).
 *
 * They used to show API names: "…is accepted; only internal_notes may be
 * edited. Attempted: discount.", "Cannot shrink end_date (…)", and "closed
 * (closed_won); only description, next_step, notes may be edited". A lowered
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
    const statuses = table(source, 'STATUS_LABELS');
    expect(statuses.map(([k]) => k).sort()).toEqual(['accepted', 'expired']);
    for (const [value, label] of statuses) expect(label, value).toBe(optionLabel(Quote, 'status', value));
    expect(source).toContain(`only its ${fieldLabel(Quote, 'internal_notes')} can still be edited`);
  });

  it('contract_validation: the end date', () => {
    expect(lowered('contract_validation')).toContain(`contract's ${fieldLabel(Contract, 'end_date')} cannot move earlier`);
  });
});
