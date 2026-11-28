// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * An order confirmed with no payment plan gets one step (the 2026-11-26
 * ruling, hotcrm#2806, item 5): since overdue is measured on the payment plan,
 * an order with no plan would never show as overdue, and many reps never write
 * a plan by hand. The generated step is only the floor: it can be edited,
 * split or deleted like any other.
 *
 * When the order's Status becomes Confirmed (the Confirm Order button,
 * hotcrm#2716, writes the status the same way the form does, so both reach
 * this) and the order has no plan step yet:
 *
 * - **Amount**: the order's Total Price.
 * - **Planned date**: today plus the order's Payment Terms (Net 15 / 30 / 60 /
 *   90 days; Due on Receipt, or no terms, the same day).
 * - **Name**: the order's name, as the rep typed it (data, not text this app
 *   writes, so it is never in the wrong language).
 *
 * An order that already has a step (one the rep wrote, or one generated at an
 * earlier confirmation) gets none: moving a Confirmed order back to Draft and
 * confirming it again adds nothing. An order inserted already Confirmed (an
 * import) is not a status change and gets none. Instalments (30 % in advance,
 * 70 % on acceptance) stay the rep's to split. When the order's amount
 * changes later, `./sales-order-amount-plan-step.flow.ts` follows it.
 *
 * Why it is shaped this way:
 *
 * - A flow on `crm_sales_order`, not a hook, and here rather than in the app
 *   package: the order is the app package's object, which a module may not
 *   hook (ADR-0130 R4), and what it writes is this module's — with the module
 *   disabled it is not served, and the order still confirms
 *   (`./sales-order-contract-fill.flow.ts` is the same shape).
 * - The order is read back as stored after the confirming write (the #2503
 *   race the quote flows guard against), for its total and terms.
 * - `runAs: 'system'` (AGENTS.md rule 9): a person who may confirm an order
 *   is not always one who may write its plan (finance, an administrator's
 *   import), and the one-step check must see every step of the order. It
 *   reads the order's steps inside the order's organization (rule 10) and
 *   writes one step, through the row stamp like any save, so its account and
 *   contract follow the order.
 */
export const SalesOrderConfirmedPlanStepFlow: Flow = {
  name: 'sales_order_confirmed_plan_step',
  label: 'Confirmed Order Gets a Payment Plan',
  description: 'When an order is confirmed and has no payment plan, create one step: the order total, due today plus the order\'s payment terms.',
  type: 'record_change',
  status: 'active',
  // Elevated on purpose (see the header): the step check reads every step of
  // the order, and the person confirming may not write plans. The one write
  // is a new step on this order.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (the order became Confirmed)',
      config: {
        objectName: 'crm_sales_order',
        triggerType: 'record-after-update',
        condition: P`has(record.status) && record.status == "confirmed" && (!has(previous.status) || previous.status != "confirmed")`,
      },
    },
    {
      id: 'find_step',
      type: 'get_record',
      label: 'Does the Order Have a Payment Plan?',
      config: {
        objectName: 'crm_billing_milestone',
        // The organization pin (rule 10): the order's own organization.
        filter: { crm_sales_order: cel`record.id`, organization_id: cel`record.organization_id` },
        outputVariable: 'existingStep',
      },
    },
    {
      id: 'get_order',
      type: 'get_record',
      label: 'Get the Confirmed Order',
      config: { objectName: 'crm_sales_order', filter: { id: cel`record.id` }, outputVariable: 'storedOrder' },
    },
    {
      id: 'create_step',
      type: 'create_record',
      label: 'Create the Payment Plan Step',
      config: {
        objectName: 'crm_billing_milestone',
        fields: {
          name: cel`has(vars.storedOrder.name) && vars.storedOrder.name != null && vars.storedOrder.name != "" ? vars.storedOrder.name : string(vars.storedOrder.order_number)`,
          crm_sales_order: cel`record.id`,
          planned_amount: cel`has(vars.storedOrder.total_price) && vars.storedOrder.total_price != null ? double(vars.storedOrder.total_price) : 0.0`,
          planned_date: cel`isoDate(addDays(today(), !has(vars.storedOrder.payment_terms) || vars.storedOrder.payment_terms == null ? 0
            : vars.storedOrder.payment_terms == "net_15" ? 15
            : vars.storedOrder.payment_terms == "net_30" ? 30
            : vars.storedOrder.payment_terms == "net_60" ? 60
            : vars.storedOrder.payment_terms == "net_90" ? 90
            : 0))`,
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'find_step', type: 'default' },
    // Complementary conditionals off the read: `find_step` binds a step or
    // `null` on every path, so neither side takes a `has()` guard.
    { id: 'e2', source: 'find_step', target: 'end', type: 'conditional', condition: P`vars.existingStep != null`, label: 'Has a plan' },
    { id: 'e3', source: 'find_step', target: 'get_order', type: 'conditional', condition: P`vars.existingStep == null`, label: 'No plan' },
    { id: 'e4', source: 'get_order', target: 'create_step', type: 'default' },
    { id: 'e5', source: 'create_step', target: 'end', type: 'default' },
  ],
};
