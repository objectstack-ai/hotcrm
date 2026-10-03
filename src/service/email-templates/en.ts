// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/**
 * English (en-US) — the service package's notification templates.
 *
 * Every string is the text its `notify` node already sent, with the flow's
 * `{var.path}` interpolations re-expressed as the `{{key}}` holes the renderer
 * fills from that node's `templateData`. ⚠️ Tagged `en-US`, not `en` — see the
 * resolution-ladder note on `bundle()`.
 */
export const en: EmailTemplatePack = {
  'crm.case_escalated': {
    label: 'Case Escalated',
    subject: 'Case escalated: {{case_number}}',
    bodyHtml: '<p>Case {{case_number}} ({{priority}}) has been auto-escalated on critical priority. Ownership passes to the service manager with the lightest load; while nobody holds that position the case stays with you. Open the case to see who owns it now.</p>',
  },
  'crm.case_sla_breach': {
    label: 'Case SLA Breached',
    subject: 'SLA breached: case {{case_number}}',
    bodyHtml: '<p>Case {{case_number}} ({{priority}}) passed its SLA due date and has been auto-escalated.</p>',
  },
};
