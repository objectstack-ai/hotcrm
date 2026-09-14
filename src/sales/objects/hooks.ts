// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales hook registrations — this package's half of the list `src/hooks/index.ts`
 * used to hold whole.
 *
 * A named re-export barrel, like every other barrel in this tree, and NOT a
 * pre-assembled array. The order hooks reach `defineStack()` is written
 * straight into the artifact — measured: reversing the input array reverses
 * `hooks[]` in `dist/objectstack.json` — and four independently ordered package
 * lists cannot reproduce one interleaved order. So assembly stays at the single
 * place that can see all four, `objectstack.config.ts`, which registers them in
 * the order this repo has always used (by hook source file name).
 *
 * A `*.hook.ts` sits beside the `*.object.ts` it names: co-location is what
 * enforces ADR-0130 R4 (a hook may not attach to another package's object), so
 * everything listed here fires on an object `src/sales/objects/` declares.
 * `campaign_attribution_refresh` and `campaign_lead_conversion_refresh` are
 * campaign arithmetic that lands here for exactly that reason — they are
 * attached to `crm_opportunity` and `crm_lead`.
 */

export { default as accountHook } from './account.hook';
export { default as contactHook } from './contact.hook';
export { default as eventHook } from './event.hook';
export { default as forecastHook } from './forecast.hook';
export { default as leadHook } from './lead.hook';
export { default as leadCampaignMetricsHook } from './lead.campaign-metrics.hook';
export { default as opportunityHook } from './opportunity.hook';
export { default as opportunityCampaignMetricsHook } from './opportunity.campaign-metrics.hook';
export { default as taskHook } from './task.hook';
