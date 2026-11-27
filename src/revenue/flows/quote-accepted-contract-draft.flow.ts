// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel, tmpl } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { contractDraftGraph } from '../../sales/flows/_contract-draft';
type Flow = Automation.Flow;

/**
 * The moment a quote becomes Accepted: an update whose new row is `accepted`
 * and whose old row was not. Shared with `quote_accepted_order`, the flow
 * beside this one, so the two fire on the same writes.
 */
export const QUOTE_ACCEPTED_NOW = P`has(record.status) && record.status == "accepted"
  && (!has(previous.status) || previous.status == null || previous.status != "accepted")`;

/**
 * The draft, built by the one definition both contract drafts share
 * (`src/sales/flows/_contract-draft.ts`, which carries the placeholder
 * defaults and the notes on every field):
 *
 * - `contract_value` is the total the quote STORES, read by `get_quote` after
 *   the accepting write, never the trigger's pre-image (#2503: a line can be
 *   rolled into the quote after the accept read its prior row and before it
 *   wrote, and the contract was drafted at a figure the quote's lines
 *   contradicted). After the accept the line freeze refuses every new line,
 *   so the stored total is the one the lines sum to.
 * - `description` names the quote by number and name (`label_quote`: the
 *   number is left out, with its separator, on a quote whose number is
 *   blank), TEXT in the organization's language (#2535), translated at
 *   `flows.quote_accepted_contract_draft.records.<node>.fields.description`.
 *   Quote names may repeat, and `crm_contract` has no field naming the quote,
 *   so the sentence is the whole provenance record.
 * - `name`, the contract's title (hotcrm#2746), is the quote's name, else its
 *   opportunity's (`get_opportunity`), else the quote's number: the person
 *   completing the draft may change it, and it is never empty, since a
 *   contract's name is required.
 */
const DRAFT = contractDraftGraph({
  root: 'record',
  value: `vars.storedQuote != null && has(vars.storedQuote.total_price) && vars.storedQuote.total_price != null
    ? double(vars.storedQuote.total_price)
    : (has(record.total_price) && record.total_price != null ? double(record.total_price) : 0.0)`,
  description: tmpl`Auto-drafted from accepted quote {{ quote }}`,
  name: 'vars.contractName',
}, { from: 'label_quote', to: 'find_order', firstEdge: 2, outputVariable: 'contract' });

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
 * The contract is the one Draft Contract drafts from an order
 * (`sales_order_draft_contract`): both build it with `contractDraftGraph`.
 * With the order flow on too, the quote's order is created in the same write,
 * and this flow names its contract on that order (an order belongs to at most
 * one contract), so the order does not offer Draft Contract a second time.
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
  // Elevated because a sales rep holds `crm_contract.allowCreate: false` and
  // accepting a quote on their own deal is the ordinary path (#2014): the
  // draft is the business's paperwork, not the rep authoring a contract. The
  // run carries the accepter, so `created_by` names them; the close-won stays
  // theirs in `quote_on_accepted`. The full reasoning is in the header above.
  runAs: 'system',
  variables: [
    // The quote as the provenance sentence names it: `QTE-0001 - Name`.
    { name: 'quote', type: 'text', isInput: false, isOutput: false },
    // The contract's name: the quote's, else its opportunity's (hotcrm#2746).
    { name: 'contractName', type: 'text', isInput: false, isOutput: false },
  ],
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
    {
      // The quote's opportunity, for the contract's name when the quote has
      // none. A quote with no opportunity binds `null`.
      id: 'get_opportunity', type: 'get_record', label: 'Get the Quote’s Opportunity',
      config: {
        objectName: 'crm_opportunity',
        filter: { id: cel`has(record.crm_opportunity) && record.crm_opportunity != null ? string(record.crm_opportunity) : ""` },
        outputVariable: 'quoteOpportunity',
      },
    },
    {
      // Number and name. `quote_number` is the engine's autonumber, so it is
      // read off the stored row; a quote whose number is blank is named by its
      // name alone, with no dangling separator.
      id: 'label_quote', type: 'assignment', label: 'Name the Quote',
      config: {
        assignments: {
          quote: cel`vars.storedQuote != null && has(vars.storedQuote.quote_number) && vars.storedQuote.quote_number != null && vars.storedQuote.quote_number != ""
            ? string(vars.storedQuote.quote_number) + " - " + string(vars.storedQuote.name)
            : (vars.storedQuote != null && has(vars.storedQuote.name) ? string(vars.storedQuote.name) : "")`,
          contractName: cel`vars.storedQuote != null && has(vars.storedQuote.name) && vars.storedQuote.name != null && vars.storedQuote.name != ""
            ? string(vars.storedQuote.name)
            : (has(vars.quoteOpportunity) && vars.quoteOpportunity != null && has(vars.quoteOpportunity.name) && vars.quoteOpportunity.name != null && vars.quoteOpportunity.name != ""
              ? string(vars.quoteOpportunity.name)
              : (vars.storedQuote != null && has(vars.storedQuote.quote_number) && vars.storedQuote.quote_number != null ? string(vars.storedQuote.quote_number) : ""))`,
        },
      },
    },
    ...DRAFT.nodes,
    {
      // The quote's order, which `quote_accepted_order` created in the same
      // write when it is on (it registers first, so its run comes first).
      id: 'find_order', type: 'get_record', label: 'Get the Quote’s Order',
      config: { objectName: 'crm_sales_order', filter: { crm_quote: cel`record.id` }, outputVariable: 'orderOfQuote' },
    },
    {
      // An order belongs to at most one contract: name this draft on the
      // quote's order, so the order does not offer Draft Contract again.
      id: 'link_order', type: 'update_record', label: 'Name the Contract on the Order',
      config: { objectName: 'crm_sales_order', filter: { id: cel`orderOfQuote.id` }, fields: { crm_contract: cel`contract.id` } },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_quote', type: 'default' },
    { id: 'e20', source: 'get_quote', target: 'get_opportunity', type: 'default' },
    { id: 'e21', source: 'get_opportunity', target: 'label_quote', type: 'default' },
    // Four complementary conditionals off the read, exactly one of which
    // holds: the two splits of the draft (`contractDraftGraph`).
    ...DRAFT.edges,
    // Complementary conditionals off the read: `find_order` binds the order
    // or `null` on every path.
    {
      id: 'e100', source: 'find_order', target: 'link_order', type: 'conditional', label: 'Order names no contract',
      condition: P`has(vars.orderOfQuote) && vars.orderOfQuote != null && (!has(vars.orderOfQuote.crm_contract) || vars.orderOfQuote.crm_contract == null || vars.orderOfQuote.crm_contract == "")`,
    },
    {
      id: 'e101', source: 'find_order', target: 'end', type: 'conditional', label: 'No order, or it names one',
      condition: P`!(has(vars.orderOfQuote) && vars.orderOfQuote != null && (!has(vars.orderOfQuote.crm_contract) || vars.orderOfQuote.crm_contract == null || vars.orderOfQuote.crm_contract == ""))`,
    },
    { id: 'e102', source: 'link_order', target: 'end', type: 'default' },
  ],
};
