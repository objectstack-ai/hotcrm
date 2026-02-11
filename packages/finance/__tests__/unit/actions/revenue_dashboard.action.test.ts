import { vi, Mock } from 'vitest';

vi.mock('../../../src/db', () => ({
  broker: {
    find: vi.fn()
  }
}));

import { broker } from '../../../src/db';
import {
  calculateTCV,
  calculateARR,
  calculateQuoteToClose,
  CalculateTCVRequest,
  CalculateARRRequest,
  CalculateQuoteToCloseRequest
} from '../../../src/actions/revenue_dashboard.action';

describe('Revenue Dashboard - calculateTCV', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate total contract value summary', async () => {
    const mockContracts = [
      { contract_number: 'C-001', status: 'activated', total_value: 100000, contract_type: 'Standard', account_id: 'acc_1', created_date: new Date().toISOString() },
      { contract_number: 'C-002', status: 'draft', total_value: 50000, contract_type: 'Premium', account_id: 'acc_2', created_date: new Date().toISOString() },
    ];
    const mockAccounts = [
      { account_id: 'acc_1', name: 'Acme', industry: 'Tech', type: 'enterprise', annual_revenue: 1000000 },
      { account_id: 'acc_2', name: 'Globex', industry: 'Finance', type: 'smb', annual_revenue: 500000 },
    ];
    const mockPriorContracts: any[] = [];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockContracts)
      .mockResolvedValueOnce(mockAccounts)
      .mockResolvedValueOnce(mockPriorContracts);

    const result = await calculateTCV({});

    expect(result.summary.totalContractValue).toBe(150000);
    expect(result.summary.activeContracts).toBe(2);
    expect(result.summary.averageContractValue).toBe(75000);
  });

  it('should calculate distribution across value ranges', async () => {
    const mockContracts = [
      { contract_number: 'C-001', status: 'activated', total_value: 5000, contract_type: 'Standard', account_id: 'acc_1', created_date: new Date().toISOString() },
      { contract_number: 'C-002', status: 'activated', total_value: 75000, contract_type: 'Standard', account_id: 'acc_2', created_date: new Date().toISOString() },
      { contract_number: 'C-003', status: 'activated', total_value: 200000, contract_type: 'Premium', account_id: 'acc_3', created_date: new Date().toISOString() },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockContracts)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await calculateTCV({});

    expect(result.distribution).toBeDefined();
    expect(result.distribution.length).toBe(6);
    const under10k = result.distribution.find(d => d.range === '<$10K');
    expect(under10k!.count).toBe(1);
  });

  it('should break down by contract status', async () => {
    const mockContracts = [
      { contract_number: 'C-001', status: 'activated', total_value: 100000, contract_type: 'Standard', account_id: 'acc_1', created_date: new Date().toISOString() },
      { contract_number: 'C-002', status: 'activated', total_value: 80000, contract_type: 'Standard', account_id: 'acc_2', created_date: new Date().toISOString() },
      { contract_number: 'C-003', status: 'draft', total_value: 50000, contract_type: 'Standard', account_id: 'acc_3', created_date: new Date().toISOString() },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockContracts)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await calculateTCV({});

    expect(result.byStatus.length).toBeGreaterThan(0);
    const activated = result.byStatus.find(s => s.status === 'activated');
    expect(activated!.count).toBe(2);
    expect(activated!.totalValue).toBe(180000);
  });

  it('should filter by accountId when provided', async () => {
    (broker.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request: CalculateTCVRequest = { accountId: 'acc_123' };
    const result = await calculateTCV(request);

    expect(result.summary.activeContracts).toBe(0);
    expect(result.summary.totalContractValue).toBe(0);
    const callArgs = (broker.find as Mock).mock.calls[0];
    expect(callArgs[1].filters).toEqual(
      expect.arrayContaining([['account_id', '=', 'acc_123']])
    );
  });

  it('should calculate growth trend with prior period comparison', async () => {
    const now = new Date();
    const mockContracts = [
      { contract_number: 'C-001', status: 'activated', total_value: 200000, contract_type: 'Standard', account_id: 'acc_1', created_date: now.toISOString() },
    ];
    const mockPriorContracts = [
      { total_value: 150000 },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockContracts)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockPriorContracts);

    const result = await calculateTCV({});

    expect(result.growthTrend).toBeDefined();
    expect(result.growthTrend.priorPeriodValue).toBe(150000);
    expect(result.growthTrend.absoluteChange).toBe(result.growthTrend.currentPeriodValue - 150000);
  });
});

describe('Revenue Dashboard - calculateARR', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate ARR summary for active subscriptions', async () => {
    const now = new Date();
    const pastDate = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
    const futureDate = new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString();

    const mockContracts = [
      { contract_number: 'C-001', account_id: 'acc_1', total_value: 10000, billing_frequency: 'monthly', start_date: pastDate, end_date: futureDate, status: 'activated', created_date: pastDate },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockContracts)  // active contracts
      .mockResolvedValueOnce([])             // churned contracts
      .mockResolvedValueOnce([{ account_id: 'acc_1', name: 'Test Co' }]); // accounts

    const result = await calculateARR({});

    expect(result.summary.totalARR).toBe(120000); // 10000 * 12
    expect(result.summary.totalMRR).toBe(10000);
    expect(result.summary.activeSubscriptions).toBe(1);
  });

  it('should calculate ARR movement breakdown', async () => {
    const now = new Date();
    const pastDate = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
    const futureDate = new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString();
    const farPast = new Date(now.getFullYear() - 3, now.getMonth(), 1).toISOString();

    const mockContracts = [
      { contract_number: 'C-001', account_id: 'acc_1', total_value: 10000, billing_frequency: 'monthly', start_date: farPast, end_date: futureDate, status: 'activated', created_date: farPast },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockContracts)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ account_id: 'acc_1', name: 'Test Co' }]);

    const result = await calculateARR({});

    expect(result.movement).toBeDefined();
    expect(result.movement.beginningARR).toBeGreaterThanOrEqual(0);
    expect(result.movement.endingARR).toBe(result.summary.totalARR);
  });

  it('should handle empty dataset', async () => {
    (broker.find as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await calculateARR({});

    expect(result.summary.totalARR).toBe(0);
    expect(result.summary.activeSubscriptions).toBe(0);
    expect(result.topCustomers).toEqual([]);
  });

  it('should return monthly trend data', async () => {
    const now = new Date();
    const pastDate = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
    const futureDate = new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString();

    const mockContracts = [
      { contract_number: 'C-001', account_id: 'acc_1', total_value: 5000, billing_frequency: 'monthly', start_date: pastDate, end_date: futureDate, status: 'activated', created_date: pastDate },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockContracts)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ account_id: 'acc_1', name: 'Test' }]);

    const result = await calculateARR({ trendMonths: 6 });

    expect(result.trend.length).toBe(6);
    result.trend.forEach(t => {
      expect(t.month).toBeDefined();
      expect(t.arr).toBeGreaterThanOrEqual(0);
      expect(t.customerCount).toBeGreaterThanOrEqual(0);
    });
  });

  it('should list top customers by ARR', async () => {
    const now = new Date();
    const pastDate = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
    const futureDate = new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString();

    const mockContracts = [
      { contract_number: 'C-001', account_id: 'acc_1', total_value: 10000, billing_frequency: 'monthly', start_date: pastDate, end_date: futureDate, status: 'activated', created_date: pastDate },
      { contract_number: 'C-002', account_id: 'acc_2', total_value: 5000, billing_frequency: 'monthly', start_date: pastDate, end_date: futureDate, status: 'activated', created_date: pastDate },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockContracts)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { account_id: 'acc_1', name: 'Big Corp' },
        { account_id: 'acc_2', name: 'Small Co' },
      ]);

    const result = await calculateARR({});

    expect(result.topCustomers.length).toBe(2);
    expect(result.topCustomers[0].arr).toBeGreaterThan(result.topCustomers[1].arr);
    expect(result.topCustomers[0].accountName).toBe('Big Corp');
  });
});

describe('Revenue Dashboard - calculateQuoteToClose', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate conversion metrics', async () => {
    const now = new Date();
    const pastDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();

    const mockQuotes = [
      { quote_id: 'q1', status: 'accepted', total_amount: 50000, opportunity_id: 'opp_1', owner_id: 'rep_1', created_date: pastDate, revision_number: 1, product_id: 'p1' },
      { quote_id: 'q2', status: 'draft', total_amount: 30000, opportunity_id: 'opp_2', owner_id: 'rep_2', created_date: pastDate, revision_number: 0, product_id: 'p1' },
    ];
    const mockOpps = [
      { opportunity_id: 'opp_1', stage: 'closed_won', close_date: now.toISOString(), amount: 50000 },
      { opportunity_id: 'opp_2', stage: 'proposal', amount: 30000 },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockQuotes)   // quotes
      .mockResolvedValueOnce(mockOpps)     // opportunities
      .mockResolvedValueOnce([])           // products
      .mockResolvedValueOnce([]);          // reps

    const result = await calculateQuoteToClose({});

    expect(result.summary.totalQuotes).toBe(2);
    expect(result.summary.quotesAccepted).toBe(1);
    expect(result.summary.conversionRate).toBe(50);
  });

  it('should calculate quote funnel stages', async () => {
    const now = new Date();
    const pastDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();

    const mockQuotes = [
      { quote_id: 'q1', status: 'accepted', total_amount: 100000, opportunity_id: 'opp_1', owner_id: 'rep_1', created_date: pastDate, revision_number: 0, product_id: 'p1' },
      { quote_id: 'q2', status: 'sent', total_amount: 50000, opportunity_id: 'opp_2', owner_id: 'rep_1', created_date: pastDate, revision_number: 0, product_id: 'p1' },
      { quote_id: 'q3', status: 'draft', total_amount: 25000, opportunity_id: 'opp_3', owner_id: 'rep_2', created_date: pastDate, revision_number: 0, product_id: 'p2' },
    ];
    const mockOpps = [
      { opportunity_id: 'opp_1', stage: 'closed_won', close_date: now.toISOString(), amount: 100000 },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockQuotes)
      .mockResolvedValueOnce(mockOpps)
      .mockResolvedValueOnce([{ product_id: 'p1', name: 'Product A' }, { product_id: 'p2', name: 'Product B' }])
      .mockResolvedValueOnce([{ user_id: 'rep_1', name: 'Rep One' }, { user_id: 'rep_2', name: 'Rep Two' }]);

    const result = await calculateQuoteToClose({});

    expect(result.funnel).toBeDefined();
    expect(result.funnel.length).toBe(5);
    expect(result.funnel[0].stage).toBe('draft');
    expect(result.funnel[0].count).toBeGreaterThanOrEqual(result.funnel[result.funnel.length - 1].count);
  });

  it('should handle empty quotes dataset', async () => {
    (broker.find as Mock).mockResolvedValueOnce([]); // quotes - no further finds since empty

    const result = await calculateQuoteToClose({});

    expect(result.summary.totalQuotes).toBe(0);
    expect(result.summary.conversionRate).toBe(0);
    expect(result.summary.totalQuotedValue).toBe(0);
  });

  it('should break down win rate by value range', async () => {
    const now = new Date();
    const pastDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();

    const mockQuotes = [
      { quote_id: 'q1', status: 'accepted', total_amount: 3000, opportunity_id: 'opp_1', owner_id: 'rep_1', created_date: pastDate, revision_number: 0, product_id: 'p1' },
      { quote_id: 'q2', status: 'sent', total_amount: 200000, opportunity_id: 'opp_2', owner_id: 'rep_1', created_date: pastDate, revision_number: 0, product_id: 'p1' },
    ];
    const mockOpps = [
      { opportunity_id: 'opp_1', stage: 'closed_won', close_date: now.toISOString() },
      { opportunity_id: 'opp_2', stage: 'proposal' },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockQuotes)
      .mockResolvedValueOnce(mockOpps)
      .mockResolvedValueOnce([])  // products
      .mockResolvedValueOnce([]); // reps

    const result = await calculateQuoteToClose({});

    expect(result.byValueRange.length).toBe(5);
    const under5k = result.byValueRange.find(r => r.range === '<$5K');
    expect(under5k!.wonQuotes).toBe(1);
    expect(under5k!.winRate).toBe(100);
  });

  it('should provide revision analysis', async () => {
    const now = new Date();
    const pastDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();

    const mockQuotes = [
      { quote_id: 'q1', status: 'accepted', total_amount: 50000, opportunity_id: 'opp_1', owner_id: 'rep_1', created_date: pastDate, revision_number: 2, product_id: 'p1' },
      { quote_id: 'q2', status: 'accepted', total_amount: 30000, opportunity_id: 'opp_2', owner_id: 'rep_1', created_date: pastDate, revision_number: 1, product_id: 'p1' },
      { quote_id: 'q3', status: 'draft', total_amount: 10000, opportunity_id: 'opp_3', owner_id: 'rep_2', created_date: pastDate, revision_number: 0, product_id: 'p2' },
    ];
    const mockOpps = [
      { opportunity_id: 'opp_1', stage: 'closed_won', close_date: now.toISOString() },
      { opportunity_id: 'opp_2', stage: 'closed_won', close_date: now.toISOString() },
      { opportunity_id: 'opp_3', stage: 'proposal' },
    ];

    (broker.find as Mock)
      .mockResolvedValueOnce(mockQuotes)
      .mockResolvedValueOnce(mockOpps)
      .mockResolvedValueOnce([{ product_id: 'p1', name: 'Product A' }, { product_id: 'p2', name: 'Product B' }])
      .mockResolvedValueOnce([{ user_id: 'rep_1', name: 'Rep One' }, { user_id: 'rep_2', name: 'Rep Two' }]);

    const result = await calculateQuoteToClose({});

    expect(result.revisionAnalysis).toBeDefined();
    expect(result.revisionAnalysis.avgRevisionsBeforeClose).toBeGreaterThan(0);
    expect(result.revisionAnalysis.revisionDistribution.length).toBeGreaterThan(0);
  });
});
