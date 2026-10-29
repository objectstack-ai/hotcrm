// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import { OpportunityDetailPage } from '../src/sales/pages/opportunity_detail.page';
import { HIGH_VALUE_DEAL_AMOUNT, LARGE_DEAL_AMOUNT } from '../src/sales/objects/_thresholds';
import { packFor, type AnyRec } from './helpers/composed-stack';

/**
 * A deal waiting on approval says so (#2371 row 2).
 *
 * Measured on 18.2.0: the save that sends a deal for approval shows only the
 * ordinary "Opportunity … updated" toast, and the page gains Recall / Reply
 * buttons above the title with no word on why. No hook or flow can add text
 * to that toast, so the deal page carries the message while the request
 * waits: who decides (by the amount tiers of `opportunity_approval`), that the
 * deal is locked, and what Recall does. Delete either banner, or break its
 * predicate, and this goes red.
 */

type Rec = Record<string, unknown>;

const components: AnyRec[] = (OpportunityDetailPage.regions ?? []).flatMap((r) => (r.components ?? []) as AnyRec[]);
const alert = (id: string): AnyRec => {
  const found = components.find((c) => c.id === id);
  if (!found) throw new Error(`opportunity_detail_page has no component ${id}`);
  return found;
};
const MANAGER = alert('opp_approval_pending_manager');
const DIRECTOR = alert('opp_approval_pending_director');

const shown = (component: AnyRec, record: Rec): unknown =>
  ExpressionEngine.evaluate({ dialect: 'cel', source: component.properties.visible.source }, { record });

const SHAPES: Array<[string, Rec, 'manager' | 'director' | null]> = [
  ['pending at the large-deal line', { approval_status: 'pending', amount: LARGE_DEAL_AMOUNT }, 'manager'],
  ['pending at exactly the high-value line', { approval_status: 'pending', amount: HIGH_VALUE_DEAL_AMOUNT }, 'manager'],
  ['pending over the high-value line', { approval_status: 'pending', amount: HIGH_VALUE_DEAL_AMOUNT + 1 }, 'director'],
  ['pending with no amount column', { approval_status: 'pending' }, 'manager'],
  ['pending with a null amount', { approval_status: 'pending', amount: null }, 'manager'],
  ['approved', { approval_status: 'approved', amount: 600_000 }, null],
  ['rejected', { approval_status: 'rejected', amount: 150_000 }, null],
  ['not required', { approval_status: 'not_required', amount: 50_000 }, null],
  ['a null status', { approval_status: null, amount: 150_000 }, null],
  ['no status column', { amount: 150_000 }, null],
];

describe('the deal page says a deal is waiting on approval (#2371 row 2)', () => {
  it('declares two info banners in the header, gated by a CEL predicate', () => {
    for (const c of [MANAGER, DIRECTOR]) {
      expect(c.type).toBe('record:alert');
      expect(c.properties.severity).toBe('info');
      expect(c.properties.visible.dialect).toBe('cel');
    }
  });

  it.each(SHAPES)('%s: shows the %s banner', (_label, record, which) => {
    expect(shown(MANAGER, record)).toEqual({ ok: true, value: which === 'manager' });
    expect(shown(DIRECTOR, record)).toEqual({ ok: true, value: which === 'director' });
  });

  // The console's own Recall button label, per locale (`approvals.recall` in
  // the `@objectstack/console` 18.2.0 locale bundles), and the position labels
  // the packs publish.
  const RECALL: Record<string, string> = { en: 'Recall', 'zh-CN': '撤回', 'ja-JP': '取り下げ', 'es-ES': 'Retirar' };
  const position = (locale: string, name: string): string =>
    locale === 'en' ? ({ sales_manager: 'Sales Manager', sales_director: 'Sales Director' } as Rec)[name] as string
      : String(packFor(locale)?.positions?.[name]?.label);

  it.each(Object.keys(RECALL))('%s: names the approver, the lock and what Recall does', (locale) => {
    const manager = position(locale, 'sales_manager');
    const director = position(locale, 'sales_director');
    expect(manager, `${locale} pack has no sales_manager label`).not.toBe('undefined');
    for (const c of [MANAGER, DIRECTOR]) {
      const text = `${c.properties.title[locale]} ${c.properties.body[locale]}`;
      expect(text, c.id).toContain(manager);
      expect(text, c.id).toContain(RECALL[locale]);
    }
    expect(`${DIRECTOR.properties.title[locale]} ${DIRECTOR.properties.body[locale]}`).toContain(director);
    expect(DIRECTOR.properties.body[locale]).toContain(`$${HIGH_VALUE_DEAL_AMOUNT.toLocaleString('en-US')}`);
  });
});
