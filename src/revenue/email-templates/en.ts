// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/**
 * English (en-US) — the revenue package's notification templates.
 *
 * Every string is the text its `notify` node already sent, with the flow's
 * `{var.path}` interpolations re-expressed as the `{{key}}` holes the renderer
 * fills from that node's `templateData`. ⚠️ Tagged `en-US`, not `en` — see the
 * resolution-ladder note on `bundle()`.
 */
export const en: EmailTemplatePack = {
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
  'crm.quote_created': {
    label: 'Quote Created',
    subject: 'Quote created: {{quote_name}}',
    bodyHtml: '<p>Your quote {{quote_name}} has been created from this opportunity.</p>',
  },
};
