import { describe, it, expect } from 'vitest';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';
import { ProviderPatientAccess, NursePatientAccess, AdminFullAccess } from '../../../src/patient.rls';

describe('Healthcare Phase 13 Metadata Compliance', () => {
  describe('Row-Level Security Policies', () => {
    it('ProviderPatientAccess validates against RowLevelSecurityPolicySchema', () => {
      expect(ProviderPatientAccess).toBeDefined();
      expect(() => RowLevelSecurityPolicySchema.parse(ProviderPatientAccess)).not.toThrow();
    });
    it('NursePatientAccess validates against RowLevelSecurityPolicySchema', () => {
      expect(NursePatientAccess).toBeDefined();
      expect(() => RowLevelSecurityPolicySchema.parse(NursePatientAccess)).not.toThrow();
    });
    it('AdminFullAccess validates against RowLevelSecurityPolicySchema', () => {
      expect(AdminFullAccess).toBeDefined();
      expect(() => RowLevelSecurityPolicySchema.parse(AdminFullAccess)).not.toThrow();
    });
  });
});
