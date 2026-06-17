// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

export const MarketingUserProfile = {
  name: 'marketing_user',
  label: 'Marketing User',
  isProfile: true,
  objects: {
    crm_lead:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_account:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_contact:     { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_campaign:    { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_opportunity: { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
  },
};
