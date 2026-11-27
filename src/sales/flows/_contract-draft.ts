// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { expression } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { QUOTE_ACCEPTANCE_KEY } from './contract-drafted-notice.flow';
type FlowNode = Automation.Flow['nodes'][number];
type FlowEdge = Automation.Flow['edges'][number];

/**
 * The drafted contract — ONE definition for the two flows that draft it
 * (hotcrm#2558): `quote_accepted_contract_draft` (an accepted quote, when an
 * administrator switches it on; `src/revenue/flows/`) and
 * `sales_order_draft_contract_write` (Draft Contract on an order; `./`). Both
 * build their `create_record` nodes here, so "Draft Contract creates the
 * contract the automatic draft creates" holds by construction rather than by a
 * second copy. The revenue flow imports this along its edge into the app
 * package (AGENTS.md *Project Architecture* rule 2).
 *
 * This was the body of the `quote_accepted_contract_draft` hook until
 * hotcrm#2558; every note below is carried over from it.
 */

/**
 * PLACEHOLDER DEFAULTS — declared as defaults, NOT decided as business facts
 * (#1129 ruling, 2026-08-31). An auto-drafted contract is a STARTING DRAFT an
 * admin completes, not a faithful transcription of what was sold.
 * `crm_contract` requires all three, the source can express none of them, so
 * the draft has to supply something; none of it is evidence about the deal:
 *
 *   - `contract_term_months` — `required + notNull + min: 1` on the contract,
 *     and neither a quote nor an order records a term. 12 is a guess with
 *     nothing behind it;
 *   - `contract_type` — the contract declares six values (subscription /
 *     service / license / partnership / nda / msa) and NO option default, so
 *     this line is the only thing that ever picks one: every drafted contract
 *     in the app is a subscription and the other five types are unreachable
 *     on this path. It does not stay here either —
 *     `./billing-handoff-contract-activated.flow.ts` POSTs `contract_type` to
 *     billing when the contract activates;
 *   - `start_date` — the one member that is not a literal: the date of the
 *     draft (`START_DATE` below), which is not necessarily the date the
 *     customer's term begins. A placeholder RULE rather than a placeholder
 *     value.
 *
 * `end_date` is not a fourth default — it is DERIVED from the two above
 * (`addMonths`, real calendar months on the UTC calendar; a `days * 30` term
 * shorted 12 months by ~5 days), so it inherits their guesses rather than
 * adding one of its own.
 *
 * ⛔ Do not read these as decisions and do not quietly re-tune them. The
 * alternative — the quote carrying a real term and type so the draft
 * transcribes what was sold — is option A of #1129: recorded, not undertaken,
 * unfrozen only by measured evidence that real sales processes fix the term
 * and type at acceptance time. This block is then the list of values that
 * move onto `crm_quote`. Leaving them unmarked was excluded by the same
 * ruling: an unmarked hardcode is exactly how the `payment_terms` drift of
 * #873 happened.
 */
export const DRAFT_CONTRACT_DEFAULTS = {
  contract_term_months: 12,
  contract_type: 'subscription',
} as const;

/** The draft's start date, the placeholder rule above: the day it is drafted. */
const START_DATE = 'isoDate(today())';

/**
 * The four shapes of the draft. A `create_record` node writes every key it
 * names, so "the source has no opportunity" or "the source chose no payment
 * terms" — an ABSENT key in the document the engine receives, never `null` and
 * never `false` (#714, #873) — is a node of its own rather than a value:
 * absent, the contract's own `payment_terms` default applies.
 * `test/quote-accepted-lookups.test.ts` and
 * `test/quote-accepted-payment-terms.test.ts` pin both absences.
 *
 * The ids are the flows' node ids, and so the locale packs' keys:
 * `flows.<flow>.records.<id>.fields.description`.
 */
export const CONTRACT_DRAFT_VARIANTS = [
  { id: 'draft_contract', opportunity: true, terms: true },
  { id: 'draft_contract_no_terms', opportunity: true, terms: false },
  { id: 'draft_contract_no_opportunity', opportunity: false, terms: true },
  { id: 'draft_contract_bare', opportunity: false, terms: false },
] as const;

/** The node ids of the four drafts, for the locale packs. */
export const CONTRACT_DRAFT_NODE_IDS = CONTRACT_DRAFT_VARIANTS.map((v) => v.id);

/** What one flow drafts FROM: CEL paths into its source record, and its sentence. */
export interface ContractDraftSource {
  /** The CEL root the source's links and terms are read off (`record`, `vars.order`). */
  readonly root: string;
  /** CEL for the contract's value: the figure the source STORES. */
  readonly value: string;
  /**
   * CEL for the contract's name, its record title (hotcrm#2746): the source's
   * own name, which the person completing the draft may change. Each flow
   * computes it into a variable, since the fallbacks differ by source (the
   * quote's name, else its opportunity's; the order's name, else its number).
   * Never empty: `crm_contract.name` is required, and an empty one would
   * refuse the draft.
   */
  readonly name: string;
  /**
   * The contract's ONE field explaining where it came from: a text envelope
   * (`tmpl`), written in the ORGANIZATION's language (#2535) — everyone in the
   * organization reads the contract, so never the drafting person's. ⛔ Never
   * a record id: it names the source by number and name, since names may
   * repeat and `crm_contract` has no field naming a quote.
   */
  readonly description: unknown;
}

// A flow variable is led by its own `has()` (an unbound variable answers
// `false` there rather than aborting); `record` is always bound.
const present = (root: string, field: string): string =>
  `${root.startsWith('vars.') ? `has(${root}) && ` : ''}has(${root}.${field}) && ${root}.${field} != null && ${root}.${field} != ""`;

/**
 * The contract document one variant writes.
 *
 * - `name` is the source's name (`ContractDraftSource.name`), so the draft
 *   is titled like the sale it came from, not by a bare CTR- number.
 * - `owner_id` is the source's owner; a source with none is left to the
 *   engine, which stamps an elevated run's insert with the person whose act
 *   ran it (`stampSystemInsertOwner`), as the hook wrote `ctx.user.id`.
 * - `payment_terms` carries the term the customer negotiated (#873): the list
 *   is shared by quote, order and contract (`../picklists/payment_terms.picklist.ts`).
 * - `automation_key` is the mark of a drafted contract, which
 *   `contract_drafted_notice` fires on in every language, so the person whose
 *   act drafted it is told once, whichever flow drafted it. It names the
 *   automation, never the source (#1129 ruling B, #1253).
 *
 * What the draft deliberately does NOT carry (#1129 ruling, 2026-08-31) —
 * DECIDED, not overlooked: the source's shipping terms and shipping address
 * have no counterpart column on `crm_contract`; its billing address has one
 * and is left for the admin completing the draft; its description would
 * displace the provenance sentence. Copying any of them is option A and
 * unfreezes with it.
 */
const fieldsOf = (source: ContractDraftSource, variant: (typeof CONTRACT_DRAFT_VARIANTS)[number]): Record<string, unknown> => {
  const r = source.root;
  const cel = (src: string) => expression(src, 'cel');
  // The source has an owner — a CEL test, built outside the template below.
  const ownerSet = present(r, 'owner_id');
  return {
    name: cel(source.name),
    contract_term_months: DRAFT_CONTRACT_DEFAULTS.contract_term_months,
    contract_type: DRAFT_CONTRACT_DEFAULTS.contract_type,
    start_date: cel(START_DATE),
    end_date: cel(`isoDate(addMonths(today(), ${DRAFT_CONTRACT_DEFAULTS.contract_term_months}))`),
    status: 'draft',
    contract_value: cel(source.value),
    description: source.description,
    automation_key: QUOTE_ACCEPTANCE_KEY,
    crm_account: cel(`${r}.crm_account`),
    crm_contact: cel(`has(${r}.crm_contact) ? ${r}.crm_contact : null`),
    ...(variant.opportunity ? { crm_opportunity: cel(`${r}.crm_opportunity`) } : {}),
    owner_id: cel(`${ownerSet} ? ${r}.owner_id : null`),
    ...(variant.terms ? { payment_terms: cel(`${r}.payment_terms`) } : {}),
  };
};

/**
 * The draft's nodes and edges, from `from` (a node that dominates them and has
 * bound the source) to `to`: four complementary conditionals off `from`,
 * exactly one of which holds, each into its own `create_record`.
 * `outputVariable` binds the created contract, for a flow that links it.
 */
export function contractDraftGraph(
  source: ContractDraftSource,
  wiring: { from: string; to: string; firstEdge: number; outputVariable?: string },
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const hasOpportunity = present(source.root, 'crm_opportunity');
  const hasTerms = present(source.root, 'payment_terms');
  const nodes = CONTRACT_DRAFT_VARIANTS.map((variant): FlowNode => ({
    id: variant.id, type: 'create_record', label: 'Draft Contract',
    config: {
      objectName: 'crm_contract',
      fields: fieldsOf(source, variant),
      ...(wiring.outputVariable ? { outputVariable: wiring.outputVariable } : {}),
    },
  }));
  const into = CONTRACT_DRAFT_VARIANTS.map((variant, i): FlowEdge => ({
    id: `e${wiring.firstEdge + i}`, source: wiring.from, target: variant.id, type: 'conditional',
    condition: expression(
      `${variant.opportunity ? '' : '!'}(${hasOpportunity}) && ${variant.terms ? '' : '!'}(${hasTerms})`,
      'cel',
    ),
  }));
  const out = CONTRACT_DRAFT_VARIANTS.map((variant, i): FlowEdge => ({
    id: `e${wiring.firstEdge + CONTRACT_DRAFT_VARIANTS.length + i}`, source: variant.id, target: wiring.to, type: 'default',
  }));
  return { nodes, edges: [...into, ...out] };
}
