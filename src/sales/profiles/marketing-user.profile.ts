// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

export const MarketingUserProfile = {
  name: 'marketing_user',
  label: 'Marketing User',
  objects: {
    // `allowExport` where an export surface exists — canonical note in
    // `src/profiles/index.ts`. Lead and contact list exports are marketing's
    // core targeting workflow; account/opportunity back the campaign-ROI
    // reports. No `crm_case` grant here, so no export bit for it either.
    crm_lead:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false, allowExport: true },
    crm_account:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false, allowExport: true },
    crm_contact:     { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false, allowExport: true },
    crm_campaign:    { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    // Org-wide read: marketing attributes campaign → pipeline ROI, which needs
    // every opportunity, not just self-owned. viewAllRecords was false here
    // while every other object on this set is true — an oversight that hid all
    // pipeline from marketing (and tripped security-private-no-readscope).
    crm_opportunity: { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false, allowExport: true },
    // Campaign membership is THIS profile's core write surface: the
    // "Add to Campaign" action (`src/actions/lead.actions.ts`) inserts
    // `crm_campaign_member` rows, and before #488 no permission set granted the
    // object — the action failed for the only persona meant to run it. Rows
    // derive from the campaign (controlled_by_parent), so there is no record
    // scope to author — and as of 17.0.0-rc.4 that derivation does follow the
    // campaign grant: MEASURED and pinned by
    // `test/parent-derived-reach.test.ts`, master accessibility resolves through
    // the same paths a direct read of the campaign takes, ownership and
    // `sys_record_share` grants included. For THIS profile the delta is small —
    // `crm_campaign` is `public_read` and this set holds org-wide campaign read,
    // so the rows are the same either way — but the grant is now scope that
    // follows the campaigns above, not org-wide read in fact as it was through
    // 17.0.0-rc.3 (objectstack-ai/objectstack#5386, #694).
    // Deleting membership history stays a manager/admin privilege, matching
    // every other object here.
    crm_campaign_member: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    // Read-only reference: knowledge articles for campaign copy
    // (public_read catalog).
    // Reads the KB and may rate it; cannot author articles (#601).
    crm_article_feedback: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
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
      using: 'is_private == false || owner_id == current_user.id',
    },
    // The platform's `member_default` set carries a wildcard owner-only-writes
    // policy (`created_by == current_user.id` on update), and RLS policies are
    // OR-combined — so without a policy of its own, this set's allowEdit on
    // campaigns only reaches campaigns the user personally created. That also
    // silently broke "Add to Campaign": enrolling a member is a write DERIVED
    // from the campaign (controlled_by_parent), so it requires campaign edit at
    // the row level. This is the one direction in which the ADR-0055 derivation
    // really does narrow: a master RLS policy is exactly what it folds in, while
    // ownership and `sys_record_share` grants are not (which is why the READ
    // side of these member rows is org-wide — see the `crm_campaign_member`
    // grant above and objectstack-ai/objectstack#5386, #694). This policy widens
    // campaign updates to every holder of the set — exactly what the object
    // grant above already declares. `id != null`
    // is the pushdown-safe "all rows" predicate (verified: compiles to
    // `{id: {$null: false}}`).
    {
      name: 'marketing_campaign_updates',
      label: 'Marketing works any campaign',
      description:
        'Marketing users edit any campaign (and thereby enrol members into it), not only campaigns they created.',
      object: 'crm_campaign',
      operation: 'update' as const,
      using: 'id != null',
    },
    // Same widening for the member rows themselves: response tracking means
    // updating rows the enrollment flow (system context) created, which the
    // default owner-only-writes policy would otherwise deny.
    {
      name: 'marketing_campaign_member_updates',
      label: 'Marketing updates any campaign member',
      description:
        'Marketing users update member response state on rows they did not personally create.',
      object: 'crm_campaign_member',
      operation: 'update' as const,
      using: 'id != null',
    },
  ],
};
