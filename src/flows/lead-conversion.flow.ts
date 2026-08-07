// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/** Lead Conversion — multi-step screen flow to convert qualified leads */
export const LeadConversionFlow: Flow = {
  name: 'lead_conversion',
  label: 'Lead Conversion Process',
  description: 'Automated flow to convert qualified leads to accounts, contacts, and opportunities',
  type: 'screen',
  status: 'active',

  // Lead conversion is a TRUSTED, INDIVISIBLE business transaction, so it runs
  // with the system writer — the same shape `close_case` uses in
  // `case-actions.flow.ts` (a screen flow off a record header action whose
  // writes are not the caller's to make). Under the default `runAs: 'user'`
  // every data node executed as the rep who pressed the button, and that made
  // the flow's OUTCOME a function of the converter's permission set rather than
  // of the lead:
  //
  //  1. #1033 — DEAD FLOW FOR THE CORE PERSONA. `create_account` maps
  //     `annual_revenue`, which the `sales_rep` set marks
  //     `{ readable: true, editable: false }`. Every rep conversion died at that
  //     node with `create_record(crm_account) failed: [Security] Field write
  //     denied: not permitted to edit [annual_revenue] on 'crm_account'`, lead
  //     unconverted and nothing created. FLS masks a REP EDITING an account's
  //     revenue by hand; it was never meant to decide whether a lead can be
  //     converted, and an empty `annual_revenue` on the lead failed identically
  //     because the refusal is on the KEY, not the value.
  //  2. DEDUPE THAT ONLY SAW HALF THE ORG. `find_account` /`find_contact` guard
  //     constraints that are ORG-WIDE (`crm_account.name` is `unique: true`, and
  //     `crm_contact.email` carries a global unique index), but under the
  //     caller's scope they only ever saw the caller's own book — `crm_account`
  //     is private + `readScope: 'own'` for a rep, `crm_contact` derives from
  //     the accounts they can reach. A rep converting a lead whose company or
  //     contact email already belongs to ANOTHER rep matched nothing, fell to
  //     the create branch, and hit the unique index — after the account row was
  //     already written. That is the very orphaning `find_contact`'s own note
  //     says it fixed; the fix was only ever complete for admins.
  //
  // Both are the same defect: a dedupe/copy decision that must be a property of
  // the LEAD was being taken through the converter's keyhole. Elevating fixes
  // both and makes the products identical whoever converts, which is the point.
  //
  // What this deliberately does NOT do — and must not be "simplified" into:
  //
  //  - It does NOT widen FLS. `sales_rep` still cannot edit
  //    `crm_account.annual_revenue`; a direct rep write is still refused. The
  //    grant belongs to this flow, not to the rep.
  //  - It does NOT skip restricted fields for restricted callers. A
  //    caller-dependent field map would make one lead convert into two different
  //    accounts depending on who clicked, which is the bug, not the fix.
  //
  // Cost, stated plainly: the run no longer re-checks the caller's access to
  // `recordId`, so authorization rests on the surfaces that gate the trigger —
  // the `convert_lead` action's own `visible` predicate and the record page that
  // hosts it. This is the same posture `close_case` already carries, and it is
  // why `get_lead` below re-asserts, IN the graph, the one guard a system write
  // stands down (`lead.hook.ts`'s converted-lead lock keys on `ctx.user?.id`,
  // this repo's system-write signal). See
  // `test/flow-conversion-authority.test.ts`, which measures every sentence of
  // this comment against the real kernel.
  runAs: 'system',

  variables: [
    // Named `recordId` to match the console's flow-action invocation contract:
    // POST /automation/:name/trigger sends { recordId, objectName } and the
    // dispatcher exposes them as params.recordId / params.crmLeadId. A custom
    // name like `leadId` never gets seeded (16.x runtime).
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'createOpportunity', type: 'boolean', isInput: true, isOutput: false },
    { name: 'opportunityName', type: 'text', isInput: true, isOutput: false },
    { name: 'opportunityAmount', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_lead' } },
    {
      // BINDING, not guarding (#643). `createOpportunity` is the only variable
      // any condition in this flow reads that no node upstream of the read
      // assigns: `matchedAccount` / `matchedContact` are `get_record` outputs
      // and `get_record` always writes its `outputVariable` (with `null` on a
      // miss), but `createOpportunity` arrives only if the screen runner sends
      // it back in the resume signal. A runner that posts just the fields the
      // user touched leaves it UNBOUND, and edge `e16` then aborts with
      // `No such key: createOpportunity` — reproduced end-to-end: the run is
      // recorded `failed` and the lead is never marked converted.
      //
      // The remedy is NOT a `has()` guard. A guard would encode "a missing
      // answer means No" inside the predicate; what is actually wrong is that
      // the graph left the variable unbound. Declaring it in `flow.variables`
      // does not help either — measured on 17.0.0-rc.1, `FlowVariableSchema` is
      // strict `{ name, type, isInput, isOutput }` with NO `defaultValue`, and
      // `AutomationEngine.execute` binds a declared input only when
      // `context.params[name] !== undefined`. So the binding has to be an
      // `assignment` node, and it has to sit ahead of the screen so the resume
      // signal overwrites it whenever the runner does answer.
      //
      // `false` mirrors the screen field's own `defaultValue: false` — the
      // commonest path is "convert this lead WITHOUT an opportunity".
      id: 'init_defaults', type: 'assignment', label: 'Default Conversion Options',
      config: { assignments: { createOpportunity: false } },
    },
    {
      id: 'screen_1', type: 'screen', label: 'Conversion Details',
      config: {
        // `visibleWhen` on a screen field is BARE CEL over the screen's own
        // field names — not the `{var}` template dialect the rest of this flow
        // uses for filters, `update_record` fields and decision conditions. The
        // client re-evaluates the predicate against the values collected so far,
        // which is why it cannot be a server-interpolated template.
        fields: [
          // NOT `required` (#4477). A checkbox has no unanswered state — clear
          // IS an answer, and "convert this lead WITHOUT an opportunity" is the
          // commonest path. `required: true` said otherwise on both sides of the
          // wire: the client counted the untouched box as an unanswered field
          // and blocked Submit, and from 17.0.0-rc.2 the SERVER enforces the
          // screen's declared contract too, refusing the resume outright with
          // `INVALID_SCREEN_INPUT: Screen field "createOpportunity" is required`
          // — so a runner that posts only what the user touched could no longer
          // convert a lead at all. `defaultValue: false` (and the
          // `init_defaults` assignment behind it) is what actually supplies the
          // answer; the flag only ever contradicted it.
          { name: 'createOpportunity', label: 'Create Opportunity?', type: 'boolean', defaultValue: false },
          { name: 'opportunityName', label: 'Opportunity Name', type: 'text', required: true, visibleWhen: 'createOpportunity == true' },
          // `required` here, unlike on `createOpportunity` above, is CORRECT
          // and load-bearing (#1030). `crm_opportunity.amount` is
          // `required: true` + `storage: { notNull: true }`, so an opportunity
          // with no amount is refused by the engine — but the refusal landed
          // deep inside `create_opportunity`, after the account and contact had
          // already been written, and #524 (platform: a flow's internal failure
          // has no UI echo) swallowed it: the dialog closed, nothing was
          // converted, and the user was told nothing. Declaring it here moves
          // the same refusal forward to the moment a human is still looking at
          // the screen.
          //
          // Pairing `required` with `visibleWhen` is what keeps this out of
          // #4477's trap. The server evaluates a screen field's `visibleWhen`
          // against the SUBMITTED values before enforcing its `required`
          // (`refuseInvalidScreenInput`), so on the commonest path — convert
          // WITHOUT an opportunity — the field is hidden, its `required` never
          // fires, and a runner that posts only what the user touched still
          // resumes. An UNCONDITIONAL `required` would have re-broken
          // conversion for exactly the callers #4477 fixed it for.
          { name: 'opportunityAmount', label: 'Opportunity Amount', type: 'currency', required: true, visibleWhen: 'createOpportunity == true' },
        ],
      },
    },
    {
      // Selects the lead ONLY while it is still convertible. The
      // `is_converted` half is this flow's own re-conversion guard, and it is
      // here because `runAs: 'system'` above takes the other one away:
      // `lead.hook.ts`'s converted-lead lock is written `if (event ===
      // 'beforeUpdate' && ctx.user?.id)`, and a system write carries no user,
      // so the lock stands down by design (its own message advertises the
      // system write as the admin escape hatch — do NOT close it there, other
      // flows and the demo bootstrap rely on it).
      //
      // MEASURED, not assumed: with the flow elevated and this condition
      // absent, running the conversion twice over one lead returns
      // `success: true` the second time and writes a SECOND opportunity, then
      // re-stamps `converted_*`. With it present the second run reaches
      // `find_account` with `leadRecord` null and the engine refuses:
      //
      //   get_record: refusing to run — 1 filter condition(s) resolved to
      //   nothing and were dropped from the query: `{leadRecord.company_
      //   normalized}` (at name_normalized) …
      //
      // — run `failed`, `acted: 0`, nothing written. Fail-closed, which is the
      // outcome that matters; the message names the dropped condition rather
      // than the cause, so note that a null `leadRecord` now has exactly two
      // readings: no such lead, or one that is already converted.
      // `test/flow-conversion-authority.test.ts` pins both.
      //
      // `$ne: true` and not `false`: it is TOTAL. `is_converted` carries
      // `defaultValue: false` so ordinary rows hold `false`, but a driver that
      // stores only the columns a row was written with hands back the key
      // ABSENT, and `is_converted: false` would then refuse to convert a
      // perfectly open lead.
      id: 'get_lead', type: 'get_record', label: 'Get Convertible Lead',
      config: {
        objectName: 'crm_lead',
        filter: { id: '{recordId}', is_converted: { $ne: true } },
        outputVariable: 'leadRecord',
      },
    },
    {
      // Account dedupe: before creating a new account, look for an existing one
      // with the same company name — NORMALIZED (#626). This used to compare
      // `crm_account.name` against the raw `{leadRecord.company}`, so
      // "Acme Corp" and "ACME  Corp" produced two accounts.
      //
      // Both sides of this comparison are stored, hook-maintained columns, and
      // that is forced rather than chosen: a flow template cannot normalize
      // ANYTHING. `service-automation`'s `resolveToken` recognises exactly one
      // function form — `NOW()` / `TODAY()` — and every bare identifier in the
      // expression fallback is substituted before evaluation, so no string
      // method is reachable either: `{LOWER(x)}`, `{TRIM(x)}` and
      // `{x.toLowerCase()}` all resolve to `undefined`, and an unwrapped
      // `LOWER({x})` interpolates literally to "LOWER(Acme Corp)". A formula
      // field is no help either — it has no physical column to filter on. So
      // the producer canonicalizes (`account_protection`,
      // `lead_duplicate_check`) and this node does a plain, indexed equality
      // match. `test/account-name-normalized-match.test.ts` re-measures all of
      // that rather than trusting this paragraph.
      //
      // Normalize-then-EXACT only: lower + trim + collapse internal
      // whitespace. Fuzzy matching stays out of scope, as before.
      //
      // If the lead carries NO `company_normalized`, this node does not fall
      // back and does not match everything — `get_record` REFUSES TO RUN:
      //
      //   get_record: refusing to run — 1 filter condition(s) resolved to
      //   nothing and were dropped from the query: `{leadRecord.company_
      //   normalized}` (at name_normalized). An absent condition does not
      //   narrow a query, it widens it …
      //
      // (measured on 17.0.0-rc.1; pinned in the test file). That is the right
      // failure: the only way to reach it is a lead row written before this
      // change, which is what the backfill in docs/MAINTENANCE.md §3.3 exists
      // for, and a conversion that stops with that message is far cheaper to
      // diagnose than one that quietly creates a duplicate account.
      //
      // Deliberately NOT papered over with a second, case-sensitive lookup on
      // the raw `name`: a missing key means the producer did not run, and a
      // tolerant consumer path would hide that while restoring the exact bug
      // this node exists to fix.
      id: 'find_account', type: 'get_record', label: 'Find Existing Account',
      config: { objectName: 'crm_account', filter: { name_normalized: '{leadRecord.company_normalized}' }, outputVariable: 'matchedAccount' },
    },
    {
      // Branching is on edges `e5` / `e6`. No `config.condition` here: a
      // `decision` node's singular one is never evaluated (#4414).
      id: 'decision_account', type: 'decision', label: 'Account Already Exists?',
    },
    {
      // NEW-account branch. outputVariable is `createdAccount`; the assignment
      // below normalizes both branches onto a single `accountId` id string so
      // downstream nodes don't need to know which path ran.
      //
      // `name` carries the lead's company VERBATIM — the display value. The
      // match key `name_normalized` is deliberately absent: it is readonly and
      // hook-owned, and `account_protection` derives it from the `name` written
      // here, so an account created by this node is immediately findable by the
      // next conversion.
      id: 'create_account', type: 'create_record', label: 'Create Account',
      config: {
        objectName: 'crm_account',
        fields: {
          name: '{leadRecord.company}', phone: '{leadRecord.phone}',
          website: '{leadRecord.website}', industry: '{leadRecord.industry}',
          annual_revenue: '{leadRecord.annual_revenue}',
          number_of_employees: '{leadRecord.number_of_employees}',
          billing_address: '{leadRecord.address}',
          owner_id: '{$User.Id}', is_active: true,
        },
        outputVariable: 'createdAccount',
      },
    },
    {
      id: 'use_new_account', type: 'assignment', label: 'Use New Account',
      config: { assignments: { accountId: '{createdAccount.id}' } },
    },
    {
      id: 'use_existing_account', type: 'assignment', label: 'Reuse Existing Account',
      config: { assignments: { accountId: '{matchedAccount.id}' } },
    },
    {
      // Contact dedupe by email — GLOBAL, not per-account: crm_contact carries
      // a global unique index on `email`, so an account-scoped lookup missed a
      // same-email contact under another account, and the subsequent
      // create_contact then exploded on the DB index AFTER the account was
      // already created (orphaning it). Leads require an email, so the match
      // key is reliable.
      id: 'find_contact', type: 'get_record', label: 'Find Existing Contact',
      config: {
        objectName: 'crm_contact',
        filter: { email: '{leadRecord.email}' },
        outputVariable: 'matchedContact',
      },
    },
    {
      // Branching is on edges `e11` / `e12` — see `decision_account`.
      id: 'decision_contact', type: 'decision', label: 'Contact Already Exists?',
    },
    {
      // `accountId` is a bare id string from whichever account branch ran.
      id: 'create_contact', type: 'create_record', label: 'Create Contact',
      config: {
        objectName: 'crm_contact',
        fields: {
          first_name: '{leadRecord.first_name}', last_name: '{leadRecord.last_name}',
          email: '{leadRecord.email}', phone: '{leadRecord.phone}',
          title: '{leadRecord.title}', crm_account: '{accountId}',
          is_primary: true, owner_id: '{$User.Id}',
        },
        outputVariable: 'createdContact',
      },
    },
    {
      id: 'use_new_contact', type: 'assignment', label: 'Use New Contact',
      config: { assignments: { contactId: '{createdContact.id}' } },
    },
    {
      id: 'use_existing_contact', type: 'assignment', label: 'Reuse Existing Contact',
      config: { assignments: { contactId: '{matchedContact.id}' } },
    },
    {
      // Branching is on edges `e16` / `e17` — see `decision_account`.
      id: 'decision_opportunity', type: 'decision', label: 'Create Opportunity?',
    },
    {
      id: 'create_opportunity', type: 'create_record', label: 'Create Opportunity',
      config: {
        objectName: 'crm_opportunity',
        fields: {
          name: '{opportunityName}', crm_account: '{accountId}', primary_contact: '{contactId}',
          amount: '{opportunityAmount}', stage: 'prospecting', probability: 10,
          lead_source: '{leadRecord.lead_source}', close_date: '{TODAY() + 90}', owner_id: '{$User.Id}',
        },
        outputVariable: 'createdOpportunity',
      },
    },
    {
      // Normalize both opportunity branches onto a single `opportunityId`
      // (same pattern as accountId/contactId): on the "No" branch the create
      // node never ran, so referencing `{createdOpportunity.id}` directly in
      // mark_converted interpolated an unresolved placeholder into the
      // converted_opportunity lookup.
      id: 'use_new_opportunity', type: 'assignment', label: 'Use New Opportunity',
      config: { assignments: { opportunityId: '{createdOpportunity.id}' } },
    },
    {
      id: 'no_opportunity', type: 'assignment', label: 'No Opportunity',
      config: { assignments: { opportunityId: null } },
    },
    {
      id: 'mark_converted', type: 'update_record', label: 'Mark Lead as Converted',
      config: {
        objectName: 'crm_lead', filter: { id: '{recordId}' },
        fields: {
          // `status: 'converted'` rides along so list views agree with the
          // conversion flags (the qualified → converted transition is legal
          // per the lead_status_progression state machine).
          is_converted: true, status: 'converted', converted_date: '{NOW()}',
          converted_account: '{accountId}', converted_contact: '{contactId}',
          converted_opportunity: '{opportunityId}',
        },
      },
    },
    {
      // ADR-0012: deliver via the `notify` node (inbox + email). The legacy
      // `script` + `actionType:'email'` shape is a no-op stub in 7.4.
      id: 'send_notification', type: 'notify', label: 'Send Confirmation',
      config: {
        recipients: ['{$User.Id}'],
        channels: ['inbox', 'email'],
        topic: 'lead_converted',
        title: 'Lead converted: {leadRecord.first_name} {leadRecord.last_name}',
        message: 'Lead {leadRecord.first_name} {leadRecord.last_name} was converted into an account and contact.',
        actionUrl: '/crm_account/{accountId}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e0', source: 'start', target: 'init_defaults', type: 'default' },
    { id: 'e1', source: 'init_defaults', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'get_lead', type: 'default' },
    { id: 'e3', source: 'get_lead', target: 'find_account', type: 'default' },
    { id: 'e4', source: 'find_account', target: 'decision_account', type: 'default' },
    // Existing account → reuse; no account → create. Both converge on create_contact.
    { id: 'e5', source: 'decision_account', target: 'use_existing_account', type: 'default', condition: P`vars.matchedAccount != null`, label: 'Existing' },
    { id: 'e6', source: 'decision_account', target: 'create_account', type: 'default', condition: P`vars.matchedAccount == null`, label: 'New' },
    { id: 'e7', source: 'create_account', target: 'use_new_account', type: 'default' },
    // Both account branches converge on the contact-dedupe lookup.
    { id: 'e8', source: 'use_new_account', target: 'find_contact', type: 'default' },
    { id: 'e9', source: 'use_existing_account', target: 'find_contact', type: 'default' },
    { id: 'e10', source: 'find_contact', target: 'decision_contact', type: 'default' },
    // Existing contact → reuse; none → create. Both converge on decision_opportunity.
    { id: 'e11', source: 'decision_contact', target: 'use_existing_contact', type: 'default', condition: P`vars.matchedContact != null`, label: 'Existing' },
    { id: 'e12', source: 'decision_contact', target: 'create_contact', type: 'default', condition: P`vars.matchedContact == null`, label: 'New' },
    { id: 'e13', source: 'create_contact', target: 'use_new_contact', type: 'default' },
    { id: 'e14', source: 'use_new_contact', target: 'decision_opportunity', type: 'default' },
    { id: 'e15', source: 'use_existing_contact', target: 'decision_opportunity', type: 'default' },
    { id: 'e16', source: 'decision_opportunity', target: 'create_opportunity', type: 'default', condition: P`vars.createOpportunity == true`, label: 'Yes' },
    { id: 'e17', source: 'decision_opportunity', target: 'no_opportunity', type: 'default', condition: P`vars.createOpportunity != true`, label: 'No' },
    { id: 'e18', source: 'create_opportunity', target: 'use_new_opportunity', type: 'default' },
    { id: 'e18a', source: 'use_new_opportunity', target: 'mark_converted', type: 'default' },
    { id: 'e18b', source: 'no_opportunity', target: 'mark_converted', type: 'default' },
    { id: 'e19', source: 'mark_converted', target: 'send_notification', type: 'default' },
    { id: 'e20', source: 'send_notification', target: 'end', type: 'default' },
  ],
};
