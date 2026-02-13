import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateReportFromNL,
  suggestReportFilters,
  autoGenerateReport
} from '../../../src/actions/report_ai.action';

// Mock the broker used by action functions
vi.mock('../../../src/db', () => ({
  broker: {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({}),
    insert: vi.fn().mockResolvedValue({ _id: 'rpt_generated_001' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    count: vi.fn().mockResolvedValue(0)
  }
}));

// ─── generateReportFromNL ──────────────────────────────────────────────────────

describe('generateReportFromNL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when query is empty', async () => {
    await expect(generateReportFromNL({ query: '' })).rejects.toThrow(
      'A natural language query is required'
    );
  });

  it('should throw when query is whitespace only', async () => {
    await expect(generateReportFromNL({ query: '   ' })).rejects.toThrow(
      'A natural language query is required'
    );
  });

  it('should return a report definition with required fields', async () => {
    const result = await generateReportFromNL({
      query: 'Show me top 10 customers by revenue'
    });

    expect(result).toBeDefined();
    expect(result.report).toBeDefined();
    expect(result.report.name).toBeDefined();
    expect(result.report.object_name).toBeDefined();
    expect(result.report.report_type).toBeDefined();
    expect(result.report.columns).toBeInstanceOf(Array);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.explanation).toBeDefined();
  });

  it('should accept optional objectName parameter', async () => {
    const result = await generateReportFromNL({
      query: 'Show revenue breakdown',
      objectName: 'account'
    });

    expect(result.report).toBeDefined();
    expect(result.report.object_name).toBeDefined();
  });
});

// ─── suggestReportFilters ──────────────────────────────────────────────────────

describe('suggestReportFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when objectName is missing', async () => {
    await expect(
      suggestReportFilters({ objectName: '' })
    ).rejects.toThrow('objectName is required');
  });

  it('should return filter suggestions', async () => {
    const result = await suggestReportFilters({
      objectName: 'opportunity'
    });

    expect(result).toBeDefined();
    expect(result.filters).toBeInstanceOf(Array);
    expect(result.combinations).toBeInstanceOf(Array);
  });

  it('should return filters with required properties', async () => {
    const result = await suggestReportFilters({
      objectName: 'account',
      context: 'quarterly review'
    });

    for (const filter of result.filters) {
      expect(filter.field).toBeDefined();
      expect(filter.operator).toBeDefined();
      expect(filter.label).toBeDefined();
      expect(filter.reasoning).toBeDefined();
    }
  });

  it('should return combinations with name and filters', async () => {
    const result = await suggestReportFilters({
      objectName: 'account'
    });

    for (const combo of result.combinations) {
      expect(combo.name).toBeDefined();
      expect(combo.description).toBeDefined();
      expect(combo.filters).toBeInstanceOf(Array);
    }
  });
});

// ─── autoGenerateReport ────────────────────────────────────────────────────────

describe('autoGenerateReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when objectName is missing', async () => {
    await expect(
      autoGenerateReport({ objectName: '' })
    ).rejects.toThrow('objectName is required');
  });

  it('should return a generated report with an ID', async () => {
    const result = await autoGenerateReport({
      objectName: 'account'
    });

    expect(result).toBeDefined();
    expect(result.reportId).toBeDefined();
    expect(result.report).toBeDefined();
    expect(result.report.name).toBeDefined();
    expect(result.explanation).toBeDefined();
  });

  it('should accept optional purpose parameter', async () => {
    const result = await autoGenerateReport({
      objectName: 'opportunity',
      purpose: 'performance'
    });

    expect(result.report).toBeDefined();
    expect(result.reportId).toBeDefined();
  });

  it('should persist the report via broker.insert', async () => {
    const { broker } = await import('../../../src/db');

    await autoGenerateReport({ objectName: 'account' });

    expect(broker.insert).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({
        object_name: expect.any(String),
        report_type: expect.any(String),
        is_public: false
      })
    );
  });
});
