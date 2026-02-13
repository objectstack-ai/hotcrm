import { describe, it, expect } from 'vitest';
import { ChartConfigSchema } from '@objectstack/spec/ui';
import { PipelineFunnelChart } from '../../../src/pipeline_funnel.chart';
import { RevenueTrendChart } from '../../../src/revenue_trend.chart';
import { CashFlowChart } from '../../../../finance/src/cash_flow.chart';
import { CaseResolutionChart } from '../../../../support/src/case_resolution.chart';
import { ChannelPerformanceChart } from '../../../../marketing/src/channel_performance.chart';
import { AttritionTrendChart } from '../../../../hr/src/attrition_trend.chart';

describe('Phase 10.5A Chart Configurations Metadata Compliance', () => {
  const charts = [
    { name: 'PipelineFunnelChart', chart: PipelineFunnelChart, expectedType: 'funnel' },
    { name: 'RevenueTrendChart', chart: RevenueTrendChart, expectedType: 'line' },
    { name: 'CashFlowChart', chart: CashFlowChart, expectedType: 'waterfall' },
    { name: 'CaseResolutionChart', chart: CaseResolutionChart, expectedType: 'bar' },
    { name: 'ChannelPerformanceChart', chart: ChannelPerformanceChart, expectedType: 'bar' },
    { name: 'AttritionTrendChart', chart: AttritionTrendChart, expectedType: 'line' },
  ];

  it('should have exactly 6 chart configurations', () => {
    expect(charts.length).toBe(6);
  });

  describe.each(charts)('$name', ({ chart, expectedType }) => {
    it('should be defined', () => {
      expect(chart).toBeDefined();
    });

    it('should validate against ChartConfigSchema', () => {
      expect(() => ChartConfigSchema.parse(chart)).not.toThrow();
    });

    it(`should be of type "${expectedType}"`, () => {
      expect(chart.type).toBe(expectedType);
    });

    it('should have a non-empty title', () => {
      expect(typeof chart.title).toBe('string');
      expect(chart.title.length).toBeGreaterThan(0);
    });

    it('should have xAxis and yAxis defined', () => {
      expect(chart.xAxis).toBeDefined();
      expect(chart.yAxis).toBeDefined();
    });
  });
});
