// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

export const SalesRepProfile = {
  name: 'sales_rep',
  label: 'Sales Representative',
  // A rep's book of business is private by design (own records + whatever a
  // sharing rule or team grant extends). The objects below carry an explicit
  // `readScope: 'own'` so the intent is authored, not inferred — this both
  // silences the `security-private-no-readscope` liveness warning and pins the
  // behavior: without it, a private-OWD object with allowRead but no scope is
  // an under-specified grant the engine reads as "own only" anyway. Reps who
  // need cross-team visibility get it through the account team / territory
  // sharing rules, not by widening the base set.
  objects: {
    crm_lead:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_account:     { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_contact:     { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_opportunity: { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_quote:       { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_contract:    { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_product:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_campaign:    { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_case:        { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_task:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
  },
  fields: {
    'crm_account.annual_revenue':     { readable: true, editable: false },
    'crm_account.description':        { readable: true, editable: true },
    'crm_opportunity.amount':         { readable: true, editable: true },
    'crm_opportunity.probability':    { readable: true, editable: true },
  },
};
