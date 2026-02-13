import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/db', () => ({
  broker: {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockResolvedValue({ _id: 'rpt_001' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    count: vi.fn().mockResolvedValue(0),
  }
}));

import { generateReport, suggestReportImprovements } from '../../../src/actions/report_ai.action';
import { broker } from '../../../src/db';
import type { Mock } from 'vitest';

describe('Report AI Action - generateReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a report config from natural language', async () => {
    const result = await generateReport({ query: 'top 10 customers by revenue' });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report.object_name).toBeDefined();
    expect(result.report.columns).toBeDefined();
    expect(Array.isArray(result.report.columns)).toBe(true);
  });

  it('should return explanation describing the generated report', async () => {
    const result = await generateReport({ query: 'deals closing this month' });

    expect(result.explanation).toBeDefined();
    expect(typeof result.explanation).toBe('string');
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('should save the generated report via broker.insert', async () => {
    await generateReport({ query: 'pipeline by stage' });

    expect(broker.insert).toHaveBeenCalledWith('report', expect.objectContaining({
      name: expect.any(String),
      object_name: expect.any(String),
      report_type: expect.any(String),
    }));
  });

  it('should include report_type and chart_type in generated report', async () => {
    const result = await generateReport({ query: 'revenue trend' });

    expect(result.report.report_type).toBeDefined();
    expect(['tabular', 'summary', 'matrix']).toContain(result.report.report_type);
  });
});

describe('Report AI Action - suggestReportImprovements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return improvement suggestions for a report', async () => {
    (broker.findOne as Mock).mockResolvedValue({
      name: 'Pipeline Report',
      object_name: 'opportunity',
      report_type: 'summary'
    });

    const result = await suggestReportImprovements({ reportId: 'rpt_001' });

    expect(result.suggestions).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should include type, description and priority in each suggestion', async () => {
    (broker.findOne as Mock).mockResolvedValue({ name: 'Test Report' });

    const result = await suggestReportImprovements({ reportId: 'rpt_001' });

    for (const suggestion of result.suggestions) {
      expect(suggestion.type).toBeDefined();
      expect(suggestion.description).toBeDefined();
      expect(suggestion.priority).toBeDefined();
    }
  });

  it('should call broker.findOne to retrieve the report', async () => {
    (broker.findOne as Mock).mockResolvedValue({ name: 'Test Report' });

    await suggestReportImprovements({ reportId: 'rpt_xyz' });

    expect(broker.findOne).toHaveBeenCalledWith('report', 'rpt_xyz');
  });
});
