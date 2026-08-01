// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

export const SalesRepProfile = {
  name: 'sales_rep',
  label: 'Sales Representative',
  // A rep's book of business is private by design (own records + whatever a
  // sharing rule or team grant extends). The objects below carry an explicit
  // `readScope: 'own'` so the intent is authored, not inferred — this both
  // silences the `security-private-no-readscope` liveness warning and pins the
  // behavior: without it, a private-OWD object with allowRead but no scope is
  // an under-specified grant the engine reads as "own only" anyway. Reps who
  // need cross-team visibility get it through the account team / territory
  // sharing rules, not by widening the base set.
  objects: {
    // `allowExport` where an export surface exists — canonical note in
    // `src/profiles/index.ts`. Safe alongside `readScope: 'own'`: export is
    // read-derived, so a rep's CSV carries their own book, not the org's.
    crm_lead:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowExport: true },
    crm_account:     { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowExport: true },
    // NO readScope: `crm_contact` is `controlled_by_parent` (master-detail to
    // crm_account), so its rows derive from the account the rep can read —
    // territory- and team-shared accounts included. A `readScope` here was
    // inert (the sharing service only applies owner scope to `private` objects)
    // and read as a promise the engine never kept: it said "own contacts only"
    // while access actually followed the account (#488).
    crm_contact:     { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, allowExport: true },
    crm_opportunity: { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowExport: true },
    crm_quote:       { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_contract:    { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_product:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_campaign:    { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_case:        { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowExport: true },
    crm_task:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    // Reference catalog (public_read OWD): reps read knowledge articles, which
    // are authored by service.
    crm_knowledge_article: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    // Forecast snapshots are written by the nightly `forecast.hook` job and the
    // `revenue_forecasting` skill, never by hand — read-only, and only the rep's
    // own snapshots (private OWD + explicit own scope, as above).
    crm_forecast:          { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    // Product lines on the rep's own deals and quotes. Both objects are
    // `controlled_by_parent`, so rows follow the opportunity / quote and writes
    // require edit on that parent (ADR-0055) — that is what scopes a rep to
    // their own book here, which is why there is no readScope to author.
    // Without these grants the opportunity "Products" related list and the
    // whole CPQ path were denied for every non-admin user (#488).
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
    'crm_opportunity.probability':    { readable: true, editable: true },
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
