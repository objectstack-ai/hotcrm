import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Portfolio Performance Report
 * Performance analysis by portfolio, asset class, and time period.
 */
export const PortfolioPerformanceReport = {
  name: 'portfolio_performance_report',
  label: 'Portfolio Performance Report',
  description: 'Portfolio performance analysis with returns, risk metrics, and benchmark comparison',
  objectName: 'portfolio',
  type: 'summary' as const,
  columns: [
    { field: 'name', label: 'Portfolio' },
    { field: 'wealth_account', label: 'Client Account' },
    { field: 'asset_class', label: 'Asset Class' },
    { field: 'market_value', label: 'Market Value', aggregate: 'sum' as const },
    { field: 'performance_ytd', label: 'YTD Return (%)', aggregate: 'avg' as const },
    { field: 'benchmark_return', label: 'Benchmark Return (%)', aggregate: 'avg' as const }
  ],
  groupingsDown: [
    { field: 'asset_class', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Performance by Asset Class',
    xAxis: 'asset_class',
    yAxis: 'performance_ytd',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(PortfolioPerformanceReport);

export default PortfolioPerformanceReport;
