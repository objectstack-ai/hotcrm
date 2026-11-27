// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { CrmTranslations } from '../src/sales/translations';
import { ServiceTranslations } from '../src/service/translations';
import { RevenueTranslations } from '../src/revenue/translations';
import {
  bootOptions, signUpPerson, switchFlow, systemUpdate, runScheduledFlow, settleNotificationDeliveries, committedFile, notificationsTo,
  type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Text HotCRM writes by itself is stored in the ORGANIZATION's language
 * (#2494, #2522, #2535).
 *
 * Measured before this change on a zh-CN boot: every escalation reason, the
 * title of every task the app opens by itself, the drafted contract's
 * description and the renewal deal's name and next step were English — the
 * only English sentences on a Chinese organization's pages. Since objectstack
 * 18.6.0 a hook declares such a sentence under `texts` and asks for it with
 * `ctx.text` (objectstack#34374), and a flow record write marks it with the
 * text envelope (objectstack#34062). The platform picks the translation in the
 * organization's language — its Localization setting, else the app's
 * `i18n.defaultLocale` — never the language of whoever saved, and writes the
 * English source where a pack has none (ruling B on objectstack#34062).
 *
 * The same app boots twice here, once declaring `zh-CN` and once `en`, and
 * every site is driven through its real door: a person's save, a record-change
 * flow, a scheduled sweep. Each zh-CN expectation is the zh-CN pack's sentence
 * with its holes filled, so a site that writes its English literal again goes
 * red here; each `en` expectation is the English source.
 *
 * Three things the change must keep, pinned alongside:
 *   - the contract-drafted notice fires exactly once for a drafted contract
 *     (its trigger reads the contract's `automation_key`, not the sentence);
 *   - the renewal sweep opens one renewal deal per account and one reminder
 *     per contract, and the stall sweep one task per stall episode (their
 *     gates read the task's `automation_key`, not its title);
 *   - a private deal's task title carries no deal name, in either language.
 */

const SOURCE = {
  escalatedNamed: 'Escalated: {{ label }}',
  escalatedReasonCritical: 'Auto-escalated: critical priority',
  escalatedReasonSla: 'Auto-escalated: SLA due date breached',
  leadNamed: 'Follow up with qualified lead: {{ lead }}',
  activationNamed: 'Activate new customer for opportunity {{ opportunity }}',
  activationPrivate: 'Activate new customer (private opportunity)',
  renewalSubject: 'Renewal due: contract {{ currentContract.contract_number }}',
  renewalName: 'Renewal — {{ currentContract.contract_number }}',
  renewalNextStep: 'Confirm renewal terms with customer',
  stallNamed: 'Advance stalled deal: {{ currentOpp.name | truncate:200 }}',
  stallPrivate: 'Advance stalled deal (private opportunity)',
  draftedNamed: 'Auto-drafted from accepted quote {{ quote }}',
  draftedFromOrder: 'Drafted from order {{ order }}',
} as const;
type Sentence = keyof typeof SOURCE;

/** Where each sentence's translation lives: the pack of the package that registers its hook or flow. */
const PACK_PATH: Record<Sentence, [bundle: Rec, path: string]> = {
  escalatedNamed: [ServiceTranslations, 'hooks.case_status_side_effects.texts.escalated_named.message'],
  escalatedReasonCritical: [ServiceTranslations, 'flows.case_escalation.records.assign_senior_agent.fields.escalation_reason'],
  escalatedReasonSla: [ServiceTranslations, 'flows.case_sla_monitor.records.flag_breach.fields.escalation_reason'],
  leadNamed: [CrmTranslations, 'hooks.lead_automation.texts.follow_up_named.message'],
  activationNamed: [CrmTranslations, 'hooks.opportunity_promote_account.texts.activation_named.message'],
  activationPrivate: [CrmTranslations, 'hooks.opportunity_promote_account.texts.activation_private.message'],
  renewalSubject: [CrmTranslations, 'flows.contract_renewal.records.create_renewal_task.fields.subject'],
  renewalName: [CrmTranslations, 'flows.contract_renewal.records.create_renewal_opp.fields.name'],
  renewalNextStep: [CrmTranslations, 'flows.contract_renewal.records.create_renewal_opp.fields.next_step'],
  stallNamed: [CrmTranslations, 'flows.opportunity_stagnation.records.create_followup_task.fields.subject'],
  stallPrivate: [CrmTranslations, 'flows.opportunity_stagnation.records.create_private_followup_task.fields.subject'],
  // Since hotcrm#2558 a packaged flow (one key per variant of the draft; the
  // first stands for the four, which `test/sales-order-draft-contract.test.ts`
  // builds from one definition).
  draftedNamed: [RevenueTranslations, 'flows.quote_accepted_contract_draft.records.draft_contract.fields.description'],
  draftedFromOrder: [CrmTranslations, 'flows.sales_order_draft_contract_write.records.draft_contract.fields.description'],
};

const TRANSLATED_LOCALES = ['zh-CN', 'ja-JP', 'es-ES'] as const;

const packSentence = (sentence: Sentence, locale: string): string => {
  const [bundle, path] = PACK_PATH[sentence];
  const found = path.split('.').reduce<any>((node, key) => node?.[key], bundle[locale]);
  if (typeof found !== 'string') throw new Error(`no ${locale} translation of '${sentence}' at ${path}`);
  return found;
};

const holes = (template: string): string[] => [...template.matchAll(/\{\{([^}]*)\}\}/g)].map((m) => m[1]!.trim()).sort();

/** The template with its holes filled: a hole's path is looked up in `values`, and `truncate:N` cuts as the platform does. */
const fill = (template: string, values: Record<string, string>): string =>
  template.replace(/\{\{\s*([^}|\s]+)\s*(?:\|\s*truncate:(\d+)\s*)?\}\}/g, (_, path: string, cap?: string) => {
    const value = values[path];
    if (value === undefined) throw new Error(`no value for the hole ${path}`);
    const n = cap === undefined ? undefined : Number(cap);
    return n !== undefined && value.length > n ? `${value.slice(0, n - 1)}…` : value;
  });

const CJK = /[一-鿿]/;

describe('every stored sentence has its translation in each pack, with the source\'s holes (#2494, #2522, #2535)', () => {
  it.each(TRANSLATED_LOCALES)('%s', (locale) => {
    for (const sentence of Object.keys(SOURCE) as Sentence[]) {
      const translated = packSentence(sentence, locale);
      expect(translated, `${locale} ${sentence} is the English source`).not.toBe(SOURCE[sentence]);
      expect(holes(translated), `${locale} ${sentence}: a translation fills the holes the source fills`).toEqual(holes(SOURCE[sentence]));
    }
  });

  it('the stall title fits the 255-character subject with the longest name the cap lets through, in every language', () => {
    // `crm_task.subject` caps at 255 and the engine refuses an overflow; the
    // name is cut at 200 (#2210), so each opening must leave room for it.
    for (const locale of ['en', ...TRANSLATED_LOCALES]) {
      const template = locale === 'en' ? SOURCE.stallNamed : packSentence('stallNamed', locale);
      expect(fill(template, { 'currentOpp.name': 'x'.repeat(400) }).length, locale).toBeLessThanOrEqual(255);
    }
  });
});

const day = (daysFromNow: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

/** The shipped artifact, declaring `locale` as the app's default language. */
const artifactIn = (locale: string): typeof artifact => {
  const a = artifact as unknown as Rec;
  return { ...a, i18n: { ...a.i18n, defaultLocale: locale } } as typeof artifact;
};

describe.each([
  { locale: 'zh-CN', chinese: true },
  { locale: 'en', chinese: false },
])('an organization whose language is $locale', ({ locale, chinese }) => {
  /** The sentence this organization's records carry, holes filled. */
  const expected = (sentence: Sentence, values: Record<string, string> = {}): string =>
    fill(chinese ? packSentence(sentence, locale) : SOURCE[sentence], values);

  let verify: VerifyStack;
  let rep: Person;
  let agent: Person;
  let k = 0;

  beforeAll(async () => {
    verify = await bootStack(artifactIn(locale), bootOptions());
    await verify.signIn();
    // The accepted-quote contract draft ships switched off (hotcrm#2558); the
    // revenue case below pins it switched on.
    await switchFlow(verify, 'quote_accepted_contract_draft', true);
    rep = await signUpPerson(verify, `rep@org-locale-${locale}.test`, {
      name: 'Locale Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    // Service grants, off the intake rota: a case the agent opens stays theirs.
    agent = await signUpPerson(verify, `agent@org-locale-${locale}.test`, { name: 'Locale Agent', permissionSets: ['service_agent'] });
  }, 300_000);

  afterAll(async () => {
    await verify?.stop();
  });

  const account = async (): Promise<Rec> =>
    (await verify.seed('crm_account', [{ name: `Locale Co ${++k}`, tier: 'enterprise', owner_id: rep.id }]))[0]!;
  const sweep = (flow: string) => settleNotificationDeliveries(verify, () => runScheduledFlow(verify, flow));
  const waitForRow = (object: string, where: Rec): Promise<Rec> =>
    vi.waitFor(async () => {
      const [row] = await verify.rows(object, where);
      expect(row, `no ${object} row for ${JSON.stringify(where)}`).toBeTruthy();
      return row!;
    }, { timeout: 15_000, interval: 50 });

  describe('the service module (#2494)', { timeout: 60_000 }, () => {
    it('a case opened critical is escalated with the reason, its follow-up task titled, and the close completes that task', async () => {
      const acct = await account();
      const opened = await verify.hooks.run('crm_case', 'insert', {
        subject: `Line down ${++k}`, description: 'All lines are down.', crm_account: acct.id, status: 'new', priority: 'critical',
      }, { as: agent.token });
      const kase = await vi.waitFor(async () => {
        const [row] = await verify.rows('crm_case', { id: opened.id });
        expect(row?.status).toBe('escalated');
        return row!;
      }, { timeout: 15_000, interval: 50 });
      expect(kase.escalation_reason).toBe(expected('escalatedReasonCritical'));
      expect(CJK.test(String(kase.escalation_reason))).toBe(chinese);

      const task = await waitForRow('crm_task', { related_to_case: opened.id });
      expect(task.subject).toBe(expected('escalatedNamed', { label: `${kase.case_number} · ${kase.subject}` }));
      expect(task.automation_key).toBe('case_escalation');

      await verify.hooks.run('crm_case', 'update', { id: opened.id, status: 'closed', resolution: 'Line restored.' }, { as: agent.token });
      await vi.waitFor(async () => {
        const [row] = await verify.rows('crm_task', { id: task.id });
        expect(row?.status, 'the close did not complete the escalation task').toBe('completed');
      }, { timeout: 15_000, interval: 50 });
    });

    it('the SLA sweep escalates a breached case with the reason', async () => {
      const acct = await account();
      const opened = await verify.hooks.run('crm_case', 'insert', {
        subject: `Slow portal ${++k}`, description: 'It is slow.', crm_account: acct.id, status: 'new', priority: 'high',
      }, { as: agent.token });
      await systemUpdate(verify, 'crm_case', { id: opened.id, status: 'in_progress', sla_due_date: new Date(Date.now() - 2 * 86_400_000).toISOString() });
      await sweep('case_sla_monitor');
      const [kase] = await verify.rows('crm_case', { id: opened.id });
      expect(kase).toMatchObject({ is_escalated: true, escalation_reason: expected('escalatedReasonSla') });
    });
  });

  describe('the sales package (#2522)', { timeout: 60_000 }, () => {
    it('a qualified lead\'s follow-up task', async () => {
      const [lead] = await verify.seed('crm_lead', [{
        first_name: 'Lee', last_name: `Prospect ${++k}`, company: `Lead Co ${k}`, email: `lead${k}@org-locale.test`, status: 'new', owner_id: rep.id,
      }]);
      await verify.hooks.run('crm_lead', 'update', {
        id: lead!.id, status: 'qualified', need_type: 'new_implementation', estimated_amount: 40_000,
      }, { as: rep.token });
      const task = await waitForRow('crm_task', { related_to_lead: lead!.id });
      expect(task.subject).toBe(expected('leadNamed', { lead: `Lee Prospect ${k} - Lead Co ${k}` }));
    });

    it('a won deal\'s activation task, and a won private deal\'s, which names no deal', async () => {
      const won = async (over: Rec): Promise<Rec> => {
        const acct = await account();
        const [opp] = await verify.seed('crm_opportunity', [{
          name: `Locale Deal ${++k}`, amount: 50_000, stage: 'negotiation', close_date: '2030-06-30', crm_account: acct.id, owner_id: rep.id, ...over,
        }]);
        await verify.hooks.run('crm_opportunity', 'update', { id: opp!.id, stage: 'closed_won', win_reason: 'better_price' }, { as: rep.token });
        return { opp: opp!, task: await waitForRow('crm_task', { related_to_opportunity: opp!.id }) };
      };
      const named = await won({});
      expect(named.task.subject).toBe(expected('activationNamed', { opportunity: named.opp.name }));
      const hidden = await won({ is_private: true });
      expect(hidden.task.subject).toBe(expected('activationPrivate'));
      expect(String(hidden.task.subject)).not.toContain(hidden.opp.name);
    });

    it('the stall sweep\'s task, once per episode, and a private deal\'s without its name', async () => {
      const stalled = async (over: Rec): Promise<Rec> => {
        const acct = await account();
        const [opp] = await verify.seed('crm_opportunity', [{
          name: `Stalled Locale Deal ${++k}`, amount: 50_000, stage: 'proposal', close_date: '2030-06-30', crm_account: acct.id, owner_id: rep.id, ...over,
        }]);
        await systemUpdate(verify, 'crm_opportunity', { id: opp!.id, stage_entry_date: day(-30) });
        return opp!;
      };
      const named = await stalled({});
      const hidden = await stalled({ is_private: true });
      await sweep('opportunity_stagnation');
      await sweep('opportunity_stagnation');

      const namedTasks = await verify.rows('crm_task', { related_to_opportunity: named.id });
      expect(namedTasks.map((t) => t.subject), 'one stall task per episode').toEqual([expected('stallNamed', { 'currentOpp.name': named.name })]);
      expect(namedTasks[0]!.automation_key).toBe('stalled_deal');
      const hiddenTasks = await verify.rows('crm_task', { related_to_opportunity: hidden.id });
      expect(hiddenTasks.map((t) => t.subject)).toEqual([expected('stallPrivate')]);
      expect(String(hiddenTasks[0]!.subject)).not.toContain(hidden.name);
    });

    it('the renewal sweep\'s reminder and renewal deal, once each per contract and account', async () => {
      const acct = await account();
      const [contact] = await verify.seed('crm_contact', [{
        first_name: 'Cara', last_name: `Signer ${++k}`, email: `cara${k}@org-locale.test`, crm_account: acct.id, owner_id: rep.id,
      }]);
      const [contract] = await verify.seed('crm_contract', [{
        status: 'activated', crm_account: acct.id, crm_contact: contact!.id, owner_id: rep.id,
        contract_type: 'subscription', contract_value: 90_000, auto_renewal: true, renewal_notice_days: 30,
        name: 'Fixture Contract', contract_term_months: 12, start_date: day(20 - 365), end_date: day(20),
        billing_frequency: 'monthly', payment_terms: 'net_30', signed_copy: await committedFile(verify, rep.id),
      }]);
      await sweep('contract_renewal');
      await sweep('contract_renewal');

      const values = { 'currentContract.contract_number': String(contract!.contract_number) };
      const reminders = await verify.rows('crm_task', { related_to_account: acct.id });
      expect(reminders.map((t) => t.subject), 'one reminder per contract').toEqual([expected('renewalSubject', values)]);
      expect(reminders[0]!.automation_key).toBe(`contract_renewal:${contract!.id}`);
      const deals = await verify.rows('crm_opportunity', { crm_account: acct.id, type: 'existing_renewal' });
      expect(deals, 'one renewal deal per account').toHaveLength(1);
      expect(deals[0]).toMatchObject({ name: expected('renewalName', values), next_step: expected('renewalNextStep') });
    });
  });

  describe('the revenue module (#2535)', { timeout: 60_000 }, () => {
    it('an accepted quote\'s drafted contract carries the provenance sentence, and its accepter is told once', async () => {
      const create = async (object: string, doc: Rec) =>
        String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
      const acct = await create('crm_account', { name: `Drafted Locale Co ${++k}` });
      const contact = await create('crm_contact', {
        first_name: 'Dana', last_name: `Drafted ${k}`, email: `dana${k}@org-locale.test`, crm_account: acct,
      });
      const opportunity = await create('crm_opportunity', {
        name: `Drafted Locale deal ${k}`, crm_account: acct, stage: 'proposal', amount: 1_000, close_date: '2030-06-30',
      });
      const quoteName = `Drafted Locale quote ${k}`;
      const id = await create('crm_quote', {
        name: quoteName, crm_account: acct, crm_contact: contact, crm_opportunity: opportunity,
        quote_date: day(0), expiration_date: '2030-12-31',
      });
      for (const status of ['in_review', 'presented', 'accepted']) {
        const signed = status === 'accepted' ? { signed_copy: await committedFile(verify, rep.id) } : {};
        await verify.hooks.run('crm_quote', 'update', { id, status, ...signed }, { as: rep.token });
      }
      const contract = await waitForRow('crm_contract', { crm_opportunity: opportunity });
      const [quote] = await verify.rows('crm_quote', { id });
      expect(contract.description).toBe(expected('draftedNamed', { quote: `${quote!.quote_number} - ${quoteName}` }));
      expect(contract.automation_key).toBe('quote_acceptance');

      await vi.waitFor(async () => {
        const notices = (await notificationsTo(verify, rep.id, 'contract_drafted'))
          .filter((n) => n.payload?.actionUrl === `/crm_contract/${contract.id}`);
        expect(notices, 'the drafted-contract notice fires exactly once').toHaveLength(1);
      }, { timeout: 15_000, interval: 100 });
    });

    it('Draft Contract on the order an accepted quote created carries the order\'s provenance sentence (#2558)', async () => {
      const create = async (object: string, doc: Rec) =>
        String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
      const acct = await create('crm_account', { name: `Ordered Locale Co ${++k}` });
      const contact = await create('crm_contact', {
        first_name: 'Odo', last_name: `Ordered ${k}`, email: `odo${k}@org-locale.test`, crm_account: acct,
      });
      const id = await create('crm_quote', {
        name: `Ordered Locale quote ${k}`, crm_account: acct, crm_contact: contact, quote_date: day(0), expiration_date: '2030-12-31',
      });
      // The shipped default: the order flow on, the automatic draft off.
      await switchFlow(verify, 'quote_accepted_contract_draft', false);
      try {
        for (const status of ['in_review', 'presented', 'accepted']) {
          const signed = status === 'accepted' ? { signed_copy: await committedFile(verify, rep.id) } : {};
          await verify.hooks.run('crm_quote', 'update', { id, status, ...signed }, { as: rep.token });
        }
      } finally {
        await switchFlow(verify, 'quote_accepted_contract_draft', true);
      }
      const order = await waitForRow('crm_sales_order', { crm_quote: id });
      const run = await verify.flows.run('sales_order_draft_contract', { recordId: order.id, objectName: 'crm_sales_order' }, { as: rep.token }) as Rec;
      expect(run.status, JSON.stringify(run.error ?? run.status)).toBe('paused');
      const contract = await waitForRow('crm_contract', { crm_account: acct });
      expect(contract.description).toBe(expected('draftedFromOrder', { order: `${order.order_number} - ${order.name}` }));
      expect(CJK.test(String(contract.description))).toBe(chinese);
      expect(contract.automation_key).toBe('quote_acceptance');
    });
  });
});
