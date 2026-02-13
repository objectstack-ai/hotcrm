import type { EmailTemplate } from '@objectstack/spec/system';
import { EmailTemplateSchema } from '@objectstack/spec/system';

/**
 * Email sent when an invoice is dispatched to a customer.
 */
export const FinanceInvoiceSentEmail = {
  id: 'finance_invoice_sent',
  subject: 'Invoice {{invoice_number}} from {{company_name}}',
  bodyType: 'html',
  body: [
    '<h2>Invoice {{invoice_number}}</h2>',
    '<p>Dear Customer,</p>',
    '<p>Please find your invoice details below.</p>',
    '<ul>',
    '  <li><strong>Invoice Number:</strong> {{invoice_number}}</li>',
    '  <li><strong>Amount Due:</strong> {{amount}}</li>',
    '  <li><strong>Due Date:</strong> {{due_date}}</li>',
    '</ul>',
    '<p>Thank you for your business.<br/>{{company_name}}</p>',
  ].join('\n'),
  variables: ['invoice_number', 'amount', 'due_date', 'company_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(FinanceInvoiceSentEmail);

/**
 * Confirmation email sent when a payment is received.
 */
export const FinancePaymentReceivedEmail = {
  id: 'finance_payment_received',
  subject: 'Payment Received for Invoice {{invoice_number}}',
  bodyType: 'html',
  body: [
    '<h2>Payment Confirmation</h2>',
    '<p>We have received your payment. Thank you!</p>',
    '<ul>',
    '  <li><strong>Invoice Number:</strong> {{invoice_number}}</li>',
    '  <li><strong>Amount Paid:</strong> {{amount}}</li>',
    '  <li><strong>Payment Method:</strong> {{payment_method}}</li>',
    '</ul>',
    '<p>This invoice is now marked as paid. No further action is required.</p>',
  ].join('\n'),
  variables: ['invoice_number', 'amount', 'payment_method'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(FinancePaymentReceivedEmail);

/**
 * Reminder sent when a payment is overdue.
 */
export const FinancePaymentOverdueEmail = {
  id: 'finance_payment_overdue',
  subject: 'Overdue: Invoice {{invoice_number}} — {{days_overdue}} days past due',
  bodyType: 'html',
  body: [
    '<h2>Payment Overdue Notice</h2>',
    '<p>Dear {{company_name}},</p>',
    '<p>Our records indicate that the following invoice remains unpaid:</p>',
    '<ul>',
    '  <li><strong>Invoice Number:</strong> {{invoice_number}}</li>',
    '  <li><strong>Amount Due:</strong> {{amount}}</li>',
    '  <li><strong>Days Overdue:</strong> {{days_overdue}}</li>',
    '</ul>',
    '<p>Please arrange payment at your earliest convenience to avoid further action.</p>',
  ].join('\n'),
  variables: ['invoice_number', 'amount', 'days_overdue', 'company_name'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(FinancePaymentOverdueEmail);

/**
 * Monthly account statement sent to customers.
 */
export const FinanceStatementEmail = {
  id: 'finance_statement',
  subject: 'Monthly Statement for {{company_name}} — {{period}}',
  bodyType: 'html',
  body: [
    '<h2>Monthly Statement</h2>',
    '<p>Dear {{company_name}},</p>',
    '<p>Please find your account statement for the period <strong>{{period}}</strong>.</p>',
    '<ul>',
    '  <li><strong>Account Number:</strong> {{account_number}}</li>',
    '  <li><strong>Total Due:</strong> {{total_due}}</li>',
    '</ul>',
    '<p>Please review and contact us if you have any questions regarding your balance.</p>',
  ].join('\n'),
  variables: ['company_name', 'period', 'total_due', 'account_number'],
} satisfies EmailTemplate;
EmailTemplateSchema.parse(FinanceStatementEmail);

export default {
  FinanceInvoiceSentEmail,
  FinancePaymentReceivedEmail,
  FinancePaymentOverdueEmail,
  FinanceStatementEmail,
};
