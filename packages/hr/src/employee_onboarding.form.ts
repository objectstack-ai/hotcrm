import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Employee Onboarding Form Definition
 * Wizard layout guiding HR through the full employee onboarding process.
 */
export const EmployeeOnboardingForm = {
  type: 'wizard' as const,
  data: {
    provider: 'object' as const,
    object: 'employee'
  },
  sections: [
    {
      label: 'Personal Information',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'first_name', required: true },
        { field: 'last_name', required: true },
        { field: 'email', required: true, placeholder: 'work@company.com' },
        { field: 'personal_email' },
        { field: 'phone' },
        { field: 'date_of_birth' },
        { field: 'gender' }
      ]
    },
    {
      label: 'Role & Department',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'department_id', label: 'Department', required: true },
        { field: 'position_id', label: 'Position', required: true },
        { field: 'manager_id', label: 'Manager' },
        { field: 'hire_date', required: true },
        { field: 'employment_type' },
        { field: 'work_location' }
      ]
    },
    {
      label: 'IT Setup',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'employee_number', readonly: true, helpText: 'Auto-generated after provisioning' },
        { field: 'work_location' }
      ]
    },
    {
      label: 'Review & Confirm',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'first_name', readonly: true },
        { field: 'last_name', readonly: true },
        { field: 'email', readonly: true },
        { field: 'department_id', readonly: true, label: 'Department' },
        { field: 'position_id', readonly: true, label: 'Position' },
        { field: 'hire_date', readonly: true }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(EmployeeOnboardingForm);

export default EmployeeOnboardingForm;
