import { P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { TERRITORY } from '../objects/_territory';

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
 * Territory-Based Sharing (criteria-based, by declared territory).
 *
 * These filter on `crm_account.territory` — a declared `select` whose value
 * `account.hook.ts` derives from `billing_address.country` against the one
 * authored mapping in `src/objects/_territory.ts`.
 *
 * ### Two defects, in the order they were fixed
 *
 * 1. The condition used to read `record.billing_address.country`. A sharing
 *    rule's condition is compiled to a pushdown-able filter by
 *    `compileCelToFilter`, which rejects any path reaching inside an `address`
 *    value; `plugin-sharing` then refuses to seed the rule at all rather than
 *    degrade it to match-all, which is how both of these shipped inert for
 *    months while the docs promised they worked (#621). The fix was a FLAT
 *    column, `billing_country`. The `in [...]` operator was never the blocker
 *    — `test/sharing-seeding.test.ts` measures the whole supported operator
 *    set and fails if any declared rule stops translating.
 *
 * 2. That column is free text, so the rules still matched a TYPED STRING: an
 *    account whose billing country read `United States` matched neither
 *    territory, silently, and the country lists were duplicated across two CEL
 *    strings and six localised documentation tables (#639). The fix is to
 *    match a declared value instead. The country never reaches a rule now, and
 *    the `UK`-vs-`GB` question that could not be fixed in isolation dissolved
 *    with it: both spellings are `emea` in the mapping, so nothing migrated.
 *
 * The literal values below are INTERPOLATED from the declared domain — `P`
 * quotes an interpolated string, so `record.territory == "na"` is what is
 * authored, and renaming a territory value cannot be half-applied.
 * `test/territory-single-source.test.ts` pins the rest of the derivation:
 * every value one of these rules names must be a declared option, and must be
 * reachable from at least one country.
 */
export const TerritorySharingRules = [
  {
    name: 'north_america_territory',
    label: 'North America Territory',
    object: 'crm_account',
    type: 'criteria' as const,
    condition: P`record.territory == ${TERRITORY.NA}`,
    accessLevel: 'edit' as const,
    sharedWith: { type: 'position' as const, value: 'na_sales_team' },
  },
  {
    name: 'europe_territory',
    label: 'Europe Territory',
    object: 'crm_account',
    type: 'criteria' as const,
    condition: P`record.territory == ${TERRITORY.EMEA}`,
    accessLevel: 'edit' as const,
    sharedWith: { type: 'position' as const, value: 'eu_sales_team' },
  },
];
