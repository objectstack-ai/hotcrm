import { P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

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
  condition: P`!(record.stage in ["closed_won", "closed_lost"]) && record.amount >= 100000`,
  accessLevel: 'read' as const,
  sharedWith: { type: 'position' as const, value: 'sales_director' },
};
