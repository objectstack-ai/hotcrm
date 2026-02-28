import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Admissions Dashboard
 * Applications by stage, enrollment trends, and scholarship allocation overview.
 */
export const AdmissionsDashboard = {
  name: 'admissions_dashboard',
  label: 'Admissions Dashboard',
  description: 'Admissions overview with application pipeline, enrollment trends, and scholarship allocation',
  widgets: [
    {
      id: 'total_applications',
      title: 'Total Applications',
      type: 'metric' as const,
      object: 'application_form',
      aggregate: 'count' as const,
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'pending_review',
      title: 'Pending Review',
      type: 'metric' as const,
      object: 'application_form',
      aggregate: 'count' as const,
      filter: ['status', '=', 'submitted'],
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'acceptance_rate',
      title: 'Acceptance Rate',
      type: 'kpi' as const,
      object: 'application_form',
      aggregate: 'count' as const,
      filter: ['status', '=', 'accepted'],
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'scholarships_awarded',
      title: 'Scholarships Awarded',
      type: 'metric' as const,
      object: 'scholarship',
      aggregate: 'sum' as const,
      valueField: 'amount',
      filter: ['status', '=', 'awarded'],
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      id: 'applications_by_stage',
      title: 'Applications by Stage',
      type: 'funnel' as const,
      object: 'application_form',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'enrollment_by_program',
      title: 'Enrollment by Program',
      type: 'bar' as const,
      object: 'enrollment',
      categoryField: 'term',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'scholarship_allocation_by_department',
      title: 'Scholarship Allocation by Department',
      type: 'pie' as const,
      object: 'scholarship',
      categoryField: 'department',
      aggregate: 'sum' as const,
      valueField: 'amount',
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      id: 'recent_applications',
      title: 'Recent Applications',
      type: 'table' as const,
      object: 'application_form',
      aggregate: 'count' as const,
      filter: ['status', '!=', 'rejected'],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(AdmissionsDashboard);

export default AdmissionsDashboard;
