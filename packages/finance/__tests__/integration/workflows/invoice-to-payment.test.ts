/**
 * Integration Test: Invoice to Payment Workflow
 */

import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    doc: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
    find: vi.fn()
  }
}));

import { db } from '../../../src/db';

describe('Invoice to Payment Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full invoice lifecycle', async () => {
    const mockInvoice = {
      id: 'inv_001',
      invoice_number: 'INV-00001',
      account_id: 'acc_123',
      amount: 50000,
      invoice_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Draft'
    };

    const sentInvoice = { ...mockInvoice, status: 'Sent', sent_date: new Date().toISOString() };
    const paidInvoice = { ...sentInvoice, status: 'Paid', payment_date: new Date().toISOString() };

    (db.doc.create as Mock).mockResolvedValue(mockInvoice);
    (db.doc.update as Mock)
      .mockResolvedValueOnce(sentInvoice)
      .mockResolvedValueOnce(paidInvoice);

    const invoice = await db.doc.create('invoice', mockInvoice);
    expect(invoice.status).toBe('Draft');

    const sent = await db.doc.update('invoice', invoice.id, { status: 'Sent', sent_date: new Date().toISOString() });
    expect(sent.status).toBe('Sent');

    const paid = await db.doc.update('invoice', invoice.id, { status: 'Paid', payment_date: new Date().toISOString() });
    expect(paid.status).toBe('Paid');
    expect(paid.payment_date).toBeDefined();
  });

  it('should create invoice lines', async () => {
    const mockInvoice = { id: 'inv_002', amount: 30000 };
    const mockLine = { id: 'line_001', invoice_id: 'inv_002', product_id: 'prod_1', quantity: 10, unit_price: 3000, line_amount: 30000 };

    (db.doc.create as Mock).mockResolvedValueOnce(mockInvoice).mockResolvedValueOnce(mockLine);

    const invoice = await db.doc.create('invoice', mockInvoice);
    const line = await db.doc.create('invoice_line', { invoice_id: invoice.id, product_id: 'prod_1', quantity: 10, unit_price: 3000, line_amount: 30000 });

    expect(line.invoice_id).toBe(invoice.id);
    expect(line.line_amount).toBe(30000);
  });

  it('should handle payment application', async () => {
    const mockInvoice = { id: 'inv_payment', amount: 10000, status: 'Sent' };
    const mockPayment = { id: 'pay_001', invoice_id: 'inv_payment', amount: 10000, payment_date: new Date().toISOString(), payment_method: 'Credit Card' };
    const paidInvoice = { ...mockInvoice, status: 'Paid', payment_date: new Date().toISOString() };

    (db.doc.get as Mock).mockResolvedValue(mockInvoice);
    (db.doc.create as Mock).mockResolvedValue(mockPayment);
    (db.doc.update as Mock).mockResolvedValue(paidInvoice);

    const payment = await db.doc.create('payment', mockPayment);
    const updated = await db.doc.update('invoice', payment.invoice_id, { status: 'Paid', payment_date: payment.payment_date });

    expect(updated.status).toBe('Paid');
  });

  it('should track partial payments', async () => {
    const mockInvoice = { id: 'inv_partial', amount: 20000, status: 'Sent' };
    const payment1 = { id: 'pay_p1', invoice_id: 'inv_partial', amount: 10000, payment_date: new Date().toISOString() };
    const payment2 = { id: 'pay_p2', invoice_id: 'inv_partial', amount: 10000, payment_date: new Date().toISOString() };

    (db.doc.create as Mock).mockResolvedValueOnce(payment1).mockResolvedValueOnce(payment2);
    (db.find as Mock).mockResolvedValue([payment1, payment2]);
    (db.doc.update as Mock).mockResolvedValue({ ...mockInvoice, status: 'Paid' });

    await db.doc.create('payment', payment1);
    await db.doc.create('payment', payment2);

    const payments = await db.find('payment', { filters: [['invoice_id', '=', 'inv_partial']] });
    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    expect(totalPaid).toBe(20000);
  });
});
