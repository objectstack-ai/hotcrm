// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';
import { bundle, type TemplateVariables } from './_bundle';
import { en } from './en';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/** What each template reads, once for all four locales (`TemplateVariables`, hotcrm#2451). */
const VARIABLES: TemplateVariables = {
  'crm.account_approved': [{ name: 'name' }],
  'crm.account_rejected': [{ name: 'name' }],
  'crm.contact_welcome': [{ name: 'person_name' }],
  // The contract's number and name, composed by the flow (`contractLabel`, hotcrm#2746).
  'crm.contract_drafted': [{ name: 'contract' }],
  'crm.contract_expired': [{ name: 'contract' }],
  'crm.contract_renewal': [{ name: 'contract' }, { name: 'end_date', type: 'date' }],
  'crm.deal_stalled': [
    { name: 'name' },
    { name: 'stage_label', description: "The stage's label in each language, keyed by locale; each locale's row reads its own key." },
    { name: 'days_in_stage', type: 'number' },
  ],
  'crm.large_deal_won': [{ name: 'name' }, { name: 'amount', type: 'number' }],
  'crm.lead_conversion_approved': [{ name: 'person_name' }],
  'crm.lead_conversion_rejected': [{ name: 'person_name' }],
  'crm.lead_converted': [{ name: 'person_name' }],
  'crm.lead_routing_hot': [{ name: 'person_name' }, { name: 'company' }, { name: 'rating', type: 'number' }],
  'crm.lead_routing_new': [{ name: 'person_name' }, { name: 'company' }],
  'crm.opportunity_approved': [{ name: 'name' }],
  'crm.opportunity_rejected': [{ name: 'name' }],
  'crm.task_reminder': [{ name: 'subject' }, { name: 'reminder_date', type: 'date' }],
  'crm.urgent_task': [{ name: 'subject' }],
};

/**
 * Sales — every `sys_email_template` row this package's `notify` nodes name.
 *
 * Four locale packs crossed with seventeen template names: the rows a
 * recipient's own `sys_user.locale` is resolved against, per recipient, after
 * fan-out. Assembled here the way `translations/crm.translation.ts` assembles
 * the UI locale packs — one file per language, one file that collects them.
 */
export const SalesEmailTemplates: EmailTemplateDefinition[] = bundle({
  'en-US': en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'es-ES': esES,
}, VARIABLES);
