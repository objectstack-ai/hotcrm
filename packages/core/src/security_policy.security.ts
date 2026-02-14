import type { Policy } from '@objectstack/spec/security';
import { PolicySchema } from '@objectstack/spec/security';

import { EnterprisePasswordPolicy } from './password_policy.security.js';
import { EnterpriseSessionPolicy } from './session_policy.security.js';

export const EnterpriseSecurityPolicy = {
  name: 'enterprise_security_policy',
  password: EnterprisePasswordPolicy,
  session: EnterpriseSessionPolicy,
  network: {
    trustedRanges: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
    blockUnknown: false,
    vpnRequired: false,
  },
  audit: {
    logRetentionDays: 365,
    sensitiveFields: ['ssn', 'credit_card', 'bank_account'],
    captureRead: true,
  },
  isDefault: true,
  assignedProfiles: ['standard_user', 'admin'],
} satisfies Policy;

PolicySchema.parse(EnterpriseSecurityPolicy);

export default EnterpriseSecurityPolicy;
