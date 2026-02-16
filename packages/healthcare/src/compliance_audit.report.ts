import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * HIPAA Compliance Audit Report
 * Audit trail of PHI access, compliance checks, and violation tracking.
 */
export const ComplianceAuditReport = {
  name: 'compliance_audit_report',
  label: 'HIPAA Compliance Audit Report',
  description: 'HIPAA compliance audit trail with access logs, violation tracking, and remediation status',
  objectName: 'hipaa_audit',
  type: 'summary' as const,
  columns: [
    { field: 'user', label: 'User' },
    { field: 'action', label: 'Action' },
    { field: 'object_accessed', label: 'Object Accessed' },
    { field: 'access_date', label: 'Access Date' },
    { field: 'status', label: 'Status' },
    { field: 'risk_level', label: 'Risk Level' }
  ],
  groupingsDown: [
    { field: 'status', sortOrder: 'asc' as const },
    { field: 'risk_level', sortOrder: 'desc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Audit Events by Status',
    xAxis: 'status',
    yAxis: 'access_date',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(ComplianceAuditReport);

export default ComplianceAuditReport;
