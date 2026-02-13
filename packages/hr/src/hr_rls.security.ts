import type { RowLevelSecurityPolicy } from '@objectstack/spec/security';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';

export const HrEmployeeAccess = {
  name: 'hr_employee_access',
  label: 'HR Employee Access',
  description: 'Employees can only see their own records',
  object: 'employee',
  operation: 'all',
  using: 'user_id = current_user_id()',
  roles: ['hr_employee'],
  enabled: true,
  priority: 10,
  tags: ['hr', 'rls', 'employee']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(HrEmployeeAccess);

export const HrManagerAccess = {
  name: 'hr_manager_access',
  label: 'HR Manager Access',
  description: 'Managers can see records of their direct reports',
  object: 'employee',
  operation: 'all',
  using: 'manager_id = current_user_id()',
  roles: ['hr_manager'],
  enabled: true,
  priority: 20,
  tags: ['hr', 'rls', 'manager']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(HrManagerAccess);

export const HrAdminAccess = {
  name: 'hr_admin_access',
  label: 'HR Admin Access',
  description: 'HR admins have unrestricted access to all employee records',
  object: 'employee',
  operation: 'all',
  using: '1=1',
  roles: ['hr_admin'],
  enabled: true,
  priority: 30,
  tags: ['hr', 'rls', 'admin']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(HrAdminAccess);

export default { HrEmployeeAccess, HrManagerAccess, HrAdminAccess };
