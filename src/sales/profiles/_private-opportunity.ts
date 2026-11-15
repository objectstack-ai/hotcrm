// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The private-deal row filter (ADR-0058), one definition for every set that
 * reads opportunities org-wide.
 *
 * `crm_opportunity.is_private` is the checkbox on the opportunity form that
 * promises a deal is its owner's alone. Org-wide readers are exactly who it
 * has to hold back, so every set that grants `viewAllRecords` on
 * opportunities carries this select policy with it (hotcrm#2489: the finance
 * controller and project manager sets were added without it and read every
 * private deal). Compiles to `{ $or: [{ is_private: false }, { owner_id:
 * <caller> }] }`. `owner_id`, the same column the OWD / sharing owner-match
 * reads, so "its owner" means one thing app-wide (#548).
 *
 * Each set keeps a policy name of its own (`opportunity_private_owner_only`
 * on `sales_manager`, as shipped). `rowLevelSecurity[].label` /
 * `description` are display copy the permission editor draws on the policy
 * card; this policy authors neither, so its intent lives here.
 *
 * `test/private-opportunity-policy.test.ts` fails when a set grants
 * opportunity View All without it.
 */
export const PRIVATE_OPPORTUNITY_PREDICATE = 'is_private == false || owner_id == current_user.id';

export const privateOpportunityPolicy = (name: string) => ({
  name,
  object: 'crm_opportunity',
  operation: 'select' as const,
  using: PRIVATE_OPPORTUNITY_PREDICATE,
});
