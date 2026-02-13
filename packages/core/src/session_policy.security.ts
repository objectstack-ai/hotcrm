import type { SessionPolicy } from '@objectstack/spec/security';
import { SessionPolicySchema } from '@objectstack/spec/security';

export const EnterpriseSessionPolicy = {
  idleTimeout: 30,
  absoluteTimeout: 480,
  forceMfa: true,
} satisfies SessionPolicy;

SessionPolicySchema.parse(EnterpriseSessionPolicy);

export default EnterpriseSessionPolicy;
