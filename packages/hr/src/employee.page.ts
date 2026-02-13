import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Employee Detail Page Layout
 */
export const EmployeePage = {
  name: 'employee_detail',
  object: 'employee',
  type: 'record' as const,
  label: 'Employee Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['hr_specialist', 'hr_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['full_name', 'employee_number', 'employment_status', 'department_id', 'position_id']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['employee_info', 'employment_info', 'emergency_info']
          }
        }
      ]
    },
    {
      name: 'employee_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Employee Information',
          properties: {
            fields: [
              'first_name', 'last_name', 'email', 'personal_email',
              'phone', 'mobile_phone', 'date_of_birth', 'gender',
              'photo', 'home_address'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'employment_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Employment Information',
          properties: {
            fields: [
              'employee_number', 'department_id', 'position_id', 'manager_id',
              'hire_date', 'termination_date', 'employment_status', 'employment_type',
              'work_location', 'base_salary'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'emergency_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Emergency Contact Information',
          properties: {
            fields: [
              'emergency_contact_name', 'emergency_contact_phone',
              'emergency_contact_relationship', 'notes'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'related_lists',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Training',
          properties: {
            object: 'training',
            columns: ['name', 'status', 'start_date', 'end_date'],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Certifications',
          properties: {
            object: 'certification',
            columns: ['name', 'issued_date', 'expiration_date', 'status'],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Performance Reviews',
          properties: {
            object: 'performance_review',
            columns: ['review_period', 'rating', 'status', 'reviewer'],
            sort: [{ field: 'review_period', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(EmployeePage);

export default EmployeePage;
