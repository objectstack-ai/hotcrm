// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
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
    // THE authority for the conversion default. `defaultValue` is what makes
    // declared mean BOUND: the engine seeds every declared variable that
    // carries one before the run starts, so `createOpportunity` is bound on
    // every path — including the one where the screen runner posts back only
    // the fields the user touched. The screen field below derives its prefill
    // from this line rather than restating `false`.
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
    // ⛔ Never seed this with an assignment node instead: an assignment is
    // unconditional and clobbers a caller-supplied value. All of the above is
    // pinned in `test/flow-variable-conditions.test.ts`.
    { name: 'createOpportunity', type: 'boolean', isInput: true, isOutput: false, defaultValue: false },
    { name: 'opportunityName', type: 'text', isInput: true, isOutput: false },
    // Bound to `null` up front because `decision_amount`'s edges read it: a
    // runner may post nothing for an unticked box, and an unbound read fails
    // the run (`test/flow-variable-conditions.test.ts`, CLASS 2). The screen
    // answer overwrites it, and a ticked box with no amount is still refused
    // by the screen's `required` before any edge is read.
    { name: 'opportunityAmount', type: 'text', isInput: true, isOutput: false, defaultValue: null },
    // The conversion's close date, collected on the screen below
    // instead of stamped inside `create_opportunity`. Declared with NO
    // `defaultValue`, and that is measured rather than chosen: the engine
    // binds a DECLARATION's default raw — `seedDeclaredVariables` does a plain
    // `variables.set(name, defaultValue)` with no `interpolate` call — so
    // `{TODAY() + 90}` written here would bind that string verbatim and
    // `create_opportunity` would post the braces into a date column. Measured
    // on 17.3.0 by running a probe flow, not by reading the engine. The screen
    // field is therefore the only layer that can carry the expression, which
    // is where the +90 lives and why this line is deliberately bare.
    { name: 'closeDate', type: 'date', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_lead' } },
    {
      id: 'screen_1', type: 'screen', label: 'Conversion Details',
      config: {
        // The suspected-duplicate warning. `lead_duplicate_check` flags a
        // re-captured email at intake and links the record the lead repeats;
        // the rep about to CONVERT is the last moment that flag is worth
        // anything, and without it the duplicate becomes a second account,
        // contact and opportunity.
        //
        // ⛔ Not on `convert_lead`'s `confirmText`: that string is static and
        // unconditional, so it would warn identically on every clean lead — the
        // cry-wolf that makes a confirm dialog furniture. This screen is where
        // the conversion decision is actually taken, and the one surface that
        // can say something TRUE about THIS lead.
        //
        // Mechanism: the executor renders `config.description` — a text slot,
        // written as a `{{ }}` hole since 18.0.0-next.0 — into the `ScreenSpec`
        // it puts on the wire, and `FlowRunner.tsx` renders it —
        // `{screen.description && <DialogDescription>…}`. A hole over `null`
        // renders the empty string, which the executor's `renderTextSlot`
        // turns into no description at all (read in the installed
        // 18.0.0-next.0 `service-automation`; on the 17.1.0 bundles it was
        // measured as `interp` mapping null to `undefined`), so the clean-lead
        // branch below (which assigns `null`) renders NO description rather
        // than an empty paragraph. That is why the conditionality lives in an
        // assignment and not in the copy: a screen `description` has no
        // `visibleWhen`.
        description: '{{duplicateWarning}}',
        // `visibleWhen` on a screen field is BARE CEL over the screen's own
        // field names — not the CEL value envelopes the rest of this flow uses
        // for filters and `update_record` fields, evaluated on the server. The
        // client re-evaluates the predicate against the values collected so far,
        // which is why it cannot be a server-evaluated envelope.
        fields: [
          // ⛔ NEVER `required` on a boolean screen field. A checkbox has no
          // unanswered state — clear IS an answer, and "convert this lead
          // WITHOUT an opportunity" is the commonest path. `required: true`
          // blocks on both sides of the wire: the client counts the untouched
          // box as an unanswered field and disables Submit, and from
          // 17.0.0-rc.2 the SERVER enforces the screen's declared contract too,
          // refusing the resume with `INVALID_SCREEN_INPUT: Screen field
          // "createOpportunity" is required` — so a runner that posts only what
          // the user touched cannot convert a lead at all. The variable's
          // declared `defaultValue` is what supplies the answer.
          //
          // DERIVED, not restated. The envelope reads the flow variable
          // `createOpportunity`, so the literal `false` is written exactly once in this
          // file — on the declaration — and the widget prefill cannot drift from
          // the value the engine binds.
          //
          // A screen field's `defaultValue` is a CEL value envelope evaluated
          // before the descriptor goes on the wire, so the client receives the
          // value, never the envelope: boolean `false`, which is what the
          // 17.0.0 GA template was measured to send. (`visibleWhen` below is the
          // opposite case: forwarded raw, never evaluated on the server. Same
          // node, two different dialects.)
          { name: 'createOpportunity', label: 'Create Opportunity?', type: 'boolean', defaultValue: cel`createOpportunity` },
          // PREFILLED FROM THE LEAD (REQ-0005 acceptance 2). Both defaults are
          // CEL envelopes over `leadRecord`, which `get_lead` bound before this
          // screen was reached — the fetch sits AHEAD of the screen for the
          // duplicate warning, and these two ride the same ordering.
          //
          // ⚠️ Each envelope is evaluated before the descriptor goes on the
          // wire, so `estimated_amount` arrives as a NUMBER. `company` is
          // required on a lead; `estimated_amount` is not, so its read is
          // guarded: a lead with no estimate is served `null` where 17.x served
          // nothing (the migration entry: a field's `defaultValue` seeds the
          // field with null), and an ABSENT column on a sparse datasource no
          // longer fails the run at this screen.
          //
          // ⛔ The amount is prefilled, never copied silently. `estimated_amount`
          // is a pre-qualification guess and `crm_opportunity.amount` is a
          // number a rep defends in a forecast; conversion is the moment a human
          // turns one into the other, so the figure is shown in an editable box
          // and the rep confirms it. Writing it straight into
          // `create_opportunity` would put an unreviewed estimate into the
          // forecast and leave the two fields looking like copies of each other.
          //
          // `required` on the amount mirrors the column, for the reason given
          // at `closeDate` below: `crm_opportunity.amount` is `required` +
          // `notNull`, and without this a ticked box with no amount reached
          // `create_opportunity` after the account and contact were written,
          // leaving the lead half-converted (#2060 item 2). Visible-only, so
          // an unticked box still converts with no amount. The column's other
          // rule, `amount_positive` (greater than zero), cannot be said here:
          // a screen field's `min` is inclusive. `decision_amount` refuses it
          // instead, before any write (#2060 item 2b).
          { name: 'opportunityName', label: 'Opportunity Name', type: 'text', required: true, defaultValue: cel`leadRecord.company`, visibleWhen: 'createOpportunity == true' },
          { name: 'opportunityAmount', label: 'Opportunity Amount', type: 'currency', required: true, defaultValue: cel`has(leadRecord.estimated_amount) ? leadRecord.estimated_amount : null`, visibleWhen: 'createOpportunity == true' },
          // The close date, DEFAULTED AND VISIBLE. `close_date` is what files
          // an opportunity into a forecast PERIOD, so ⛔ never stamp it silently
          // inside `create_opportunity`: a hidden +90 days files every converted
          // deal a quarter out and moves the forecast where nobody can see it.
          //
          // The +90 is written HERE and nowhere else, and here the layer is
          // FORCED rather than preferred. A screen field's `defaultValue` is
          // evaluated before the descriptor goes on the wire and a flow
          // variable's default is bound raw (see the declaration above), so this
          // is the only place the expression can be written at all.
          // `isoDate(daysFromNow(90))` writes the `YYYY-MM-DD` string 90 days out
          // on the UTC calendar — what 17.3.0's `{TODAY() + 90}` was measured to
          // send — and the value the rep sees is the value
          // `create_opportunity` writes.
          //
          // `required` mirrors the column — `crm_opportunity.close_date` is
          // `required` + `notNull` — and it is what keeps the refusal at the
          // SCREEN boundary. Measured both ways against a real ObjectQL engine:
          // WITHOUT it, a submission carrying no date reaches
          // `create_opportunity` and fails there with `Close Date is required`,
          // by which point the account and the contact have already been
          // written and the lead is left half-converted; WITH it the resume is
          // refused before any node runs, nothing is written, and the message
          // names the field. That path is not hypothetical — a rep who CLEARS
          // the prefilled date posts the key empty, and `isPresent('')` is
          // false. A hidden `required` never fires: the server contract skips it
          // when `visibleWhen` evaluates false, and so does the console, which
          // is the untouched-checkbox path this screen has always had to keep
          // working.
          { name: 'closeDate', label: 'Close Date', type: 'date', required: true, defaultValue: cel`isoDate(daysFromNow(90))`, visibleWhen: 'createOpportunity == true' },
        ],
      },
    },
    {
      // ⛔ This fetch must stay AHEAD of the screen: the duplicate warning
      // reads `leadRecord`, and a screen that suspends before the fetch has
      // nothing to read. The fetch itself never depended on the screen —
      // `recordId` is an input variable, seeded before the run starts.
      id: 'get_lead', type: 'get_record', label: 'Get Lead Record',
      config: { objectName: 'crm_lead', filter: { id: cel`recordId` }, outputVariable: 'leadRecord' },
    },
    {
      // Branching is on edges `e21` / `e22` / `e25` — see `decision_account`.
      // Three ways out, because `duplicate_status` carries two different KINDS
      // of fact and they get different answers: the machine's `suspected` guess
      // warns and lets the rep decide (`e21`), a person's `confirmed` verdict
      // refuses outright (`e25`), and everything else converts silently (`e22`).
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
      // This warning's TEXT is English-only: it is the value of a variable,
      // and no locale pack reaches a variable — the screen's translated
      // `description` can only carry the `{{duplicateWarning}}` hole that
      // shows it. The screens' own headings and bodies are keyed in the packs
      // (`flows.lead_conversion` in `src/sales/translations/<locale>/app.ts`),
      // and the banner on the record page carries the warning in all four.
      id: 'warn_duplicate', type: 'assignment', label: 'Compose Duplicate Warning',
      config: {
        assignments: {
          duplicateWarning:
            cel`'Suspected duplicate — intake flagged this lead as repeating an existing record with this email address (' + leadRecord.email + '). Converting creates a second account, contact and opportunity for the same buyer; compare the linked record on the lead page before you continue.'`,
        },
      },
    },
    {
      // The other branch assigns `null`, which is what makes the warning
      // CONDITIONAL: the description hole renders it as no description at
      // all (see `screen_1`). Same shape as `no_opportunity` below — both branches
      // write the variable so no downstream read ever meets an unset one.
      id: 'no_duplicate_warning', type: 'assignment', label: 'No Duplicate Warning',
      config: { assignments: { duplicateWarning: null } },
    },
    {
      // The REFUSAL. A `confirmed` duplicate is a person's verdict, and the app
      // stops converting on it — the rule AGENTS.md states as "interception
      // stands on a person's judgement". `suspected` keeps the warn-and-allow
      // above: a machine's guess stays advisory, because `lead_duplicate_check`
      // matches on email EQUALITY and a shared inbox (`info@`, a switchboard
      // address) false-positives by construction. ⛔ Do not block on the guess —
      // it would need an override flag to stay usable, and an override flag is
      // the one shape this exhibit must not demonstrate.
      //
      // ## Why the refusal is HERE and not on `convert_lead`'s predicate
      //
      // A refusal must NAME the verdict and the surviving record, and measured
      // against `@objectstack/spec` 17.2.0 the action predicates cannot:
      // `visible` and `disabled` are each a bare boolean/CEL envelope with
      // nowhere to put a sentence, so `visible` hides a button that cannot then
      // explain itself and `disabled` greys one out with no reason attached.
      // `errorMessage` on the Action is a single static string — what the
      // console toasts on a FAILED run — and cannot say anything about THIS
      // lead. A screen node's `description` is a text slot rendered per run
      // and shown by `FlowRunner` as the dialog body.
      //
      // The flow is also the only choke point covering every door: the
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
      // this dialog. Submitting it resumes into `end`; nothing is created and
      // the lead is untouched on either path, because every write in this flow
      // is downstream of `screen_1`.
      //
      // ## What the copy may claim
      //
      // ⛔ NOT the shared email address, which is what `warn_duplicate` above
      // uses. That claim is safe for `suspected` because only
      // `lead_duplicate_check` writes it and it matches on email; `confirmed`
      // is written by a PERSON, and the lead form lets a reviewer point
      // `duplicate_of_type` + its lookup at any record they like. So the
      // refusal names the survivor through the relationship fields that exist
      // to carry it (`test/record-id-not-in-prose.test.ts`: "the id goes in the
      // relationship field that exists to carry it, or nowhere"), naming the
      // `duplicates` field group by its shipped label, "Duplicate Management".
      // That sentence also stays true on the `erased` tombstone, where the
      // verdict survives its pointer (`lead.hook.ts`, job 1c).
      //
      // ⛔ Never transcribe the vocabulary of `duplicate_of_type` into this
      // sentence ("an existing Lead" / "an existing Contact"). Those labels are
      // locale-pack facts with one source of truth, the rep can see them on the
      // section this line points at, and a hand-copied machine list in prose is
      // the drift AGENTS.md documentation rule 5 forbids.
      //
      // The title and the body are translated in the packs
      // (`flows.lead_conversion.screens.refuse_confirmed_duplicate`).
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
      // Branching is on edges `e28` / `e29` — see `decision_account`.
      id: 'decision_approval', type: 'decision', label: 'Approved for Conversion?',
    },
    {
      // The approval gate, on the surface a REST caller reaches (REQ-0005
      // acceptance 3). `convert_lead`'s `visible` predicate hides the button and
      // `lead.hook.ts` refuses the write, but this flow has its own door —
      // `POST /automation/lead_conversion/trigger` — and without this branch a
      // caller through that door would run the whole conversion and only be
      // refused at `mark_converted`, by which point the account, the contact and
      // the opportunity have already been written and the lead is left
      // half-converted. Refusing HERE, ahead of `screen_1`, is what makes the
      // gate whole: every create and update in this flow sits behind that
      // screen, and this path never reaches it.
      id: 'refuse_unapproved', type: 'screen', label: 'Conversion Refused',
      config: {
        title: 'Conversion refused',
        description:
          "This lead has not been approved for conversion. An approver has to sign it off before it can become an account, contact and opportunity; the Conversion Approval field on the lead shows whether the decision is still pending or was refused. Keep working the lead in the meantime — nothing about it is frozen.",
        // Field-less screen: `waitForInput` is what turns it from a server-side
        // pass-through into the dialog the rep reads. See
        // `refuse_confirmed_duplicate` for the mechanism.
        waitForInput: true,
      },
    },
    {
      // Branching is on edges `e31` / `e32` — see `decision_account`. The
      // match-key guard sits between the duplicate verdict and `screen_1`, so
      // it dominates `find_account` and a key-less lead is refused before the
      // rep fills in the form and before any write. It is the LAST of the
      // three refusals on purpose: an unapproved lead or a confirmed duplicate
      // is told that verdict first, and a missing key is a repairable data
      // gap rather than a verdict.
      id: 'decision_match_key', type: 'decision', label: 'Company Match Key?',
    },
    {
      // The KEY-LESS refusal (#2017). Why `find_account` must not run without
      // a key is recorded on that node; this is what the rep reads instead.
      //
      // A refusal, not a new account, and that is the flow's own stated intent
      // rather than a fresh choice: a conversion that stops is far cheaper to
      // diagnose than one that quietly attaches to the wrong account or
      // creates a duplicate one, and `screen_1` offers the rep no account
      // choice that could confirm a match by hand.
      //
      // The copy claims only what holds on every path into it: the key is
      // derived from `company` on every write that carries it
      // (`lead_duplicate_check`), and nothing has been written, because every
      // create and update in this flow sits behind `screen_1`. Its title and
      // body are translated in the packs, like the other two refusals.
      //
      // Field-less screen: `waitForInput` is what turns it from a server-side
      // pass-through into the dialog the rep reads. See
      // `refuse_confirmed_duplicate` for the mechanism.
      id: 'refuse_no_match_key', type: 'screen', label: 'Conversion Refused',
      config: {
        title: 'Conversion refused',
        description:
          "This lead's company has no match key, so conversion cannot tell which account it belongs to, and it will not guess: a guess could file the contact and opportunity under another customer. Saving the lead's Company rebuilds the key, so save it again, then convert. Nothing has been created.",
        waitForInput: true,
      },
    },
    {
      // Branching is on edges `e44` / `e45` — see `decision_account`. The
      // only gate AFTER `screen_1`, because it judges an answer the rep typed
      // there, and it dominates every write (`find_account` below only reads).
      id: 'decision_amount', type: 'decision', label: 'Opportunity Amount Above Zero?',
    },
    {
      // The NON-POSITIVE AMOUNT refusal (#2060 item 2b). `crm_opportunity`'s
      // `amount_positive` refuses an amount of zero or less, and the platform
      // does not undo a failed run, so letting it reach `create_opportunity`
      // left the account and contact written and the lead unconverted. The
      // edges restate that rule's predicate exactly (`<= 0`, null excluded:
      // an empty amount is the screen's `required`), so the two cannot
      // disagree about which amounts convert.
      //
      // A first-class refusal (`EndConfigSchema` `outcome: 'refused'`), as in
      // `quote_generation`, and ⛔ not the message-only screen the three
      // refusals above use: the run ends `refused` rather than `completed`,
      // and the console shows the message with Close only. A screen here was
      // measured to toast "Saved — next step" over a refusal, and its Submit
      // toasts `convert_lead`'s "Lead converted successfully!". Translated as
      // `refusals.refuse_nonpositive_amount.message` in the packs.
      id: 'refuse_nonpositive_amount', type: 'end', label: 'Conversion Refused',
      config: {
        outcome: 'refused',
        message: 'Conversion refused: an opportunity amount must be greater than zero. Nothing was created. Convert the lead again with the amount the deal is worth, or leave Create Opportunity unticked to convert it without one.',
      },
    },
    {
      // Account dedupe: match on the NORMALIZED company name, never on the raw
      // one — "Acme Corp" and "ACME  Corp" are the same account.
      //
      // Both sides of this comparison are stored, hook-maintained columns, and
      // on 17.x that was forced rather than chosen: a flow template could not
      // normalize ANYTHING. `service-automation`'s `resolveToken` recognises exactly one
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
      // whitespace. Fuzzy matching stays out of scope.
      //
      // A lead with NO `company_normalized` never reaches this node:
      // `decision_match_key`, ahead of `screen_1`, refuses it first. The node
      // cannot be left to refuse on its own, because "no key" arrives in two
      // shapes that behave differently (both measured on 17.7.0):
      //
      //   · ABSENT — a sparse datasource (`driver-memory` / `driver-mongodb`)
      //     on a row never written with the column. The token resolves to
      //     nothing and `get_record` refuses to run, so the run FAILS
      //     (`FLOW_FAILED`, "refusing to run — 1 filter condition(s) resolved
      //     to nothing and were dropped from the query …").
      //   · NULL — SQL, or any datasource once the column is written empty,
      //     which `lead_duplicate_check` does on purpose for a company that
      //     folds to nothing. The token resolves to `null`, and a bare `null`
      //     in a filter is the platform's documented HAS-NO-VALUE predicate
      //     (`$eq: null`, `@objectstack/spec` `data/filter.zod.ts`). This
      //     lookup then MATCHES every account whose own key is null, and the
      //     lead converts onto an unrelated customer's account (#2017).
      //
      // A key-less lead is not only a row written before the producer existed
      // (the backfill in docs/MAINTENANCE.md §3.3): a non-string company
      // written through the record API folds to `null` too. A conversion that
      // stops is far cheaper to diagnose than one that quietly attaches to the
      // wrong account or creates a duplicate one, so the answer is the
      // refusal the rep reads in `refuse_no_match_key`.
      //
      // Since 18.0.0-next.0 the operand is a CEL envelope: an absent key fails
      // the run before the query, and a null one refuses the node instead of
      // matching (the platform's `flow-value-slot-template-dialect-refused`
      // entry; not re-measured here). Neither shape converts onto another
      // account any more, and `decision_match_key` still refuses first, with
      // copy the rep can read.
      //
      // ⛔ Never paper this over with a second, case-sensitive lookup on the
      // raw `name`: a missing key means the producer could not derive one, and
      // a tolerant consumer path would hide that while restoring the exact bug
      // this node exists to fix.
      id: 'find_account', type: 'get_record', label: 'Find Existing Account',
      config: { objectName: 'crm_account', filter: { name_normalized: cel`leadRecord.company_normalized` }, outputVariable: 'matchedAccount' },
    },
    {
      // Branching is on edges `e5` / `e6`. No `config.condition` here: a
      // `decision` node's singular one is never evaluated.
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
      //
      // ⛔ No `annual_revenue` here, ever, not even as null. The `sales_rep`
      // permission set makes it read-only, and the field lock refuses the KEY
      // whatever its value, so carrying it failed every rep's conversion into
      // a new account (#2016). `copy_account_revenue` below writes it.
      id: 'create_account', type: 'create_record', label: 'Create Account',
      config: {
        objectName: 'crm_account',
        fields: {
          // `company` is required on a lead; every other copied fact is
          // optional, so its read is guarded to null (an insert treats null as
          // it treated the key the template left out).
          name: cel`leadRecord.company`, phone: cel`has(leadRecord.phone) ? leadRecord.phone : null`,
          website: cel`has(leadRecord.website) ? leadRecord.website : null`,
          industry: cel`has(leadRecord.industry) ? leadRecord.industry : null`,
          number_of_employees: cel`has(leadRecord.number_of_employees) ? leadRecord.number_of_employees : null`,
          billing_address: cel`has(leadRecord.address) ? leadRecord.address : null`,
          owner_id: cel`current_user.id`, is_active: true,
        },
        outputVariable: 'createdAccount',
      },
    },
    {
      // The ELEVATED half of the new-account branch, and the only elevation
      // in this flow (AGENTS.md house rule 9): the lead's annual revenue,
      // written onto the account `create_account` just created by
      // `lead_conversion_account_revenue` (`runAs: 'system'`). This flow stays
      // `runAs: 'user'`, so the account itself is still the converting user's
      // own write, held to their object and field permissions. Why the callee
      // copies one column instead of creating the account is recorded in its
      // header (`lead-conversion-account-revenue.flow.ts`).
      //
      // ⛔ `accountId` is only ever `createdAccount.id`: the callee writes
      // with the system context onto whatever account it is handed.
      id: 'copy_account_revenue', type: 'subflow', label: 'Copy Lead Revenue to Account',
      config: {
        flowName: 'lead_conversion_account_revenue',
        input: {
          accountId: cel`createdAccount.id`,
          annualRevenue: cel`has(leadRecord.annual_revenue) ? leadRecord.annual_revenue : null`,
        },
      },
    },
    {
      id: 'use_new_account', type: 'assignment', label: 'Use New Account',
      config: { assignments: { accountId: cel`createdAccount.id` } },
    },
    {
      id: 'use_existing_account', type: 'assignment', label: 'Reuse Existing Account',
      config: { assignments: { accountId: cel`matchedAccount.id` } },
    },
    {
      // Contact dedupe by email — GLOBAL, not per-account. ⛔ Never scope this
      // lookup to the account: `crm_contact` carries a global unique index on
      // `email`, so an account-scoped lookup misses a same-email contact under
      // another account and `create_contact` then explodes on the DB index
      // AFTER the account has been created, orphaning it. Leads require an
      // email, so the match key is reliable.
      id: 'find_contact', type: 'get_record', label: 'Find Existing Contact',
      config: {
        objectName: 'crm_contact',
        filter: { email: cel`leadRecord.email` },
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
          // The person's own facts travel with them (#2068). `crm_contact`
          // declares each of these on the lead's vocabulary (the two selects
          // reference the same `salutation` and `lead_source` picklists,
          // pinned by `test/actions-flows-integrity`), so a straight copy is
          // always legal. The two opt-outs are copied,
          // never defaulted: a lead that opted out must not become a contact
          // that has not — `email_opt_out` hides Send Email and silences
          // `contact_welcome`, `do_not_call` refuses a scheduled call. A
          // REUSED contact does not come through here: see
          // `decision_contact_do_not_call`.
          //
          // Names and email are required on a lead and read bare; the rest
          // are optional and guarded to null, which an insert reads as the
          // omitted key the template wrote (each opt-out then takes its
          // `false` default, as before).
          salutation: cel`has(leadRecord.salutation) ? leadRecord.salutation : null`,
          mobile: cel`has(leadRecord.mobile) ? leadRecord.mobile : null`,
          lead_source: cel`has(leadRecord.lead_source) ? leadRecord.lead_source : null`,
          do_not_call: cel`has(leadRecord.do_not_call) ? leadRecord.do_not_call : null`,
          email_opt_out: cel`has(leadRecord.email_opt_out) ? leadRecord.email_opt_out : null`,
          first_name: cel`leadRecord.first_name`, last_name: cel`leadRecord.last_name`,
          email: cel`leadRecord.email`, phone: cel`has(leadRecord.phone) ? leadRecord.phone : null`,
          title: cel`has(leadRecord.title) ? leadRecord.title : null`, crm_account: cel`accountId`,
          is_primary: true, owner_id: cel`current_user.id`,
        },
        outputVariable: 'createdContact',
      },
    },
    {
      id: 'use_new_contact', type: 'assignment', label: 'Use New Contact',
      config: { assignments: { contactId: cel`createdContact.id` } },
    },
    {
      id: 'use_existing_contact', type: 'assignment', label: 'Reuse Existing Contact',
      config: { assignments: { contactId: cel`matchedContact.id` } },
    },
    {
      // ── A REUSED contact keeps the stricter consent (#2068) ──────────────
      //
      // `create_contact` copies the lead's opt-outs onto a NEW contact. A
      // reused contact already holds its own answer, and an opt-out is a
      // promise to a person that a conversion never takes back — so this path
      // only ever RAISES a flag, one node per flag, and only when the lead
      // carries it. The `raise_*` nodes write the literal `true`, ⛔ never a
      // copy of `leadRecord.x`: a copy would write the lead's `false` over a contact
      // who had opted out. `crm_account` carries neither flag, so the account
      // half of "the stricter value wins" has nothing to write.
      //
      // The edges read the LEAD's flag only, not whether the contact already
      // holds it. Reading `vars.matchedContact.x` needs a
      // `has(vars.matchedContact)` guard, which
      // `test/flow-variable-conditions.test.ts` forbids on this flow (a
      // `get_record` binds it on every path) — and writing `true` over `true`
      // changes nothing.
      //
      // Branching on `e35` / `e36`, then `e38` / `e39`: each pair is TOTAL and
      // partitions by De Morgan, so exactly one edge holds on every shape
      // `get_lead` can bind — pinned in `test/flow-conversion.test.ts`.
      id: 'decision_contact_do_not_call', type: 'decision', label: 'Lead Is Do-Not-Call?',
    },
    {
      id: 'raise_contact_do_not_call', type: 'update_record', label: 'Carry Do-Not-Call to Contact',
      config: { objectName: 'crm_contact', filter: { id: cel`contactId` }, fields: { do_not_call: true } },
    },
    {
      id: 'decision_contact_email_opt_out', type: 'decision', label: 'Lead Opted Out of Email?',
    },
    {
      id: 'raise_contact_email_opt_out', type: 'update_record', label: 'Carry Email Opt-Out to Contact',
      config: { objectName: 'crm_contact', filter: { id: cel`contactId` }, fields: { email_opt_out: true } },
    },
    {
      // Branching is on edges `e16` / `e17` — see `decision_account`.
      id: 'decision_opportunity', type: 'decision', label: 'Create Opportunity?',
    },
    {
      // `close_date` comes from the screen field, which is the only layer that
      // can carry the `isoDate(daysFromNow(90))` expression — see the
      // `closeDate` declaration. An unbound `closeDate` fails the run at this
      // node rather than inventing a quarter, which is the failure this node
      // is allowed to have.
      id: 'create_opportunity', type: 'create_record', label: 'Create Opportunity',
      config: {
        objectName: 'crm_opportunity',
        fields: {
          name: cel`opportunityName`, crm_account: cel`accountId`, primary_contact: cel`contactId`,
          amount: cel`opportunityAmount`, stage: 'prospecting', probability: 10,
          lead_source: cel`has(leadRecord.lead_source) ? leadRecord.lead_source : null`,
          close_date: cel`closeDate`, owner_id: cel`current_user.id`,
        },
        outputVariable: 'createdOpportunity',
      },
    },
    {
      // Normalize both opportunity branches onto a single `opportunityId`, the
      // same pattern as accountId/contactId. ⛔ Never reference
      // `createdOpportunity.id` downstream instead: on the "No" branch the
      // create node never ran, and the unbound read fails the run (on 17.x the
      // unresolved token interpolated into the `converted_opportunity` lookup
      // as a placeholder).
      id: 'use_new_opportunity', type: 'assignment', label: 'Use New Opportunity',
      config: { assignments: { opportunityId: cel`createdOpportunity.id` } },
    },
    {
      id: 'no_opportunity', type: 'assignment', label: 'No Opportunity',
      config: { assignments: { opportunityId: null } },
    },
    {
      id: 'mark_converted', type: 'update_record', label: 'Mark Lead as Converted',
      config: {
        objectName: 'crm_lead', filter: { id: cel`recordId` },
        fields: {
          // `status: 'converted'` rides along so list views agree with the
          // conversion flags (the qualified → converted transition is legal
          // per the lead_status_progression state machine).
          is_converted: true, status: 'converted', converted_date: cel`isoDatetime(now())`,
          converted_account: cel`accountId`, converted_contact: cel`contactId`,
          converted_opportunity: cel`opportunityId`,
        },
      },
    },
    {
      // ADR-0012: deliver via the `notify` node (inbox + email). The legacy
      // `script` + `actionType:'email'` shape is a no-op stub in 7.4.
      id: 'send_notification', type: 'notify', label: 'Send Confirmation',
      config: {
        recipients: [cel`current_user.id`],
        channels: ['inbox', 'email'],
        topic: 'lead_converted',
        template: 'crm.lead_converted',
        templateData: { first_name: cel`leadRecord.first_name`, last_name: cel`leadRecord.last_name` },
        actionUrl: '/crm_account/{{accountId}}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    // ⛔ A retired edge's id stays VACANT and every surviving edge keeps the id
    // it has always had — `e1`, `e2`, `e3`, `e7` and `e15` are gaps on purpose.
    // Renumbering to close a gap rewrites ids that other notes, tests and run
    // logs refer to.
    { id: 'e0', source: 'start', target: 'get_lead', type: 'default' },
    // ⛔ When you add an edge, take the next id AFTER THE HIGHEST IN USE — do
    // not reuse a vacant one, and do not assume an unused-looking id is free.
    // A duplicate id is INERT (traversal filters out-edges by `source`, never
    // by `id`), so nothing fails and the collision survives to trap the next
    // editor picking out of the sequence. `e1`, `e2`, `e3`, `e7` and `e15` are
    // vacant retired ids and stay that way; `e27` is above the highest live
    // id, not a gap-fill.
    { id: 'e27', source: 'get_lead', target: 'decision_approval', type: 'default' },
    // ── The approval gate (REQ-0005 step 7) ────────────────────────────
    //
    // The same TOTAL, PARTITIONING pair the duplicate verdict below is written
    // as, and for the same measured reason: a decision node declaring no
    // `config.conditions` takes EVERY out-edge whose condition holds, in
    // parallel, so two overlapping guards would refuse the conversion and
    // continue it in one run. `e29` is `e28` negated by De Morgan.
    //
    // ⚠️ The polarity is fail-OPEN, unlike the duplicate branch, and that is the
    // gate's off switch rather than a slip. Only the two verdicts a live
    // approval writes refuse; `not_required` — the shipped default — and an
    // absent column (a lead from before the field existed) both continue, so
    // with the gate off this pair is invisible and conversion behaves exactly as
    // it did before. `lead.hook.ts` and `convert_lead.visible` carry the same
    // polarity, because the three have to agree about what "off" means.
    { id: 'e28', source: 'decision_approval', target: 'refuse_unapproved', type: 'default', condition: P`has(vars.leadRecord) && has(vars.leadRecord.conversion_approval_status)
      && (vars.leadRecord.conversion_approval_status == "pending" || vars.leadRecord.conversion_approval_status == "rejected")`, label: 'Not approved' },
    { id: 'e29', source: 'decision_approval', target: 'decision_duplicate', type: 'default', condition: P`!has(vars.leadRecord) || !has(vars.leadRecord.conversion_approval_status)
      || (vars.leadRecord.conversion_approval_status != "pending" && vars.leadRecord.conversion_approval_status != "rejected")`, label: 'Clear' },
    // Rejoins nothing, exactly like `e26`: the refusal IS not reaching a writer.
    { id: 'e30', source: 'refuse_unapproved', target: 'end', type: 'default' },
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
    // ⛔ `e22`'s third term must carry BOTH inequalities. A decision node that
    // declares no `config.conditions` reports no branch, so traversal takes
    // EVERY out-edge whose condition holds, IN PARALLEL — with `e22` left at
    // `!= "suspected"` a confirmed lead satisfies `e22` AND `e25`, showing the
    // refusal and converting the lead in the same run. Measured on
    // `AutomationEngine.evaluateCondition` across all seven record shapes; the
    // pin is in `test/lead-duplicate-visibility.test.ts`.
    { id: 'e21', source: 'decision_duplicate', target: 'warn_duplicate', type: 'default', condition: P`has(vars.leadRecord) && has(vars.leadRecord.duplicate_status) && vars.leadRecord.duplicate_status == "suspected"`, label: 'Suspected' },
    { id: 'e25', source: 'decision_duplicate', target: 'refuse_confirmed_duplicate', type: 'default', condition: P`has(vars.leadRecord) && has(vars.leadRecord.duplicate_status) && vars.leadRecord.duplicate_status == "confirmed"`, label: 'Confirmed' },
    { id: 'e22', source: 'decision_duplicate', target: 'no_duplicate_warning', type: 'default', condition: P`!has(vars.leadRecord) || !has(vars.leadRecord.duplicate_status) || (vars.leadRecord.duplicate_status != "suspected" && vars.leadRecord.duplicate_status != "confirmed")`, label: 'Clean' },
    // Both clear duplicate branches pass the match-key guard before the form.
    { id: 'e23', source: 'warn_duplicate', target: 'decision_match_key', type: 'default' },
    { id: 'e24', source: 'no_duplicate_warning', target: 'decision_match_key', type: 'default' },
    // ── The match-key guard (#2017) ────────────────────────────────────
    //
    // TOTAL and PARTITIONING, for the reason recorded at `e28` / `e29`: `e32`
    // is `e31` negated by De Morgan, so exactly one holds for every shape
    // `get_lead` can bind — unbound, a null row, the column absent, null,
    // empty, or keyed. `has()` alone is not the test: on a row that carries
    // the column as null it answers true, so the value needs `isBlank` too.
    // Fail-CLOSED, unlike the approval gate: without a key there is nothing to
    // match on, and a guess is the defect.
    { id: 'e31', source: 'decision_match_key', target: 'screen_1', type: 'default', condition: P`has(vars.leadRecord) && has(vars.leadRecord.company_normalized) && !isBlank(vars.leadRecord.company_normalized)`, label: 'Has match key' },
    { id: 'e32', source: 'decision_match_key', target: 'refuse_no_match_key', type: 'default', condition: P`!has(vars.leadRecord) || !has(vars.leadRecord.company_normalized) || isBlank(vars.leadRecord.company_normalized)`, label: 'No match key' },
    // Rejoins nothing, exactly like `e26` / `e30`.
    { id: 'e33', source: 'refuse_no_match_key', target: 'end', type: 'default' },
    // The refusal branch rejoins nothing: it goes straight to `end`, so no
    // node that writes is downstream of it. That is the refusal — the flow's
    // every create/update sits behind `screen_1`, which this path never
    // reaches.
    { id: 'e26', source: 'refuse_confirmed_duplicate', target: 'end', type: 'default' },
    // `e2` (screen_1 → find_account) is RETIRED and stays vacant (#2060 item
    // 2b): the amount gate sits between them now, on `e43` – `e45`. The pair
    // is TOTAL and PARTITIONING (`e45` is `e44` negated by De Morgan), pinned
    // in `test/flow-conversion.test.ts`; an unticked box never reads the amount.
    // `e45` ends the run at its target, a refusing `end`: no edge leaves it.
    { id: 'e43', source: 'screen_1', target: 'decision_amount', type: 'default' },
    { id: 'e44', source: 'decision_amount', target: 'find_account', type: 'default', condition: P`vars.createOpportunity != true || vars.opportunityAmount == null || vars.opportunityAmount > 0`, label: 'Amount accepted' },
    { id: 'e45', source: 'decision_amount', target: 'refuse_nonpositive_amount', type: 'default', condition: P`vars.createOpportunity == true && vars.opportunityAmount != null && vars.opportunityAmount <= 0`, label: 'Zero or less' },
    { id: 'e4', source: 'find_account', target: 'decision_account', type: 'default' },
    // Existing account → reuse; no account → create. Both converge on create_contact.
    // `find_account` is reached only with a match key (`e31`), so a match
    // here is an equality on a real key, never the has-no-value predicate.
    // ⛔ No second copy of the key test on these two edges: it could never
    // be false here, and an inert restatement of a live predicate is the
    // shape #650 retired from this repo's decision nodes.
    { id: 'e5', source: 'decision_account', target: 'use_existing_account', type: 'default', condition: P`vars.matchedAccount != null`, label: 'Existing' },
    { id: 'e6', source: 'decision_account', target: 'create_account', type: 'default', condition: P`vars.matchedAccount == null`, label: 'New' },
    // `e7` (create_account → use_new_account) is RETIRED and stays vacant
    // (#2016): the revenue copy sits between them now, on `e41` / `e42`.
    { id: 'e41', source: 'create_account', target: 'copy_account_revenue', type: 'default' },
    { id: 'e42', source: 'copy_account_revenue', target: 'use_new_account', type: 'default' },
    // Both account branches converge on the contact-dedupe lookup.
    { id: 'e8', source: 'use_new_account', target: 'find_contact', type: 'default' },
    { id: 'e9', source: 'use_existing_account', target: 'find_contact', type: 'default' },
    { id: 'e10', source: 'find_contact', target: 'decision_contact', type: 'default' },
    // Existing contact → reuse; none → create. Both converge on
    // decision_opportunity, the reuse path through the consent raise below.
    { id: 'e11', source: 'decision_contact', target: 'use_existing_contact', type: 'default', condition: P`vars.matchedContact != null`, label: 'Existing' },
    { id: 'e12', source: 'decision_contact', target: 'create_contact', type: 'default', condition: P`vars.matchedContact == null`, label: 'New' },
    { id: 'e13', source: 'create_contact', target: 'use_new_contact', type: 'default' },
    { id: 'e14', source: 'use_new_contact', target: 'decision_opportunity', type: 'default' },
    // ── The reused contact's consent raise (#2068) ─────────────────────
    //
    // `e15` (use_existing_contact → decision_opportunity) is RETIRED and stays
    // vacant; `e34` replaces it. Each pair below is TOTAL and PARTITIONING, and
    // only a flag the lead carries as `true` takes the raise.
    { id: 'e34', source: 'use_existing_contact', target: 'decision_contact_do_not_call', type: 'default' },
    { id: 'e35', source: 'decision_contact_do_not_call', target: 'raise_contact_do_not_call', type: 'default', condition: P`has(vars.leadRecord) && has(vars.leadRecord.do_not_call) && vars.leadRecord.do_not_call == true`, label: 'Do not call' },
    { id: 'e36', source: 'decision_contact_do_not_call', target: 'decision_contact_email_opt_out', type: 'default', condition: P`!has(vars.leadRecord) || !has(vars.leadRecord.do_not_call) || vars.leadRecord.do_not_call != true`, label: 'Callable' },
    { id: 'e37', source: 'raise_contact_do_not_call', target: 'decision_contact_email_opt_out', type: 'default' },
    { id: 'e38', source: 'decision_contact_email_opt_out', target: 'raise_contact_email_opt_out', type: 'default', condition: P`has(vars.leadRecord) && has(vars.leadRecord.email_opt_out) && vars.leadRecord.email_opt_out == true`, label: 'Opted out' },
    { id: 'e39', source: 'decision_contact_email_opt_out', target: 'decision_opportunity', type: 'default', condition: P`!has(vars.leadRecord) || !has(vars.leadRecord.email_opt_out) || vars.leadRecord.email_opt_out != true`, label: 'Emailable' },
    { id: 'e40', source: 'raise_contact_email_opt_out', target: 'decision_opportunity', type: 'default' },
    { id: 'e16', source: 'decision_opportunity', target: 'create_opportunity', type: 'default', condition: P`vars.createOpportunity == true`, label: 'Yes' },
    { id: 'e17', source: 'decision_opportunity', target: 'no_opportunity', type: 'default', condition: P`vars.createOpportunity != true`, label: 'No' },
    { id: 'e18', source: 'create_opportunity', target: 'use_new_opportunity', type: 'default' },
    { id: 'e18a', source: 'use_new_opportunity', target: 'mark_converted', type: 'default' },
    { id: 'e18b', source: 'no_opportunity', target: 'mark_converted', type: 'default' },
    { id: 'e19', source: 'mark_converted', target: 'send_notification', type: 'default' },
    { id: 'e20', source: 'send_notification', target: 'end', type: 'default' },
  ],
};
