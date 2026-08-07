// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales Manager Profile
 *
 * Org-wide on the sales stack: a manager owns the number, so they read and
 * modify every rep's record rather than only their own.
 */
export const SalesManagerProfile = {
  name: 'sales_manager',
  label: 'Sales Manager',
  objects: {
    // `allowTransfer` on exactly the objects this set holds `modifyAllRecords`
    // on — the sales book a manager reassigns. Canonical note in
    // `src/profiles/index.ts`.
    // `allowExport` where an export surface exists — canonical note in
    // `src/profiles/index.ts`. A manager owns the number, so the pipeline and
    // book exports that feed offline forecasting are part of the job.
    crm_lead:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true, allowExport: true },
    crm_account:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true, allowExport: true },
    crm_contact:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true, allowExport: true },
    crm_opportunity: { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true, allowExport: true },
    crm_quote:       { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true },
    crm_contract:    { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_product:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
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
    // adjust the committed number, so this is org-wide read AND write on a
    // private object (#488 — the object had no grant at all).
    crm_forecast:    { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: true, allowTransfer: true },
    // Knowledge is service-authored; sales reads it (public_read OWD).
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
  },
  fields: {
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
  // checkbox that promised confidentiality and delivered none. Org-wide readers
  // are exactly who it has to hold back, so the set that grants
  // `viewAllRecords` on opportunities also carries the row filter that honours
  // it. Compiles to `{ $or: [{ is_private: false }, { owner_id: <caller> }] }`.
  //
  // `owner_id`, not the app-authored `owner` lookup this used to name: #548
  // retired that field. The predicate now keys on the SAME column the OWD /
  // sharing owner-match reads, so "its owner" means one thing app-wide.
  rowLevelSecurity: [
    {
      name: 'opportunity_private_owner_only',
      label: 'Private opportunities stay with their owner',
      description:
        'A deal flagged Private is visible only to its owner, even to holders of org-wide opportunity read.',
      object: 'crm_opportunity',
      operation: 'select' as const,
      using: 'is_private == false || owner_id == current_user.id',
    },
  ],
};
