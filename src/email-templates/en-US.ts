// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';

/**
 * English (`en-US`) — notification bundles for the `notify` flow nodes.
 *
 * ⚠️ The English rows are tagged `en-US`, NOT `en`, and that is load-bearing
 * rather than a spelling preference. `EmailService.resolveAndRenderTemplate`
 * looks a row up by EXACT `(name, locale)` and, when that misses, retries
 * exactly once against `DEFAULT_TEMPLATE_LOCALE` — the literal `'en-US'`
 * (`plugin-email`, `resolveAndRenderTemplate`). There is no language-subtag
 * folding anywhere on the path, so `en-US` is the ladder's floor and the only
 * tag that catches every recipient this app did not translate for:
 *
 *   - a recipient with no `sys_user.locale` -> deployment default `'en'`
 *     (`objectstack.config.ts`) -> misses -> retries `en-US` -> this row;
 *   - a recipient whose column literally says `'en-US'` -> this row directly;
 *   - a recipient on a fifth locale nobody authored (`'fr-FR'`) -> misses ->
 *     retries `en-US` -> this row.
 *
 * Tagging these rows `'en'` instead would satisfy only the first case and
 * dead-letter the other two: `TEMPLATE_NOT_FOUND` classifies `permanent`, so
 * the delivery is never retried. The spec's own contract note says the same
 * thing from the other side — a bundle carrying the deployment default's row
 * but not `en-US` is off-contract, and the fix is the bundle.
 *
 * ⛔ Every string here is the text the `notify` node already carried, with the
 * flow's `{var.path}` interpolations re-expressed as the `{{key}}` placeholders
 * `sendTemplate` renders against the node's `templateData`. This was a
 * conversion, not a rewrite: ⛔ do not improve the wording here without
 * changing it in all four bundles at once.
 */
export const enUS: EmailTemplateDefinition[] = [
  {
    // ⚠️ This body must stay true on BOTH outcomes of `case_escalation`. "It
    // remains assigned to you" is false whenever the hand-off finds a manager;
    // the opposite claim ("it has been reassigned") is false whenever the
    // `service_manager` pool is unstaffed, which is the first-install norm. So
    // it states the rule and points at the record for the answer. The same
    // constraint binds every locale of this row.
    name: 'crm_case_escalated', label: 'Case escalated', category: 'notification', locale: 'en-US',
    subject: 'Case escalated: {{case_number}}',
    bodyHtml: '<p>Case {{case_number}} ({{priority}}) has been auto-escalated on critical priority. Ownership passes to the service manager with the lightest load; while nobody holds that position the case stays with you. Open the case to see who owns it now.</p>',
  },
  {
    name: 'crm_case_sla_breach', label: 'Case SLA breached', category: 'notification', locale: 'en-US',
    subject: 'SLA breached: case {{case_number}}',
    bodyHtml: '<p>Case {{case_number}} ({{priority}}) passed its SLA due date and has been auto-escalated.</p>',
  },
  {
    name: 'crm_contact_welcome', label: 'New contact to welcome', category: 'notification', locale: 'en-US',
    subject: 'New contact: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} was added as a contact. Reach out to welcome them.</p>',
  },
  {
    name: 'crm_contract_expired', label: 'Contract expired', category: 'notification', locale: 'en-US',
    subject: 'Contract expired: {{contract_number}}',
    bodyHtml: '<p>Contract {{contract_number}} reached its end date and has been marked expired.</p>',
  },
  {
    name: 'crm_contract_renewal', label: 'Contract renewal due', category: 'notification', locale: 'en-US',
    subject: 'Contract renewal due: {{contract_number}}',
    bodyHtml: '<p>Contract {{contract_number}} ends on {{end_date}}. Start the renewal conversation now.</p>',
  },
  {
    name: 'crm_lead_hot', label: 'Hot lead assigned', category: 'notification', locale: 'en-US',
    subject: 'Hot lead — assign within 24h: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} from {{company}} (rating {{rating}}) needs an owner today.</p>',
  },
  {
    name: 'crm_lead_new', label: 'New lead to assign', category: 'notification', locale: 'en-US',
    subject: 'New lead to assign: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} from {{company}} is awaiting assignment.</p>',
  },
  {
    name: 'crm_lead_converted', label: 'Lead converted', category: 'notification', locale: 'en-US',
    subject: 'Lead converted: {{first_name}} {{last_name}}',
    bodyHtml: '<p>Lead {{first_name}} {{last_name}} was converted into an account and contact.</p>',
  },
  {
    name: 'crm_opportunity_approved', label: 'Deal approved', category: 'notification', locale: 'en-US',
    subject: 'Deal approved: {{name}}',
    bodyHtml: '<p>Your opportunity {{name}} has been approved.</p>',
  },
  {
    name: 'crm_opportunity_rejected', label: 'Deal rejected', category: 'notification', locale: 'en-US',
    subject: 'Deal rejected: {{name}}',
    bodyHtml: '<p>Your opportunity {{name}} was not approved. Review and revise before resubmitting.</p>',
  },
  {
    name: 'crm_deal_stalled', label: 'Deal stalled', category: 'notification', locale: 'en-US',
    subject: 'Stalled deal: {{name}}',
    bodyHtml: '<p>Opportunity {{name}} has sat in {{stage}} for {{days_in_stage}} days. Time to advance or re-qualify it.</p>',
  },
  {
    name: 'crm_large_deal_won', label: 'Large deal won', category: 'notification', locale: 'en-US',
    subject: 'Large deal won: {{name}}',
    bodyHtml: '<p>{{name}} closed at {{amount}}. Congratulations to the team.</p>',
  },
  {
    name: 'crm_quote_created', label: 'Quote created', category: 'notification', locale: 'en-US',
    subject: 'Quote created: {{quote_name}}',
    bodyHtml: '<p>Your quote {{quote_name}} has been created from this opportunity.</p>',
  },
  {
    name: 'crm_task_reminder', label: 'Task reminder', category: 'notification', locale: 'en-US',
    subject: 'Task reminder: {{subject}}',
    bodyHtml: '<p>Your task "{{subject}}" is due (reminder set for {{reminder_date}}).</p>',
  },
  {
    name: 'crm_urgent_task', label: 'Urgent task assigned', category: 'notification', locale: 'en-US',
    subject: 'Urgent task: {{subject}}',
    bodyHtml: '<p>An urgent task "{{subject}}" was assigned to you and needs attention.</p>',
  },
];
