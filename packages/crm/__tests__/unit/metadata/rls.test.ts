import { describe, it, expect } from 'vitest';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';
import { CrmRepAccess, CrmManagerAccess, CrmExecAccess } from '../../../src/crm_rls.security';

describe('CRM RLS Policies Metadata Compliance', () => {
  const policies = [
    { name: 'CrmRepAccess', policy: CrmRepAccess },
    { name: 'CrmManagerAccess', policy: CrmManagerAccess },
    { name: 'CrmExecAccess', policy: CrmExecAccess },
  ];

  describe.each(policies)('$name', ({ policy }) => {
    it('should be defined', () => {
      expect(policy).toBeDefined();
    });

    it('should validate against RowLevelSecurityPolicySchema', () => {
      expect(() => RowLevelSecurityPolicySchema.parse(policy)).not.toThrow();
    });

    it('should have a snake_case name', () => {
      expect(policy.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it('should have roles array', () => {
      expect(Array.isArray(policy.roles)).toBe(true);
      expect(policy.roles.length).toBeGreaterThan(0);
    });

    it('should be enabled', () => {
      expect(policy.enabled).toBe(true);
    });
  });
});
