// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Contact welcome — record-change flow on contact insert.
 *
 * Migrated from the removed `welcome_email` object workflow (7.7 dropped
 * `workflows[]`; on-create automation is now a `record_change` flow). Sends a
 * welcome notification to the new contact.
 */
export const ContactWelcomeFlow: Flow = {
  name: 'contact_welcome',
  label: 'Contact Welcome',
  description: 'On new contact: send a welcome notification.',
  type: 'record_change',
  status: 'active',
  variables: [],
  nodes: [
    { id: 'start', type: 'start', label: 'Start (contact created)', config: { objectName: 'crm_contact', triggerType: 'record-after-create' } },
    {
      id: 'send_welcome', type: 'notify', label: 'Send Welcome',
      config: {
        to: ['{record.email}'],
        channels: ['email'],
        topic: 'contact_welcome',
        title: 'Welcome, {record.full_name}',
        body: 'Thanks for connecting with us, {record.full_name}. Your account team will be in touch shortly.',
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
