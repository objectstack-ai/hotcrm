import type { PasswordPolicy } from '@objectstack/spec/security';
import { PasswordPolicySchema } from '@objectstack/spec/security';

export const EnterprisePasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  expirationDays: 90,
  historyCount: 5,
} satisfies PasswordPolicy;

PasswordPolicySchema.parse(EnterprisePasswordPolicy);

export default EnterprisePasswordPolicy;
