// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { O2C_FIGURE_FIELDS } from './_o2c-figures';
import { privateOpportunityPolicy } from './_private-opportunity';
import { PSA_READ_ALL_OBJECTS } from './_psa-grants';
import { SalesManagerProfile } from './sales-manager.profile';
import { EXPENSE_READ_ALL, EXPENSE_REPORT_READ_ALL, EXPENSE_REQUEST_LINE_READ, EXPENSE_STANDARD_READ } from './_expense-grants';

/**
 * Sales Leadership — reads what a sales manager reads, and changes nothing a
 * holder does not own (#2492, ruled A by the maintainer 2026-11-15; #2514). The `crm_executive` and
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
 *   - ⛔ No object-level create, edit, delete, transfer or export anywhere:
 *     every record a holder does not own stays read only. The large-deal
 *     shares stay as they are; the `crm_user` floor every member holds is
 *     unchanged (#2231: a member may still create and edit their OWN leads,
 *     accounts, contacts and deals).
 *   - `crm_opportunity.amount` is editable (#2514): the floor's own-deal
 *     create and edit need it, and this set naming the field read only
 *     refused both (403 "Field write denied … [amount]"). A field grant
 *     opens no record, so a rep's deal still answers 403 to a holder's edit.
 *   - App visibility as `sales_manager`'s: all five apps.
 */
const READ_ALL = { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false } as const;
const READ_CHILD = { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false } as const;

export const SalesLeadershipProfile = {
  name: 'sales_leadership',
  label: 'Sales Leadership',
  description:
    'Executives and sales directors: read what a sales manager reads, change nothing they do not own, and create and edit their own deals with the amount.',
  tabPermissions: SalesManagerProfile.tabPermissions,
  objects: {
    // Every expense read, nothing written (#2492 A); their own come through
    // `crm_user` (hotcrm#2556, `_expense-grants.ts`).
    crm_expense: EXPENSE_READ_ALL,
    crm_expense_report: EXPENSE_REPORT_READ_ALL,
    crm_expense_request: EXPENSE_READ_ALL,
    crm_expense_request_line: EXPENSE_REQUEST_LINE_READ,
    crm_expense_standard: EXPENSE_STANDARD_READ, // every standard, read (hotcrm#2616)
    crm_lead:              READ_ALL,
    crm_account:           READ_ALL,
    crm_contact:           READ_ALL,
    crm_opportunity:       READ_ALL,
    crm_quote:             READ_ALL,
    crm_sales_order:       READ_ALL,
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
    crm_sales_order_line:  READ_CHILD,
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
    // edited by nobody holding only this set — except the deal amount, which a
    // holder's OWN deal needs on create and edit (#2514; the record reach is
    // the `crm_user` floor's own-only, so others' deals stay read only).
    'crm_opportunity.amount':   { readable: true, editable: true },
    'crm_account.health_score': { readable: true, editable: false },
    'crm_quote.internal_notes': { readable: true, editable: false },
    'crm_case.internal_notes':  { readable: true, editable: false },
  },
  // ADR-0058: org-wide opportunity readers are exactly who the Private flag
  // has to hold back, so this set carries the shared private-deal row filter
  // (`_private-opportunity.ts`, hotcrm#2489) under a policy name of its own.
  rowLevelSecurity: [privateOpportunityPolicy('opportunity_private_owner_only_leadership')],
};
