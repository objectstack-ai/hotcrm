import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Compliance Status Report
 * KYC compliance overview with verification status, risk ratings, and expiry tracking.
 */
export const ComplianceStatusReport = {
  name: 'compliance_status_report',
  label: 'Compliance Status Report',
  description: 'KYC and regulatory compliance status with risk assessment and verification tracking',
  objectName: 'kyc',
  type: 'summary' as const,
  columns: [
    { field: 'wealth_account', label: 'Client Account' },
    { field: 'status', label: 'KYC Status' },
    { field: 'risk_rating', label: 'Risk Rating' },
    { field: 'verification_date', label: 'Verification Date' },
    { field: 'expiry_date', label: 'Expiry Date' },
    { field: 'verified_by', label: 'Verified By' }
  ],
  groupingsDown: [
    { field: 'status', sortOrder: 'asc' as const },
    { field: 'risk_rating', sortOrder: 'desc' as const }
  ],
  chart: {
    type: 'pie' as const,
    title: 'KYC Status Distribution',
    xAxis: 'status',
    yAxis: 'verification_date',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(ComplianceStatusReport);

export default ComplianceStatusReport;
