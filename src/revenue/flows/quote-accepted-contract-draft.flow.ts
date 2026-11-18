// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel, expression, tmpl } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { QUOTE_ACCEPTANCE_KEY } from '../../sales/flows/contract-drafted-notice.flow';
type Flow = Automation.Flow;
type FlowNode = Automation.Flow['nodes'][number];
type FlowEdge = Automation.Flow['edges'][number];

/**
 * The moment a quote becomes Accepted: an update whose new row is `accepted`
 * and whose old row was not. Shared with `quote_accepted_order`, the flow
 * beside this one, so the two fire on the same writes.
 */
export const QUOTE_ACCEPTED_NOW = P`has(record.status) && record.status == "accepted"
  && (!has(previous.status) || previous.status == null || previous.status != "accepted")`;

/**
 * PLACEHOLDER DEFAULTS — declared as defaults, NOT decided as business facts
 * (#1129 ruling, 2026-08-31). An auto-drafted contract is a STARTING DRAFT an
 * admin completes, not a faithful transcription of what was sold.
 * `crm_contract` requires all three, a quote can express none of them, so the
 * draft has to supply something; none of it is evidence about the deal:
 *
 *   - `contract_term_months` — `required + notNull + min: 1` on the contract,
 *     and the quote has nowhere to record a term. 12 is a guess with nothing
 *     behind it;
 *   - `contract_type` — the contract declares six values (subscription /
 *     service / license / partnership / nda / msa) and NO option default, so
 *     this line is the only thing that ever picks one: every auto-drafted
 *     contract in the app is a subscription and the other five types are
 *     unreachable on this path. It does not stay here either —
 *     `src/sales/flows/billing-handoff-contract-activated.flow.ts` POSTs
 *     `contract_type` to billing when the contract activates;
 *   - `start_date` — the one member that is not a literal: the date the quote
 *     happened to be ACCEPTED, which is not necessarily the date the
 *     customer's term begins. A placeholder RULE rather than a placeholder
 *     value.
 *
 * `end_date` is not a fourth default — it is DERIVED from the two above
 * (`addMonths`, real calendar months on the UTC calendar), so it inherits
 * their guesses rather than adding one of its own.
 *
 * ⛔ Do not read these as decisions and do not quietly re-tune them. The
 * alternative — the quote carrying a real term and type so the draft
 * transcribes what was sold — is option A of #1129: recorded, not undertaken,
 * unfrozen only by measured evidence that real sales processes fix the term
 * and type at acceptance time. This block is then the list of values that
 * move onto `crm_quote`. Leaving them unmarked was excluded by the same
 * ruling: an unmarked hardcode is exactly how the `payment_terms` drift of
 * #873 happened.
 *
 * Exported because the order's Draft Contract
 * (`src/sales/flows/sales-order-draft-contract.flow.ts`) drafts the same
 * contract, and `test/sales-order-draft-contract.test.ts` holds the two to it.
 * The copy there is its own (a module file may import from `src/sales/`, never
 * the other way round, AGENTS.md *Project Architecture* rule 2).
 */
export const DRAFT_CONTRACT_DEFAULTS = {
  contract_term_months: 12,
  contract_type: 'subscription',
} as const;

/**
 * The four shapes of the drafted contract. A `create_record` node writes every
 * key it names, so "the quote has no opportunity" or "the quote chose no
 * payment terms" — an ABSENT key in the document the engine receives, never
 * `null` and never `false` (#714, #873) — is a node of its own rather than a
 * value. `test/quote-accepted-lookups.test.ts` and
 * `test/quote-accepted-payment-terms.test.ts` pin both absences.
 */
const VARIANTS = [
  { id: 'draft_contract', opportunity: true, terms: true },
  { id: 'draft_contract_no_terms', opportunity: true, terms: false },
  { id: 'draft_contract_no_opportunity', opportunity: false, terms: true },
  { id: 'draft_contract_bare', opportunity: false, terms: false },
] as const;

/** The node ids of the four drafts, for the locale packs' `records` keys. */
export const CONTRACT_DRAFT_NODE_IDS = VARIANTS.map((v) => v.id);

/** The quote has an opportunity / chose payment terms — the two splits above. */
const HAS_OPPORTUNITY = `has(record.crm_opportunity) && record.crm_opportunity != null && record.crm_opportunity != ""`;
const HAS_TERMS = `has(record.payment_terms) && record.payment_terms != null && record.payment_terms != ""`;

/**
 * The contract document one variant writes.
 *
 * - `contract_value` is the total the quote STORES, read by `get_quote` after
 *   the accepting write, never the trigger's pre-image (#2503: a line can be
 *   rolled into the quote after the accept read its prior row and before it
 *   wrote, and the contract was drafted at a figure the quote's lines
 *   contradicted). After the accept the line freeze refuses every new line,
 *   so the stored total is the one the lines sum to.
 * - `owner_id` is the quote's owner; a quote with none is left to the engine,
 *   which stamps an elevated run's insert with the person who accepted
 *   (`stampSystemInsertOwner`), as the hook wrote `ctx.user.id`.
 * - `payment_terms` carries the term the customer negotiated (#873); a quote
 *   that chose none writes no key, and the contract's own default applies.
 * - `description` is the provenance sentence, TEXT in the organization's
 *   language (#2535): translated at
 *   `flows.quote_accepted_contract_draft.records.<node>.fields.description`.
 *   Everyone in the organization reads the contract, so it is never the
 *   accepting rep's language. ⛔ Never a record id: it names the quote by
 *   number and name — quote names may repeat, and `crm_contract` has no field
 *   naming the quote, so the sentence is the whole provenance record.
 * - `automation_key` is the mark of a drafted contract, which
 *   `contract_drafted_notice` fires on in every language. It names the
 *   automation, never the quote (#1129 ruling B, #1253).
 *
 * What the draft deliberately does NOT carry (#1129 ruling, 2026-08-31) —
 * DECIDED, not overlooked: `crm_quote.shipping_terms` and
 * `crm_quote.shipping_address` have no counterpart column on `crm_contract`;
 * `crm_quote.billing_address` has one and is left for the admin completing
 * the draft; the quote's `description` would displace the provenance
 * sentence. Copying any of them is option A and unfreezes with it.
 */
const contractFields = (variant: (typeof VARIANTS)[number]): Record<string, unknown> => ({
  contract_term_months: DRAFT_CONTRACT_DEFAULTS.contract_term_months,
  contract_type: DRAFT_CONTRACT_DEFAULTS.contract_type,
  start_date: cel`isoDate(today())`,
  end_date: cel`isoDate(addMonths(today(), ${DRAFT_CONTRACT_DEFAULTS.contract_term_months}))`,
  status: 'draft',
  contract_value: cel`vars.storedQuote != null && has(vars.storedQuote.total_price) && vars.storedQuote.total_price != null
    ? double(vars.storedQuote.total_price)
    : (has(record.total_price) && record.total_price != null ? double(record.total_price) : 0.0)`,
  description: tmpl`Auto-drafted from accepted quote {{ storedQuote.quote_number }} - {{ storedQuote.name }}`,
  automation_key: QUOTE_ACCEPTANCE_KEY,
  crm_account: cel`record.crm_account`,
  crm_contact: cel`has(record.crm_contact) ? record.crm_contact : null`,
  ...(variant.opportunity ? { crm_opportunity: cel`record.crm_opportunity` } : {}),
  owner_id: cel`has(record.owner_id) && record.owner_id != null && record.owner_id != "" ? record.owner_id : null`,
  ...(variant.terms ? { payment_terms: cel`record.payment_terms` } : {}),
});

/**
 * Accepted quote drafts a contract — the automatic draft, as a packaged flow an
 * administrator can switch (REQ-0010 rule 3, hotcrm#2558).
 *
 * ## Ships switched OFF
 *
 * Until hotcrm#2558 every accepted quote drafted a contract
 * (`quote_accepted_contract_draft`, an `async` hook in `quote.hook.ts`). A
 * product sale needs no contract, so an accepted quote now creates an ORDER
 * (`quote_accepted_order`), and the contract is drafted from the order on
 * demand (Draft Contract, `src/sales/actions/sales_order.actions.ts`). This
 * flow is the old automatic draft, kept whole: `defaultActive: false` ships it
 * off, and an administrator who wants every accepted quote to draft its
 * contract again switches it on (Setup → Flows → Enabled, or
 * `POST /api/v1/automation/quote_accepted_contract_draft/toggle`). The switch
 * is the installation's, in the activation ledger (`sys_metadata_activation`):
 * it survives a restart and an upgrade of this package (measured,
 * `test/quote-accepted-flow-switch.test.ts`). Switched on, it drafts exactly
 * the contract the hook drafted: every test that pinned the hook runs against
 * this flow switched on.
 *
 * ## `runAs: 'system'` (#2014)
 *
 * A sales rep holds `crm_contract.allowCreate: false`, and a rep accepting the
 * quote on their own deal is the ordinary CPQ path — so as the caller the
 * draft was refused, and the deal went `closed_won` with no contract
 * (measured on 17.7.0). The draft is the business's paperwork for a sale the
 * rep is entitled to record, not the rep authoring a contract, so this flow
 * elevates (AGENTS.md rule 9); the rep still cannot create a contract by hand.
 * Elevation is not anonymity: an elevated run carries the trigger's user, so
 * the contract's `created_by` names the person who accepted, which is who
 * `contract_drafted_notice` tells.
 *
 * Elevating as little as possible is why the close-won is NOT here: a system
 * write is not held by an approval's record lock, so elevated, an accepted
 * quote would close a deal its manager has not approved. `quote_on_accepted`
 * (the hook) keeps that write the caller's, and the two stay independent legs
 * (#714): a contract that will not draft does not decide whether the deal is
 * won. A record-change flow's failure is recorded on its run and never
 * refuses the accepting write, as the hook's `onError: 'log'` never did.
 *
 * Organization (AGENTS.md rule 10): its one read is the triggering quote by
 * id, so there is no scan to pin; its writes are inserts built from that
 * quote's links, and an elevated run carries the trigger's organization, so
 * the engine stamps `organization_id` as on the rep's own insert.
 */
export const QuoteAcceptedContractDraftFlow: Flow = {
  name: 'quote_accepted_contract_draft',
  label: 'Accepted Quote Drafts a Contract',
  description: 'When a quote is accepted, draft its contract: a 12-month subscription at the quote’s total, for an administrator to complete. Ships switched off; switch it on to draft a contract for every accepted quote.',
  type: 'record_change',
  status: 'active',
  defaultActive: false,
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start', type: 'start', label: 'Start (quote accepted)',
      config: { objectName: 'crm_quote', triggerType: 'record-after-update', condition: QUOTE_ACCEPTED_NOW },
    },
    {
      // The quote as STORED, for its total (#2503) and its number and name.
      id: 'get_quote', type: 'get_record', label: 'Get Accepted Quote',
      config: { objectName: 'crm_quote', filter: { id: cel`record.id` }, outputVariable: 'storedQuote' },
    },
    ...VARIANTS.map((variant): FlowNode => ({
      id: variant.id, type: 'create_record', label: 'Draft Contract',
      config: { objectName: 'crm_contract', fields: contractFields(variant) },
    })),
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_quote', type: 'default' },
    // Four complementary conditionals off the read, exactly one of which
    // holds: the two splits of `contractFields`, each written once.
    ...VARIANTS.map((variant, i): FlowEdge => ({
      id: `e${i + 2}`, source: 'get_quote', target: variant.id, type: 'conditional',
      condition: expression(
        `${variant.opportunity ? '' : '!'}(${HAS_OPPORTUNITY}) && ${variant.terms ? '' : '!'}(${HAS_TERMS})`,
        'cel',
      ),
    })),
    ...VARIANTS.map((variant, i): FlowEdge => ({
      id: `e${i + 6}`, source: variant.id, target: 'end', type: 'default',
    })),
  ],
};
