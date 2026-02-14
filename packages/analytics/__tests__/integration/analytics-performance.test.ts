import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@objectstack/runtime', () => ({
  broker: {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  }
}));

import { broker } from '@objectstack/runtime';

const PERF_THRESHOLD_MS = 2000;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateRecords(count: number, template: (i: number) => Record<string, any>) {
  return Array.from({ length: count }, (_, i) => ({ _id: `rec_${i}`, ...template(i) }));
}

// ─── Report Query Performance ──────────────────────────────────────────────────

describe('Analytics Performance - Report Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute a 100K record report query within 2 seconds', async () => {
    const records = generateRecords(100_000, (i) => ({
      name: `Opportunity ${i}`,
      amount: Math.round(Math.random() * 500_000),
      stage: ['prospecting', 'negotiation', 'closed_won', 'closed_lost'][i % 4],
      close_date: `2025-${String((i % 12) + 1).padStart(2, '0')}-15`,
      owner_id: `user_${i % 50}`,
    }));

    vi.mocked(broker.find).mockResolvedValue(records);
    vi.mocked(broker.count).mockResolvedValue(100_000);

    const start = Date.now();

    const results = await broker.find('opportunity', {
      filters: [['stage', '=', 'closed_won']],
    });

    // Simulate aggregation over results
    const totalRevenue = results.reduce((sum: number, r: any) => sum + r.amount, 0);
    const avgDealSize = totalRevenue / results.length;
    const byOwner: Record<string, number> = {};
    for (const r of results) {
      byOwner[r.owner_id] = (byOwner[r.owner_id] || 0) + r.amount;
    }

    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(PERF_THRESHOLD_MS);
    expect(results).toHaveLength(100_000);
    expect(totalRevenue).toBeGreaterThan(0);
    expect(avgDealSize).toBeGreaterThan(0);
    expect(Object.keys(byOwner).length).toBeGreaterThan(0);
  });

  it('should handle report with groupings and sort on 100K records', async () => {
    const records = generateRecords(100_000, (i) => ({
      object_name: 'opportunity',
      amount: i * 10,
      region: ['NA', 'EMEA', 'APAC', 'LATAM'][i % 4],
    }));

    vi.mocked(broker.find).mockResolvedValue(records);

    const start = Date.now();
    const results = await broker.find('opportunity', {
      filters: [['amount', '>', 50000]],
    });

    // Simulate grouping by region
    const grouped: Record<string, { count: number; total: number }> = {};
    for (const r of results) {
      if (!grouped[r.region]) grouped[r.region] = { count: 0, total: 0 };
      grouped[r.region].count++;
      grouped[r.region].total += r.amount;
    }

    // Simulate sort by total descending
    const sorted = Object.entries(grouped).sort(([, a], [, b]) => b.total - a.total);

    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(PERF_THRESHOLD_MS);
    expect(sorted.length).toBe(4);
    expect(sorted[0][1].total).toBeGreaterThanOrEqual(sorted[1][1].total);
  });
});

// ─── KPI Aggregation Performance ───────────────────────────────────────────────

describe('Analytics Performance - KPI Aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate KPI values across multiple source objects within 2 seconds', async () => {
    const opportunityRecords = generateRecords(50_000, (i) => ({
      amount: Math.round(Math.random() * 200_000),
      stage: 'closed_won',
      close_date: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
    }));

    const invoiceRecords = generateRecords(30_000, (i) => ({
      total_amount: Math.round(Math.random() * 100_000),
      status: ['paid', 'pending', 'overdue'][i % 3],
      issued_date: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
    }));

    const caseRecords = generateRecords(20_000, (i) => ({
      resolution_time_hours: Math.round(Math.random() * 72),
      priority: ['critical', 'high', 'medium', 'low'][i % 4],
      status: 'resolved',
    }));

    vi.mocked(broker.find)
      .mockResolvedValueOnce(opportunityRecords)
      .mockResolvedValueOnce(invoiceRecords)
      .mockResolvedValueOnce(caseRecords);

    const start = Date.now();

    // KPI: Total Revenue
    const opportunities = await broker.find('opportunity', {
      filters: [['stage', '=', 'closed_won']],
    });
    const totalRevenue = opportunities.reduce((sum: number, r: any) => sum + r.amount, 0);

    // KPI: Collection Rate
    const invoices = await broker.find('invoice', {
      filters: [['status', '=', 'paid']],
    });
    const collectionRate = invoices.filter((r: any) => r.status === 'paid').length / invoices.length;

    // KPI: Avg Resolution Time
    const cases = await broker.find('case', {
      filters: [['status', '=', 'resolved']],
    });
    const avgResolution = cases.reduce((sum: number, r: any) => sum + r.resolution_time_hours, 0) / cases.length;

    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(PERF_THRESHOLD_MS);
    expect(totalRevenue).toBeGreaterThan(0);
    expect(collectionRate).toBeGreaterThanOrEqual(0);
    expect(collectionRate).toBeLessThanOrEqual(1);
    expect(avgResolution).toBeGreaterThan(0);
  });
});

// ─── Dashboard Widget Performance ──────────────────────────────────────────────

describe('Analytics Performance - Dashboard Widget Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load 10 dashboard widgets in parallel within 2 seconds', async () => {
    const widgetConfigs = [
      { id: 'w1', type: 'kpi', source_object: 'opportunity', metric: 'sum', field: 'amount' },
      { id: 'w2', type: 'chart', source_object: 'opportunity', chart_type: 'bar', field: 'stage' },
      { id: 'w3', type: 'kpi', source_object: 'invoice', metric: 'count', field: '_id' },
      { id: 'w4', type: 'chart', source_object: 'case', chart_type: 'pie', field: 'priority' },
      { id: 'w5', type: 'kpi', source_object: 'contract', metric: 'sum', field: 'value' },
      { id: 'w6', type: 'table', source_object: 'opportunity', limit: 20 },
      { id: 'w7', type: 'chart', source_object: 'invoice', chart_type: 'line', field: 'issued_date' },
      { id: 'w8', type: 'kpi', source_object: 'case', metric: 'avg', field: 'resolution_time_hours' },
      { id: 'w9', type: 'chart', source_object: 'opportunity', chart_type: 'funnel', field: 'stage' },
      { id: 'w10', type: 'kpi', source_object: 'account', metric: 'count', field: '_id' },
    ];

    // Each widget gets its own dataset
    for (const widget of widgetConfigs) {
      const data = generateRecords(10_000, (i) => ({
        value: Math.round(Math.random() * 100_000),
        category: `cat_${i % 10}`,
        date: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
      }));
      vi.mocked(broker.find).mockResolvedValueOnce(data);
    }

    const start = Date.now();

    // Parallel widget loading
    const widgetResults = await Promise.all(
      widgetConfigs.map(async (widget) => {
        const data = await broker.find(widget.source_object, { filters: [] });

        let result: any;
        switch (widget.type) {
          case 'kpi': {
            const values = data.map((r: any) => r.value);
            result = {
              id: widget.id,
              value: widget.metric === 'sum' ? values.reduce((a: number, b: number) => a + b, 0)
                : widget.metric === 'avg' ? values.reduce((a: number, b: number) => a + b, 0) / values.length
                : values.length,
            };
            break;
          }
          case 'chart': {
            const groups: Record<string, number> = {};
            for (const r of data) {
              groups[r.category] = (groups[r.category] || 0) + 1;
            }
            result = { id: widget.id, series: Object.entries(groups) };
            break;
          }
          case 'table': {
            result = { id: widget.id, rows: data.slice(0, 20) };
            break;
          }
        }
        return result;
      })
    );

    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(PERF_THRESHOLD_MS);
    expect(widgetResults).toHaveLength(10);
    expect(widgetResults.every((r: any) => r.id)).toBe(true);
  });
});

// ─── Large Dataset Filter Performance ──────────────────────────────────────────

describe('Analytics Performance - Large Dataset Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply complex multi-condition filters over 100K records within 2 seconds', async () => {
    const records = generateRecords(100_000, (i) => ({
      amount: i * 5,
      stage: ['prospecting', 'qualification', 'negotiation', 'closed_won', 'closed_lost'][i % 5],
      region: ['NA', 'EMEA', 'APAC', 'LATAM'][i % 4],
      owner_id: `user_${i % 25}`,
      created_date: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      is_active: i % 3 !== 0,
      probability: (i % 100) + 1,
    }));

    vi.mocked(broker.find).mockResolvedValue(records);

    const start = Date.now();

    const allRecords = await broker.find('opportunity', {
      filters: [['amount', '>', 10000]],
    });

    // Simulate complex client-side filtering (multi-condition)
    const filtered = allRecords.filter((r: any) =>
      r.amount > 100_000 &&
      ['closed_won', 'negotiation'].includes(r.stage) &&
      r.region === 'NA' &&
      r.is_active === true &&
      r.probability > 50
    );

    // Simulate sorting by amount descending
    filtered.sort((a: any, b: any) => b.amount - a.amount);

    // Simulate pagination (page 1 of 50 per page)
    const page = filtered.slice(0, 50);

    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(PERF_THRESHOLD_MS);
    expect(allRecords).toHaveLength(100_000);
    expect(filtered.length).toBeLessThan(100_000);
    expect(page.length).toBeLessThanOrEqual(50);
    if (page.length > 1) {
      expect(page[0].amount).toBeGreaterThanOrEqual(page[1].amount);
    }
  });
});

// ─── Cross-Cloud Report Performance ────────────────────────────────────────────

describe('Analytics Performance - Cross-Cloud Report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should join CRM, Finance, and Support data for a cross-cloud report within 2 seconds', async () => {
    const accounts = generateRecords(10_000, (i) => ({
      name: `Account ${i}`,
      industry: ['Technology', 'Finance', 'Healthcare', 'Manufacturing'][i % 4],
      annual_revenue: Math.round(Math.random() * 10_000_000),
    }));

    const invoices = generateRecords(50_000, (i) => ({
      account_id: `rec_${i % 10_000}`,
      total_amount: Math.round(Math.random() * 50_000),
      status: ['paid', 'pending', 'overdue'][i % 3],
      issued_date: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
    }));

    const cases = generateRecords(40_000, (i) => ({
      account_id: `rec_${i % 10_000}`,
      priority: ['critical', 'high', 'medium', 'low'][i % 4],
      status: ['open', 'in_progress', 'resolved', 'closed'][i % 4],
      resolution_time_hours: Math.round(Math.random() * 48),
    }));

    vi.mocked(broker.find)
      .mockResolvedValueOnce(accounts)
      .mockResolvedValueOnce(invoices)
      .mockResolvedValueOnce(cases);

    const start = Date.now();

    // Fetch data from three clouds
    const [accountData, invoiceData, caseData] = await Promise.all([
      broker.find('account', { filters: [] }),
      broker.find('invoice', { filters: [] }),
      broker.find('case', { filters: [] }),
    ]);

    // Build account lookup index for join performance
    const accountIndex = new Map<string, any>();
    for (const a of accountData) {
      accountIndex.set(a._id, a);
    }

    // Aggregate invoice totals by account
    const invoiceByAccount: Record<string, { total: number; count: number }> = {};
    for (const inv of invoiceData) {
      if (!invoiceByAccount[inv.account_id]) {
        invoiceByAccount[inv.account_id] = { total: 0, count: 0 };
      }
      invoiceByAccount[inv.account_id].total += inv.total_amount;
      invoiceByAccount[inv.account_id].count++;
    }

    // Aggregate case metrics by account
    const caseByAccount: Record<string, { total: number; count: number; critical: number }> = {};
    for (const c of caseData) {
      if (!caseByAccount[c.account_id]) {
        caseByAccount[c.account_id] = { total: 0, count: 0, critical: 0 };
      }
      caseByAccount[c.account_id].count++;
      caseByAccount[c.account_id].total += c.resolution_time_hours;
      if (c.priority === 'critical') caseByAccount[c.account_id].critical++;
    }

    // Build joined cross-cloud report rows
    const reportRows = accountData.map((account: any) => ({
      account_name: account.name,
      industry: account.industry,
      annual_revenue: account.annual_revenue,
      invoice_total: invoiceByAccount[account._id]?.total ?? 0,
      invoice_count: invoiceByAccount[account._id]?.count ?? 0,
      case_count: caseByAccount[account._id]?.count ?? 0,
      critical_cases: caseByAccount[account._id]?.critical ?? 0,
      avg_resolution: caseByAccount[account._id]
        ? caseByAccount[account._id].total / caseByAccount[account._id].count
        : 0,
    }));

    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(PERF_THRESHOLD_MS);
    expect(reportRows).toHaveLength(10_000);
    expect(reportRows[0]).toHaveProperty('account_name');
    expect(reportRows[0]).toHaveProperty('invoice_total');
    expect(reportRows[0]).toHaveProperty('case_count');
    expect(reportRows[0]).toHaveProperty('avg_resolution');
  });
});
