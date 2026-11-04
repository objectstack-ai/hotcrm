// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { OpportunityStagnationFlow } from '../src/sales/flows/opportunity-stagnation.flow';
import { CaseEscalationFlow } from '../src/service/flows/case-escalation.flow';
import { CaseSlaMonitorFlow } from '../src/service/flows/case-sla-monitor.flow';
import { CrmTranslations } from '../src/sales/translations';
import { ServiceTranslations } from '../src/service/translations';
import { flowNodesDeep } from './helpers/flow-regions';
import {
  hotcrmStack, signUpPerson, systemUpdate, runScheduledFlow, settleNotificationDeliveries, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * A notice names a select field's value by its option label, in the language
 * of the template that renders it (#2391).
 *
 * The stalled-deal notice read "has sat in needs_analysis" in English and
 * 「已在“needs_analysis”阶段停留」 in Chinese; the case escalation and SLA
 * breach notices printed the priority the same way, 「工单 CS-1（critical）」.
 * Each now hands its template a `*_label` entry that holds the label in every
 * shipped language (`src/sales/flows/_option-labels.ts` says why the flow
 * computes it on 18.3.0), and each locale's template reads its own key.
 *
 * Measured on the booted stack: the entry is evaluated by the flow engine's
 * own CEL evaluator, every locale pack is rendered by the email service the
 * inbox and the email channel both call, and the stalled-deal sweep is run
 * end to end for an English and a Chinese owner.
 */

/** The template key of each locale the packs ship: a hole path takes no hyphen. */
const LOCALES = { en: 'en-US', zh_CN: 'zh-CN', es_ES: 'es-ES', ja_JP: 'ja-JP' } as const;

/** The labels of `object.field` per template key, as the package's translations carry them. */
const labelsOf = (bundle: Rec, object: string, field: string): Record<string, Record<string, string>> =>
  Object.fromEntries(Object.entries(bundle).map(([locale, data]) =>
    [locale.replace(/-/g, '_'), (data as Rec).objects[object].fields[field].options]));

const notifyNode = (flow: Rec, id: string): Rec => {
  const node = flowNodesDeep(flow).find((n) => n.id === id && n.type === 'notify');
  if (!node) throw new Error(`${flow.name} has no notify node ${id}`);
  return node;
};

const NOTICES = [
  {
    template: 'crm.deal_stalled', flow: OpportunityStagnationFlow, node: 'notify_owner',
    key: 'stage_label', variable: 'currentOpp', object: 'crm_opportunity', field: 'stage', bundle: CrmTranslations,
    value: 'needs_analysis', data: { name: 'Apex Logistics Data Hub', days_in_stage: 33 },
  },
  {
    template: 'crm.case_escalated', flow: CaseEscalationFlow, node: 'notify_team',
    key: 'priority_label', variable: 'caseRecord', object: 'crm_case', field: 'priority', bundle: ServiceTranslations,
    value: 'critical', data: { case_number: 'CS-0001' },
  },
  {
    template: 'crm.case_sla_breach', flow: CaseSlaMonitorFlow, node: 'notify_team',
    key: 'priority_label', variable: 'currentCase', object: 'crm_case', field: 'priority', bundle: ServiceTranslations,
    value: 'high', data: { case_number: 'CS-0002' },
  },
] as const;

let verify: VerifyStack;
let enRep: Person;
let zhRep: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  await verify.signIn();
  enRep = await signUpPerson(verify, 'en@notice-option-labels.test', {
    name: 'English Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  zhRep = await signUpPerson(verify, 'zh@notice-option-labels.test', {
    name: 'Chinese Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  await systemUpdate(verify, 'sys_user', { id: zhRep.id, locale: 'zh-CN' });
}, 120_000);

describe.each(NOTICES)('$template names its $field by the option label', (n) => {
  const labels = labelsOf(n.bundle, n.object, n.field);
  const entry = () => notifyNode(n.flow, n.node).config.templateData[n.key];
  const evaluate = (value: unknown) => verify.kernel.getService<Rec>('automation')
    .evaluateValueEnvelope(entry(), new Map([[n.variable, { [n.field]: value }]]), 'templateData', {});

  it('every served option of the field has a label in every shipped language', () => {
    const served = verify.metadata.object(n.object)?.fields?.[n.field] as Rec | undefined;
    const options = ((served?.options ?? []) as Rec[]).map((o) => String(o.value));
    expect(options.length, `${n.object}.${n.field} served no options`).toBeGreaterThan(0);
    expect(Object.keys(labels).sort()).toEqual(Object.keys(LOCALES).sort());
    for (const [locale, byValue] of Object.entries(labels)) {
      expect(Object.keys(byValue).sort(), `${locale} labels`).toEqual([...options].sort());
    }
  });

  it('the flow engine evaluates the entry to the label in every language, not the stored value', () => {
    expect(evaluate(n.value)).toEqual(Object.fromEntries(Object.keys(LOCALES).map((key) => [key, labels[key]![n.value]])));
    // A value outside the authored options is named as stored, as the
    // platform's own `label()` names it; the node does not fail on it.
    expect(evaluate('added_in_studio')).toEqual(Object.fromEntries(Object.keys(LOCALES).map((key) => [key, 'added_in_studio'])));
  });

  it.each(Object.entries(LOCALES))('the %s pack prints its own label', async (key, locale) => {
    const email = verify.kernel.getService<Rec>('email');
    const render = async (entry: unknown): Promise<string> => (await email.renderTemplate({
      template: n.template, locale, data: { ...n.data, [n.key]: entry },
    })).text;
    const labelled = await render(evaluate(n.value));
    expect(labelled).toContain(labels[key]![n.value]);
    // The hole is what changed, not the prose around it: the English
    // escalation sentence says "on critical priority" in words of its own, so
    // the stored value is counted against a render that fed it to the hole.
    const asStored = await render(Object.fromEntries(Object.keys(LOCALES).map((k) => [k, n.value])));
    const count = (text: string) => text.split(n.value).length - 1;
    expect(count(labelled), 'the hole still prints the stored value').toBe(count(asStored) - 1);
  });
});

describe('opportunity_stagnation — the inbox notice in each owner’s language', () => {
  it('reads "Needs Analysis" for an English owner and 「需求分析」 for a Chinese one', async () => {
    const day = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const deals: Array<[Person, string, string]> = [];
    for (const [owner, label] of [[enRep, 'Needs Analysis'], [zhRep, '需求分析']] as const) {
      const [acct] = await verify.seed('crm_account', [{ name: `Label Co ${++k}`, tier: 'smb', owner_id: owner.id }]);
      const [opp] = await verify.seed('crm_opportunity', [{
        name: `Label Deal ${++k}`, amount: 50_000, stage: 'needs_analysis', close_date: '2030-06-30',
        crm_account: acct!.id, owner_id: owner.id, stage_entry_date: day(-33),
      }]);
      deals.push([owner, String(opp!.id), label]);
    }
    await settleNotificationDeliveries(verify, () => runScheduledFlow(verify, 'opportunity_stagnation'));
    for (const [owner, id, label] of deals) {
      const row = await vi.waitFor(async () => {
        const rows = (await verify.rows('sys_inbox_message', { user_id: owner.id, topic: 'deal_stalled' }))
          .filter((r) => r.action_url === `/crm_opportunity/${id}`);
        expect(rows, 'no inbox row for the stalled deal yet').toHaveLength(1);
        return rows[0]!;
      }, { timeout: 15_000, interval: 100 });
      expect(String(row.body_md)).toContain(label);
      expect(String(row.body_md), 'the stored stage leaked through').not.toContain('needs_analysis');
    }
  }, 60_000);
});
