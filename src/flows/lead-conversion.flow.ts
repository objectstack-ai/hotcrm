// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/** Lead Conversion — multi-step screen flow to convert qualified leads */
export const LeadConversionFlow: Flow = {
  name: 'lead_conversion',
  label: 'Lead Conversion Process',
  description: 'Automated flow to convert qualified leads to accounts, contacts, and opportunities',
  type: 'screen',
  status: 'active',

  variables: [
    // Named `recordId` to match the console's flow-action invocation contract:
    // POST /automation/:name/trigger sends { recordId, objectName } and the
    // dispatcher exposes them as params.recordId / params.crmLeadId. A custom
    // name like `leadId` never gets seeded (16.x runtime).
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'createOpportunity', type: 'boolean', isInput: true, isOutput: false },
    { name: 'opportunityName', type: 'text', isInput: true, isOutput: false },
    { name: 'opportunityAmount', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_lead' } },
    {
      id: 'screen_1', type: 'screen', label: 'Conversion Details',
      config: {
        // `visibleWhen` on a screen field is BARE CEL over the screen's own
        // field names — not the `{var}` template dialect the rest of this flow
        // uses for filters, `update_record` fields and decision conditions. The
        // client re-evaluates the predicate against the values collected so far,
        // which is why it cannot be a server-interpolated template.
        fields: [
          // `defaultValue: false` is load-bearing. An untouched checkbox holds
          // `undefined`, which the runner counts as an unanswered required
          // field — so "convert this lead WITHOUT an opportunity", the commonest
          // path, blocked Submit on a box the user deliberately left clear.
          { name: 'createOpportunity', label: 'Create Opportunity?', type: 'boolean', required: true, defaultValue: false },
          { name: 'opportunityName', label: 'Opportunity Name', type: 'text', required: true, visibleWhen: 'createOpportunity == true' },
          { name: 'opportunityAmount', label: 'Opportunity Amount', type: 'currency', visibleWhen: 'createOpportunity == true' },
        ],
      },
    },
    {
      id: 'get_lead', type: 'get_record', label: 'Get Lead Record',
      config: { objectName: 'crm_lead', filter: { id: '{recordId}' }, outputVariable: 'leadRecord' },
    },
    {
      // Account dedupe: before creating a new account, look for an existing one
      // with the same company name. Exact-name match (case/whitespace sensitive)
      // — the standard lightweight dedupe; fuzzy matching is out of scope here.
      id: 'find_account', type: 'get_record', label: 'Find Existing Account',
      config: { objectName: 'crm_account', filter: { name: '{leadRecord.company}' }, outputVariable: 'matchedAccount' },
    },
    {
      id: 'decision_account', type: 'decision', label: 'Account Already Exists?',
      config: { condition: P`vars.matchedAccount != null` },
    },
    {
      // NEW-account branch. outputVariable is `createdAccount`; the assignment
      // below normalizes both branches onto a single `accountId` id string so
      // downstream nodes don't need to know which path ran.
      id: 'create_account', type: 'create_record', label: 'Create Account',
      config: {
        objectName: 'crm_account',
        fields: {
          name: '{leadRecord.company}', phone: '{leadRecord.phone}',
          website: '{leadRecord.website}', industry: '{leadRecord.industry}',
          annual_revenue: '{leadRecord.annual_revenue}',
          number_of_employees: '{leadRecord.number_of_employees}',
          billing_address: '{leadRecord.address}',
          owner: '{$User.Id}', is_active: true,
        },
        outputVariable: 'createdAccount',
      },
    },
    {
      id: 'use_new_account', type: 'assignment', label: 'Use New Account',
      config: { assignments: { accountId: '{createdAccount.id}' } },
    },
    {
      id: 'use_existing_account', type: 'assignment', label: 'Reuse Existing Account',
      config: { assignments: { accountId: '{matchedAccount.id}' } },
    },
    {
      // Contact dedupe by email — GLOBAL, not per-account: crm_contact carries
      // a global unique index on `email`, so an account-scoped lookup missed a
      // same-email contact under another account, and the subsequent
      // create_contact then exploded on the DB index AFTER the account was
      // already created (orphaning it). Leads require an email, so the match
      // key is reliable.
      id: 'find_contact', type: 'get_record', label: 'Find Existing Contact',
      config: {
        objectName: 'crm_contact',
        filter: { email: '{leadRecord.email}' },
        outputVariable: 'matchedContact',
      },
    },
    {
      id: 'decision_contact', type: 'decision', label: 'Contact Already Exists?',
      config: { condition: P`vars.matchedContact != null` },
    },
    {
      // `accountId` is a bare id string from whichever account branch ran.
      id: 'create_contact', type: 'create_record', label: 'Create Contact',
      config: {
        objectName: 'crm_contact',
        fields: {
          first_name: '{leadRecord.first_name}', last_name: '{leadRecord.last_name}',
          email: '{leadRecord.email}', phone: '{leadRecord.phone}',
          title: '{leadRecord.title}', crm_account: '{accountId}',
          is_primary: true, owner: '{$User.Id}',
        },
        outputVariable: 'createdContact',
      },
    },
    {
      id: 'use_new_contact', type: 'assignment', label: 'Use New Contact',
      config: { assignments: { contactId: '{createdContact.id}' } },
    },
    {
      id: 'use_existing_contact', type: 'assignment', label: 'Reuse Existing Contact',
      config: { assignments: { contactId: '{matchedContact.id}' } },
    },
    {
      id: 'decision_opportunity', type: 'decision', label: 'Create Opportunity?',
      config: { condition: P`vars.createOpportunity == true` },
    },
    {
      id: 'create_opportunity', type: 'create_record', label: 'Create Opportunity',
      config: {
        objectName: 'crm_opportunity',
        fields: {
          name: '{opportunityName}', crm_account: '{accountId}', primary_contact: '{contactId}',
          amount: '{opportunityAmount}', stage: 'prospecting', probability: 10,
          lead_source: '{leadRecord.lead_source}', close_date: '{TODAY() + 90}', owner: '{$User.Id}',
        },
        outputVariable: 'createdOpportunity',
      },
    },
    {
      // Normalize both opportunity branches onto a single `opportunityId`
      // (same pattern as accountId/contactId): on the "No" branch the create
      // node never ran, so referencing `{createdOpportunity.id}` directly in
      // mark_converted interpolated an unresolved placeholder into the
      // converted_opportunity lookup.
      id: 'use_new_opportunity', type: 'assignment', label: 'Use New Opportunity',
      config: { assignments: { opportunityId: '{createdOpportunity.id}' } },
    },
    {
      id: 'no_opportunity', type: 'assignment', label: 'No Opportunity',
      config: { assignments: { opportunityId: null } },
    },
    {
      id: 'mark_converted', type: 'update_record', label: 'Mark Lead as Converted',
      config: {
        objectName: 'crm_lead', filter: { id: '{recordId}' },
        fields: {
          // `status: 'converted'` rides along so list views agree with the
          // conversion flags (the qualified → converted transition is legal
          // per the lead_status_progression state machine).
          is_converted: true, status: 'converted', converted_date: '{NOW()}',
          converted_account: '{accountId}', converted_contact: '{contactId}',
          converted_opportunity: '{opportunityId}',
        },
      },
    },
    {
      // ADR-0012: deliver via the `notify` node (inbox + email). The legacy
      // `script` + `actionType:'email'` shape is a no-op stub in 7.4.
      id: 'send_notification', type: 'notify', label: 'Send Confirmation',
      config: {
        to: ['{$User.Id}'],
        channels: ['inbox', 'email'],
        topic: 'lead_converted',
        title: 'Lead converted: {leadRecord.first_name} {leadRecord.last_name}',
        body: 'Lead {leadRecord.first_name} {leadRecord.last_name} was converted into an account and contact.',
        actionUrl: '/crm_account/{accountId}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'get_lead', type: 'default' },
    { id: 'e3', source: 'get_lead', target: 'find_account', type: 'default' },
    { id: 'e4', source: 'find_account', target: 'decision_account', type: 'default' },
    // Existing account → reuse; no account → create. Both converge on create_contact.
    { id: 'e5', source: 'decision_account', target: 'use_existing_account', type: 'default', condition: P`vars.matchedAccount != null`, label: 'Existing' },
    { id: 'e6', source: 'decision_account', target: 'create_account', type: 'default', condition: P`vars.matchedAccount == null`, label: 'New' },
    { id: 'e7', source: 'create_account', target: 'use_new_account', type: 'default' },
    // Both account branches converge on the contact-dedupe lookup.
    { id: 'e8', source: 'use_new_account', target: 'find_contact', type: 'default' },
    { id: 'e9', source: 'use_existing_account', target: 'find_contact', type: 'default' },
    { id: 'e10', source: 'find_contact', target: 'decision_contact', type: 'default' },
    // Existing contact → reuse; none → create. Both converge on decision_opportunity.
    { id: 'e11', source: 'decision_contact', target: 'use_existing_contact', type: 'default', condition: P`vars.matchedContact != null`, label: 'Existing' },
    { id: 'e12', source: 'decision_contact', target: 'create_contact', type: 'default', condition: P`vars.matchedContact == null`, label: 'New' },
    { id: 'e13', source: 'create_contact', target: 'use_new_contact', type: 'default' },
    { id: 'e14', source: 'use_new_contact', target: 'decision_opportunity', type: 'default' },
    { id: 'e15', source: 'use_existing_contact', target: 'decision_opportunity', type: 'default' },
    { id: 'e16', source: 'decision_opportunity', target: 'create_opportunity', type: 'default', condition: P`vars.createOpportunity == true`, label: 'Yes' },
    { id: 'e17', source: 'decision_opportunity', target: 'no_opportunity', type: 'default', condition: P`vars.createOpportunity != true`, label: 'No' },
    { id: 'e18', source: 'create_opportunity', target: 'use_new_opportunity', type: 'default' },
    { id: 'e18a', source: 'use_new_opportunity', target: 'mark_converted', type: 'default' },
    { id: 'e18b', source: 'no_opportunity', target: 'mark_converted', type: 'default' },
    { id: 'e19', source: 'mark_converted', target: 'send_notification', type: 'default' },
    { id: 'e20', source: 'send_notification', target: 'end', type: 'default' },
  ],
};
