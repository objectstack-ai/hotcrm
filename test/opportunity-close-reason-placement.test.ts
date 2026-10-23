// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import { OpportunityViews } from '../src/sales/views/opportunity.view';
import { Opportunity } from '../src/sales/objects/opportunity.object';

/**
 * The close reason is asked for where the close happens (#2238, #2194 T1-U02).
 *
 * `win_reason` / `loss_reason` carry a `requiredWhen` on their closed stage.
 * While the Edit form kept them on its last tab ("Win / Loss", collapsed),
 * picking Closed Won and pressing Update failed once ("Please check the
 * highlighted fields: Win Reason") and jumped to that tab — every win cost one
 * failed save. The form now offers each reason in the Overview section, in the
 * cell beside Stage, shown only on its own closed stage; the object files both
 * in `sales_process`, the group that holds `stage`, so the derived Details tab
 * agrees.
 *
 * This suite pins: the placement, the visibility on every stage value (and on
 * a record with no stage at all — an unevaluable `visibleWhen` fails OPEN, see
 * `test/view-predicate-dialect.test.ts`), that the `requiredWhen` gates are
 * unchanged, and that the Win / Loss section keeps `loss_details`.
 */

type AnyRec = Record<string, any>;

const sections = (): AnyRec[] => (OpportunityViews as AnyRec).form.sections;
const section = (name: string): AnyRec => {
  const s = sections().find((x) => x.name === name);
  if (!s) throw new Error(`form section "${name}" not found`);
  return s;
};
const nameOf = (f: any): string => (typeof f === 'string' ? f : f.field);
const entry = (sectionName: string, field: string): AnyRec | undefined =>
  section(sectionName).fields.find((f: any) => typeof f !== 'string' && f.field === field);

const sourceOf = (pred: unknown): string =>
  typeof pred === 'string' ? pred : (pred as AnyRec).source;

const evaluate = (pred: unknown, record: AnyRec) =>
  ExpressionEngine.evaluate({ dialect: 'cel', source: sourceOf(pred) }, { record });

const STAGES = ((Opportunity.fields as AnyRec).stage.options as AnyRec[]).map((o) => o.value);

const REASONS = [
  { field: 'win_reason', stage: 'closed_won' },
  { field: 'loss_reason', stage: 'closed_lost' },
] as const;

describe('opportunity form — the close reason sits beside Stage (#2238)', () => {
  it('places Win Reason then Loss Reason right after Stage in Overview', () => {
    const names = section('overview').fields.map(nameOf);
    const at = names.indexOf('stage');
    expect(at).toBeGreaterThanOrEqual(0);
    expect(names.slice(at, at + 3)).toEqual(['stage', 'win_reason', 'loss_reason']);
  });

  it('offers each reason on exactly one form section', () => {
    for (const { field } of REASONS) {
      const holders = sections().filter((s) => (s.fields ?? []).map(nameOf).includes(field));
      expect(holders.map((s) => s.name), field).toEqual(['overview']);
    }
  });

  it.each(REASONS)('shows $field only when the stage is $stage', ({ field, stage }) => {
    const pred = entry('overview', field)?.visibleWhen;
    expect(pred, `${field} has no visibleWhen`).toBeDefined();
    expect(STAGES).toContain(stage);
    for (const value of STAGES) {
      const r = evaluate(pred, { stage: value });
      expect(r.ok, `${field} @ ${value}`).toBe(true);
      expect((r as AnyRec).value, `${field} @ ${value}`).toBe(value === stage);
    }
    // A new record has no stage key yet: the predicate must still answer, hidden.
    const blank = evaluate(pred, {});
    expect(blank.ok).toBe(true);
    expect((blank as AnyRec).value).toBe(false);
  });

  it('keeps Loss/Win Details on the Win / Loss section', () => {
    expect(section('win_loss').fields.map(nameOf)).toEqual(['loss_details']);
  });
});

describe('opportunity object — the reasons are filed with Stage (#2238)', () => {
  const fields = Opportunity.fields as AnyRec;

  it.each(REASONS)('$field is in the sales_process group, beside stage', ({ field }) => {
    expect(fields.stage.group).toBe('sales_process');
    expect(fields[field].group).toBe('sales_process');
  });

  it.each(REASONS)('$field keeps its requiredWhen on $stage unchanged', ({ field, stage }) => {
    expect(sourceOf(fields[field].requiredWhen)).toBe(
      `has(record.stage) && record.stage == "${stage}"`,
    );
  });
});
