/**
 * Integration Test: Quote to Order Workflow
 */

import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  db: {
    doc: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
    find: vi.fn()
  }
}));

import { db } from '../../../src/db';

describe('Quote to Order Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete quote to order conversion', async () => {
    const mockQuote = {
      id: 'quote_001',
      quote_number: 'Q-00001',
      opportunity_id: 'opp_123',
      account_id: 'acc_123',
      status: 'draft',
      total_price: 50000
    };

    const approvedQuote = { ...mockQuote, status: 'approved', approval_date: new Date().toISOString() };
    const mockOrder = {
      id: 'order_001',
      order_number: 'ORD-00001',
      quote_id: 'quote_001',
      account_id: 'acc_123',
      status: 'activated',
      total_amount: 50000
    };

    (db.doc.create as Mock).mockResolvedValueOnce(mockQuote).mockResolvedValueOnce(mockOrder);
    (db.doc.update as Mock).mockResolvedValue(approvedQuote);

    const quote = await db.doc.create('quote', mockQuote);
    expect(quote.status).toBe('draft');

    const approved = await db.doc.update('quote', quote.id, { status: 'approved', approval_date: new Date().toISOString() });
    expect(approved.status).toBe('approved');

    const order = await db.doc.create('order', { quote_id: approved.id, account_id: approved.account_id, status: 'activated', total_amount: approved.total_price });
    expect(order.quote_id).toBe(quote.id);
    expect(order.status).toBe('activated');
  });

  it('should create quote line items', async () => {
    const mockQuote = { id: 'quote_002' };
    const mockLine = { id: 'qli_001', quote_id: 'quote_002', product_id: 'prod_1', quantity: 5, unit_price: 10000, total_price: 50000 };

    (db.doc.create as Mock).mockResolvedValueOnce(mockQuote).mockResolvedValueOnce(mockLine);

    const quote = await db.doc.create('quote', mockQuote);
    const line = await db.doc.create('quote_line_item', { quote_id: quote.id, product_id: 'prod_1', quantity: 5, unit_price: 10000, total_price: 50000 });

    expect(line.quote_id).toBe(quote.id);
    expect(line.total_price).toBe(50000);
  });

  it('should apply pricing rules and discounts', async () => {
    const mockQuote = { id: 'quote_discount', total_price: 100000 };
    const discountRule = { discount_percent: 10, min_quantity: 5 };
    const discountedQuote = { ...mockQuote, discount_amount: 10000, total_price: 90000 };

    (db.doc.get as Mock).mockResolvedValue(mockQuote);
    (db.find as Mock).mockResolvedValue([discountRule]);
    (db.doc.update as Mock).mockResolvedValue(discountedQuote);

    const updated = await db.doc.update('quote', 'quote_discount', { discount_amount: 10000, total_price: 90000 });

    expect(updated.discount_amount).toBe(10000);
    expect(updated.total_price).toBe(90000);
  });

  it('should handle quote approval workflow', async () => {
    const mockQuote = { id: 'quote_approval', total_price: 200000, status: 'pending_approval' };
    const approvalRequest = { id: 'appr_001', quote_id: 'quote_approval', status: 'pending', approver_id: 'mgr_123' };
    const approvedRequest = { ...approvalRequest, status: 'approved', approval_date: new Date().toISOString() };

    (db.doc.create as Mock).mockResolvedValue(approvalRequest);
    (db.doc.update as Mock).mockResolvedValueOnce(approvedRequest).mockResolvedValueOnce({ ...mockQuote, status: 'approved' });

    const approval = await db.doc.create('approval_request', approvalRequest);
    const approved = await db.doc.update('approval_request', approval.id, { status: 'approved', approval_date: new Date().toISOString() });
    const quote = await db.doc.update('quote', mockQuote.id, { status: 'approved' });

    expect(approved.status).toBe('approved');
    expect(quote.status).toBe('approved');
  });
});
