// State machine configuration for order lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Order Lifecycle State Machine
 * Manages the complete lifecycle of orders from draft through fulfillment and invoicing.
 */
export const OrderLifecycleStateMachine = {
  name: 'order_lifecycle',
  label: 'Order Lifecycle State Machine',
  object: 'order',
  description: 'Manages order states from draft creation through submission, approval, fulfillment, and invoicing',

  initial: 'draft',

  states: [
    {
      name: 'draft',
      label: 'Draft',
      description: 'Order has been created but not yet submitted for approval',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'draft' },
        { type: 'fieldUpdate', field: 'created_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'submitted',
          event: 'submit',
          guard: 'total_amount > 0 AND account_id != NULL AND line_item_count > 0',
          description: 'Submit the order for approval',
          actions: [
            { type: 'fieldUpdate', field: 'submitted_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'order_submitted_notification',
              recipients: ['${owner.email}'],
            },
          ],
        },
        {
          to: 'cancelled',
          event: 'cancel',
          description: 'Cancel the draft order',
          actions: [
            { type: 'fieldUpdate', field: 'cancelled_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'submitted',
      label: 'Submitted',
      description: 'Order has been submitted and is pending approval',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'submitted' },
        {
          type: 'taskCreation',
          subject: 'Review order: ${order_number}',
          assignee: '${approver.id}',
          dueDate: 'TODAY() + 2',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'approved',
          event: 'approve',
          guard: 'approver_id != NULL',
          description: 'Approve the submitted order',
          actions: [
            { type: 'fieldUpdate', field: 'approved_date', value: 'NOW()' },
            { type: 'fieldUpdate', field: 'approved_by', value: '${approver.id}' },
            {
              type: 'emailAlert',
              template: 'order_approved_notification',
              recipients: ['${owner.email}', '${contact.email}'],
            },
          ],
        },
        {
          to: 'draft',
          event: 'return',
          description: 'Return the order to draft for corrections',
          actions: [
            { type: 'fieldUpdate', field: 'return_reason', value: '${reason}' },
          ],
        },
        {
          to: 'cancelled',
          event: 'cancel',
          description: 'Cancel the submitted order',
          actions: [
            { type: 'fieldUpdate', field: 'cancelled_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'approved',
      label: 'Approved',
      description: 'Order has been approved and is ready for fulfillment',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'approved' },
        {
          type: 'taskCreation',
          subject: 'Fulfill order: ${order_number}',
          assignee: '${fulfillment_team.id}',
          dueDate: 'TODAY() + 5',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'fulfilled',
          event: 'fulfill',
          guard: 'shipping_address != NULL',
          description: 'Mark the order as fulfilled',
          actions: [
            { type: 'fieldUpdate', field: 'fulfilled_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'order_fulfilled_notification',
              recipients: ['${contact.email}'],
            },
          ],
        },
        {
          to: 'cancelled',
          event: 'cancel',
          description: 'Cancel the approved order before fulfillment',
          actions: [
            { type: 'fieldUpdate', field: 'cancelled_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'fulfilled',
      label: 'Fulfilled',
      description: 'Order has been shipped or delivered to the customer',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'fulfilled' },
        {
          type: 'emailAlert',
          template: 'order_shipment_confirmation',
          recipients: ['${contact.email}'],
        },
      ],
      transitions: [
        {
          to: 'invoiced',
          event: 'invoice',
          description: 'Generate invoice for the fulfilled order',
          actions: [
            { type: 'fieldUpdate', field: 'invoiced_date', value: 'NOW()' },
          ],
        },
      ],
    },
    {
      name: 'invoiced',
      label: 'Invoiced',
      description: 'Invoice has been generated for the order',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'invoiced' },
      ],
    },
    {
      name: 'cancelled',
      label: 'Cancelled',
      description: 'Order has been cancelled',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'cancelled' },
        { type: 'fieldUpdate', field: 'cancelled_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'draft',
          event: 'reopen',
          guard: 'DAYS_BETWEEN(cancelled_date, NOW()) <= 14',
          description: 'Reopen a recently cancelled order',
        },
      ],
    },
  ],

  globalGuards: {
    hasAccount: 'account_id != NULL',
    isNotInvoiced: 'status != "invoiced"',
    isNotCancelled: 'status != "cancelled"',
  },

  events: {
    submit: 'Submit order for approval',
    approve: 'Approve the order',
    return: 'Return order to draft for corrections',
    fulfill: 'Mark order as fulfilled',
    invoice: 'Generate invoice for the order',
    cancel: 'Cancel the order',
    reopen: 'Reopen a cancelled order',
  },
};

// Spec-validated state machine definition
export const ValidatedOrderLifecycleStateMachine = StateMachineSchema.parse({
  id: 'order_lifecycle',
  initial: 'draft',
  states: {
    draft: { type: 'atomic' },
    submitted: { type: 'atomic' },
    approved: { type: 'atomic' },
    fulfilled: { type: 'atomic' },
    invoiced: { type: 'final' },
    cancelled: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default OrderLifecycleStateMachine;
