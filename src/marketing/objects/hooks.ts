// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Marketing hook registrations. See `src/sales/objects/hooks.ts` for why these
 * are named re-exports rather than an assembled array, and why a `*.hook.ts`
 * lives beside the `*.object.ts` it names.
 *
 * `campaign.hook.ts` keeps the two hooks attached to `crm_campaign`; the two it
 * used to carry on `crm_opportunity` and `crm_lead` moved to
 * `src/sales/objects/` with the objects they fire on.
 */

export { default as campaignHook } from './campaign.hook';
export { default as campaignMemberHook } from './campaign_member.hook';
