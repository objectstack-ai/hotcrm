// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { O2C_FIGURE_FIELDS } from './_o2c-figures';
import { privateOpportunityPolicy } from './_private-opportunity';
import { PSA_READ_ALL_OBJECTS } from './_psa-grants';
import { SalesManagerProfile } from './sales-manager.profile';

/**
 * Sales Leadership — reads what a sales manager reads, and writes nothing
 * (#2492, ruled A by the maintainer 2026-11-15). The `crm_executive` and
 * `crm_sales_director` positions distribute it (`src/sales/sharing/positions.ts`).
 *
 * Both positions held no set, so a holder carried `crm_user` alone: the
 * large-deal shares (`opportunity_large_deal_*`) showed them the big open
 * deals and nothing else — 0 accounts, 403 on cases, contracts, quotes and
 * forecasts, and an Executive Overview of zeros.
 *
 *   - Read reach: every object `sales_manager` reads, at the same depth (View
 *     All where that set has View All or Modify All, child rows where it
 *     reads children), written out below rather than derived so a read the
 *     manager gains later is a decision here too.
 *   - `crm_opportunity` View All carries the private-deal row filter
 *     (ADR-0058, the shared `privateOpportunityPolicy`): a deal flagged
 *     Private stays its owner's.
 *   - ⛔ No create, edit, delete, transfer or export anywhere. The large-deal
 *     shares stay as they are; the `crm_user` floor every member holds is
 *     unchanged (#2231: a member may still create and edit their OWN leads,
 *     accounts and contacts).
 *   - App visibility as `sales_manager`'s: all five apps.
 */
const READ_ALL = { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false } as const;
const READ_CHILD = { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false } as const;

export const SalesLeadershipProfile = {
  name: 'sales_leadership',
  label: 'Sales Leadership',
  description:
    'Executives and sales directors, read only: read every account, contact, deal, quote, contract, forecast and case a sales manager reads, and change none.',
  tabPermissions: SalesManagerProfile.tabPermissions,
  objects: {
    crm_lead:              READ_ALL,
    crm_account:           READ_ALL,
    crm_contact:           READ_ALL,
    crm_opportunity:       READ_ALL,
    crm_quote:             READ_ALL,
    crm_contract:          READ_ALL,
    crm_product:           READ_ALL,
    crm_price_book:        READ_ALL,
    crm_price_book_entry:  READ_CHILD,
    crm_campaign:          READ_ALL,
    crm_campaign_member:   READ_CHILD,
    crm_case:              READ_ALL,
    crm_task:              READ_ALL,
    crm_event:             READ_ALL,
    crm_event_attendee:    READ_CHILD,
    crm_forecast:          READ_ALL,
    crm_article_feedback:  READ_ALL,
    crm_knowledge_article: READ_ALL,
    crm_billing_milestone: READ_CHILD,
    crm_invoice:           READ_CHILD,
    crm_payment:           READ_CHILD,
    crm_opportunity_line_item: READ_CHILD,
    crm_quote_line_item:   READ_CHILD,
    ...PSA_READ_ALL_OBJECTS,
    sys_attachment:        READ_CHILD,
    sys_comment:           READ_CHILD,
    sys_activity:          READ_CHILD,
  },
  fields: {
    // The Order to Cash figures on the contract and the account (#2416): this
    // set holds no Modify All on the account, so the account's are named too.
    ...O2C_FIGURE_FIELDS,
    // The fields other sets mask, read in full as the manager reads them, and
    // edited by nobody holding only this set.
    'crm_opportunity.amount':   { readable: true, editable: false },
    'crm_account.health_score': { readable: true, editable: false },
    'crm_quote.internal_notes': { readable: true, editable: false },
    'crm_case.internal_notes':  { readable: true, editable: false },
  },
  // ADR-0058: org-wide opportunity readers are exactly who the Private flag
  // has to hold back, so this set carries the shared private-deal row filter
  // (`_private-opportunity.ts`, hotcrm#2489) under a policy name of its own.
  rowLevelSecurity: [privateOpportunityPolicy('opportunity_private_owner_only_leadership')],
};
