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
    { name: 'terms', label: 'Payment Terms', type: 'select' as const, options: ['net_15', 'net_30', 'net_45', 'net_60'] }
  ],
  variant: 'primary' as const,
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
    { name: 'payment_method', label: 'Payment Method', type: 'select' as const, options: ['credit_card', 'bank_transfer', 'check', 'cash'] },
    { name: 'reference_number', label: 'Reference #', type: 'text' as const }
  ],
  variant: 'primary' as const,
  successMessage: 'Payment recorded successfully'
} satisfies Action;

export const SendReminderAction = {
  name: 'send_reminder',
  label: 'Send Reminder',
  icon: 'bell',
  type: 'modal' as const,
  locations: ['record_header' as const, 'list_item' as const],
  params: [
    { name: 'reminder_type', label: 'Reminder Type', type: 'select' as const, options: ['payment_due', 'overdue', 'final_notice'] },
    { name: 'message', label: 'Custom Message', type: 'textarea' as const }
  ],
  variant: 'secondary' as const,
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
