import type { RowLevelSecurityPolicy } from '@objectstack/spec/security';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';

/**
 * Client Data Row-Level Security Policies
 * Restricts wealth account access based on assigned advisor and compliance roles.
 */

export const AdvisorClientAccess = {
  name: 'advisor_client_access',
  label: 'Advisor Client Access',
  description: 'Advisors can only see their assigned clients',
  object: 'wealth_account',
  operation: 'all',
  using: 'advisor_id = current_user_id()',
  roles: ['wealth_advisor'],
  enabled: true,
  priority: 10,
  tags: ['financial_services', 'rls', 'advisor']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(AdvisorClientAccess);

export const ComplianceFullAccess = {
  name: 'compliance_full_access',
  label: 'Compliance Officer Full Access',
  description: 'Compliance officers can view all accounts for regulatory oversight',
  object: 'wealth_account',
  operation: 'all',
  using: '1=1',
  roles: ['compliance_officer'],
  enabled: true,
  priority: 20,
  tags: ['financial_services', 'rls', 'compliance']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(ComplianceFullAccess);

export const AdminFullAccess = {
  name: 'admin_full_access',
  label: 'Administrator Full Access',
  description: 'Administrators have unrestricted access to all wealth accounts',
  object: 'wealth_account',
  operation: 'all',
  using: '1=1',
  roles: ['financial_services_admin'],
  enabled: true,
  priority: 30,
  tags: ['financial_services', 'rls', 'admin']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(AdminFullAccess);

export default { AdvisorClientAccess, ComplianceFullAccess, AdminFullAccess };
