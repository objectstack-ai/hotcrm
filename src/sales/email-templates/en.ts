// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from './_bundle';

/**
 * English (en-US) — the sales package's notification templates.
 *
 * Per-locale file, one language each, assembled in `crm.email-template.ts` —
 * the same convention `src/sales/translations/` already follows for the UI
 * locale packs.
 *
 * Every string here began as the text its `notify` node already sent, with the
 * flow's `{var.path}` interpolations re-expressed as the `{{key}}` holes the
 * renderer fills from that node's `templateData`. A conversion, not a rewrite:
 * no notification said anything new. A text changed since says why beside it.
 *
 * ⚠️ Registered under `en-US`, not `en` — see the ladder note on `bundle()`.
 */
export const en: EmailTemplatePack = {
  'crm.account_approved': {
    label: 'Account Approved',
    subject: 'Account approved: {{name}}',
    bodyHtml: '<p>This account has been signed off and is now established data.</p>',
  },
  'crm.account_rejected': {
    label: 'Account Not Approved',
    subject: 'Account not approved: {{name}}',
    bodyHtml: '<p>This account was not signed off. Correct its details and ask for another review.</p>',
  },
  'crm.contact_welcome': {
    label: 'New Contact',
    subject: 'New contact: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} was added as a contact. Reach out to welcome them.</p>',
  },
  'crm.contract_expired': {
    label: 'Contract Expired',
    subject: 'Contract expired: {{contract_number}}',
    bodyHtml: '<p>Contract {{contract_number}} reached its end date and has been marked expired.</p>',
  },
  'crm.contract_renewal': {
    label: 'Contract Renewal Due',
    subject: 'Contract renewal due: {{contract_number}}',
    bodyHtml: '<p>Contract {{contract_number}} ends on {{end_date}}. Start the renewal conversation now.</p>',
  },
  'crm.deal_stalled': {
    label: 'Stalled Deal',
    subject: 'Stalled deal: {{name}}',
    bodyHtml: '<p>Opportunity {{name}} has sat in {{stage}} for {{days_in_stage}} days. Time to advance or re-qualify it.</p>',
  },
  // `{{amount | number:2}}`: the hole goes through the renderer's `number`
  // formatter (ADR-0053), in the recipient's locale, so the amount reads
  // "1,200,000.00" as it does on the record and the list. The bare hole printed
  // the raw value, "closed at 1200000" (#2193). Every locale pack uses the
  // same hole.
  'crm.large_deal_won': {
    label: 'Large Deal Won',
    subject: 'Large deal won: {{name}}',
    bodyHtml: '<p>{{name}} closed at {{amount | number:2}}. Congratulations to the team.</p>',
  },
  'crm.lead_conversion_approved': {
    label: 'Lead Approved for Conversion',
    subject: 'Lead approved for conversion: {{first_name}} {{last_name}}',
    bodyHtml: '<p>This lead has been signed off. You can convert it into an account, contact and opportunity.</p>',
  },
  'crm.lead_conversion_rejected': {
    label: 'Lead Not Approved',
    subject: 'Lead not approved: {{first_name}} {{last_name}}',
    bodyHtml: '<p>Conversion of this lead was not approved. Keep working it, or disqualify it with a reason.</p>',
  },
  'crm.lead_converted': {
    label: 'Lead Converted',
    subject: 'Lead converted: {{first_name}} {{last_name}}',
    bodyHtml: '<p>Lead {{first_name}} {{last_name}} was converted into an account and contact.</p>',
  },
  // The two routing alerts go to the lead's OWNER (`lead_assignment`), so they
  // say the lead is theirs to follow up. They used to read as an assigner's
  // queue ("assign within 24h", "awaiting assignment"), sent to the person the
  // lead was already assigned to (#2073 item 7).
  'crm.lead_routing_hot': {
    label: 'Hot Lead Routing',
    subject: 'Hot lead — follow up within 24h: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} from {{company}} (rating {{rating}}) is yours. Follow up by tomorrow.</p>',
  },
  'crm.lead_routing_new': {
    label: 'New Lead Routing',
    subject: 'New lead assigned to you: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} from {{company}} is now yours. Follow up within 3 days.</p>',
  },
  'crm.opportunity_approved': {
    label: 'Deal Approved',
    subject: 'Deal approved: {{name}}',
    bodyHtml: '<p>Your opportunity {{name}} has been approved.</p>',
  },
  'crm.opportunity_rejected': {
    label: 'Deal Rejected',
    subject: 'Deal rejected: {{name}}',
    bodyHtml: '<p>Your opportunity {{name}} was not approved. Review and revise before resubmitting.</p>',
  },
  'crm.task_reminder': {
    label: 'Task Reminder',
    subject: 'Task reminder: {{subject}}',
    bodyHtml: '<p>Your task "{{subject}}" is due (reminder set for {{reminder_date}}).</p>',
  },
  'crm.urgent_task': {
    label: 'Urgent Task',
    subject: 'Urgent task: {{subject}}',
    bodyHtml: '<p>An urgent task "{{subject}}" was assigned to you and needs attention.</p>',
  },
};
