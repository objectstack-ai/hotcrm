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

  variables: [
    // Named `recordId` to match the console's flow-action invocation contract:
    // POST /automation/:name/trigger sends { recordId, objectName } and the
    // dispatcher exposes them as params.recordId / params.crmLeadId. A custom
    // name like `leadId` never gets seeded (16.x runtime).
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    // THE authority for the conversion default (#1155). `defaultValue` is what
    // makes declared mean BOUND: the engine seeds every declared variable that
    // carries one before the run starts, so `createOpportunity` is bound on
    // every path — including the one where the screen runner posts back only
    // the fields the user touched, which is the #643 defect. The `init_defaults`
    // assignment node that used to do this is gone; the screen field below
    // derives its prefill from this line rather than restating `false`.
    //
    // Measured on 17.0.0 GA, by running flows (not by reading the engine):
    //   · declared + nothing supplied  → bound to `false`; ablating this key
    //     from the declaration re-fails the read with `No such key:
    //     createOpportunity`, so the default is what binds it;
    //   · seeded BEFORE the start condition is evaluated, so a start condition
    //     could read it too;
    //   · a caller-supplied `context.params.createOpportunity` WINS — the
    //     boundary is `!== undefined`, so an explicit `false`/`null` is a
    //     supplied answer, and only absence falls through to this default.
    // The assignment node had none of that last property: it was unconditional,
    // so it clobbered a supplied value. All three are pinned in
    // `test/flow-variable-conditions.test.ts`.
    { name: 'createOpportunity', type: 'boolean', isInput: true, isOutput: false, defaultValue: false },
    { name: 'opportunityName', type: 'text', isInput: true, isOutput: false },
    { name: 'opportunityAmount', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_lead' } },
    // The `init_defaults` assignment node that used to sit here is RETIRED
    // (#1155). It existed only because `FlowVariableSchema` had no
    // `defaultValue` (#643 / #651); it does now, and the declaration on
    // `createOpportunity` above binds the variable earlier and without the
    // node's one real defect — being unconditional, it clobbered a
    // caller-supplied `context.params` value it should have deferred to.
    {
      id: 'screen_1', type: 'screen', label: 'Conversion Details',
      config: {
        // The suspected-duplicate warning (#1207). `lead_duplicate_check`
        // flags a re-captured email at intake and links the record the lead
        // repeats; until now the rep about to CONVERT — the last moment the
        // flag is worth anything — was never told, and the duplicate became a
        // second account, contact and opportunity.
        //
        // Why here and not on `convert_lead`'s `confirmText`: that string is
        // static and unconditional, so it would warn identically on every
        // clean lead (the cry-wolf that makes a confirm dialog furniture), and
        // #1214 item 1 has since removed that confirm outright — a warning
        // parked there would have died with it. This screen is where the
        // conversion decision is actually taken, and it is the one surface
        // that can say something TRUE about THIS lead.
        //
        // Mechanism, measured on the shipped 17.1.0 bundles rather than
        // assumed: the executor interpolates `config.description`
        // (`interp(cfg.description)`) into the `ScreenSpec` it puts on the
        // wire, and `FlowRunner.tsx` renders it — `{screen.description &&
        // <DialogDescription>{screen.description}</DialogDescription>}`. A
        // whole-string sole token returns the RAW value and `interp` maps
        // null to `undefined`, so the clean-lead branch below (which assigns
        // `null`) renders NO description at all rather than an empty
        // paragraph. That is why the conditionality lives in an assignment
        // and not in the copy: a screen `description` has no `visibleWhen`.
        description: '{duplicateWarning}',
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
          // convert a lead at all. The variable's declared `defaultValue` is
          // what actually supplies the answer; the flag only ever contradicted
          // it.
          //
          // DERIVED, not restated (#1155). `{createOpportunity}` reads the flow
          // variable, so the literal `false` is written exactly once in this
          // file — on the declaration — and the widget prefill cannot drift
          // from the value the engine binds. That is the duplication #1155 was
          // filed about; writing `defaultValue: false` here again would have
          // moved it one level over rather than removed it.
          //
          // A screen field's `defaultValue` is server-interpolated before the
          // descriptor goes on the wire, and a whole-string sole token returns
          // the RAW value rather than a stringification — measured on GA, the
          // client receives boolean `false`, byte-identical to what the literal
          // sent. (`visibleWhen` below is the opposite case: forwarded raw,
          // never interpolated. Same node, two different dialects.)
          { name: 'createOpportunity', label: 'Create Opportunity?', type: 'boolean', defaultValue: '{createOpportunity}' },
          { name: 'opportunityName', label: 'Opportunity Name', type: 'text', required: true, visibleWhen: 'createOpportunity == true' },
          { name: 'opportunityAmount', label: 'Opportunity Amount', type: 'currency', visibleWhen: 'createOpportunity == true' },
        ],
      },
    },
    {
      // Moved AHEAD of the screen (#1207). Nothing about the fetch changed —
      // `{recordId}` is an input variable, seeded before the run starts, so
      // this node never depended on the screen having run. What changed is
      // that the screen can now say something about the lead: the warning
      // below reads `leadRecord`, and a screen that suspends before the fetch
      // has nothing to read.
      id: 'get_lead', type: 'get_record', label: 'Get Lead Record',
      config: { objectName: 'crm_lead', filter: { id: '{recordId}' }, outputVariable: 'leadRecord' },
    },
    {
      // Branching is on edges `e21` / `e22` / `e25` — see `decision_account`.
      // Three ways out since #1288, because `duplicate_status` carries two
      // different KINDS of fact and they get different answers: the machine's
      // `suspected` guess warns and lets the rep decide (`e21`), a person's
      // `confirmed` verdict refuses outright (`e25`), and everything else
      // converts silently (`e22`).
      id: 'decision_duplicate', type: 'decision', label: 'Duplicate Verdict?',
    },
    {
      // The warning names the record the way the UI names a person — by the
      // email address the two records share — and NOT by
      // `duplicate_of_lead` / `duplicate_of_contact`, which hold ids. That is
      // the house rule `test/record-id-not-in-prose.test.ts` states for every
      // sentence a user reads: "the id goes in the relationship field that
      // exists to carry it, or nowhere". The link itself is on the lead's
      // record page (`lead_detail.page.ts`), where it can be clicked.
      //
      // "flagged at intake" is the app's own published definition of this
      // value, not a guess about provenance: `duplicate_status`'s help text
      // reads "Suspected = flagged automatically at intake" in all four
      // locales, and `lead_duplicate_check` is insert-only by design.
      //
      // Flow copy is English-only in this repo, deliberately and consistently:
      // flows carry no entry in the locale packs (`src/translations/*.ts`
      // translate objects, fields, views and actions), which
      // `test/automation-docs-coverage.test.ts` records as the reason its
      // Chinese flow labels are authored in the test itself. The banner on the
      // record page — which DOES have a locale channel — carries all four.
      id: 'warn_duplicate', type: 'assignment', label: 'Compose Duplicate Warning',
      config: {
        assignments: {
          duplicateWarning:
            'Suspected duplicate — intake flagged this lead as repeating an existing record with this email address ({leadRecord.email}). Converting creates a second account, contact and opportunity for the same buyer; compare the linked record on the lead page before you continue.',
        },
      },
    },
    {
      // The other branch assigns `null`, which is what makes the warning
      // CONDITIONAL: `interp` maps it to `undefined` and the dialog renders no
      // description. Same shape as `no_opportunity` below — both branches
      // write the variable so no downstream read ever meets an unset one.
      id: 'no_duplicate_warning', type: 'assignment', label: 'No Duplicate Warning',
      config: { assignments: { duplicateWarning: null } },
    },
    {
      // The REFUSAL (#1288). A `confirmed` duplicate is a person's verdict, and
      // the app stops converting on it — the ruling's item 1, and the rule
      // AGENTS.md now states as "interception stands on a person's judgement".
      // `suspected` keeps #1207's warn-and-allow above: a machine's guess stays
      // advisory, because `lead_duplicate_check` matches on email EQUALITY and
      // a shared inbox (`info@`, a switchboard address) false-positives by
      // construction. Blocking on the guess would need an override flag to be
      // usable, and an override flag is the one shape this exhibit must not
      // demonstrate.
      //
      // ## Why the refusal is HERE and not on `convert_lead`'s predicate
      //
      // The ruling allowed either ("谓词或 flow 拒绝") and also required the
      // refusal to NAME the verdict and the surviving record. Measured against
      // `@objectstack/spec` 17.2.0, the action predicates cannot do the second
      // half: `visible` and `disabled` are each a bare boolean/CEL envelope
      // with nowhere to put a sentence, so `visible` hides a button that cannot
      // then explain itself and `disabled` greys one out with no reason
      // attached. `errorMessage` on the Action is a single static string — it
      // is what the console toasts on a FAILED run — and cannot say anything
      // about this lead. A screen node's `description`, by contrast, is
      // interpolated per run and rendered by `FlowRunner` as the dialog body,
      // which is why the #1207 warning already lives on one.
      //
      // The flow is also the only choke point that covers every door: the
      // record-header button, the list-row button and the `action_convert_lead`
      // AI tool all dispatch `POST /automation/lead_conversion/trigger`, while
      // `visible` / `disabled` are console-side and say nothing to the other
      // two.
      //
      // ## What the rep sees, measured on the shipped console bundle
      //
      // A run that PAUSES returns `{ success: true, silent: true }` to the
      // action framework (`RecordDetailView`'s flow handler), and `silent`
      // suppresses the success toast — so `convert_lead`'s
      // `successMessage: 'Lead converted successfully!'` does NOT fire behind
      // this dialog. The rep gets the refusal and nothing else. Submitting it
      // resumes into `end`, where the runner's own neutral "Flow completed"
      // toast appears; nothing is created and the lead is untouched on either
      // path, because every write in this flow is downstream of `screen_1`.
      //
      // ## What the copy may claim
      //
      // ⚠️ NOT the shared email address, which is what `warn_duplicate` above
      // uses. That claim is safe for `suspected` because only
      // `lead_duplicate_check` writes it and it matches on email; `confirmed`
      // is written by a PERSON, and the lead form lets a reviewer point
      // `duplicate_of_type` + its lookup at any record they like. So the
      // refusal names the survivor the way the house rule prescribes — through
      // the relationship fields that exist to carry it
      // (`test/record-id-not-in-prose.test.ts`: "the id goes in the
      // relationship field that exists to carry it, or nowhere"), naming the
      // `duplicates` field group by its shipped label, "Duplicate Management".
      // That sentence also stays true on the `erased` tombstone, where the
      // verdict survives its pointer (`lead.hook.ts`, job 1c).
      //
      // ⛔ The vocabulary of `duplicate_of_type` is deliberately NOT
      // transcribed into this sentence ("an existing Lead" / "an existing
      // Contact"). Those labels are locale-pack facts with one source of truth,
      // the rep can see them on the section this line points at, and a
      // hand-copied machine list in prose is the drift AGENTS.md documentation
      // rule 5 forbids.
      //
      // Flow copy is English-only in this repo — see `warn_duplicate` above for
      // the measurement; a flow has no entry in `src/translations/*.ts`.
      id: 'refuse_confirmed_duplicate', type: 'screen', label: 'Conversion Refused',
      config: {
        title: 'Conversion refused',
        description:
          "This lead's Duplicate Status is Confirmed: a reviewer compared it against an existing record and recorded that it repeats one. Converting would create a second account, contact and opportunity for the same buyer. The Duplicate Management section on this lead names the surviving record; disqualify this lead as a duplicate instead. Only a reviewer revising that verdict reopens conversion.",
        // A message-only screen: no fields, so the pause has to be asked for.
        // `waitForInput` is what turns a field-less screen from a server-side
        // pass-through into the dialog the rep reads (the executor's
        // `shouldPause`), and without it this node would fall through to `end`
        // in silence — a refusal nobody is told about.
        waitForInput: true,
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
    // `e0` used to run start → init_defaults, with `e1` carrying on to the
    // screen. With the seeding node retired (#1155) the start edge goes
    // straight to the screen and `e1` is gone; the gap in the numbering is
    // deliberate, so every surviving edge keeps the id it has always had.
    // #1207 reordered the head of the graph: start → get_lead → duplicate
    // decision → screen → find_account. `e3` (get_lead → find_account) is
    // retired and its id left vacant, same convention as `e1` above; `e0` and
    // `e2` keep their ids and their meaning as "the first edge" and "the edge
    // out of the screen".
    { id: 'e0', source: 'start', target: 'get_lead', type: 'default' },
    // That same reorder gave this edge (get_lead → decision_duplicate) the id
    // `e20`, which the terminal edge `send_notification → end` had already held
    // since the original graph — so the file carried `e20` TWICE. The collision
    // was inert, because traversal filters out-edges by `source` and never by
    // `id`, but it contradicted the convention above, and it was a trap for the
    // next editor picking a "free" id out of the sequence — #1288 had to add
    // `e25` to this very file. The convention decides which of the two moves:
    // the terminal edge keeps the id it has always had, so the newer edge takes
    // a fresh `e27` — the next id after the highest in use. `e1` and `e3` stay
    // vacant, as retired ids do.
    { id: 'e27', source: 'get_lead', target: 'decision_duplicate', type: 'default' },
    // ⚠️ Both conditions are TOTAL, and on this surface that is not a style
    // preference: a flow condition is interpreted strict CEL on every run, and
    // an unguarded field read against a driver that omits absent columns
    // (`driver-memory` / `driver-mongodb`) aborts — which FAILS THE RUN, so an
    // unguarded read here would make ordinary leads unconvertible. Measured, in
    // exactly that shape: `condition failed to evaluate as CEL: No such key:
    // duplicate_status`. The full table is in
    // `test/flow-condition-totality.test.ts`.
    //
    // TWO guards, in the spelling `test/flow-variable-conditions.test.ts`
    // requires, and the outer one is not decoration: `vars.leadRecord` is a
    // KEY, so a plain `vars.leadRecord != null` would itself abort with
    // `Unknown variable` on the run where `get_lead` bound nothing — the guard
    // would be the fault it was written to prevent. `has(vars.leadRecord)`
    // answers instead of reading.
    //
    // The THREE edges PARTITION by De Morgan (`!(a && b && c)` written out as
    // `!a || !b || !c`, with the two verdict tests conjoined under the last
    // term), so exactly one is true for every record shape, including the
    // shapes where the column, the row or both are missing.
    //
    // ⚠️ `e22`'s third term carries BOTH inequalities since #1288, and that is
    // the load-bearing half of adding `e25` — not a tidy-up. A decision node
    // that declares no `config.conditions` reports no branch, so traversal
    // takes EVERY out-edge whose condition holds, in parallel. With `e22` left
    // at `!= "suspected"` a confirmed lead satisfied `e22` AND `e25`: it would
    // have shown the refusal and converted the lead in the same run. Measured
    // on `AutomationEngine.evaluateCondition`, all seven record shapes, before
    // and after; the pin is in `test/lead-duplicate-visibility.test.ts`.
    { id: 'e21', source: 'decision_duplicate', target: 'warn_duplicate', type: 'default', condition: P`has(vars.leadRecord) && has(vars.leadRecord.duplicate_status) && vars.leadRecord.duplicate_status == "suspected"`, label: 'Suspected' },
    { id: 'e25', source: 'decision_duplicate', target: 'refuse_confirmed_duplicate', type: 'default', condition: P`has(vars.leadRecord) && has(vars.leadRecord.duplicate_status) && vars.leadRecord.duplicate_status == "confirmed"`, label: 'Confirmed' },
    { id: 'e22', source: 'decision_duplicate', target: 'no_duplicate_warning', type: 'default', condition: P`!has(vars.leadRecord) || !has(vars.leadRecord.duplicate_status) || (vars.leadRecord.duplicate_status != "suspected" && vars.leadRecord.duplicate_status != "confirmed")`, label: 'Clean' },
    { id: 'e23', source: 'warn_duplicate', target: 'screen_1', type: 'default' },
    { id: 'e24', source: 'no_duplicate_warning', target: 'screen_1', type: 'default' },
    // The refusal branch rejoins nothing: it goes straight to `end`, so no
    // node that writes is downstream of it. That is the refusal — the flow's
    // every create/update sits behind `screen_1`, which this path never
    // reaches.
    { id: 'e26', source: 'refuse_confirmed_duplicate', target: 'end', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'find_account', type: 'default' },
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
