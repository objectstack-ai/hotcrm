import { ObjectSchema } from '@objectstack/spec/data';
import { Campaign } from '../../../src/campaign.object';
import { CampaignMember } from '../../../src/campaign_member.object';
import { EmailTemplate } from '../../../src/email_template.object';
import { Form } from '../../../src/form.object';
import { LandingPage } from '../../../src/landing_page.object';
import { MarketingList } from '../../../src/marketing_list.object';
import { Unsubscribe } from '../../../src/unsubscribe.object';

const IDENTIFIER_RE = /^[a-z][a-z0-9_.]+$/;

const OBJECTS = [
  { name: 'Campaign', schema: Campaign },
  { name: 'CampaignMember', schema: CampaignMember },
  { name: 'EmailTemplate', schema: EmailTemplate },
  { name: 'Form', schema: Form },
  { name: 'LandingPage', schema: LandingPage },
  { name: 'MarketingList', schema: MarketingList },
  { name: 'Unsubscribe', schema: Unsubscribe },
];

describe('Marketing Package - Spec Compliance', () => {
  describe.each(OBJECTS)('$name', ({ name, schema }) => {
    it('should pass ObjectSchema.parse() validation', () => {
      expect(() => ObjectSchema.parse(schema)).not.toThrow();
    });

    it('should have snake_case object name', () => {
      expect(schema.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it('should have all select option values as valid identifiers', () => {
      const fields = schema.fields as Record<string, any>;
      for (const [fieldName, field] of Object.entries(fields)) {
        if (field.options && Array.isArray(field.options)) {
          for (const opt of field.options) {
            expect(opt.value).toMatch(IDENTIFIER_RE);
          }
        }
      }
    });

    it('should not have unknown properties in enable', () => {
      if (!schema.enable) return;
      const parsed = ObjectSchema.parse(schema);
      const originalKeys = Object.keys(schema.enable);
      const parsedKeys = Object.keys((parsed as any).enable || {});
      const unknownKeys = originalKeys.filter(k => !parsedKeys.includes(k));
      expect(unknownKeys).toEqual([]);
    });
  });
});
