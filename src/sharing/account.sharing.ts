import { P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/** Share accounts with sales managers/directors based on customer status */
export const AccountTeamSharingRule = {
  name: 'account_team_sharing',
  label: 'Account Team Sharing',
  object: 'crm_account',
  type: 'criteria' as const,
  condition: P`record.type == "customer" && record.is_active == true`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'position' as const, value: 'sales_manager' },
};

/**
 * Territory-Based Sharing (criteria-based, by billing country).
 *
 * These filter on `crm_account.billing_country` — the flat projection of
 * `billing_address.country` that `account.hook.ts` maintains — and NOT on the
 * nested path directly. A sharing rule's condition is compiled to a
 * pushdown-able filter by `compileCelToFilter`, which rejects any path reaching
 * inside an `address` value; `plugin-sharing` then refuses to seed the rule at
 * all rather than degrade it to match-all, which is how both of these shipped
 * inert for months while the docs promised they worked (#621).
 *
 * The `in [...]` operator is NOT the blocker and never was — it compiles to
 * `{billing_country: {$in: [...]}}` against a flat column. `test/sharing-seeding.test.ts`
 * measures the whole supported operator set and fails if any declared rule
 * stops translating, so this cannot silently regress again.
 */
export const TerritorySharingRules = [
  {
    name: 'north_america_territory',
    label: 'North America Territory',
    object: 'crm_account',
    type: 'criteria' as const,
    condition: P`record.billing_country in ["US", "CA", "MX"]`,
    accessLevel: 'edit' as const,
    sharedWith: { type: 'position' as const, value: 'na_sales_team' },
  },
  {
    name: 'europe_territory',
    label: 'Europe Territory',
    object: 'crm_account',
    type: 'criteria' as const,
    // `UK` is deliberately not `GB`: this list is carried over verbatim from
    // the pre-#621 rule so the fix changes where the country is READ FROM, not
    // which accounts the territory covers.
    condition: P`record.billing_country in ["UK", "DE", "FR", "IT", "ES"]`,
    accessLevel: 'edit' as const,
    sharedWith: { type: 'position' as const, value: 'eu_sales_team' },
  },
];
