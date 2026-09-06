// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { QUOTE_DISCOUNT_CEILING } from '../objects/_thresholds';
type Flow = Automation.Flow;

/** Quote Generation — screen flow to create a quote from an opportunity */
export const QuoteGenerationFlow: Flow = {
  name: 'quote_generation',
  label: 'Generate Quote from Opportunity',
  description: 'Create a quote based on opportunity details',
  type: 'screen',
  status: 'active',

  variables: [
    // `recordId` matches the console's flow-action trigger contract
    // ({ recordId, objectName }); a custom name like `opportunityId` is never
    // seeded — same lesson as lead_conversion.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'quoteName', type: 'text', isInput: true, isOutput: false },
    { name: 'expirationDays', type: 'number', isInput: true, isOutput: false },
    { name: 'discount', type: 'number', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_opportunity' } },
    {
      id: 'screen_1', type: 'screen', label: 'Quote Details',
      config: {
        fields: [
          { name: 'quoteName', label: 'Quote Name', type: 'text', required: true },
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
      config: { objectName: 'crm_opportunity', filter: { id: '{recordId}' }, outputVariable: 'oppRecord' },
    },
    {
      id: 'create_quote', type: 'create_record', label: 'Create Quote',
      config: {
        objectName: 'crm_quote',
        fields: {
          name: '{quoteName}', crm_opportunity: '{recordId}',
          crm_account: '{oppRecord.crm_account}', crm_contact: '{oppRecord.primary_contact}',
          owner_id: '{$User.Id}', status: 'draft',
          quote_date: '{TODAY()}', expiration_date: '{TODAY() + expirationDays}',
          // `subtotal` is a bare path pass-through and needs no rounding:
          // `crm_opportunity.amount` is itself `Field.currency({ scale: 2 })`,
          // so it cannot arrive here unrounded.
          subtotal: '{oppRecord.amount}', discount: '{discount}',
          // ⛔ A currency × percentage MUST be rounded to the field's declared
          // scale inside the expression — the quote's own money fields are the
          // contract, and the flow meets it rather than handing the engine an
          // unrounded double. `discount_amount` / `total_price` are both
          // `Field.currency({ scale: 2 })`, while `discount / 100` is inexact
          // for every percentage whose hundredth is not a dyadic rational, so a
          // BARE product carries a tail the field refuses: 180,000 at 30% is
          // 125999.99999999999 and the insert is rejected with `Total Price must
          // have at most 2 decimal places (got 11)`. That made quote generation
          // depend on an arithmetic accident of amount × discount — 20% of 180K
          // worked, 30% of the same 180K did not, and the 400 never reached the
          // seller (#1206).
          //
          // `round()` is the CEL stdlib's, mirrored 1:1 into flow value
          // expressions from service-automation 17.3.0. It is INTEGER-ONLY and
          // single-argument, so N-decimal rounding is spelled `round(x * 100) /
          // 100` — the platform's own arity diagnostic names this exact pattern.
          // ⛔ Not `round(x, 2)`: there is no precision form, and it now fails
          // loudly. ⛔ Never an operator trick like `(x * 100 + 0.5 | 0) / 100`
          // either — `|0` is an int32 coercion that SILENTLY overflows above
          // ~21.5M, which on a money field is worse than the defect it dodges;
          // `round()` refuses loudly past `Number.MAX_SAFE_INTEGER` instead.
          //
          // ⭐ This shape applies ANYWHERE a flow multiplies a currency by a
          // percentage. Write the rounding, not the bare product.
          discount_amount: '{round(oppRecord.amount * (discount / 100) * 100) / 100}',
          total_price: '{round(oppRecord.amount * (1 - discount / 100) * 100) / 100}',
          payment_terms: 'net_30',
        },
        outputVariable: 'quoteId',
      },
    },
    {
      // Advance to `proposal` only from a PRE-proposal stage (the state
      // machine allows `→ proposal` from all three). Re-writing `proposal` on
      // a deal already at proposal/negotiation was an illegal self/backward
      // transition — those deals keep their stage; the quote is still created.
      //
      // The predicate itself lives on edges `e4a` / `e4b` — a `decision` node's
      // singular `config.condition` is never evaluated, so a copy here would be
      // inert (17.0.0-rc.2's `flow-inert-node-condition`, #4414). The totality
      // rationale is on those edges, where the guards are.
      id: 'check_stage', type: 'decision', label: 'Can Advance to Proposal?',
    },
    {
      id: 'update_opportunity', type: 'update_record', label: 'Update Opportunity',
      config: {
        // No `last_activity_date` write: crm_opportunity has no such field
        // (it lives on crm_account) — the unknown column made this node fail.
        objectName: 'crm_opportunity', filter: { id: '{recordId}' },
        fields: { stage: 'proposal' },
      },
    },
    {
      // ADR-0012: deliver via the `notify` node (inbox + email). The legacy
      // `script` + `actionType:'email'` shape is a no-op stub in 7.4.
      id: 'notify_owner', type: 'notify', label: 'Send Notification',
      config: {
        recipients: ['{$User.Id}'],
        channels: ['inbox', 'email'],
        topic: 'quote_created',
        title: 'Quote created: {quoteName}',
        message: 'Your quote {quoteName} has been created from this opportunity.',
        actionUrl: '/crm_quote/{quoteId.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'get_opportunity', type: 'default' },
    { id: 'e3', source: 'get_opportunity', target: 'create_quote', type: 'default' },
    { id: 'e4', source: 'create_quote', target: 'check_stage', type: 'default' },
    // The two branches must PARTITION, so the guards are written in opposite
    // polarity: `has(…) && …` on the advance side, `!has(…) || …` on the keep
    // side. An unknown stage therefore lands on "keep stage" — the quote is
    // still created and nothing illegal is written to the state machine.
    // These EDGES are the live sites; `check_stage` carries no
    // `config.condition` at all, because the engine never evaluates one.
    //
    // TOTALITY (#643): `oppRecord` is a `get_record` OUTPUT — `findOne` answers
    // a miss with `null`, and reading a field off it then aborts with `No such
    // key: stage`. Measured unreachable TODAY only because two neighbouring
    // schemas happen to close it: `crm_opportunity.stage` is `required` (never
    // a sparse column) and `crm_quote.crm_account` is `required`, so a null
    // `oppRecord` makes `create_quote` fail one node earlier. Both are one
    // `required: false` away from re-opening it, so the predicate carries its
    // own guard — and from 17.0.0-rc.2 an unevaluable condition aborts the step
    // instead of skipping it (#4775), so the guard is load-bearing, not
    // decorative. Note the scope is `vars.oppRecord`, not bare `oppRecord`:
    // measured, `has(oppRecord.stage)` still aborts with `Unknown variable:
    // oppRecord` when the variable is unbound, while `has(vars.oppRecord)`
    // answers `false` — only the `vars.`-scoped form is total against both
    // hazards.
    { id: 'e4a', source: 'check_stage', target: 'update_opportunity', type: 'conditional', condition: P`has(vars.oppRecord) && has(vars.oppRecord.stage)
      && (vars.oppRecord.stage == "prospecting" || vars.oppRecord.stage == "qualification" || vars.oppRecord.stage == "needs_analysis")`, label: 'Advance' },
    { id: 'e4b', source: 'check_stage', target: 'notify_owner', type: 'conditional', condition: P`!has(vars.oppRecord) || !has(vars.oppRecord.stage)
      || (vars.oppRecord.stage != "prospecting" && vars.oppRecord.stage != "qualification" && vars.oppRecord.stage != "needs_analysis")`, label: 'Keep stage' },
    { id: 'e5', source: 'update_opportunity', target: 'notify_owner', type: 'default' },
    { id: 'e6', source: 'notify_owner', target: 'end', type: 'default' },
  ],
};
