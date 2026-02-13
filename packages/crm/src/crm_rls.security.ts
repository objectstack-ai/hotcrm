import type { RowLevelSecurityPolicy } from '@objectstack/spec/security';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';

export const CrmRepAccess = {
  name: 'crm_rep_access',
  label: 'CRM Rep Access',
  description: 'Sales reps can only see their own accounts and opportunities',
  object: 'account',
  operation: 'all',
  using: 'owner_id = current_user_id()',
  roles: ['crm_user'],
  enabled: true,
  priority: 10,
  tags: ['crm', 'rls', 'rep']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(CrmRepAccess);

export const CrmManagerAccess = {
  name: 'crm_manager_access',
  label: 'CRM Manager Access',
  description: 'Managers can see all records owned by their team members',
  object: 'account',
  operation: 'all',
  using: 'owner_id IN (SELECT id FROM users WHERE manager_id = current_user_id())',
  roles: ['crm_manager'],
  enabled: true,
  priority: 20,
  tags: ['crm', 'rls', 'manager']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(CrmManagerAccess);

export const CrmExecAccess = {
  name: 'crm_exec_access',
  label: 'CRM Executive Access',
  description: 'Executives have unrestricted access to all CRM records',
  object: 'account',
  operation: 'all',
  using: '1=1',
  roles: ['crm_admin'],
  enabled: true,
  priority: 30,
  tags: ['crm', 'rls', 'exec']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(CrmExecAccess);

export default { CrmRepAccess, CrmManagerAccess, CrmExecAccess };
