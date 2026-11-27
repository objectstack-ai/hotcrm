// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel, tmpl } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { contractDraftGraph } from './_contract-draft';
type Flow = Automation.Flow;

/**
 * Draft Contract — the order's contract, drafted on demand (REQ-0010 rule 2,
 * hotcrm#2558).
 *
 * An accepted quote no longer drafts a contract by itself: a product sale
 * needs none. Where the sale does need one (a subscription, project services),
 * the rep opens the order and runs Draft Contract (`draft_contract`,
 * `../actions/sales_order.actions.ts`). It drafts the contract the automatic
 * draft drafts — the same type, term, defaults and field values, built by the
 * same definition (`./_contract-draft.ts`) — from the order, at the order's
 * total, and names it on the order. The button is offered only while the
 * order names no contract; an order placed under an existing framework
 * contract just names that one, and is never offered a second. A cancelled
 * order is not offered it either (hotcrm#2756): its sale is off, and a
 * contract drafted for it would be paperwork for nothing.
 *
 * ## Two flows, because only the contract insert is elevated (AGENTS.md rule 9)
 *
 * A sales rep holds `crm_contract.allowCreate: false` (#2014): the draft is
 * the business's paperwork for a sale the rep may record, not the rep
 * authoring a contract. So this screen flow runs AS THE PERSON
 * (`runAs: 'user'`) and reads the order with their own access — an order they
 * cannot open is refused here, and nothing is written — and the one write they
 * could not make is `sales_order_draft_contract_write`, a dedicated
 * `runAs: 'system'` flow called through a `subflow` node. That flow can be
 * started by no other door (objectstack#22310): only a parent's `subflow`
 * node reaches it, and this parent hands it the order it just read.
 *
 * The callee also names the contract on the order, in the same elevated run.
 * A flow carries no transaction (ADR-0077): drafted by the system and linked
 * by the person, a person who can read the order but not edit it would leave
 * a contract no order names. The action is offered only to a person who may
 * edit orders.
 *
 * ## Refused before anything is written
 *
 * Four `end` refusals, each saying that no contract was drafted: the order is
 * gone or out of reach; it is cancelled (hotcrm#2756: the button is not drawn
 * there, but a REST trigger, or a page left open while another person
 * cancelled the order, still reaches this door); it already names a contract
 * (a second click, or an order under a framework contract); it has no contact
 * — `crm_contract` requires a primary contact, which an order may leave
 * empty. Translated as `refusals.<node>.message` in the packs.
 *
 * Only Cancelled is refused by status. Draft, Confirmed and Completed orders
 * all draft, as before.
 *
 * Afterwards the run pauses on a result screen with a link to the contract,
 * and the person is also told by `contract_drafted_notice`, as for every
 * drafted contract.
 */
export const SalesOrderDraftContractFlow: Flow = {
  name: 'sales_order_draft_contract',
  label: 'Draft Contract from Order',
  description: "Draft the order's contract — an order contract at the order's total, a 12-month subscription for an administrator to complete — and name it on the order.",
  type: 'screen',
  status: 'active',
  runAs: 'user',
  variables: [
    // MUST be `recordId` — the console's flow-action trigger seeds only that
    // name ({ recordId, objectName }).
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_sales_order' } },
    {
      // As the person: an order they cannot read binds `null`.
      id: 'get_order', type: 'get_record', label: 'Get Order',
      config: { objectName: 'crm_sales_order', filter: { id: cel`recordId` }, outputVariable: 'orderRecord' },
    },
    {
      id: 'refuse_missing', type: 'end', label: 'Order Not Found',
      config: { outcome: 'refused', message: 'This order no longer exists, or you cannot open it. No contract was drafted.' },
    },
    {
      id: 'refuse_cancelled', type: 'end', label: 'Order Is Cancelled',
      config: { outcome: 'refused', message: 'This order is cancelled. No contract was drafted.' },
    },
    {
      id: 'refuse_has_contract', type: 'end', label: 'Order Already Has a Contract',
      config: { outcome: 'refused', message: 'This order already names its contract. No contract was drafted.' },
    },
    {
      id: 'refuse_no_contact', type: 'end', label: 'Order Has No Contact',
      config: { outcome: 'refused', message: 'A contract names its primary contact: add a contact to the order first. No contract was drafted.' },
    },
    {
      id: 'draft', type: 'subflow', label: 'Draft the Contract',
      config: {
        flowName: 'sales_order_draft_contract_write',
        // ⛔ Only ever the order this run just read as the person.
        input: { orderId: cel`orderRecord.id` },
        outputVariable: 'drafted',
      },
    },
    {
      id: 'result', type: 'screen', label: 'Contract Drafted',
      config: {
        description: 'A draft contract was created from order {{ orderRecord.order_number }} and named on the order. Open it to complete the term, the dates and the type.',
        fields: [
          { name: 'contractLink', label: 'Contract', type: 'record_link', reference: 'crm_contract', defaultValue: cel`drafted.contractId` },
        ],
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_order', type: 'default' },
    // Complementary conditionals off the read, exactly one of which holds:
    // missing, else cancelled, else already under a contract, else without a
    // contact, else draft. `get_order` binds the row or `null` on every path;
    // each field read is led by `has(vars.orderRecord)` and its own `has()` (a
    // raw row is sparse).
    { id: 'e2', source: 'get_order', target: 'refuse_missing', type: 'conditional', condition: P`vars.orderRecord == null`, label: 'Not found' },
    {
      id: 'e3', source: 'get_order', target: 'refuse_cancelled', type: 'conditional', label: 'Cancelled',
      condition: P`has(vars.orderRecord) && vars.orderRecord != null && has(vars.orderRecord.status) && vars.orderRecord.status == "cancelled"`,
    },
    {
      id: 'e4', source: 'get_order', target: 'refuse_has_contract', type: 'conditional', label: 'Has a contract',
      condition: P`has(vars.orderRecord) && vars.orderRecord != null && !(has(vars.orderRecord.status) && vars.orderRecord.status == "cancelled")
        && has(vars.orderRecord.crm_contract) && vars.orderRecord.crm_contract != null && vars.orderRecord.crm_contract != ""`,
    },
    {
      id: 'e5', source: 'get_order', target: 'refuse_no_contact', type: 'conditional', label: 'No contact',
      condition: P`has(vars.orderRecord) && vars.orderRecord != null && !(has(vars.orderRecord.status) && vars.orderRecord.status == "cancelled")
        && !(has(vars.orderRecord.crm_contract) && vars.orderRecord.crm_contract != null && vars.orderRecord.crm_contract != "")
        && !(has(vars.orderRecord.crm_contact) && vars.orderRecord.crm_contact != null && vars.orderRecord.crm_contact != "")`,
    },
    {
      id: 'e6', source: 'get_order', target: 'draft', type: 'conditional', label: 'Draft',
      condition: P`has(vars.orderRecord) && vars.orderRecord != null && !(has(vars.orderRecord.status) && vars.orderRecord.status == "cancelled")
        && !(has(vars.orderRecord.crm_contract) && vars.orderRecord.crm_contract != null && vars.orderRecord.crm_contract != "")
        && has(vars.orderRecord.crm_contact) && vars.orderRecord.crm_contact != null && vars.orderRecord.crm_contact != ""`,
    },
    { id: 'e7', source: 'draft', target: 'result', type: 'default' },
    { id: 'e8', source: 'result', target: 'end', type: 'default' },
  ],
};

/**
 * The elevated half of Draft Contract: the contract insert, and the order's
 * link to it. See `SalesOrderDraftContractFlow` for why it is a flow of its
 * own and why the link is here.
 *
 * The contract is the shared draft (`./_contract-draft.ts`), as an order
 * contract naming this order (`DRAFT` below): its value is the
 * order's STORED total, read here by id; its description names the order by
 * number and name, TEXT in the organization's language (#2535), translated at
 * `flows.sales_order_draft_contract_write.records.<node>.fields.description`.
 * Its `automation_key` is the drafted-contract mark, so
 * `contract_drafted_notice` tells the person who ran Draft Contract (an
 * elevated run carries them, so the contract's `created_by` names them).
 *
 * Organization (AGENTS.md rule 10): it reads one order by the id its parent
 * hands it and writes that order and one new contract; an elevated run keeps
 * the person's organization.
 *
 * It judges nothing about the order, a cancelled one included (hotcrm#2756):
 * the parent's refusals are the door. No trigger, action or REST call starts
 * this flow; only the parent's `subflow` node does, after its own refusals
 * (gone, cancelled, already under a contract, no contact) have all passed on
 * the order it read a moment before. A second set of the same conditions here
 * would be a copy to keep in step, guarding a door nothing else opens.
 */
const SHARED_DRAFT = contractDraftGraph({
  root: 'vars.orderRow',
  value: 'has(vars.orderRow.total_price) && vars.orderRow.total_price != null ? double(vars.orderRow.total_price) : 0.0',
  description: tmpl`Drafted from order {{ order }}`,
  name: 'vars.contractName',
}, { from: 'label_order', to: 'link_order', firstEdge: 2, outputVariable: 'contract' });

/**
 * The order's draft is an ORDER CONTRACT (hotcrm#2804): its form says so and
 * it names the order it came from, so its value follows that order while it
 * is a draft (`contract_form_and_change`, `../objects/contract.hook.ts`). Added
 * here, onto the shared draft's inserts, and not in `./_contract-draft.ts`:
 * the accepted quote's automatic draft builds the same inserts and has no
 * order to name, so it stays a framework contract, the form's default. Both
 * keys ride the elevated insert: a person may write neither.
 */
const DRAFT = {
  ...SHARED_DRAFT,
  nodes: SHARED_DRAFT.nodes.map((node) => node.type === 'create_record'
    ? {
      ...node,
      config: {
        ...node.config,
        fields: { ...(node.config as { fields: Record<string, unknown> }).fields, contract_form: 'order', crm_sales_order: cel`orderId` },
      },
    }
    : node),
};

export const SalesOrderDraftContractWriteFlow: Flow = {
  name: 'sales_order_draft_contract_write',
  label: 'Draft Contract from Order (write)',
  description: 'Create the drafted contract and name it on the order, using the system context. Called by sales_order_draft_contract through a subflow node.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'system',
  variables: [
    // ⛔ Only ever the order `sales_order_draft_contract` read as the person.
    { name: 'orderId', type: 'text', isInput: true, isOutput: false },
    { name: 'contractId', type: 'text', isInput: false, isOutput: true },
    // The order as the provenance sentence names it: `SO-0001 - Name`.
    { name: 'order', type: 'text', isInput: false, isOutput: false },
    // The contract's name (hotcrm#2746): the order's, which an order created
    // from a quote carries over from the quote.
    { name: 'contractName', type: 'text', isInput: false, isOutput: false },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    {
      id: 'get_order', type: 'get_record', label: 'Get Order',
      config: { objectName: 'crm_sales_order', filter: { id: cel`orderId` }, outputVariable: 'orderRow' },
    },
    {
      // Number and name, as the quote's draft names its quote; and the
      // contract's own name.
      id: 'label_order', type: 'assignment', label: 'Name the Order',
      config: {
        assignments: {
          order: cel`vars.orderRow != null && has(vars.orderRow.order_number) && vars.orderRow.order_number != null && vars.orderRow.order_number != ""
            ? string(vars.orderRow.order_number) + " - " + string(vars.orderRow.name)
            : (vars.orderRow != null && has(vars.orderRow.name) ? string(vars.orderRow.name) : "")`,
          // The order's name, else its number: a contract's name is required.
          contractName: cel`vars.orderRow != null && has(vars.orderRow.name) && vars.orderRow.name != null && vars.orderRow.name != ""
            ? string(vars.orderRow.name)
            : (vars.orderRow != null && has(vars.orderRow.order_number) && vars.orderRow.order_number != null ? string(vars.orderRow.order_number) : "")`,
        },
      },
    },
    ...DRAFT.nodes,
    {
      id: 'link_order', type: 'update_record', label: 'Name the Contract on the Order',
      config: { objectName: 'crm_sales_order', filter: { id: cel`orderId` }, fields: { crm_contract: cel`contract.id` } },
    },
    {
      id: 'set_output', type: 'assignment', label: 'Return the Contract',
      config: { assignments: { contractId: cel`contract.id` } },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_order', type: 'default' },
    { id: 'e20', source: 'get_order', target: 'label_order', type: 'default' },
    ...DRAFT.edges,
    { id: 'e100', source: 'link_order', target: 'set_output', type: 'default' },
    { id: 'e101', source: 'set_output', target: 'end', type: 'default' },
  ],
};
