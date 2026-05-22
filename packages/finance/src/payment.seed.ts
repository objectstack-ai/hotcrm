/**
 * Payment Seed Data
 * Sample payments linked to invoices with various payment methods
 */

export const PaymentSeedData = [
  { payment_number: 'PAY-2025-001', invoice_number: 'INV-2025-001', payment_method: 'wire_transfer', status: 'completed' },
  { payment_number: 'PAY-2025-002', invoice_number: 'INV-2025-002', payment_method: 'ach', status: 'completed' },
  { payment_number: 'PAY-2025-003', invoice_number: 'INV-2025-005', payment_method: 'credit_card', status: 'completed' },
  { payment_number: 'PAY-2025-004', invoice_number: 'INV-2025-004', payment_method: 'check', status: 'pending' },
  { payment_number: 'PAY-2025-005', invoice_number: 'INV-2025-003', payment_method: 'wire_transfer', status: 'pending' },
  { payment_number: 'PAY-2025-006', invoice_number: 'INV-2025-006', payment_method: 'ach', status: 'completed' },
  { payment_number: 'PAY-2025-007', invoice_number: 'INV-2025-008', payment_method: 'credit_card', status: 'failed' },
  { payment_number: 'PAY-2025-008', invoice_number: 'INV-2025-006', payment_method: 'wire_transfer', status: 'pending' }
];

export default PaymentSeedData;
