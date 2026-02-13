import type { RowLevelSecurityPolicy } from '@objectstack/spec/security';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';

export const SupportAgentAccess = {
  name: 'support_agent_access',
  label: 'Support Agent Access',
  description: 'Agents can only see cases assigned to them',
  object: 'case',
  operation: 'all',
  using: 'owner_id = current_user_id()',
  roles: ['support_agent'],
  enabled: true,
  priority: 10,
  tags: ['support', 'rls', 'agent']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(SupportAgentAccess);

export const SupportSupervisorAccess = {
  name: 'support_supervisor_access',
  label: 'Support Supervisor Access',
  description: 'Supervisors can see all cases in their queue',
  object: 'case',
  operation: 'all',
  using: 'queue_id IN (SELECT queue_id FROM queue_members WHERE user_id = current_user_id())',
  roles: ['support_supervisor'],
  enabled: true,
  priority: 20,
  tags: ['support', 'rls', 'supervisor']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(SupportSupervisorAccess);

export const SupportAdminAccess = {
  name: 'support_admin_access',
  label: 'Support Admin Access',
  description: 'Support admins have unrestricted access to all cases',
  object: 'case',
  operation: 'all',
  using: '1=1',
  roles: ['support_admin'],
  enabled: true,
  priority: 30,
  tags: ['support', 'rls', 'admin']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(SupportAdminAccess);

export default { SupportAgentAccess, SupportSupervisorAccess, SupportAdminAccess };
