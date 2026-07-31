// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/** Quote Generation — screen flow to create a quote from an opportunity */
export const QuoteGenerationFlow: Flow = {
  name: 'quote_generation',
  label: 'Generate Quote from Opportunity',
  description: 'Create a quote based on opportunity details',
  type: 'screen',
  status: 'active',

  variables: [
    // `recordId` matches the console's flow-action trigger contract
    // ({ recordId, objectName }); a custom name like `opportunityId` is never
    // seeded — same lesson as lead_conversion.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'quoteName', type: 'text', isInput: true, isOutput: false },
    { name: 'expirationDays', type: 'number', isInput: true, isOutput: false },
    { name: 'discount', type: 'number', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_opportunity' } },
    {
      id: 'screen_1', type: 'screen', label: 'Quote Details',
      config: {
        fields: [
          { name: 'quoteName', label: 'Quote Name', type: 'text', required: true },
          { name: 'expirationDays', label: 'Valid For (Days)', type: 'number', required: true, defaultValue: 30 },
          { name: 'discount', label: 'Discount %', type: 'percent', defaultValue: 0 },
        ],
      },
    },
    {
      id: 'get_opportunity', type: 'get_record', label: 'Get Opportunity',
      config: { objectName: 'crm_opportunity', filter: { id: '{recordId}' }, outputVariable: 'oppRecord' },
    },
    {
      id: 'create_quote', type: 'create_record', label: 'Create Quote',
      config: {
        objectName: 'crm_quote',
        fields: {
          name: '{quoteName}', crm_opportunity: '{recordId}',
          crm_account: '{oppRecord.crm_account}', crm_contact: '{oppRecord.primary_contact}',
          owner: '{$User.Id}', status: 'draft',
          quote_date: '{TODAY()}', expiration_date: '{TODAY() + expirationDays}',
          subtotal: '{oppRecord.amount}', discount: '{discount}',
          discount_amount: '{oppRecord.amount * (discount / 100)}',
          total_price: '{oppRecord.amount * (1 - discount / 100)}',
          payment_terms: 'net_30',
        },
        outputVariable: 'quoteId',
      },
    },
    {
      // Advance to `proposal` only from a PRE-proposal stage (the state
      // machine allows `→ proposal` from all three). Re-writing `proposal` on
      // a deal already at proposal/negotiation was an illegal self/backward
      // transition — those deals keep their stage; the quote is still created.
      id: 'check_stage', type: 'decision', label: 'Can Advance to Proposal?',
      config: { condition: P`oppRecord.stage == "prospecting" || oppRecord.stage == "qualification" || oppRecord.stage == "needs_analysis"` },
    },
    {
      id: 'update_opportunity', type: 'update_record', label: 'Update Opportunity',
      config: {
        // No `last_activity_date` write: crm_opportunity has no such field
        // (it lives on crm_account) — the unknown column made this node fail.
        objectName: 'crm_opportunity', filter: { id: '{recordId}' },
        fields: { stage: 'proposal' },
      },
    },
    {
      // ADR-0012: deliver via the `notify` node (inbox + email). The legacy
      // `script` + `actionType:'email'` shape is a no-op stub in 7.4.
      id: 'notify_owner', type: 'notify', label: 'Send Notification',
      config: {
        recipients: ['{$User.Id}'],
        channels: ['inbox', 'email'],
        topic: 'quote_created',
        title: 'Quote created: {quoteName}',
        message: 'Your quote {quoteName} has been created from this opportunity.',
        actionUrl: '/crm_quote/{quoteId.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'get_opportunity', type: 'default' },
    { id: 'e3', source: 'get_opportunity', target: 'create_quote', type: 'default' },
    { id: 'e4', source: 'create_quote', target: 'check_stage', type: 'default' },
    { id: 'e4a', source: 'check_stage', target: 'update_opportunity', type: 'conditional', condition: P`oppRecord.stage == "prospecting" || oppRecord.stage == "qualification" || oppRecord.stage == "needs_analysis"`, label: 'Advance' },
    { id: 'e4b', source: 'check_stage', target: 'notify_owner', type: 'conditional', condition: P`oppRecord.stage != "prospecting" && oppRecord.stage != "qualification" && oppRecord.stage != "needs_analysis"`, label: 'Keep stage' },
    { id: 'e5', source: 'update_opportunity', target: 'notify_owner', type: 'default' },
    { id: 'e6', source: 'notify_owner', target: 'end', type: 'default' },
  ],
};
