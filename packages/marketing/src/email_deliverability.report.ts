import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Email Deliverability Report
 * Email delivery metrics including bounces, spam complaints, and inbox placement
 */
export const EmailDeliverabilityReport = {
  name: 'email_deliverability_report',
  label: 'Email Deliverability Report',
  description: 'Email deliverability analysis showing delivery rates, bounces, spam complaints, and inbox placement across campaigns',
  objectName: 'campaign',
  type: 'summary' as const,
  columns: [
    { field: 'name', label: 'Campaign' },
    { field: 'num_sent', label: 'Emails Sent', aggregate: 'sum' as const },
    { field: 'delivered_count', label: 'Delivered', aggregate: 'sum' as const },
    { field: 'bounced_count', label: 'Bounced', aggregate: 'sum' as const },
    { field: 'spam_count', label: 'Spam Complaints', aggregate: 'sum' as const },
    { field: 'delivery_rate', label: 'Delivery Rate', aggregate: 'avg' as const }
  ],
  groupingsDown: [
    { field: 'type', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Email Delivery Rates by Campaign',
    xAxis: 'name',
    yAxis: 'delivery_rate',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(EmailDeliverabilityReport);

export default EmailDeliverabilityReport;
