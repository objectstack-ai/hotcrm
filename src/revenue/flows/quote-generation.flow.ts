// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, expression } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { QUOTE_DISCOUNT_CEILING } from '../../sales/objects/_thresholds';
type Flow = Automation.Flow;

/**
 * The screen's discount as a CEL double, 0 when the rep cleared the box. A
 * source FRAGMENT, spliced into both pricing envelopes with `expression()`:
 * the `P` tag JSON-quotes an interpolated string, so it cannot splice one.
 */
const DISCOUNT = '(!has(vars.discount) || isBlank(vars.discount) ? 0.0 : double(vars.discount))';

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
          // `subtotal` is a bare path pass-through and needs no rounding: it
          // copies `crm_opportunity.amount` as stored and does no arithmetic,
          // so it adds no floating-point tail of its own.
          subtotal: '{oppRecord.amount}', discount: '{discount}',
          // ⛔ A currency × percentage MUST be rounded to whole cents inside the
          // expression — the flow hands the engine a money amount, never an
          // unrounded double. `discount / 100` is inexact for every percentage
          // whose hundredth is not a dyadic rational, so a BARE product carries
          // a tail: 180,000 at 30% is 125999.99999999999. While these fields
          // declared `scale: 2` the insert was rejected for it (`Total Price
          // must have at most 2 decimal places (got 11)`, #1206). Currency
          // fields no longer declare `scale` — the platform refuses it, a
          // currency's decimals are its ISO 4217 minor unit (#1965) — so the
          // write is now ACCEPTED and the tail would be stored silently. The
          // rounding keeps `discount_amount` / `total_price` whole-cent amounts.
          //
          // Both are CEL value envelopes. CEL's `round()` is INTEGER-ONLY and
          // single-argument, and it returns an INT — so the divisor MUST be
          // the decimal `100.0`. ⛔ Never `/ 100`: in CEL int / int is integer
          // division, which silently drops the cents (1,234.56 at 10% would
          // store 123, not 123.46; `test/flow-quote.test.ts` pins it). ⛔ Not
          // `round(x, 2)` either: there is no precision form, and it fails
          // loudly. `double()` types the amount, which some drivers return as
          // a string. A cleared discount (null / absent / "") prices as 0%, as
          // it did before; the `has()` guard is what keeps that TOTAL.
          //
          // ⭐ This shape applies ANYWHERE a flow multiplies a currency by a
          // percentage. Write the rounding, not the bare product.
          discount_amount: expression(`round(double(oppRecord.amount) * (${DISCOUNT} / 100.0) * 100.0) / 100.0`, 'cel'),
          total_price: expression(`round(double(oppRecord.amount) * (1.0 - ${DISCOUNT} / 100.0) * 100.0) / 100.0`, 'cel'),
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
        template: 'crm.quote_created',
        templateData: { quote_name: '{quoteName}' },
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
    { id: 'e4a', source: 'check_stage', target: 'update_opportunity', type: 'conditional', condition: P`has(vars.oppRecord) && has(vars.oppRecord.stage)
      && (vars.oppRecord.stage == "prospecting" || vars.oppRecord.stage == "qualification" || vars.oppRecord.stage == "needs_analysis")`, label: 'Advance' },
    { id: 'e4b', source: 'check_stage', target: 'notify_owner', type: 'conditional', condition: P`!has(vars.oppRecord) || !has(vars.oppRecord.stage)
      || (vars.oppRecord.stage != "prospecting" && vars.oppRecord.stage != "qualification" && vars.oppRecord.stage != "needs_analysis")`, label: 'Keep stage' },
    { id: 'e5', source: 'update_opportunity', target: 'notify_owner', type: 'default' },
    { id: 'e6', source: 'notify_owner', target: 'end', type: 'default' },
  ],
};
