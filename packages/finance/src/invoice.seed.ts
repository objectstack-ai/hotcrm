/**
 * Invoice Seed Data
 * Sample invoices across various statuses and payment terms
 */

export const InvoiceSeedData = [
  { invoice_number: 'INV-2025-001', account: 'Acme Corporation', status: 'paid', due_date: '2025-02-14', total_amount: 27250.00, payment_terms: 'net_30' },
  { invoice_number: 'INV-2025-002', account: 'GlobalTech Solutions', status: 'paid', due_date: '2025-03-03', total_amount: 52320.00, payment_terms: 'net_30' },
  { invoice_number: 'INV-2025-003', account: 'Summit Financial Group', status: 'sent', due_date: '2025-06-15', total_amount: 34880.00, payment_terms: 'net_45' },
  { invoice_number: 'INV-2025-004', account: 'GreenLeaf Manufacturing', status: 'overdue', due_date: '2025-04-15', total_amount: 59950.00, payment_terms: 'net_45' },
  { invoice_number: 'INV-2025-005', account: 'BrightPath Media', status: 'paid', due_date: '2025-04-16', total_amount: 13080.00, payment_terms: 'net_15' },
  { invoice_number: 'INV-2025-006', account: 'NovaStar Energy', status: 'sent', due_date: '2025-07-14', total_amount: 97010.00, payment_terms: 'net_60' },
  { invoice_number: 'INV-2025-007', account: 'Acme Corporation', status: 'draft', due_date: '2025-07-01', total_amount: 9265.00, payment_terms: 'net_30' },
  { invoice_number: 'INV-2025-008', account: 'GlobalTech Solutions', status: 'sent', due_date: '2025-06-19', total_amount: 15805.00, payment_terms: 'net_30' },
  { invoice_number: 'INV-2025-009', account: 'Pacific Retail Holdings', status: 'cancelled', due_date: '2025-05-10', total_amount: 22890.00, payment_terms: 'net_30' },
  { invoice_number: 'INV-2025-010', account: 'Horizon Real Estate Group', status: 'draft', due_date: '2025-07-30', total_amount: 17985.00, payment_terms: 'net_45' }
];

export default InvoiceSeedData;
