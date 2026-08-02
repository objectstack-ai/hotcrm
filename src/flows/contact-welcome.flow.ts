// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
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
        // TOTALITY (#633): every `record.x` read carries a `has(record.x)`
        // guard — see the house-rule block in
        // `test/flow-condition-totality.test.ts`. Measured end-to-end on
        // driver-memory: `owner`'s `os.user.id` default cannot evaluate on a
        // write that carries no user (seed data, an integration, any system
        // context), ObjectQL logs `Failed to evaluate default expression` and
        // stores the row with NO `owner` column — so `record.owner != null`
        // aborted with `No such key: owner` and no seeded contact ever got a
        // welcome prompt. `!= null` is not a substitute for `has()`: on an
        // absent key it aborts exactly like `== "v"` does. An absent
        // `email_opt_out` means the contact has not opted out.
        condition: P`has(record.owner) && record.owner != null
          && (!has(record.email_opt_out) || record.email_opt_out != true)`,
      },
    },
    {
      id: 'send_welcome', type: 'notify', label: 'Prompt Owner to Welcome',
      config: {
        recipients: ['{record.owner}'],
        channels: ['inbox', 'email'],
        topic: 'contact_welcome',
        title: 'New contact: {record.first_name} {record.last_name}',
        message: '{record.first_name} {record.last_name} was added as a contact. Reach out to welcome them.',
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
