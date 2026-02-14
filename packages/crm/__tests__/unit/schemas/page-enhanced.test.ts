import { describe, it, expect } from 'vitest';
import { PageSchema } from '@objectstack/spec/ui';
import { AccountPage } from '../../../src/account.page';
import { LeadPage } from '../../../src/lead.page';
import { ContactPage } from '../../../src/contact.page';
import { OpportunityPage } from '../../../src/opportunity.page';
import { CrmHomePage } from '../../../src/crm_home.page';
import { CrmUtilityPage } from '../../../src/crm_utility.page';

describe('CRM Page Enhanced Compliance', () => {
  describe('Enhanced Record Pages', () => {
    const recordPages = [
      { name: 'AccountPage', page: AccountPage },
      { name: 'LeadPage', page: LeadPage },
      { name: 'ContactPage', page: ContactPage },
      { name: 'OpportunityPage', page: OpportunityPage },
    ];
    describe.each(recordPages)('$name', ({ page }) => {
      it('should validate against PageSchema', () => {
        expect(() => PageSchema.parse(page)).not.toThrow();
      });
      it('should be a record type', () => {
        expect(page.type).toBe('record');
      });
      it('should have isDefault set to true', () => {
        expect(page.isDefault).toBe(true);
      });
      it('should have template set to record_detail', () => {
        expect(page.template).toBe('record_detail');
      });
      it('should have assignedProfiles', () => {
        expect(page.assignedProfiles).toBeDefined();
        expect(page.assignedProfiles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('New Page Types', () => {
    it('CrmHomePage should be a home type', () => {
      expect(() => PageSchema.parse(CrmHomePage)).not.toThrow();
      expect(CrmHomePage.type).toBe('home');
    });
    it('CrmUtilityPage should be a utility type', () => {
      expect(() => PageSchema.parse(CrmUtilityPage)).not.toThrow();
      expect(CrmUtilityPage.type).toBe('utility');
    });
  });

  describe('AI Components', () => {
    it('AccountPage should have ai:chat_window', () => {
      const allComponents = AccountPage.regions.flatMap((r: any) => r.components);
      const hasAiChat = allComponents.some((c: any) => c.type === 'ai:chat_window');
      expect(hasAiChat).toBe(true);
    });
    it('OpportunityPage should have record:path', () => {
      const allComponents = OpportunityPage.regions.flatMap((r: any) => r.components);
      const hasPath = allComponents.some((c: any) => c.type === 'record:path');
      expect(hasPath).toBe(true);
    });
  });
});
