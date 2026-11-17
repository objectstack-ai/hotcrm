// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { O2C_CONTRACT_FIGURE_FIELDS } from './_o2c-figures';
import { PSA_READ_ALL_OBJECTS } from './_psa-grants';
import { privateOpportunityPolicy } from './_private-opportunity';
import { EXPENSE_OWN_READ_ALL } from './_expense-grants';

/**
 * Sales Manager Profile
 *
 * Org-wide on the sales stack: a manager owns the number, so they read and
 * modify every rep's record rather than only their own.
 */
export const SalesManagerProfile = {
  name: 'sales_manager',
  label: 'Sales Manager',
  description:
    "Sales managers: read, edit, reassign and delete every rep's leads, accounts, opportunities, quotes and activities, without system administration.",
  // Which HotCRM apps the holder's launcher offers (#2417). Visibility, not
  // access: a hidden app still opens from its address, and records link
  // across apps. Sets merge most-visible-wins, and every member also holds
  // `crm_user`, which says nothing here, so silence never re-shows an app.
  // A manager sees the four working apps, stated rather than left silent so
  // a manager who also holds a set that hides one keeps it (most-visible-
  // wins). Project Delivery too since it carries projects (#2316 phase 1a):
  // a manager reads every project of the deals the team sells.
  tabPermissions: { crm_enterprise: 'visible' as const, crm_service: 'visible' as const, crm_marketing: 'visible' as const, crm_o2c: 'visible' as const, crm_expenses: 'visible' as const, crm_psa: 'visible' as const },
  objects: {
    // Their own expenses and travel requests, as every internal set (hotcrm#2556, hotcrm#2578, `_expense-grants.ts`).
    crm_expense: EXPENSE_OWN_READ_ALL,
    crm_expense_request: EXPENSE_OWN_READ_ALL,
    // `allowTransfer` on the objects this set holds `modifyAllRecords` on —
    // the sales book a manager reassigns — plus `crm_forecast`, which kept it
    // when #2277 narrowed Modify All there. Canonical note in
    // `src/sales/profiles/index.ts`.
    // `allowExport` where an export surface exists — canonical note in
    // `src/sales/profiles/index.ts`. A manager owns the number, so the pipeline and
    // book exports that feed offline forecasting are part of the job.
    crm_lead:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true, allowExport: true },
    crm_account:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true, allowExport: true },
    crm_contact:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true, allowExport: true },
    crm_opportunity: { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true, allowExport: true },
    crm_quote:       { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true },
    // Orders (REQ-0010, #2555): the quote's grant, as the card asks.
    crm_sales_order: { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true },
    // No writeScope: `crm_contract` is `controlled_by_parent` under
    // `crm_account` (#549), so a scope here would be inert — the write gate
    // asks for EDIT on the account instead, which this set holds org-wide
    // (`modifyAllRecords` above). That retires the #880 gap on BOTH editions:
    // the contract an accepted quote drafts hangs under the rep, and the
    // manager edits it because they can edit its account, not because of a
    // hierarchy depth. `own_and_reports` was the app's only authored hierarchy
    // scope; `requires: ['hierarchy-security']` stays declared (#1378 ruling).
    // `allowDelete: false` must keep holding; `modifyAllRecords: false` keeps
    // this off the super-user bypass. `test/contract-write-depth.test.ts`.
    crm_contract:    { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_product:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    // Price books (#2313): the same shape as the catalogue above. A manager
    // creates a book (a partner tier, a promotion) and edits the books they own;
    // the seeded Standard book is the admin's, so its prices move with the
    // admin's catalogue, not with a manager's edit. Entries are
    // `controlled_by_parent`: no scope to author, and adding, repricing or
    // removing one is an edit of its book, so delete is granted on entries and
    // not on books.
    crm_price_book:  { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_price_book_entry: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    crm_campaign:    { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_case:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false, allowExport: true },
    crm_task:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true },
    // A manager coaches on activity, so this is org-wide read AND write on a
    // private object — the same shape their `crm_task` grant already has.
    // `crm_event_attendee` is `controlled_by_parent` (ADR-0055): no scope to
    // author — one would be inert metadata. It narrows to the events this set
    // can read, which is every event: `viewAllRecords` on `crm_event` above puts
    // the whole activity stack in reach, so the derived attendee rows follow.
    // MEASURED on 17.0.0-rc.4 and pinned by `test/parent-derived-reach.test.ts`,
    // master accessibility resolves through the same paths a direct read of the
    // event takes — ownership and `sys_record_share` grants folded in, not the
    // master's row-level security policies alone. Until 17.0.0-rc.3 this grant
    // was org-wide in FACT rather than by derivation, whatever the event grants
    // said (#694); objectstack-ai/objectstack#5386 fixed that upstream and it
    // shipped in rc.4. Same note in `sales-rep.profile.ts`.
    crm_event:       { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true },
    crm_event_attendee: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    // The forecast IS the manager's job: they read every rep's snapshot and
    // adjust the committed number, so this is org-wide read AND edit on a
    // private object, and delete on none (#488 — the object had no grant at
    // all; #2277 ruling B). READ is `viewAllRecords`. EDIT on rows another
    // person owns is the `forecast_manager_sharing` edit share
    // (`src/sales/sharing/forecast.sharing.ts`), ⛔ not `modifyAllRecords`:
    // Modify All is the bypass for edit, delete and transfer, so beside it
    // `allowDelete: false` was never enforced. An edit share opens update and
    // never delete. `allowTransfer` stays authored although this is no longer
    // a Modify All object — the deliberate deviation from the rule in
    // `src/sales/profiles/index.ts`, rostered in `test/ownership-model.test.ts`:
    // the profile's capability survives the narrowing, as that note intends.
    crm_forecast:    { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false, allowTransfer: true },
    // Knowledge is service-authored; sales reads it (public_read OWD).
    // Reads the KB and may rate it; cannot author articles (#601).
    crm_article_feedback: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_knowledge_article: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    // Enrollment is marketing's job; a manager only reads the membership rows
    // behind campaign ROI. `crm_campaign_member` is `controlled_by_parent`, so
    // no readScope/viewAllRecords applies (ADR-0055) — but the rows do not
    // "follow the campaign": the derivation resolves the master set through the
    // master's RLS policies only (none narrow a select on `crm_campaign`), so
    // this is org-wide read on every member row. The practical delta is small
    // here — `crm_campaign` is `public_read` and this set reads every campaign
    // anyway — so the intended derivation would return the same rows. See
    // `campaign_member.object.ts` and objectstack-ai/objectstack#5386 (#694).
    crm_campaign_member:   { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    // Order to Cash (#2315): the rep's shape — see `sales-rep.profile.ts`. All
    // three are `controlled_by_parent` under the contract, whose write gate asks
    // for edit on the account, which this set holds org-wide, so a manager keeps
    // any team contract's plan; invoices and payments stay finance's.
    crm_billing_milestone: { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    crm_invoice:           { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_payment:           { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    // Project Delivery (#2316 phase 1a): read, every project, with the rows
    // its cost figures sum (`_psa-grants.ts`). Delivery is delivery's.
    ...PSA_READ_ALL_OBJECTS,
    // Line items: full CRUD so a manager can fix pricing on any rep's deal or
    // quote. Both objects are `controlled_by_parent`, so there is no scope to
    // author — but that derivation does not narrow these rows to the deals and
    // quotes the manager can read. MEASURED (see the note in
    // `sales-rep.profile.ts` and `test/parent-derived-reach.test.ts`): the master
    // set comes from the master's RLS policies only, never from ownership or a
    // share. This set authors one such policy — the private-deal filter on
    // `crm_opportunity` below — and none on `crm_quote`, so quote lines are
    // org-wide, and opportunity lines are bounded by that policy and nothing
    // else (the guard test pins the quote chain; the opportunity side follows
    // from the same measured mechanism). Upstream gap:
    // objectstack-ai/objectstack#5386 (#694).
    crm_opportunity_line_item: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    crm_quote_line_item:       { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    crm_sales_order_line:      { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    // The record Attachments panel: canonical note on `enable.files` in
    // `src/sales/objects/index.ts` (#2029, #2038). Which attachments it lists,
    // and where an upload or a delete is taken, derives from the parent record.
    sys_attachment: { allowCreate: true,  allowRead: true, allowEdit: false, allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    // The record Discussion panel, comments and activity: canonical note on
    // `enable.feeds` in `src/sales/objects/index.ts` (#2029, #2038). Which
    // threads it reaches, and whose comments a delete takes, derives from the
    // parent record.
    sys_comment:  { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    sys_activity: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
  },
  fields: {
    // The Order to Cash figures on the contract (#2416). The account's are
    // read through Modify All on `crm_account`, so no row names them.
    ...O2C_CONTRACT_FIGURE_FIELDS,
    // Sensitive fields a manager must see in full. Authored explicitly rather
    // than left absent: these are the fields other sets mask, and an unauthored
    // grant reads as an oversight instead of a decision (#488).
    'crm_opportunity.amount':   { readable: true, editable: true },
    'crm_account.health_score': { readable: true, editable: true },
    'crm_quote.internal_notes': { readable: true, editable: true },
    // Case internal notes are the service team's working memory: a sales
    // manager reads them for account context but never edits them.
    'crm_case.internal_notes':  { readable: true, editable: false },
  },
  // ADR-0058: `crm_opportunity.is_private` is settable in the opportunity form
  // (`opportunity.view.ts`) and, before this rule, was read by nothing — a
  // checkbox that promised confidentiality and delivered none. This set reads
  // opportunities org-wide, so it carries the private-deal row filter; the
  // predicate and the rule for every such set live in `_private-opportunity.ts`.
  rowLevelSecurity: [privateOpportunityPolicy('opportunity_private_owner_only')],
};
