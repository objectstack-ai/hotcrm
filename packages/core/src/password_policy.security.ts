import { PasswordPolicySchema } from '@objectstack/spec/security';

type PasswordPolicy = typeof PasswordPolicySchema extends { _output: infer T } ? T : never;

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
