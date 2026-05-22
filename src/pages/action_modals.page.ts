// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Action-target modal pages.
 *
 * Each `Action` with `type: 'modal'` declares a `target` that resolves to a
 * registered page. The runtime opens that page inside a modal shell and
 * renders a form derived from the action's `params` array. These pages
 * therefore do not own the form fields — instead they provide:
 *
 *  • A descriptive title shown in the modal header.
 *  • A short explanatory text describing what the action does, what data
 *    will be written, and any side-effects (notifications, audit log,
 *    state machine transitions).
 *
 * The text components render *above* the auto-generated form so users get
 * a quick orientation before filling it in. This replaces the previous
 * placeholder-card stubs and brings the modal UX in line with the
 * full record pages.
 */

import type { Page } from '@objectstack/spec/ui';

type ModalCopy = {
  label: string;
  icon: string;
  heading: string;
  body: string;
};

const modalPage = (name: string, copy: ModalCopy): Page => ({
  name,
  label: copy.label,
  description: copy.heading,
  type: 'utility',
  template: 'default',
  isDefault: false,
  kind: 'full',
  regions: [
    {
      name: 'main',
      width: 'full',
      components: [
        {
          type: 'page:header',
          id: `${name}_intro`,
          label: copy.label,
          properties: {
            title: copy.heading,
            subtitle: copy.body,
            icon: copy.icon,
          },
        },
      ],
    },
  ],
});

export const EscalateCasePage = modalPage('escalate_case', {
  label: 'Escalate Case',
  icon: 'alert-triangle',
  heading: 'Escalate this case',
  body:
    'Escalation flags the case for the escalation team, sets priority to ' +
    '**Urgent**, records who escalated it and when, and triggers the ' +
    'escalation workflow (notification to the manager queue, SLA reset). ' +
    'Please give a clear reason — it is shown to the escalation owner and ' +
    'logged in the audit trail.',
});

export const CloseCasePage = modalPage('close_case', {
  label: 'Close Case',
  icon: 'check-circle',
  heading: 'Close this case',
  body:
    'Closing the case stops the SLA clock, sets status to **Closed**, ' +
    'records who closed it and when, and runs the close-case workflow ' +
    '(satisfaction survey, knowledge-article suggestion). The resolution ' +
    'text becomes part of the customer-visible history.',
});

export const CreateCampaignPage = modalPage('create_campaign', {
  label: 'Add to Campaign',
  icon: 'send',
  heading: 'Add selected leads to a campaign',
  body:
    'Each selected lead will be added to the chosen campaign as a ' +
    '`campaign_member` with status **Sent**. Existing members on the same ' +
    'campaign are skipped. Use this to track marketing touches on a list ' +
    'of leads in bulk.',
});

export const LogCallPage = modalPage('log_call', {
  label: 'Log a Call',
  icon: 'phone',
  heading: 'Log a call against this record',
  body:
    'Captures an outbound call as a `sys_activity` entry of type ' +
    '**completed**. Visible in the record activity timeline and counted in ' +
    'sales activity dashboards. Use **Duration** in whole minutes and put ' +
    'objections, next steps or commitments in **Notes**.',
});

export const MassUpdateStagePage = modalPage('mass_update_stage', {
  label: 'Update Stage',
  icon: 'layers',
  heading: 'Mass-update opportunity stage',
  body:
    'All selected opportunities will be moved to the chosen stage. ' +
    'Probability, forecast category and (for closed stages) close-date ' +
    'are recalculated by the opportunity hooks. Approval rules — for ' +
    'example the discount approval at $500K — still apply per record.',
});

export const SendEmailPage = modalPage('send_email', {
  label: 'Send Email',
  icon: 'mail',
  heading: 'Send an email to this contact',
  body:
    'The email is queued through the platform `sys_email` service and ' +
    'linked back to the contact in **Related Object**. Delivery status ' +
    '(queued / sent / failed) appears in the contact activity timeline. ' +
    'Contacts with **Email opt-out** enabled cannot be selected.',
});
