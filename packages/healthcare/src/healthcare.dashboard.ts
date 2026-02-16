import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Healthcare Dashboard
 * Clinical operations overview with appointments, referrals, and compliance status.
 */
export const HealthcareDashboard = {
  name: 'healthcare_dashboard',
  label: 'Healthcare Dashboard',
  description: 'Clinical operations overview with appointments, referrals, and compliance status',
  widgets: [
    {
      title: 'Appointments Today',
      type: 'metric' as const,
      object: 'appointment',
      aggregate: 'count' as const,
      filter: ['appointment_date', '=', 'TODAY'],
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Pending Referrals',
      type: 'metric' as const,
      object: 'referral',
      aggregate: 'count' as const,
      filter: ['status', '=', 'pending'],
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Active Patients',
      type: 'metric' as const,
      object: 'patient',
      aggregate: 'count' as const,
      filter: ['status', '=', 'active'],
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'HIPAA Compliance Score',
      type: 'kpi' as const,
      object: 'hipaa_audit',
      aggregate: 'count' as const,
      filter: ['status', '=', 'compliant'],
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Appointment Volume by Type',
      type: 'bar' as const,
      object: 'appointment',
      categoryField: 'type',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Referral Pipeline',
      type: 'funnel' as const,
      object: 'referral',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Appointments by Provider',
      type: 'pie' as const,
      object: 'appointment',
      categoryField: 'provider_name',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      title: 'Recent Appointments',
      type: 'table' as const,
      object: 'appointment',
      aggregate: 'count' as const,
      filter: ['status', '!=', 'cancelled'],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(HealthcareDashboard);

export default HealthcareDashboard;
