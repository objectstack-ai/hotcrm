import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Appointment Volume Report
 * Appointment counts by type, provider, and time period.
 */
export const AppointmentVolumeReport = {
  name: 'appointment_volume_report',
  label: 'Appointment Volume Report',
  description: 'Appointment volume analysis by type, provider, and scheduling trends',
  objectName: 'appointment',
  type: 'summary' as const,
  columns: [
    { field: 'patient', label: 'Patient' },
    { field: 'appointment_date', label: 'Date' },
    { field: 'type', label: 'Type' },
    { field: 'provider_name', label: 'Provider' },
    { field: 'status', label: 'Status' },
    { field: 'duration', label: 'Duration (min)', aggregate: 'avg' as const }
  ],
  groupingsDown: [
    { field: 'type', sortOrder: 'asc' as const },
    { field: 'provider_name', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Appointments by Type',
    xAxis: 'type',
    yAxis: 'appointment_date',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(AppointmentVolumeReport);

export default AppointmentVolumeReport;
