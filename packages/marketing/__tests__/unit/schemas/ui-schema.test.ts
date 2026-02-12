import { describe, it, expect } from 'vitest';
import { PageSchema } from '@objectstack/spec/ui';
import CampaignPage from '../../../src/campaign.page';

describe('Marketing UI Schema Compliance', () => {
  describe('CampaignPage', () => {
    it('should be defined', () => {
      expect(CampaignPage).toBeDefined();
    });

    it('should validate against PageSchema', () => {
      expect(() => PageSchema.parse(CampaignPage)).not.toThrow();
    });
  });
});
