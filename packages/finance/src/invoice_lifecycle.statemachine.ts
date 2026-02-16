// State machine configuration for invoice lifecycle
import { StateMachineSchema, type StateMachineConfig } from '@objectstack/spec/automation';

/**
 * Invoice Lifecycle State Machine
 * Manages the complete lifecycle of invoices from draft through payment or cancellation.
 */
export const InvoiceLifecycleStateMachine = {
  name: 'invoice_lifecycle',
  label: 'Invoice Lifecycle State Machine',
  object: 'invoice',
  description: 'Manages invoice states from draft creation through sending, payment, overdue tracking, and cancellation',

  initial: 'draft',

  states: [
    {
      name: 'draft',
      label: 'Draft',
      description: 'Invoice has been created but not yet sent to the customer',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'draft' },
        { type: 'fieldUpdate', field: 'created_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'sent',
          event: 'send',
          guard: 'total_amount > 0 AND account_id != NULL AND due_date != NULL',
          description: 'Send the invoice to the customer',
          actions: [
            { type: 'fieldUpdate', field: 'sent_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'invoice_sent_notification',
              recipients: ['${contact.email}'],
            },
          ],
        },
        {
          to: 'cancelled',
          event: 'cancel',
          description: 'Cancel the draft invoice',
          actions: [
            { type: 'fieldUpdate', field: 'cancelled_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'sent',
      label: 'Sent',
      description: 'Invoice has been sent to the customer and is awaiting payment',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'sent' },
        {
          type: 'taskCreation',
          subject: 'Follow up on invoice: ${invoice_number}',
          assignee: '${owner.id}',
          dueDate: 'TODAY() + 7',
          priority: 'medium',
        },
      ],
      transitions: [
        {
          to: 'paid',
          event: 'pay',
          guard: 'payment_amount >= total_amount',
          description: 'Full payment has been received',
          actions: [
            { type: 'fieldUpdate', field: 'payment_date', value: 'NOW()' },
            {
              type: 'emailAlert',
              template: 'payment_confirmation',
              recipients: ['${contact.email}'],
            },
          ],
        },
        {
          to: 'overdue',
          event: 'mark_overdue',
          guard: 'NOW() > due_date',
          description: 'Invoice has passed its due date without payment',
        },
        {
          to: 'cancelled',
          event: 'cancel',
          description: 'Cancel the sent invoice',
          actions: [
            { type: 'fieldUpdate', field: 'cancelled_reason', value: '${reason}' },
          ],
        },
        {
          to: 'draft',
          event: 'recall',
          description: 'Recall the invoice back to draft for corrections',
        },
      ],
    },
    {
      name: 'overdue',
      label: 'Overdue',
      description: 'Invoice has not been paid by the due date',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'overdue' },
        {
          type: 'emailAlert',
          template: 'invoice_overdue_reminder',
          recipients: ['${contact.email}'],
        },
        {
          type: 'taskCreation',
          subject: 'Collect overdue invoice: ${invoice_number}',
          assignee: '${owner.id}',
          dueDate: 'TODAY() + 3',
          priority: 'high',
        },
      ],
      transitions: [
        {
          to: 'paid',
          event: 'pay',
          guard: 'payment_amount >= total_amount',
          description: 'Overdue invoice has been paid',
          actions: [
            { type: 'fieldUpdate', field: 'payment_date', value: 'NOW()' },
          ],
        },
        {
          to: 'cancelled',
          event: 'cancel',
          description: 'Write off or cancel overdue invoice',
          actions: [
            { type: 'fieldUpdate', field: 'cancelled_reason', value: '${reason}' },
          ],
        },
      ],
    },
    {
      name: 'paid',
      label: 'Paid',
      description: 'Invoice has been fully paid',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'paid' },
      ],
    },
    {
      name: 'cancelled',
      label: 'Cancelled',
      description: 'Invoice has been cancelled or written off',
      type: 'final',
      onEntry: [
        { type: 'fieldUpdate', field: 'status', value: 'cancelled' },
        { type: 'fieldUpdate', field: 'cancelled_date', value: 'NOW()' },
      ],
      transitions: [
        {
          to: 'draft',
          event: 'reopen',
          guard: 'DAYS_BETWEEN(cancelled_date, NOW()) <= 30',
          description: 'Reopen a recently cancelled invoice',
        },
      ],
    },
  ],

  globalGuards: {
    hasAccount: 'account_id != NULL',
    isNotPaid: 'status != "paid"',
    isNotCancelled: 'status != "cancelled"',
  },

  events: {
    send: 'Send invoice to customer',
    pay: 'Record payment for invoice',
    mark_overdue: 'Mark invoice as overdue',
    cancel: 'Cancel the invoice',
    recall: 'Recall invoice back to draft',
    reopen: 'Reopen a cancelled invoice',
  },
};

// Spec-validated state machine definition
export const ValidatedInvoiceLifecycleStateMachine = StateMachineSchema.parse({
  id: 'invoice_lifecycle',
  initial: 'draft',
  states: {
    draft: { type: 'atomic' },
    sent: { type: 'atomic' },
    overdue: { type: 'atomic' },
    paid: { type: 'final' },
    cancelled: { type: 'final' },
  },
} satisfies StateMachineConfig);

export default InvoiceLifecycleStateMachine;
