import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Referral Pipeline Report
 * Referral status breakdown, specialty distribution, and completion rates.
 */
export const ReferralPipelineReport = {
  name: 'referral_pipeline_report',
  label: 'Referral Pipeline Report',
  description: 'Referral pipeline analysis with status breakdown, specialty distribution, and turnaround times',
  objectName: 'referral',
  type: 'summary' as const,
  columns: [
    { field: 'patient', label: 'Patient' },
    { field: 'referring_provider', label: 'Referring Provider' },
    { field: 'referred_to_provider', label: 'Referred To' },
    { field: 'specialty', label: 'Specialty' },
    { field: 'urgency', label: 'Urgency' },
    { field: 'referral_date', label: 'Referral Date' }
  ],
  groupingsDown: [
    { field: 'status', sortOrder: 'asc' as const },
    { field: 'specialty', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'funnel' as const,
    title: 'Referral Pipeline by Status',
    xAxis: 'status',
    yAxis: 'referral_date',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(ReferralPipelineReport);

export default ReferralPipelineReport;
