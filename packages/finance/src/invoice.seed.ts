/**
 * Invoice Seed Data
 * Sample invoices across various statuses and payment terms
 */

export const InvoiceSeedData = [
  { invoice_number: 'INV-2025-001', account_name: 'Acme Corporation', status: 'paid', invoice_date: '2025-01-15', due_date: '2025-02-14', subtotal: 25000.00, tax_amount: 2250.00, total_amount: 27250.00, currency: 'USD', payment_terms: 'Net 30' },
  { invoice_number: 'INV-2025-002', account_name: 'GlobalTech Solutions', status: 'paid', invoice_date: '2025-02-01', due_date: '2025-03-03', subtotal: 48000.00, tax_amount: 4320.00, total_amount: 52320.00, currency: 'USD', payment_terms: 'Net 30' },
  { invoice_number: 'INV-2025-003', account_name: 'Summit Financial Group', status: 'sent', invoice_date: '2025-05-01', due_date: '2025-06-15', subtotal: 32000.00, tax_amount: 2880.00, total_amount: 34880.00, currency: 'USD', payment_terms: 'Net 45' },
  { invoice_number: 'INV-2025-004', account_name: 'GreenLeaf Manufacturing', status: 'overdue', invoice_date: '2025-03-01', due_date: '2025-04-15', subtotal: 55000.00, tax_amount: 4950.00, total_amount: 59950.00, currency: 'USD', payment_terms: 'Net 45' },
  { invoice_number: 'INV-2025-005', account_name: 'BrightPath Media', status: 'paid', invoice_date: '2025-04-01', due_date: '2025-04-16', subtotal: 12000.00, tax_amount: 1080.00, total_amount: 13080.00, currency: 'USD', payment_terms: 'Net 15' },
  { invoice_number: 'INV-2025-006', account_name: 'NovaStar Energy', status: 'sent', invoice_date: '2025-05-15', due_date: '2025-07-14', subtotal: 89000.00, tax_amount: 8010.00, total_amount: 97010.00, currency: 'USD', payment_terms: 'Net 60' },
  { invoice_number: 'INV-2025-007', account_name: 'Acme Corporation', status: 'draft', invoice_date: '2025-06-01', due_date: '2025-07-01', subtotal: 8500.00, tax_amount: 765.00, total_amount: 9265.00, currency: 'USD', payment_terms: 'Net 30' },
  { invoice_number: 'INV-2025-008', account_name: 'GlobalTech Solutions', status: 'sent', invoice_date: '2025-05-20', due_date: '2025-06-19', subtotal: 14500.00, tax_amount: 1305.00, total_amount: 15805.00, currency: 'USD', payment_terms: 'Net 30' },
  { invoice_number: 'INV-2025-009', account_name: 'Pacific Retail Holdings', status: 'cancelled', invoice_date: '2025-04-10', due_date: '2025-05-10', subtotal: 21000.00, tax_amount: 1890.00, total_amount: 22890.00, currency: 'USD', payment_terms: 'Net 30' },
  { invoice_number: 'INV-2025-010', account_name: 'Horizon Real Estate Group', status: 'draft', invoice_date: '2025-06-15', due_date: '2025-07-30', subtotal: 16500.00, tax_amount: 1485.00, total_amount: 17985.00, currency: 'USD', payment_terms: 'Net 45' },
];

export default InvoiceSeedData;
