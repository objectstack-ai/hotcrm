import {
  predictPaymentDefault,
  predictPaymentDate,
  detectAnomalies,
  PaymentDefaultRequest,
  PaymentDateRequest,
  AnomalyDetectionRequest
} from '../../../src/actions/invoice_prediction.action';

jest.mock('../../../src/db', () => ({
  db: {
    doc: { get: jest.fn() },
    find: jest.fn()
  }
}));

import { db } from '../../../src/db';

describe('Invoice Prediction - predictPaymentDefault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should predict default probability', async () => {
    const mockInvoice = {
      invoice_number: 'INV-001',
      amount: 50000,
      invoice_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date().toISOString(),
      status: 'Sent',
      account_id: 'acc_123'
    };

    const mockAccount = { name: 'Test Corp', annual_revenue: 5000000, industry: 'Technology' };

    (db.doc.get as jest.Mock).mockResolvedValueOnce(mockInvoice).mockResolvedValueOnce(mockAccount);
    (db.find as jest.Mock).mockResolvedValue([]);

    const result = await predictPaymentDefault({ invoiceId: 'inv_123' });

    expect(result.defaultProbability).toBeGreaterThanOrEqual(0);
    expect(result.defaultProbability).toBeLessThanOrEqual(100);
    expect(result.riskLevel).toBeDefined();
  });

  it('should analyze payment history', async () => {
    const mockInvoice = { invoice_number: 'INV-002', amount: 25000, due_date: new Date().toISOString(), status: 'Sent', account_id: 'acc_history' };
    const mockAccount = { name: 'History Corp', annual_revenue: 2000000 };
    const historicalInvoices = [
      { status: 'Paid', due_date: '2024-01-01', payment_date: '2024-01-05', amount: 10000 },
      { status: 'Paid', due_date: '2024-02-01', payment_date: '2024-02-01', amount: 15000 }
    ];

    (db.doc.get as jest.Mock).mockResolvedValueOnce(mockInvoice).mockResolvedValueOnce(mockAccount);
    (db.find as jest.Mock).mockResolvedValue(historicalInvoices);

    const result = await predictPaymentDefault({ invoiceId: 'inv_history' });

    expect(result.paymentHistory).toBeDefined();
    expect(result.paymentHistory.totalInvoices).toBeGreaterThanOrEqual(0);
  });

  it('should flag high-risk invoices', async () => {
    const mockInvoice = {
      amount: 100000,
      due_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days overdue
      status: 'Sent',
      account_id: 'acc_highrisk'
    };
    const mockAccount = { annual_revenue: 500000 };
    const badHistory = [
      { status: 'Written Off', due_date: '2023-01-01', amount: 5000 },
      { status: 'Cancelled', due_date: '2023-06-01', amount: 8000 }
    ];

    (db.doc.get as jest.Mock).mockResolvedValueOnce(mockInvoice).mockResolvedValueOnce(mockAccount);
    (db.find as jest.Mock).mockResolvedValue(badHistory);

    const result = await predictPaymentDefault({ invoiceId: 'inv_highrisk' });

    expect(result.riskLevel).toMatch(/high|critical/);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

describe('Invoice Prediction - predictPaymentDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should predict payment date', async () => {
    const mockInvoice = { due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), account_id: 'acc_date', amount: 10000 };

    (db.doc.get as jest.Mock).mockResolvedValue(mockInvoice);
    (db.find as jest.Mock).mockResolvedValue([]);

    const result = await predictPaymentDate({ invoiceId: 'inv_date' });

    expect(result.predictedDate).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.dateRange).toBeDefined();
    expect(result.dateRange.earliest).toBeDefined();
    expect(result.dateRange.latest).toBeDefined();
  });

  it('should include influencing factors', async () => {
    const mockInvoice = { due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), account_id: 'acc_factors', amount: 5000 };

    (db.doc.get as jest.Mock).mockResolvedValue(mockInvoice);
    (db.find as jest.Mock).mockResolvedValue([]);

    const result = await predictPaymentDate({ invoiceId: 'inv_factors' });

    expect(result.factors).toBeDefined();
    expect(Array.isArray(result.factors)).toBe(true);
  });
});

describe('Invoice Prediction - detectAnomalies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect invoice anomalies', async () => {
    const mockInvoice = { amount: 100000, invoice_date: new Date().toISOString(), due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), account_id: 'acc_anom' };
    const mockLines = [{ quantity: 10, unit_price: 10000, line_amount: 100000 }];

    (db.doc.get as jest.Mock).mockResolvedValue(mockInvoice);
    (db.find as jest.Mock).mockResolvedValueOnce(mockLines).mockResolvedValueOnce([{ amount: 50000 }]);

    const result = await detectAnomalies({ invoiceId: 'inv_anom' });

    expect(result.hasAnomalies).toBeDefined();
    expect(result.anomalyScore).toBeGreaterThanOrEqual(0);
    expect(result.anomalies).toBeDefined();
  });

  it('should detect calculation errors', async () => {
    const mockInvoice = { amount: 100, invoice_date: new Date().toISOString(), due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), account_id: 'acc_calc' };
    const badLines = [{ quantity: 10, unit_price: 10, line_amount: 150 }]; // Wrong calculation

    (db.doc.get as jest.Mock).mockResolvedValue(mockInvoice);
    (db.find as jest.Mock).mockResolvedValueOnce(badLines).mockResolvedValueOnce([]);

    const result = await detectAnomalies({ invoiceId: 'inv_calc' });

    expect(result.hasAnomalies).toBe(true);
    const hasCalcError = result.anomalies.some(a => a.type.includes('Calculation'));
    expect(hasCalcError).toBe(true);
  });
});
