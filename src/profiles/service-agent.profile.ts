// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

export const ServiceAgentProfile = {
  name: 'service_agent',
  label: 'Service Agent',
  objects: {
    // Reference context an agent needs to work ANY ticket — a customer's cases
    // are meaningless without seeing the account/contact behind them, so these
    // are org-visible reads (viewAllRecords: true), NOT own-only. This was the
    // security-private-no-readscope warning's real signal: allowRead on a
    // private object with no scope had silently locked agents out of every
    // account they didn't personally own.
    crm_lead:        { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_account:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_contact:     { allowCreate: false, allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_opportunity: { allowCreate: false, allowRead: false, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    // Cases + tasks: an agent's own queue by default (readScope: 'own');
    // cross-agent visibility comes from the case-escalation sharing rule.
    crm_case:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_task:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_product:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
  },
  fields: {
    'crm_case.is_sla_violated':        { readable: true, editable: false },
    'crm_case.resolution_time_hours':  { readable: true, editable: false },
  },
};
