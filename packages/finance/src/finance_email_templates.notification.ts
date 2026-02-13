import { EmailTemplateSchema } from '@objectstack/spec/system';
import type { z } from 'zod';

type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

/**
 * Email sent when an invoice is issued to a customer.
 */
export const invoiceSent: EmailTemplate = EmailTemplateSchema.parse({
  id: 'invoice_sent',
  subject: 'Invoice {{invoice.number}} from {{company.name}}',
  body: [
    '<h2>Invoice Issued</h2>',
    '<p>Dear {{customer.name}},</p>',
    '<p>Please find your invoice details below:</p>',
    '<ul>',
    '  <li><strong>Invoice Number:</strong> {{invoice.number}}</li>',
    '  <li><strong>Amount Due:</strong> {{invoice.amount}}</li>',
    '  <li><strong>Due Date:</strong> {{invoice.due_date}}</li>',
    '  <li><strong>Currency:</strong> {{invoice.currency}}</li>',
    '</ul>',
    '<p>Please remit payment by the due date. Thank you for your business.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'invoice.number',
    'invoice.amount',
    'invoice.due_date',
    'invoice.currency',
    'customer.name',
    'company.name',
  ],
});

/**
 * Confirmation email sent when a payment is received.
 */
export const paymentReceived: EmailTemplate = EmailTemplateSchema.parse({
  id: 'payment_received',
  subject: 'Payment Received — {{payment.amount}} for Invoice {{invoice.number}}',
  body: [
    '<h2>Payment Confirmation</h2>',
    '<p>Dear {{customer.name}},</p>',
    '<p>We have received your payment. Details are as follows:</p>',
    '<ul>',
    '  <li><strong>Payment Amount:</strong> {{payment.amount}}</li>',
    '  <li><strong>Invoice Number:</strong> {{invoice.number}}</li>',
    '  <li><strong>Payment Date:</strong> {{payment.date}}</li>',
    '  <li><strong>Payment Method:</strong> {{payment.method}}</li>',
    '</ul>',
    '<p>Thank you for your prompt payment.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'payment.amount',
    'invoice.number',
    'payment.date',
    'payment.method',
    'customer.name',
  ],
});

/**
 * Reminder email sent when a payment is overdue.
 */
export const paymentOverdueReminder: EmailTemplate = EmailTemplateSchema.parse({
  id: 'payment_overdue_reminder',
  subject: 'Payment Overdue: Invoice {{invoice.number}} — {{invoice.amount}}',
  body: [
    '<h2>Payment Overdue Notice</h2>',
    '<p>Dear {{customer.name}},</p>',
    '<p>This is a reminder that the following invoice is past due:</p>',
    '<ul>',
    '  <li><strong>Invoice Number:</strong> {{invoice.number}}</li>',
    '  <li><strong>Amount Due:</strong> {{invoice.amount}}</li>',
    '  <li><strong>Original Due Date:</strong> {{invoice.due_date}}</li>',
    '  <li><strong>Days Overdue:</strong> {{invoice.days_overdue}}</li>',
    '</ul>',
    '<p>Please arrange payment at your earliest convenience to avoid further action.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'invoice.number',
    'invoice.amount',
    'invoice.due_date',
    'invoice.days_overdue',
    'customer.name',
  ],
});

/**
 * Monthly account statement sent to customers.
 */
export const monthlyStatement: EmailTemplate = EmailTemplateSchema.parse({
  id: 'monthly_statement',
  subject: 'Monthly Statement for {{customer.name}} — {{statement.period}}',
  body: [
    '<h2>Monthly Account Statement</h2>',
    '<p>Dear {{customer.name}},</p>',
    '<p>Please find your account summary for {{statement.period}}:</p>',
    '<ul>',
    '  <li><strong>Opening Balance:</strong> {{statement.opening_balance}}</li>',
    '  <li><strong>Total Invoiced:</strong> {{statement.total_invoiced}}</li>',
    '  <li><strong>Total Payments:</strong> {{statement.total_payments}}</li>',
    '  <li><strong>Closing Balance:</strong> {{statement.closing_balance}}</li>',
    '</ul>',
    '<p>If you have any questions, please contact your account representative.</p>',
  ].join('\n'),
  bodyType: 'html',
  variables: [
    'customer.name',
    'statement.period',
    'statement.opening_balance',
    'statement.total_invoiced',
    'statement.total_payments',
    'statement.closing_balance',
  ],
});

export const financeEmailTemplates = {
  invoiceSent,
  paymentReceived,
  paymentOverdueReminder,
  monthlyStatement,
};

export default financeEmailTemplates;
