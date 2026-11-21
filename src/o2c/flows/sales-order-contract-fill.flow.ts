// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from '../../sales/flows/_guarded-iteration';
type Flow = Automation.Flow;
type FlowNode = Flow['nodes'][number];
type FlowEdge = Flow['edges'][number];

/**
 * An order placed under a contract later passes the contract to its rows
 * (hotcrm#2724, the follow-up of hotcrm#2560).
 *
 * A plan step, an invoice or a payment that names an order takes the order's
 * contract when the row is saved (`../objects/_row-stamp.ts`). An order that
 * gets its contract only afterwards — Draft Contract on the order, or the
 * Contract field edited — left the rows already saved against it without one,
 * so the contract's Planned, Invoiced and Received missed them until each row
 * was saved again (measured on `main` at `e7fe77f`: the contract read 0, 0 and
 * 0, and the order 5000, 4000 and 2500). This flow is the other half: when the
 * order's contract is set, it writes that contract onto the order's rows that
 * have none.
 *
 * - A flow on `crm_sales_order`, not a hook: the order is the app package's
 *   object, and a module may not hook another package's object (ADR-0130 R4).
 *   A module's record-change flow on an object of the package it depends on is
 *   allowed (`docs/architecture/module-split-plan.md`, item 20, re-measured on
 *   18.5.0), as Project Delivery's flows on the expense module's report are. It
 *   lives here because what it writes is this module's: with the module
 *   disabled it is not served, and the order still works.
 * - Only an empty contract is filled: each read selects the order's rows
 *   with no contract, so a row that already names one keeps it.
 * - Each row is written by id through the row stamp, as any save is, so the
 *   account follows the order and the refusals hold. A row the stamp refuses
 *   (its account is not the contract's) keeps its old contract and the others
 *   still follow; the run history names the row that was skipped.
 * - `runAs: 'system'` (AGENTS.md rule 9): the person who places the order
 *   under a contract is a sales rep, who may not edit invoices or payments,
 *   and Draft Contract names the contract in a system run with no person at
 *   all. It writes one column, `crm_contract`, on rows it finds by the order,
 *   inside the order's organization (rule 10).
 * - Changing the order to another contract, or clearing it, moves no row: a
 *   row that has a contract keeps it (hotcrm#2724 step 3, measured and left
 *   open in the PR).
 */
const ROWS = [
  { object: 'crm_billing_milestone', key: 'step', label: 'Plan Steps' },
  { object: 'crm_invoice', key: 'invoice', label: 'Invoices' },
  { object: 'crm_payment', key: 'payment', label: 'Payments' },
] as const;

/** Find one object's rows on the order with no contract, and fill each. */
const fillRows = ({ object, key, label }: (typeof ROWS)[number]): FlowNode[] => [
  {
    id: `find_${key}s`,
    type: 'get_record',
    label: `Find the Order's ${label} With No Contract`,
    config: {
      objectName: object,
      // The organization pin (rule 10): the order's own organization.
      filter: { crm_sales_order: cel`record.id`, crm_contract: null, organization_id: cel`record.organization_id` },
      limit: 500,
      // One name for the three reads: they run one after another, and each
      // loop reads the rows its own read just found.
      outputVariable: 'orderRows',
    },
  },
  {
    id: `loop_${key}s`,
    type: 'loop',
    label: `For Each of the ${label}`,
    config: {
      collection: cel`orderRows`,
      iteratorVariable: 'orderRow',
      body: guarded(key, {
        nodes: [
          {
            id: `fill_${key}`,
            type: 'update_record',
            label: 'Write the Order\'s Contract',
            config: {
              objectName: object,
              // By id, so the row stamp reads the row as it stands (the
              // predicate path, `multi: true`, would hand it no previous
              // row). The read above already chose rows with no contract.
              filter: { id: cel`orderRow.id` },
              // ⛔ One column. Anything else written here would be written
              // with the elevated context.
              fields: { crm_contract: cel`record.crm_contract` },
            },
          },
        ],
      }),
    },
  },
];

const NODES: FlowNode[] = ROWS.flatMap(fillRows);
const CHAIN = ['start', ...NODES.map((n) => n.id), 'end'];

export const SalesOrderContractFillFlow: Flow = {
  name: 'sales_order_contract_fill',
  label: 'Order Contract Fills Its Rows',
  description: "When an order is placed under a contract, write that contract onto the order's plan steps, invoices and payments that have none.",
  type: 'record_change',
  status: 'active',
  // Elevated on purpose (see the header): a sales rep who places the order
  // under a contract may not edit its invoices or payments, and Draft Contract
  // names the contract with no person at all. The one write is
  // `crm_contract`, on rows found by the order inside its organization.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (order placed under a contract)',
      config: {
        objectName: 'crm_sales_order',
        triggerType: 'record-after-update',
        // The contract set or changed to another: every other write to the
        // order (its lines, its status) leaves the rows alone.
        condition: P`has(record.crm_contract) && record.crm_contract != null && record.crm_contract != "" && (!has(previous.crm_contract) || previous.crm_contract == null || previous.crm_contract != record.crm_contract)`,
      },
    },
    ...NODES,
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: CHAIN.slice(1).map((target, i): FlowEdge => ({ id: `e${i + 1}`, source: CHAIN[i]!, target, type: 'default' })),
};
