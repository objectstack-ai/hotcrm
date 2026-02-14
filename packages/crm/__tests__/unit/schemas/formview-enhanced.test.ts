import { describe, it, expect } from 'vitest';
import { FormViewSchema } from '@objectstack/spec/ui';
import { AccountForm } from '../../../src/account.form';
import { LeadForm } from '../../../src/lead.form';
import { ContactForm } from '../../../src/contact.form';
import { OpportunityForm } from '../../../src/opportunity.form';
import { LeadQuickCreateForm } from '../../../src/lead_quick_create.form';
import { OpportunityQuickCreateForm } from '../../../src/opportunity_quick_create.form';
import { AccountSplitForm } from '../../../src/account_split.form';

describe('CRM FormView Enhanced Compliance', () => {
  describe('Enhanced Existing Forms', () => {
    const forms = [
      { name: 'AccountForm', form: AccountForm, layout: 'simple' },
      { name: 'LeadForm', form: LeadForm, layout: 'simple' },
      { name: 'ContactForm', form: ContactForm, layout: 'simple' },
      { name: 'OpportunityForm', form: OpportunityForm, layout: 'tabbed' },
    ];
    describe.each(forms)('$name', ({ form, layout }) => {
      it('should validate against FormViewSchema', () => {
        expect(() => FormViewSchema.parse(form)).not.toThrow();
      });
      it(`should use ${layout} layout`, () => {
        expect(form.type).toBe(layout);
      });
      it('should have sections', () => {
        expect(form.sections.length).toBeGreaterThan(0);
      });
    });
  });

  describe('New Form Variants', () => {
    const variants = [
      { name: 'LeadQuickCreateForm', form: LeadQuickCreateForm, layout: 'modal' },
      { name: 'OpportunityQuickCreateForm', form: OpportunityQuickCreateForm, layout: 'drawer' },
      { name: 'AccountSplitForm', form: AccountSplitForm, layout: 'split' },
    ];
    describe.each(variants)('$name', ({ form, layout }) => {
      it('should validate against FormViewSchema', () => {
        expect(() => FormViewSchema.parse(form)).not.toThrow();
      });
      it(`should use ${layout} layout`, () => {
        expect(form.type).toBe(layout);
      });
    });
  });

  describe('Advanced Form Features', () => {
    it('AccountForm should have collapsible sections', () => {
      const collapsible = AccountForm.sections.filter((s: any) => s.collapsible);
      expect(collapsible.length).toBeGreaterThan(0);
    });
    it('LeadForm should have visibleOn fields', () => {
      const allFields = LeadForm.sections.flatMap((s: any) => s.fields);
      const hasVisibleOn = allFields.some((f: any) => f.visibleOn);
      expect(hasVisibleOn).toBe(true);
    });
    it('OpportunityForm should be tabbed with forecast details', () => {
      expect(OpportunityForm.type).toBe('tabbed');
      expect(OpportunityForm.sections.some((s: any) => s.label === 'Forecast Details')).toBe(true);
    });
  });
});
