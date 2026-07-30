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
    // Campaign membership is THIS profile's core write surface: the
    // "Add to Campaign" action (`src/actions/lead.actions.ts`) inserts
    // `crm_campaign_member` rows, and before #488 no permission set granted the
    // object — the action failed for the only persona meant to run it. Rows
    // derive from the campaign (controlled_by_parent), so record scope follows
    // the campaigns this profile can already read; deleting membership history
    // stays a manager/admin privilege, matching every other object here.
    crm_campaign_member: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    // Read-only reference: competitive intel for positioning, knowledge
    // articles for campaign copy. Both are public_read catalogs.
    crm_competitor:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_knowledge_article: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
  },
  fields: {
    // Marketing reads pipeline for campaign ROI but never prices a deal, and
    // account health is the renewal team's call — read, never write (#488).
    'crm_opportunity.amount':   { readable: true, editable: false },
    'crm_account.health_score': { readable: true, editable: false },
  },
  // The same private-deal row filter the sales_manager set carries: this
  // profile also holds org-wide opportunity read, so it is one of the readers
  // `crm_opportunity.is_private` has to hold back. See sales-manager.profile.ts
  // for the full rationale.
  rowLevelSecurity: [
    {
      name: 'opportunity_private_owner_only_marketing',
      label: 'Private opportunities stay with their owner',
      description:
        'A deal flagged Private is visible only to its owner, even to holders of org-wide opportunity read.',
      object: 'crm_opportunity',
      operation: 'select' as const,
      using: 'is_private == false || owner == current_user.id',
    },
  ],
};
