import { SessionPolicySchema } from '@objectstack/spec/security';

type SessionPolicy = typeof SessionPolicySchema extends { _output: infer T } ? T : never;

export const EnterpriseSessionPolicy = {
  idleTimeout: 30,
  absoluteTimeout: 480,
  forceMfa: true,
} satisfies SessionPolicy;

SessionPolicySchema.parse(EnterpriseSessionPolicy);

export default EnterpriseSessionPolicy;
