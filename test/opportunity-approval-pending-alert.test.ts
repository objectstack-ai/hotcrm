// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack, { type AnyRec, packFor, walk } from './helpers/composed-stack';
import { hotcrmStack } from './helpers/verify-stack';

/**
 * A deal waiting on approval is explained by the platform's own approval
 * strip, not by a banner this app writes (#2686).
 *
 * Maintainer ruling, 2026-11-19, which modifies the 2026-10-29 ruling on #2382
 * as far as these two banners go: the opportunity's two `slots.alerts`
 * banners (#2371 row 2) are dropped. They partly repeated the native strip,
 * their copy read the same to every viewer (an approver was told to "click
 * Recall"), and the fixed "Sales Manager" / "$500,000" wording went wrong under
 * reassignment, delegation or the administrators' rescue. With the banners
 * gone the page had nothing left to override, so the opportunity draws the
 * platform's default record page.
 *
 * Measured on `objectstack dev` at the 18.6.0 pin, on a $150,000 deal a rep
 * saved: the approver's strip above the title reads "Awaiting your approval ·
 * Step 1 · Sales Manager Review · Submitted by NAME" with Approve and Reject;
 * the submitter's strip carries Recall and Reply, and the page's Approvals
 * card names who the request is waiting on. The step name is the approval
 * node's label, translated by the packs; who it waits on is the node's
 * approver slate. So this suite pins both halves on the BOOTED app
 * (`@objectstack/verify`): no opportunity page authors a banner, and the data
 * the strip draws from is there.
 */

let verify: VerifyStack;
beforeAll(async () => {
  verify = await hotcrmStack();
}, 120_000);

const LOCALES = ['en', 'zh-CN', 'es-ES', 'ja-JP'];

describe('no opportunity page authors an approval banner (#2686)', () => {
  it('the opportunity has no authored record page: it draws the default page', () => {
    const pages = verify.metadata.items<AnyRec>('page');
    expect(pages.length, 'the walk no longer reaches the served pages').toBeGreaterThan(0);
    expect(pages.filter((p) => p.type === 'record' && p.object === 'crm_opportunity').map((p) => p.name)).toEqual([]);
  });

  it('no served page bound to the opportunity places an alert', () => {
    const bad = verify.metadata.items<AnyRec>('page')
      .filter((p) => p.object === 'crm_opportunity')
      .filter((p) => [...walk(p)].some((n) => n.type === 'record:alert') || 'alerts' in (p.slots ?? {}))
      .map((p) => p.name);
    expect(bad, 'pages that bring an opportunity banner back').toEqual([]);
  });

  it('the four packs carry no copy for the retired page', () => {
    for (const locale of LOCALES) {
      const pack = packFor(locale);
      expect(pack, `${locale} pack is not composed`).toBeTruthy();
      expect(pack!.pages?.opportunity_detail_page, locale).toBeUndefined();
    }
  });
});

describe('the native approval strip has its data on a large deal (#2686)', () => {
  // Both flows open the same tiers: the update gate and its insert twin.
  const FLOWS = ['opportunity_approval', 'opportunity_approval_on_create'];
  const STEPS: Array<[string, string, string]> = [
    ['manager_review', 'Sales Manager Review', 'crm_sales_manager'],
    ['director_signoff', 'Sales Director Sign-off', 'crm_sales_director'],
  ];
  const flow = (name: string): AnyRec => {
    const found = verify.metadata.items<AnyRec>('flow').find((f) => f.name === name);
    if (!found) throw new Error(`flow ${name} is not registered`);
    return found;
  };

  it.each(FLOWS)('%s: each step names its position, locks the deal and mirrors approval_status', (name) => {
    const approvals = (flow(name).nodes as AnyRec[]).filter((n) => n.type === 'approval');
    expect(approvals.map((n) => [n.id, n.label, n.config?.approvers])).toEqual(
      STEPS.map(([id, label, position]) => [id, label, [{ type: 'position', value: position }]]),
    );
    for (const node of approvals) {
      expect(node.config?.lockRecord, node.id).toBe(true);
      expect(node.config?.approvalStatusField, node.id).toBe('approval_status');
    }
    expect((verify.metadata.object('crm_opportunity')?.fields as AnyRec)?.approval_status?.type).toBe('select');
  });

  it.each(LOCALES)('%s: the strip\'s step names and the approvers\' positions are labelled', (locale) => {
    const pack = packFor(locale)!;
    const positions = ((stack as AnyRec).positions ?? []) as AnyRec[];
    for (const name of FLOWS) {
      for (const [id, label, position] of STEPS) {
        const step = pack.flows?.[name]?.approvals?.[id]?.label;
        expect(step, `${locale} ${name}.${id}`).toEqual(expect.any(String));
        expect(String(step).trim(), `${locale} ${name}.${id}`).not.toBe('');
        if (locale === 'en') expect(step).toBe(label);
        const declared = positions.find((p) => p.name === position);
        expect(declared?.label, `${position} is not declared`).toEqual(expect.any(String));
        if (locale !== 'en') expect(pack.positions?.[position]?.label, `${locale} ${position}`).toEqual(expect.any(String));
      }
    }
  });
});
