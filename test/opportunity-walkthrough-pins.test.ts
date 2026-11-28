// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { OpportunityLineItem } from '../src/revenue/objects/opportunity_line_item.object';
import { CloneOpportunityAction } from '../src/sales/actions/opportunity.actions';

type AnyRec = Record<string, any>;
const field = (o: AnyRec, name: string): AnyRec => (o.fields as AnyRec)[name];

/**
 * Walkthrough fixes that live in one key each (2026-11-17), pinned so a
 * later edit does not quietly undo them. Each was measured in the console on
 * 18.5.0 before it was pinned here. The activity pickers' lost-deal rule
 * (#2573) is pinned with their own-account rule in
 * `activity-deal-picker-account.test.ts`.
 */
describe('opportunity walkthrough fixes', () => {
  it("the product page's list of opportunity lines names each line's deal (#2599)", () => {
    // The line's own title is the product's name, which on the product page
    // repeats on every row; the deal, quantity, price and total tell them apart.
    expect(field(OpportunityLineItem, 'crm_product').relatedListColumns)
      .toEqual(['crm_opportunity', 'quantity', 'unit_price', 'total_price']);
  });

  it('Clone Opportunity sits in the More menu, not on the header bar (#2574)', () => {
    // Protocol 19 spells the More-menu-only placement as the record page plus
    // the ⋯-menu component.
    expect({ locations: CloneOpportunityAction.locations, component: CloneOpportunityAction.component })
      .toEqual({ locations: ['record_page'], component: 'action:menu' });
  });
});
