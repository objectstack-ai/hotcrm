// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

export const MarketingUserProfile = {
  name: 'marketing_user',
  label: 'Marketing User',
  objects: {
    crm_lead:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_account:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_contact:     { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_campaign:    { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    // Org-wide read: marketing attributes campaign → pipeline ROI, which needs
    // every opportunity, not just self-owned. viewAllRecords was false here
    // while every other object on this set is true — an oversight that hid all
    // pipeline from marketing (and tripped security-private-no-readscope).
    crm_opportunity: { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
  },
};
