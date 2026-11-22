// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from '../../sales/flows/_guarded-iteration';
type Flow = Automation.Flow;
type FlowNode = Flow['nodes'][number];
type FlowEdge = Flow['edges'][number];

/**
 * An order's plan steps, invoices and payments follow the order's contract
 * (hotcrm#2724, the follow-up of hotcrm#2560; step 3 ruled B on 2026-11-22,
 * comment 7072581116).
 *
 * A plan step, an invoice or a payment that names an order takes the order's
 * contract when the record is saved (`../objects/_row-stamp.ts`). An order
 * whose contract arrives or changes afterwards — Draft Contract on the order,
 * or the Contract field edited — left the records already saved against it
 * where they were, so the contract pages counted them under the wrong contract
 * or under none (measured on `main` at `e7fe77f`: the contract read 0, 0 and
 * 0, and the order 5000, 4000 and 2500). This flow is the other half. When the
 * order's contract changes from P to N:
 *
 * - **Move.** The order's records that carry P move to N. With N empty (the
 *   order's contract cleared) they are cleared, and the next contract fills
 *   them, so "clear, then Draft Contract" ends with the drafted contract.
 * - **Fill.** With N set, the order's records that carry no contract take N.
 * - A record naming any other contract stays where it is: each read selects
 *   the order's records by the contract they carry, P or none.
 *
 * Why it is shaped this way:
 *
 * - A flow on `crm_sales_order`, not a hook: the order is the app package's
 *   object, and a module may not hook another package's object (ADR-0130 R4).
 *   A module's record-change flow on an object of the package it depends on is
 *   allowed (`docs/architecture/module-split-plan.md`, item 20, re-measured on
 *   18.5.0), as Project Delivery's flows on the expense module's report are. It
 *   lives here because what it writes is this module's: with the module
 *   disabled it is not served, and the order still works.
 * - P is the trigger's `previous` row, which the platform hands a
 *   record-after-update flow (pinned on 18.6.0 by
 *   `test/o2c-order-contract-later.test.ts`, premise (a)).
 * - Each record is written by id through the row stamp, as any save is, so the
 *   account follows the order and the refusals hold. A record the stamp refuses
 *   keeps its contract and the others still follow; the run history names the
 *   record that was skipped. The plan steps go first, then the invoices, then
 *   the payments, in both legs.
 * - `runAs: 'system'` (AGENTS.md rule 9): the person who changes the order's
 *   contract is a sales rep, who may not edit invoices or payments, and Draft
 *   Contract names the contract in a system run with no person at all. So a
 *   rep's order edit changes the contract of finance's invoices and payments,
 *   and nothing else: it writes one column, `crm_contract`, on records it
 *   finds by the order, inside the order's organization (rule 10). The column
 *   keeps history on each of the three objects.
 */
const ROWS = [
  { object: 'crm_billing_milestone', key: 'step', label: 'Plan Steps' },
  { object: 'crm_invoice', key: 'invoice', label: 'Invoices' },
  { object: 'crm_payment', key: 'payment', label: 'Payments' },
] as const;

type Leg = {
  /** Node-id prefix, and the guard key prefix. */
  leg: 'move' | 'fill';
  /** What the read's records carry: the previous contract, or none. */
  carries: unknown;
  label: string;
};

/** One object's records on the order that carry `carries`, each written to the order's contract now. */
const legNodes = ({ leg, carries, label: what }: Leg, { object, key, label }: (typeof ROWS)[number]): FlowNode[] => [
  {
    id: `${leg}_find_${key}s`,
    type: 'get_record',
    label: `Find the Order's ${label} ${what}`,
    config: {
      objectName: object,
      // The organization pin (rule 10): the order's own organization.
      filter: { crm_sales_order: cel`record.id`, crm_contract: carries, organization_id: cel`record.organization_id` },
      limit: 500,
      // One name for every read: they run one after another, and each loop
      // reads the records its own read just found.
      outputVariable: 'orderRows',
    },
  },
  {
    id: `${leg}_loop_${key}s`,
    type: 'loop',
    label: `For Each of the ${label}`,
    config: {
      collection: cel`orderRows`,
      iteratorVariable: 'orderRow',
      body: guarded(`${leg}_${key}`, {
        nodes: [
          {
            id: `${leg}_${key}`,
            type: 'update_record',
            label: 'Write the Order\'s Contract',
            config: {
              objectName: object,
              // By id, so the row stamp reads the record as it stands (the
              // predicate path, `multi: true`, would hand it no previous
              // row). The read above already chose what the record carries.
              filter: { id: cel`orderRow.id` },
              // ⛔ One column. Anything else written here would be written
              // with the elevated context. Empty on a cleared order.
              fields: { crm_contract: cel`vars.newContract == "" ? null : vars.newContract` },
            },
          },
        ],
      }),
    },
  },
];

const MOVE: FlowNode[] = ROWS.flatMap((r) => legNodes({ leg: 'move', carries: cel`vars.previousContract`, label: 'on the Previous Contract' }, r));
const FILL: FlowNode[] = ROWS.flatMap((r) => legNodes({ leg: 'fill', carries: null, label: 'With No Contract' }, r));

/** `a → b → …` as default edges. */
const chain = (ids: string[], prefix: string): FlowEdge[] =>
  ids.slice(1).map((target, i): FlowEdge => ({ id: `${prefix}${i + 1}`, source: ids[i]!, target, type: 'default' }));


export const SalesOrderContractFillFlow: Flow = {
  name: 'sales_order_contract_fill',
  label: 'Order Contract Follows to Its Rows',
  description: "When an order's contract changes, move the order's plan steps, invoices and payments that carried the previous contract to the new one (or clear them with it), and give those with none the new contract.",
  type: 'record_change',
  status: 'active',
  // Elevated on purpose (see the header): a sales rep who changes the order's
  // contract may not edit its invoices or payments, and Draft Contract names
  // the contract with no person at all. The one write is `crm_contract`, on
  // records found by the order inside its organization.
  runAs: 'system',
  variables: [
    { name: 'previousContract', type: 'text', isInput: false, isOutput: false },
    { name: 'newContract', type: 'text', isInput: false, isOutput: false },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (the order\'s contract changed)',
      config: {
        objectName: 'crm_sales_order',
        triggerType: 'record-after-update',
        // Set, changed to another or cleared: every other write to the order
        // (its lines, its status) leaves the records alone.
        // Each side is the contract id held, or "": `record` and `previous`
        // hand an absent key for an empty lookup.
        condition: P`(has(record.crm_contract) && record.crm_contract != null && record.crm_contract != "" ? string(record.crm_contract) : "") != (has(previous.crm_contract) && previous.crm_contract != null && previous.crm_contract != "" ? string(previous.crm_contract) : "")`,
      },
    },
    {
      id: 'read_contracts',
      type: 'assignment',
      label: 'Read the Previous and the New Contract',
      config: {
        assignments: {
          previousContract: cel`(has(previous.crm_contract) && previous.crm_contract != null && previous.crm_contract != "" ? string(previous.crm_contract) : "")`,
          newContract: cel`(has(record.crm_contract) && record.crm_contract != null && record.crm_contract != "" ? string(record.crm_contract) : "")`,
        },
      },
    },
    { id: 'had_contract', type: 'decision', label: 'Did the Order Have a Contract?' },
    ...MOVE,
    { id: 'has_contract', type: 'decision', label: 'Does the Order Have a Contract Now?' },
    ...FILL,
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'read_contracts', type: 'default' },
    { id: 'e2', source: 'read_contracts', target: 'had_contract', type: 'default' },
    { id: 'e3', source: 'had_contract', target: MOVE[0]!.id, type: 'default', condition: P`vars.previousContract != ""`, label: 'Move' },
    { id: 'e4', source: 'had_contract', target: 'has_contract', type: 'default', condition: P`vars.previousContract == ""`, label: 'None before' },
    ...chain([...MOVE.map((n) => n.id), 'has_contract'], 'm'),
    { id: 'e5', source: 'has_contract', target: FILL[0]!.id, type: 'default', condition: P`vars.newContract != ""`, label: 'Fill' },
    { id: 'e6', source: 'has_contract', target: 'end', type: 'default', condition: P`vars.newContract == ""`, label: 'Cleared' },
    ...chain([...FILL.map((n) => n.id), 'end'], 'f'),
  ],
};
