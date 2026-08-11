import { P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { LARGE_DEAL_AMOUNT } from '../objects/_thresholds';

/**
 * Share high-value open opportunities with the sales director.
 * ADR-0090 D3: `role_and_subordinates` is gone (positions are flat); the
 * grant now targets the director position itself.
 */
export const OpportunitySalesSharingRule = {
  name: 'opportunity_sales_sharing',
  label: 'Opportunity Sales Team Sharing',
  object: 'crm_opportunity',
  type: 'criteria' as const,
  condition: P`!(record.stage in ["closed_won", "closed_lost"]) && record.amount >= ${LARGE_DEAL_AMOUNT}`,
  accessLevel: 'read' as const,
  sharedWith: { type: 'position' as const, value: 'sales_director' },
};

/**
 * The same large-deal visibility one rung up.
 *
 * Positions are FLAT (ADR-0090 D3): nothing rolls the director's grant up to the
 * executive rung, so the rule that gives leadership its pipeline view has to be
 * authored per position. Same criteria, same read-only level — an executive
 * reads the deal, the deal team still owns it.
 */
export const OpportunityExecutiveSharingRule = {
  name: 'opportunity_executive_sharing',
  label: 'Large Open Deals — Executive',
  object: 'crm_opportunity',
  type: 'criteria' as const,
  condition: P`!(record.stage in ["closed_won", "closed_lost"]) && record.amount >= ${LARGE_DEAL_AMOUNT}`,
  accessLevel: 'read' as const,
  sharedWith: { type: 'position' as const, value: 'executive' },
};
