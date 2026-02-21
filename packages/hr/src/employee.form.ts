import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Employee Form Definition
 * Wizard layout for creating and editing Employee records.
 * Leverages FormView features: wizard layout, readonly, collapsible, helpText, hidden.
 */
export const EmployeeForm = {
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
        { field: 'first_name', required: true, placeholder: 'First name' },
        { field: 'last_name', required: true, placeholder: 'Last name' },
        { field: 'email', required: true, placeholder: 'work@company.com' },
        { field: 'personal_email', helpText: 'Used for pre-boarding communications' },
        { field: 'phone' },
        { field: 'mobile_phone' },
        { field: 'date_of_birth' },
        { field: 'gender' }
      ]
    },
    {
      label: 'Employment Details',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'employee_number', readonly: true, helpText: 'Auto-generated on creation' },
        { field: 'department_id', label: 'Department', required: true },
        { field: 'position_id', label: 'Position', required: true },
        { field: 'manager_id', label: 'Manager' },
        { field: 'hire_date', required: true },
        { field: 'employment_status' },
        { field: 'employment_type' },
        { field: 'work_location' },
        { field: 'base_salary', hidden: true, helpText: 'Restricted to HR and Finance roles' }
      ]
    },
    {
      label: 'Emergency Contact',
      columns: '2' as any,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'emergency_contact_name', placeholder: 'Full name of emergency contact' },
        { field: 'emergency_contact_phone', placeholder: '+1 (555) 000-0000' },
        { field: 'emergency_contact_relationship' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(EmployeeForm);

export default EmployeeForm;
