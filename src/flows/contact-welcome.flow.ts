// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * New-contact alert — record-change flow on contact insert.
 *
 * Migrated from the removed `welcome_email` object workflow (7.7 dropped
 * `workflows[]`; on-create automation is now a `record_change` flow).
 *
 * Notifies the OWNER, not the contact: `notify` addresses platform users —
 * a raw email address is stored verbatim as an inbox user_id and reaches
 * nobody (the same phantom-audience bug fixed in lead_assignment). A true
 * outbound welcome email to the contact needs an email connector action, not
 * an inbox notification.
 *
 * Gated on `email_opt_out != true` so an opted-out contact triggers no
 * outreach prompt, and skipped entirely when there is no owner to notify.
 */
export const ContactWelcomeFlow: Flow = {
  name: 'contact_welcome',
  label: 'Contact Welcome',
  description: 'On new contact: prompt the owner to welcome them.',
  type: 'record_change',
  status: 'active',
  variables: [],
  nodes: [
    {
      id: 'start', type: 'start', label: 'Start (contact created)',
      config: {
        objectName: 'crm_contact',
        triggerType: 'record-after-create',
        condition: 'record.owner != null && record.email_opt_out != true',
      },
    },
    {
      id: 'send_welcome', type: 'notify', label: 'Prompt Owner to Welcome',
      config: {
        to: ['{record.owner}'],
        channels: ['inbox', 'email'],
        topic: 'contact_welcome',
        title: 'New contact: {record.first_name} {record.last_name}',
        body: '{record.first_name} {record.last_name} was added as a contact. Reach out to welcome them.',
        actionUrl: '/crm_contact/{record.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'send_welcome', type: 'default' },
    { id: 'e2', source: 'send_welcome', target: 'end', type: 'default' },
  ],
};
