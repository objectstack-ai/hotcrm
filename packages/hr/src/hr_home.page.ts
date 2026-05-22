import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * HR Home Page Layout
 * Landing page for HR teams with headcount overview, open positions, approvals, and onboarding tracker.
 */
export const HrHomePage = {
  name: 'hr_home',
  type: 'home' as const,
  kind: 'full' as const,
  label: 'HR Home Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['hr_manager', 'hr_admin', 'recruiter', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'page:header' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'overview',
      components: [
        {
          type: 'page:card' as const,
          label: 'Headcount Overview',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Open Positions',
          properties: {}
        }
      ]
    },
    {
      name: 'approvals',
      components: [
        {
          type: 'page:card' as const,
          label: 'Pending Approvals',
          properties: {}
        }
      ]
    },
    {
      name: 'onboarding',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Onboarding Tracker',
          properties: {
            object: 'employee',
            columns: ['first_name', 'last_name', 'department_id', 'hire_date', 'employment_status']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(HrHomePage);

export default HrHomePage;
