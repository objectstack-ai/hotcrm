import type { RowLevelSecurityPolicy } from '@objectstack/spec/security';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';

export const FinanceAccountantAccess = {
  name: 'finance_accountant_access',
  label: 'Finance Accountant Access',
  description: 'Accountants can only see invoices assigned to them',
  object: 'invoice',
  operation: 'all',
  using: 'owner_id = current_user_id()',
  roles: ['finance_user'],
  enabled: true,
  priority: 10,
  tags: ['finance', 'rls', 'accountant']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(FinanceAccountantAccess);

export const FinanceControllerAccess = {
  name: 'finance_controller_access',
  label: 'Finance Controller Access',
  description: 'Controllers have full access to all invoices',
  object: 'invoice',
  operation: 'all',
  using: '1=1',
  roles: ['finance_controller'],
  enabled: true,
  priority: 20,
  tags: ['finance', 'rls', 'controller']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(FinanceControllerAccess);

export const FinanceAuditorAccess = {
  name: 'finance_auditor_access',
  label: 'Finance Auditor Access',
  description: 'Auditors have read-only access to all invoices',
  object: 'invoice',
  operation: 'select',
  using: '1=1',
  roles: ['finance_auditor'],
  enabled: true,
  priority: 30,
  tags: ['finance', 'rls', 'auditor']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(FinanceAuditorAccess);

export default { FinanceAccountantAccess, FinanceControllerAccess, FinanceAuditorAccess };
