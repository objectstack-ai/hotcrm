// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { expression } from '@objectstack/spec';

/**
 * How a notice names a contract (hotcrm#2746): its number and its name side
 * by side, `CTR-0006 · Annual Service 2027`, the way the lookup picker shows
 * them. A contract saved before contracts had names, and not yet named by
 * `scripts/backfill-contract-names.ts`, is named by its number alone, with no
 * dangling separator.
 *
 * One value, composed by the flow, because a template hole cannot branch, and
 * a notice missing a value is not sent (#2451): a separate name hole would
 * silence the notice of every unnamed contract. The three contract templates
 * read it as `{{contract}}` (`../email-templates/`).
 *
 * `root` is the CEL root of the contract row (`record`, `currentContract`).
 */
export const contractLabel = (root: string): ReturnType<typeof expression> => expression(
  `(has(${root}.contract_number) && ${root}.contract_number != null ? string(${root}.contract_number) : "")
    + (has(${root}.name) && ${root}.name != null && ${root}.name != "" ? " · " + string(${root}.name) : "")`,
  'cel',
);
