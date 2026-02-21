import type { RowLevelSecurityPolicy } from '@objectstack/spec/security';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';

/**
 * Patient Data Row-Level Security Policies
 * Restricts patient record access based on assigned provider and healthcare roles.
 */

export const ProviderPatientAccess = {
  name: 'provider_patient_access',
  label: 'Provider Patient Access',
  description: 'Providers can only see their assigned patients',
  object: 'patient',
  operation: 'all',
  using: 'provider_id = current_user_id()',
  roles: ['provider'],
  enabled: true,
  priority: 10,
  tags: ['healthcare', 'rls', 'hipaa']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(ProviderPatientAccess);

export const NursePatientAccess = {
  name: 'nurse_patient_access',
  label: 'Nurse Patient Access',
  description: 'Nurses can view patients in their assigned department',
  object: 'patient',
  operation: 'select',
  using: 'department_id IN (SELECT department_id FROM nurse_assignments WHERE nurse_id = current_user_id())',
  roles: ['nurse'],
  enabled: true,
  priority: 20,
  tags: ['healthcare', 'rls', 'hipaa']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(NursePatientAccess);

export const AdminFullAccess = {
  name: 'healthcare_admin_full_access',
  label: 'Healthcare Admin Full Access',
  description: 'Healthcare administrators have unrestricted access to all patient records',
  object: 'patient',
  operation: 'all',
  using: '1=1',
  roles: ['healthcare_admin'],
  enabled: true,
  priority: 30,
  tags: ['healthcare', 'rls', 'admin']
} satisfies RowLevelSecurityPolicy;

RowLevelSecurityPolicySchema.parse(AdminFullAccess);

export default { ProviderPatientAccess, NursePatientAccess, AdminFullAccess };
