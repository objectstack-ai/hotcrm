import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Employee Form Definition
 * Layout for creating and editing Employee records
 */
export const EmployeeForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'employee'
  },
  sections: [
    {
      label: 'Personal Information',
      columns: '2' as const,
      fields: [
        { field: 'first_name', required: true },
        { field: 'last_name', required: true },
        { field: 'email', required: true },
        { field: 'personal_email' },
        { field: 'phone' },
        { field: 'mobile_phone' },
        { field: 'date_of_birth' },
        { field: 'gender' }
      ]
    },
    {
      label: 'Employment Details',
      columns: '2' as const,
      fields: [
        { field: 'employee_number' },
        { field: 'department_id', label: 'Department', required: true },
        { field: 'position_id', label: 'Position', required: true },
        { field: 'manager_id', label: 'Manager' },
        { field: 'hire_date', required: true },
        { field: 'employment_status' },
        { field: 'employment_type' },
        { field: 'work_location' },
        { field: 'base_salary' }
      ]
    },
    {
      label: 'Emergency Contact',
      columns: '2' as const,
      fields: [
        { field: 'emergency_contact_name' },
        { field: 'emergency_contact_phone' },
        { field: 'emergency_contact_relationship' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(EmployeeForm);

export default EmployeeForm;
