// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, expression, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { QUOTE_DISCOUNT_CEILING } from '../../sales/objects/_thresholds';
type Flow = Automation.Flow;

/**
 * Edge `e4a`'s predicate — advance the deal to `proposal`. A source FRAGMENT,
 * spliced with `expression()` because the `P` tag JSON-quotes an interpolated
 * string and cannot splice one: edge `e4b` is its exact negation,
 * spliced as `!(…)`, so the two branches partition by construction rather
 * than by a hand-kept De Morgan copy (the rationale is on the edges).
 */
const ADVANCE = `has(vars.oppRecord) && has(vars.oppRecord.stage)
  && (vars.oppRecord.stage == "prospecting" || vars.oppRecord.stage == "qualification" || vars.oppRecord.stage == "needs_analysis")
  && (!has(vars.oppRecord.approval_status) || vars.oppRecord.approval_status != "pending")`;

/** Quote Generation — screen flow to create a quote from an opportunity */
export const QuoteGenerationFlow: Flow = {
  name: 'quote_generation',
  label: 'Generate Quote from Opportunity',
  description: 'Create a quote based on opportunity details',
  type: 'screen',
  status: 'active',

  variables: [
    // MUST be `recordId` — the console's flow-action trigger contract seeds
    // only that name ({ recordId, objectName }); a custom name like
    // `opportunityId` arrives undefined.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'quoteName', type: 'text', isInput: true, isOutput: false },
    { name: 'expirationDays', type: 'number', isInput: true, isOutput: false },
    { name: 'discount', type: 'number', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_opportunity' } },
    // ─── The 立项 (qualification) gate, REQ-0006 step 11 (#2032) ─────────
    //
    // 「新增商机可跟进，立项通过后方可更新阶段、投标、赢丢单操作。」 Ruled (hotcrm-R74b
    // item 2, B): before 立项 is approved, Generate Quote REFUSES and creates
    // nothing. Steps 15 and 18 put quoting after the deal's approval too.
    //
    // Why the refusal is HERE, ahead of the form and of every writer: this
    // flow writes the quote BEFORE the stage, and a flow carries no
    // transaction (ADR-0077). With the gate armed, `opportunity_lifecycle`
    // refuses the `update_opportunity` stage write — so the run used to fail
    // AFTER `create_quote` had landed: measured on 17.7.0 as a sales_rep,
    // `FLOW_FAILED` 400 at `update_opportunity` ("This deal needs
    // qualification approval first …"), one draft quote left behind, the
    // stage unchanged. ⛔ Not #2015's keep-stage-and-quote: that lock does
    // not hold quoting, this gate does.
    //
    // The flow is the one choke point every door reaches — the record-header
    // and list-row buttons and `POST /automation/quote_generation/trigger` —
    // so the refusal lives here and `generate_quote` stays visible: hiding
    // it would leave the rep a missing button with no reason, because an
    // action's `visible` / `disabled` are bare predicates with nowhere to
    // put a sentence.
    //
    // The FILTER is the gate's reading, the one `opportunity_lifecycle`
    // applies: `pending` or `rejected` holds the deal (an approver's "no" is
    // not a release), every other value — the shipped `not_required`,
    // `approved`, none at all — does not. So `held` binds the deal only while
    // it is held, and `null` otherwise; `test/flow-quote.test.ts` pins that
    // the two answer alike, verdict by verdict.
    //
    // A read of its own, at click time. ⛔ Do not fold it into
    // `get_opportunity`: that read stays AFTER the screen so the pricing and
    // the #2015 approval branch (`e4a` / `e4b`) see the deal as it is at
    // submit. The verdict cannot drift toward held while the form is open:
    // `not_required` and `approved` are never written back to `pending`.
    { id: 'get_held', type: 'get_record', label: 'Get Held Deal', config: { objectName: 'crm_opportunity', filter: { id: cel`recordId`, qualification_approval_status: { $in: ['pending', 'rejected'] } }, outputVariable: 'held' } },
    // A first-class refusal (`EndConfigSchema` `outcome: 'refused'`): the run
    // ends `refused`, never `failed` and never parked, nothing is written,
    // and the console shows the message with Close only — no Submit and no
    // "completed" toast, which is what a message-only screen would give. It
    // names the next step the `opportunity_lifecycle` refusal of this gate
    // names.
    //
    // Translated: since 18.0.0-next.0 the `flows` translation group keys an
    // `end` node's refusal as `refusals.refuse_held.message`, which the
    // engine renders in the run's locale (at 17.7.0 it had no such key, the
    // gap raised from #2032). The console titles the dialog with the action's
    // translated label. ⛔ Do not re-route the refusal through a screen to
    // borrow a translatable title.
    { id: 'refuse_held', type: 'end', label: 'Quote Refused', config: { outcome: 'refused', message: 'Qualification approval comes first: tick Request Qualification Approval. Nothing was created.' } },
    // The Quote Name's PREFILL (#2239): the deal's own name, read ahead of
    // the form so the first Submit does not fail on an empty required field.
    // A read of its own, for the same reason `get_held` is: ⛔ do not hoist
    // `get_opportunity` ahead of the screen to serve it — the pricing and the
    // `e4a` / `e4b` branch read the deal as it is at SUBMIT, and this read is
    // only a suggestion the rep can overwrite.
    { id: 'get_deal_name', type: 'get_record', label: 'Get Deal Name', config: { objectName: 'crm_opportunity', filter: { id: cel`recordId` }, outputVariable: 'dealName' } },
    {
      id: 'screen_1', type: 'screen', label: 'Quote Details',
      config: {
        fields: [
          // Prefilled with the deal's NAME ALONE, not the seed rows' "<deal>
          // Quote": a field's `defaultValue` is a CEL envelope evaluated with
          // no locale in scope, and the `flows` translation face keys no
          // `defaultValue` slot, so an English " Quote" suffix would reach
          // every locale untranslated. `required` stays: a rep who clears the
          // box is still refused at the screen. `get_deal_name` binds `null`
          // on a miss (a deal the rep cannot read), so the read is guarded and
          // that run reaches the form empty, failing where it always did.
          { name: 'quoteName', label: 'Quote Name', type: 'text', required: true, defaultValue: cel`vars.dealName != null ? vars.dealName.name : null` },
          { name: 'expirationDays', label: 'Valid For (Days)', type: 'number', required: true, defaultValue: 30 },
          // The ceiling is a HARD block with no override
          // (`crm_quote.discount_within_ceiling`), so until it is written here
          // a rep meets the number only by having the quote refused. Both
          // strings below interpolate `QUOTE_DISCOUNT_CEILING` — imported,
          // never retyped, the same rule the two object rules follow — so the
          // hint cannot drift from the rule it describes.
          //
          // ⛔ There is deliberately NO `max`, and adding one does not work:
          // `ScreenFieldConfigSchema` is STRICT at 17.3.0 and its entire key
          // set is `name` / `label` / `type` / `required` / `options` /
          // `defaultValue` / `placeholder` / `visibleWhen`. `max` is rejected
          // BY NAME (`Unrecognized key(s) on this screen field: max`), so
          // it fails `pnpm validate` rather than quietly doing nothing, and
          // the executor forwards no such key into the `ScreenSpec` the client
          // renders. `helpText` is rejected the same way — the console's
          // dialog would render one, but no flow screen can carry it there.
          //
          // That leaves two carriers, and the label is the load-bearing one:
          // `placeholder` renders only while the input is empty and
          // `defaultValue: 0` seeds it, so it surfaces for the moment the rep
          // clears the box to type — real, but not enough on its own.
          {
            name: 'discount',
            label: `Discount % (≤ ${QUOTE_DISCOUNT_CEILING})`,
            type: 'percent',
            defaultValue: 0,
            placeholder: `0-${QUOTE_DISCOUNT_CEILING}`,
          },
        ],
      },
    },
    {
      id: 'get_opportunity', type: 'get_record', label: 'Get Opportunity',
      config: { objectName: 'crm_opportunity', filter: { id: cel`recordId` }, outputVariable: 'oppRecord' },
    },
    {
      id: 'create_quote', type: 'create_record', label: 'Create Quote',
      config: {
        objectName: 'crm_quote',
        fields: {
          name: cel`quoteName`, crm_opportunity: cel`recordId`,
          crm_account: cel`oppRecord.crm_account`, crm_contact: cel`has(oppRecord.primary_contact) ? oppRecord.primary_contact : null`,
          owner_id: cel`current_user.id`, status: 'draft',
          quote_date: cel`isoDate(today())`, expiration_date: cel`isoDate(addDays(today(), expirationDays))`,
          // `subtotal` is a bare path pass-through and needs no rounding: it
          // copies `crm_opportunity.amount` as stored and does no arithmetic,
          // so it adds no floating-point tail of its own.
          // `discount` is an optional screen answer: a resume may leave it
          // unbound, which the template wrote as nothing and the guard writes
          // as null (the quote field has no default, so the two agree).
          subtotal: cel`oppRecord.amount`, discount: cel`has(vars.discount) ? discount : null`,
          // ⛔ No `discount_amount` / `total_price` here (#2110). Both are
          // `readonly` on `crm_quote` and this flow runs as the rep, so the
          // engine's create-path strip drops them (measured on 18.0.0-next.3:
          // both stored null). `quote_workflow` derives them from the
          // `subtotal` and `discount` above, inside this same insert and to
          // whole cents (#1206): the header's one formula.
          //
          // A currency × percentage in CEL, should a flow ever need one, rounds
          // inside the expression with a DECIMAL divisor,
          // `round(x * 100.0) / 100.0`: `round()` returns an int, so `/ 100` is
          // integer division and drops the cents (#1984).
          payment_terms: 'net_30',
        },
        outputVariable: 'quoteId',
      },
    },
    {
      // Advance to `proposal` only from a PRE-proposal stage (the state machine
      // allows `→ proposal` from all three). ⛔ Never re-write `proposal` on a
      // deal already at proposal/negotiation: that is an illegal self/backward
      // transition. Those deals keep their stage; the quote is still created.
      //
      // ⛔ Nor on a deal AWAITING APPROVAL (`approval_status == "pending"`). A
      // deal of `LARGE_DEAL_AMOUNT` or more is held by `opportunity_approval`'s
      // approval node (`lockRecord: true`) until a manager decides, and the
      // lock refuses this run's stage write — the run is the rep's
      // (`runAs: 'user'`), and the lock is the approval working as intended.
      // `create_quote` has already landed by then and a flow carries no
      // transaction (ADR-0077), so the refusal used to fail the run AFTER the
      // quote existed: measured on 17.7.0, `FLOW_FAILED` 400 `RECORD_LOCKED`
      // at `update_opportunity`, the rep told the quote failed, and the draft
      // quote left standing (#2015). A deal under review keeps its stage
      // exactly like a deal already at proposal; the quote is still created —
      // the button is offered at every open stage, and a draft quote commits
      // nothing the approval is there to hold. `approval_status` is the lock's
      // own mirror (`approvalStatusField`): the approvals plugin stamps
      // `pending` when it opens the locking request and a terminal verdict
      // when it releases it.
      //
      // The predicate itself lives on edges `e4a` / `e4b` — a `decision` node's
      // singular `config.condition` is never evaluated, so a copy here would be
      // inert (17.0.0-rc.2's `flow-inert-node-condition`). The totality
      // rationale is on those edges, where the guards are.
      id: 'check_stage', type: 'decision', label: 'Can Advance to Proposal?',
    },
    {
      id: 'update_opportunity', type: 'update_record', label: 'Update Opportunity',
      config: {
        // ⛔ No `last_activity_date` write: `crm_opportunity` has no such field
        // (it lives on `crm_account`), and an unknown column fails this node.
        objectName: 'crm_opportunity', filter: { id: cel`recordId` },
        fields: { stage: 'proposal' },
      },
    },
    {
      // ADR-0012: deliver via the `notify` node (inbox + email). The legacy
      // `script` + `actionType:'email'` shape is a no-op stub in 7.4.
      id: 'notify_owner', type: 'notify', label: 'Send Notification',
      config: {
        recipients: [cel`current_user.id`],
        channels: ['inbox', 'email'],
        topic: 'quote_created',
        template: 'crm.quote_created',
        templateData: { quote_name: cel`quoteName` },
        actionUrl: '/crm_quote/{{quoteId.id}}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    // ⛔ A retired edge's id stays VACANT: `e1` (start → screen_1) is one.
    // Every surviving edge keeps its id, and a new one takes the next id after
    // the highest in use — a duplicate id is inert, so nothing would flag it.
    { id: 'e7', source: 'start', target: 'get_held', type: 'default' },
    // ── The 立项 gate (#2032) ──────────────────────────────────────────
    //
    // COMPLEMENTARY CONDITIONALS off a plain data node, not a `decision` — the
    // shape `billing-handoff-contract-activated.flow.ts` records: they are
    // evaluated one by one, and `!= null` / `== null` partition exactly.
    // `get_held` dominates both and binds `held` on every path — the row, or
    // `null` on a miss — so neither read takes a `has()` guard: the
    // get_record-dominated case `test/flow-variable-conditions.test.ts`
    // records as needing none, written like `lead_conversion`'s `e5` / `e6`.
    // Fail-OPEN like the hook: a deal the read cannot see goes on to the form
    // and fails at `create_quote` exactly as it always did.
    { id: 'e9', source: 'get_held', target: 'refuse_held', type: 'default', condition: P`vars.held != null`, label: 'Held' },
    { id: 'e10', source: 'get_held', target: 'get_deal_name', type: 'default', condition: P`vars.held == null`, label: 'Not held' },
    { id: 'e11', source: 'get_deal_name', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'get_opportunity', type: 'default' },
    { id: 'e3', source: 'get_opportunity', target: 'create_quote', type: 'default' },
    { id: 'e4', source: 'create_quote', target: 'check_stage', type: 'default' },
    // The two branches must PARTITION, so the keep side is the advance side
    // negated whole (`ADVANCE` above): `has(…) && …` advances and everything
    // else keeps. An unknown stage therefore lands on "keep stage" — the quote
    // is still created and nothing illegal is written to the state machine.
    // These EDGES are the live sites; `check_stage` carries no
    // `config.condition` at all, because the engine never evaluates one.
    //
    // TOTALITY: `oppRecord` is a `get_record` OUTPUT — `findOne` answers
    // a miss with `null`, and reading a field off it then aborts with `No such
    // key: stage`. Measured unreachable TODAY only because two neighbouring
    // schemas happen to close it: `crm_opportunity.stage` is `required` (never
    // a sparse column) and `crm_quote.crm_account` is `required`, so a null
    // `oppRecord` makes `create_quote` fail one node earlier. Both are one
    // `required: false` away from re-opening it, so the predicate carries its
    // own guard — and from 17.0.0-rc.2 an unevaluable condition aborts the step
    // instead of skipping it, so the guard is load-bearing, not
    // decorative. Note the scope is `vars.oppRecord`, not bare `oppRecord`:
    // measured, `has(oppRecord.stage)` still aborts with `Unknown variable:
    // oppRecord` when the variable is unbound, while `has(vars.oppRecord)`
    // answers `false` — only the `vars.`-scoped form is total against both
    // hazards.
    //
    // The approval term (see `check_stage`) is guarded the same way: an absent
    // or null `approval_status` is "not under approval" and advances, as it
    // did before the term existed.
    { id: 'e4a', source: 'check_stage', target: 'update_opportunity', type: 'conditional', condition: expression(ADVANCE, 'cel'), label: 'Advance' },
    { id: 'e4b', source: 'check_stage', target: 'notify_owner', type: 'conditional', condition: expression(`!(${ADVANCE})`, 'cel'), label: 'Keep stage' },
    { id: 'e5', source: 'update_opportunity', target: 'notify_owner', type: 'default' },
    { id: 'e6', source: 'notify_owner', target: 'end', type: 'default' },
  ],
};
