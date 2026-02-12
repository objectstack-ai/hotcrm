import { describe, it, expect } from 'vitest';
import { PermissionSetSchema, SharingRuleSchema, TerritoryModelSchema } from '@objectstack/spec/security';
import { CRMAdmin, CRMUser, CRMReadOnly } from '../../../src/crm.permission';
import { AccountTeamSharing, OpportunityDealSharing, LeadMarketingSharing } from '../../../src/crm.sharing';
import { SalesTerritoryModel } from '../../../src/crm.territory';

describe('CRM Security Schema Compliance', () => {
  describe('Permission Sets', () => {
    const permissionSets = [
      { name: 'CRMAdmin', set: CRMAdmin },
      { name: 'CRMUser', set: CRMUser },
      { name: 'CRMReadOnly', set: CRMReadOnly },
    ];

    describe.each(permissionSets)('$name', ({ set }) => {
      it('should be defined', () => {
        expect(set).toBeDefined();
      });

      it('should validate against PermissionSetSchema', () => {
        expect(() => PermissionSetSchema.parse(set)).not.toThrow();
      });
    });
  });

  describe('Sharing Rules', () => {
    const sharingRules = [
      { name: 'AccountTeamSharing', rule: AccountTeamSharing },
      { name: 'OpportunityDealSharing', rule: OpportunityDealSharing },
      { name: 'LeadMarketingSharing', rule: LeadMarketingSharing },
    ];

    describe.each(sharingRules)('$name', ({ rule }) => {
      it('should be defined', () => {
        expect(rule).toBeDefined();
      });

      it('should validate against SharingRuleSchema', () => {
        expect(() => SharingRuleSchema.parse(rule)).not.toThrow();
      });
    });
  });

  describe('Territory Model', () => {
    it('should be defined', () => {
      expect(SalesTerritoryModel).toBeDefined();
    });

    it('should validate against TerritoryModelSchema', () => {
      expect(() => TerritoryModelSchema.parse(SalesTerritoryModel)).not.toThrow();
    });
  });
});
