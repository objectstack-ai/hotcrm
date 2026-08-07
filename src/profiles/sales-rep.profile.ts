// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

export const SalesRepProfile = {
  name: 'sales_rep',
  label: 'Sales Representative',
  // A rep's book of business is private by design (own records + whatever a
  // sharing rule or team grant extends). The objects below carry an explicit
  // `readScope: 'own'` so the intent is authored, not inferred — this both
  // silences the `security-private-no-readscope` liveness warning and pins the
  // behavior: without it, a private-OWD object with allowRead but no scope is
  // an under-specified grant the engine reads as "own only" anyway.
  //
  // What widens that scope today is narrower than it sounds: the territory /
  // account-team rules are authored on `crm_account` ONLY, and a sharing rule
  // widens the object it names — not the records hanging off it. So a rep who
  // receives an account through a territory rule reads that account, while the
  // quotes, contracts and tasks on it stay own-only, and opportunities widen
  // only through the >= $100k leadership rules. Whether those children should
  // follow the account is an open business decision (#549), not a bug in these
  // grants — do not widen them here to paper over it.
  //
  // The `controlled_by_parent` grants below read as narrow, and as of
  // 17.0.0-rc.4 they ARE. MEASURED and pinned by
  // `test/parent-derived-reach.test.ts`: the ADR-0055 derivation resolves master
  // accessibility through the same paths a direct read of the master takes —
  // owner scope AND `sys_record_share` grants, not the master's row-level
  // security policies alone. A rep holding ONE account through a territory rule
  // reads that account's contacts and no others, and reads line items only under
  // the quotes they can reach. Writes derive the same way: a child of a master
  // the rep cannot edit is refused. So each grant below is bounded by the
  // parent's sharing, which is what it looks like.
  //
  // Until 17.0.0-rc.3 the same grants were org-wide reads and this note said so
  // (#694): the derivation consulted master RLS policies only, and HotCRM
  // authors none, so the master set was every record.
  // objectstack-ai/objectstack#5386 fixed that upstream and it shipped in rc.4.
  objects: {
    // `allowExport` where an export surface exists — canonical note in
    // `src/profiles/index.ts`. Safe alongside `readScope: 'own'`: export is
    // read-derived, so a rep's CSV carries their own book, not the org's.
    crm_lead:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowExport: true },
    crm_account:     { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowExport: true },
    // NO readScope: `crm_contact` is `controlled_by_parent` (master-detail to
    // crm_account), so a `readScope` here is inert — the sharing service only
    // applies owner scope to `private` objects — and it read as a promise the
    // engine never kept: it said "own contacts only" while access derived from
    // the parent (#488). That derivation now delivers exactly "the accounts the
    // rep can read": measured on 17.0.0-rc.4, a rep holding one territory
    // account reads THAT account's contacts and no others (see the note at the
    // top of this file, #694).
    crm_contact:     { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, allowExport: true },
    crm_opportunity: { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowExport: true },
    crm_quote:       { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_contract:    { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_product:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_campaign:    { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_case:        { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowExport: true },
    crm_task:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },

    // ─── Activity (#592) ──────────────────────────────────────────────
    // `crm_event` is `private` like `crm_task` — a personal activity record —
    // so an explicit record scope is required alongside allowRead (an omitted
    // scope silently means "own only" and reads as an unmade decision).
    // `crm_event_attendee` is `controlled_by_parent`, so authoring a readScope
    // here would be inert metadata the engine never applies. Its rows narrow to
    // the events the rep can read — which, `crm_event` being private and
    // own-scoped, is their own calendar (see the note at the top of this file,
    // #694).
    crm_event:       { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_event_attendee: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    // Reference catalog (public_read OWD): reps read knowledge articles, which
    // are authored by service.
    crm_knowledge_article: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    // Forecast snapshots are written by the nightly `forecast.hook` job and the
    // `revenue_forecasting` skill, never by hand — read-only, and only the rep's
    // own snapshots (private OWD + explicit own scope, as above).
    crm_forecast:          { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    // Product lines on deals and quotes. Both objects are
    // `controlled_by_parent`, so there is no readScope to author — one would be
    // inert metadata. That derivation scopes a rep to the lines under the deals
    // and quotes they can reach: measured on 17.0.0-rc.4, a rep reads the lines
    // of the one quote they own and none of the others (see the note at the top
    // of this file, #694). Without these grants the opportunity "Products"
    // related list and the whole CPQ path were denied for every non-admin user
    // (#488).
    crm_opportunity_line_item: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    crm_quote_line_item:       { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    // Which campaign sourced a lead — read-only context, derived from the
    // campaign (controlled_by_parent). Enrollment belongs to marketing_user.
    crm_campaign_member:       { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
  },
  fields: {
    'crm_account.annual_revenue':     { readable: true, editable: false },
    'crm_account.description':        { readable: true, editable: true },
    'crm_opportunity.amount':         { readable: true, editable: true },
    // Probability is derived from the stage by `opportunity_lifecycle` and is
    // `readonly` on the object (#1035). This grant used to say `editable: true`
    // — a permission to write a column no writer can reach, and the one
    // remaining declaration a surface could read as "offer this rep an input".
    // Read-only here too, so both axes say the same thing (same shape as
    // `crm_account.health_score` below: rep reads it, the process sets it).
    'crm_opportunity.probability':    { readable: true, editable: false },
    // Health score drives the renewal book and the at-risk views: reps see it,
    // the renewal/CS process sets it. Readable (the `at_risk_accounts` view
    // filters and sorts on it, and a masked field cannot be filtered) but never
    // rep-editable — it was previously unauthored on every set (#488).
    'crm_account.health_score':       { readable: true, editable: false },
    // Quote internal notes stay rep-editable: `quote.hook` deliberately keeps
    // them writable after a quote is sent, when nothing else is.
    'crm_quote.internal_notes':       { readable: true, editable: true },
    // Case internal notes are the service team's private working notes. A rep
    // reads the case (own scope) for account context; the agent-only commentary
    // inside it is masked — no view filters or sorts on this field, so masking
    // costs nothing but the value itself.
    'crm_case.internal_notes':        { readable: false, editable: false },
  },
};
