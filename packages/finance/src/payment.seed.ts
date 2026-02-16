/**
 * Payment Seed Data
 * Sample payments linked to invoices with various payment methods
 */

export const PaymentSeedData = [
  { payment_number: 'PAY-2025-001', invoice_number: 'INV-2025-001', amount: 27250.00, payment_date: '2025-02-10', payment_method: 'wire_transfer', status: 'completed', reference_number: 'WT-89201-ACM' },
  { payment_number: 'PAY-2025-002', invoice_number: 'INV-2025-002', amount: 52320.00, payment_date: '2025-02-28', payment_method: 'ach', status: 'completed', reference_number: 'ACH-44502-GLT' },
  { payment_number: 'PAY-2025-003', invoice_number: 'INV-2025-005', amount: 13080.00, payment_date: '2025-04-14', payment_method: 'credit_card', status: 'completed', reference_number: 'CC-77830-BPM' },
  { payment_number: 'PAY-2025-004', invoice_number: 'INV-2025-004', amount: 59950.00, payment_date: '2025-05-01', payment_method: 'check', status: 'pending', reference_number: 'CHK-11045-GLM' },
  { payment_number: 'PAY-2025-005', invoice_number: 'INV-2025-003', amount: 34880.00, payment_date: '2025-06-10', payment_method: 'wire_transfer', status: 'pending', reference_number: 'WT-92107-SFG' },
  { payment_number: 'PAY-2025-006', invoice_number: 'INV-2025-006', amount: 48500.00, payment_date: '2025-06-15', payment_method: 'ach', status: 'completed', reference_number: 'ACH-55603-NSE' },
  { payment_number: 'PAY-2025-007', invoice_number: 'INV-2025-008', amount: 15805.00, payment_date: '2025-06-18', payment_method: 'credit_card', status: 'failed', reference_number: 'CC-33210-GLT' },
  { payment_number: 'PAY-2025-008', invoice_number: 'INV-2025-006', amount: 48510.00, payment_date: '2025-07-10', payment_method: 'wire_transfer', status: 'pending', reference_number: 'WT-92301-NSE' },
];

export default PaymentSeedData;
