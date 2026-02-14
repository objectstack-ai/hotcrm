import type { Action } from '@objectstack/spec/ui';
import { ActionSchema } from '@objectstack/spec/ui';

/**
 * Finance Quick Actions
 * Create Invoice, Record Payment, Send Reminder
 */

export const CreateInvoiceAction = {
  name: 'create_invoice',
  label: 'Create Invoice',
  icon: 'file-plus',
  type: 'modal' as const,
  locations: ['record_header' as const, 'list_toolbar' as const],
  params: [
    { name: 'account_id', label: 'Account', type: 'lookup' as const, required: true },
    { name: 'due_date', label: 'Due Date', type: 'date' as const, required: true },
    { name: 'terms', label: 'Payment Terms', type: 'select' as const, required: false, options: [{ label: 'Net 15', value: 'net_15' }, { label: 'Net 30', value: 'net_30' }, { label: 'Net 45', value: 'net_45' }, { label: 'Net 60', value: 'net_60' }] }
  ],
  variant: 'primary' as const,
  refreshAfter: false,
  successMessage: 'Invoice created successfully'
} satisfies Action;

export const RecordPaymentAction = {
  name: 'record_payment',
  label: 'Record Payment',
  icon: 'credit-card',
  type: 'modal' as const,
  locations: ['record_header' as const],
  params: [
    { name: 'amount', label: 'Payment Amount', type: 'currency' as const, required: true },
    { name: 'payment_date', label: 'Payment Date', type: 'date' as const, required: true },
    { name: 'payment_method', label: 'Payment Method', type: 'select' as const, required: false, options: [{ label: 'Credit Card', value: 'credit_card' }, { label: 'Bank Transfer', value: 'bank_transfer' }, { label: 'Check', value: 'check' }, { label: 'Cash', value: 'cash' }] },
    { name: 'reference_number', label: 'Reference #', type: 'text' as const, required: false }
  ],
  variant: 'primary' as const,
  refreshAfter: false,
  successMessage: 'Payment recorded successfully'
} satisfies Action;

export const SendReminderAction = {
  name: 'send_reminder',
  label: 'Send Reminder',
  icon: 'bell',
  type: 'modal' as const,
  locations: ['record_header' as const, 'list_item' as const],
  params: [
    { name: 'reminder_type', label: 'Reminder Type', type: 'select' as const, required: false, options: [{ label: 'Payment Due', value: 'payment_due' }, { label: 'Overdue', value: 'overdue' }, { label: 'Final Notice', value: 'final_notice' }] },
    { name: 'message', label: 'Custom Message', type: 'textarea' as const, required: false }
  ],
  variant: 'secondary' as const,
  refreshAfter: false,
  confirmText: 'Send payment reminder to the customer?',
  successMessage: 'Reminder sent successfully'
} satisfies Action;

ActionSchema.parse(CreateInvoiceAction);
ActionSchema.parse(RecordPaymentAction);
ActionSchema.parse(SendReminderAction);

export const FinanceActions = {
  createInvoice: CreateInvoiceAction,
  recordPayment: RecordPaymentAction,
  sendReminder: SendReminderAction
};

export default FinanceActions;
