import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Organization Chart Page Layout
 * Visual organization chart with department hierarchy and team member listings.
 */
export const OrgChartPage = {
  name: 'org_chart',
  type: 'app' as const,
  kind: 'full' as const,
  label: 'Organization Chart',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['hr_manager', 'hr_specialist', 'admin'],

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
      name: 'chart',
      components: [
        {
          type: 'page:card' as const,
          label: 'Organization Structure',
          properties: {}
        }
      ]
    },
    {
      name: 'department_list',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Departments',
          properties: {
            object: 'department',
            columns: ['name', 'manager_id', 'headcount', 'budget'],
            sort: [{ field: 'name', direction: 'asc' }]
          }
        }
      ]
    },
    {
      name: 'team_members',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Team Members',
          properties: {
            object: 'employee',
            columns: ['employee_name', 'job_title', 'department', 'hire_date', 'status'],
            sort: [{ field: 'employee_name', direction: 'asc' }]
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(OrgChartPage);

export default OrgChartPage;
