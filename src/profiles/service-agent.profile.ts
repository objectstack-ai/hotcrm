// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

export const ServiceAgentProfile = {
  name: 'service_agent',
  label: 'Service Agent',
  isProfile: true,
  objects: {
    crm_lead:        { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_account:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_contact:     { allowCreate: false, allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_opportunity: { allowCreate: false, allowRead: false, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_case:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_task:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    crm_product:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
  },
  fields: {
    'case.is_sla_violated':        { readable: true, editable: false },
    'case.resolution_time_hours':  { readable: true, editable: false },
  },
};
