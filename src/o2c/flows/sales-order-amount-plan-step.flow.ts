// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * The payment plan follows the order's amount, as far as it safely can (the
 * 2026-11-26 ruling, hotcrm#2806, item 5): when an order's Total Price
 * changes,
 *
 * - and the order has exactly one plan step and nothing has been received on
 *   it, that step's Planned Amount becomes the new total (the generated step,
 *   `./sales-order-confirmed-plan-step.flow.ts`, is the usual case);
 * - otherwise the plan is the rep's and is left alone: the order shows
 *   *Payment Plan Differs* while the plan's total is not the order's
 *   (`../extensions/sales-order.extension.ts`), the notice the ruling asks
 *   for.
 *
 * Shaped like the confirmation flow (see its header): a flow on the app
 * package's order, kept in this module; the order read back as stored;
 * `runAs: 'system'` with the organization pin (AGENTS.md rules 9 and 10),
 * because the person whose edit moves the total may not write plans. The one
 * write is `planned_amount` on the order's lone step.
 */
export const SalesOrderAmountPlanStepFlow: Flow = {
  name: 'sales_order_amount_plan_step',
  label: 'Payment Plan Follows the Order Amount',
  description: 'When an order\'s total changes and it has one payment plan step with nothing received, set that step\'s amount to the new total.',
  type: 'record_change',
  status: 'active',
  // Elevated on purpose (see the header): the person whose edit moves the
  // order's total may not write payment plans, and the plan must still follow.
  // The one write is the lone step's Planned Amount, found under the
  // organization pin.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (the order\'s total changed)',
      config: {
        objectName: 'crm_sales_order',
        triggerType: 'record-after-update',
        condition: P`(has(record.total_price) && record.total_price != null ? double(record.total_price) : 0.0) != (has(previous.total_price) && previous.total_price != null ? double(previous.total_price) : 0.0)`,
      },
    },
    {
      id: 'find_steps',
      type: 'get_record',
      label: 'Find the Order\'s Payment Plan',
      config: {
        objectName: 'crm_billing_milestone',
        // The organization pin (rule 10): the order's own organization. Two
        // are enough to tell "one" from "more than one".
        filter: { crm_sales_order: cel`record.id`, organization_id: cel`record.organization_id` },
        limit: 2,
        outputVariable: 'orderSteps',
      },
    },
    {
      // The lone step read on its own, so its Received can be tested with a
      // `has()` guard (a guard cannot name a list element).
      id: 'get_step',
      type: 'get_record',
      label: 'Get the Lone Step',
      config: { objectName: 'crm_billing_milestone', filter: { id: cel`vars.orderSteps[0].id` }, outputVariable: 'loneStep' },
    },
    {
      id: 'get_order',
      type: 'get_record',
      label: 'Get the Order',
      config: { objectName: 'crm_sales_order', filter: { id: cel`record.id` }, outputVariable: 'storedOrder' },
    },
    {
      id: 'update_step',
      type: 'update_record',
      label: 'Set the Step to the Order Total',
      config: {
        objectName: 'crm_billing_milestone',
        // By id, so the row stamp reads the step as it stands.
        filter: { id: cel`vars.loneStep.id` },
        // ⛔ One column, written with the elevated context.
        fields: {
          planned_amount: cel`has(vars.storedOrder.total_price) && vars.storedOrder.total_price != null ? double(vars.storedOrder.total_price) : 0.0`,
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'find_steps', type: 'default' },
    { id: 'e2', source: 'find_steps', target: 'get_step', type: 'conditional', condition: P`has(vars.orderSteps) && vars.orderSteps != null && size(vars.orderSteps) == 1`, label: 'One step' },
    { id: 'e3', source: 'find_steps', target: 'end', type: 'conditional', condition: P`!has(vars.orderSteps) || vars.orderSteps == null || size(vars.orderSteps) != 1`, label: 'None, or several' },
    {
      id: 'e6', source: 'get_step', target: 'get_order', type: 'conditional', label: 'Nothing received',
      condition: P`has(vars.loneStep) && vars.loneStep != null && (!has(vars.loneStep.received_amount) || vars.loneStep.received_amount == null || double(vars.loneStep.received_amount) == 0.0)`,
    },
    {
      id: 'e7', source: 'get_step', target: 'end', type: 'conditional', label: 'Something received',
      condition: P`!has(vars.loneStep) || vars.loneStep == null || (has(vars.loneStep.received_amount) && vars.loneStep.received_amount != null && double(vars.loneStep.received_amount) != 0.0)`,
    },
    { id: 'e4', source: 'get_order', target: 'update_step', type: 'default' },
    { id: 'e5', source: 'update_step', target: 'end', type: 'default' },
  ],
};
