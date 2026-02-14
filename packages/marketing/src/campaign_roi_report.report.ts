import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Campaign ROI Report
 * Campaign spend vs revenue with attribution
 */
export const CampaignRoiReport = {
  name: 'campaign_roi_report',
  label: 'Campaign ROI Report',
  description: 'Campaign return on investment analysis with spend vs revenue and attribution modeling',
  objectName: 'campaign',
  type: 'summary' as const,
  columns: [
    { field: 'name', label: 'Campaign' },
    { field: 'type', label: 'Type' },
    { field: 'budgeted_cost', label: 'Budget', aggregate: 'sum' as const },
    { field: 'actual_cost', label: 'Actual Spend', aggregate: 'sum' as const },
    { field: 'expected_revenue', label: 'Expected Revenue', aggregate: 'sum' as const },
    { field: 'num_converted_leads', label: 'Conversions', aggregate: 'sum' as const }
  ],
  groupingsDown: [
    { field: 'type', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Campaign Spend vs Expected Revenue',
    xAxis: 'name',
    yAxis: 'actual_cost',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(CampaignRoiReport);

export default CampaignRoiReport;
