import { describe, it, expect } from 'vitest';
import { TranslationBundleSchema } from '@objectstack/spec/system';
import { CrmTranslations } from '../../../src/translations/index.js';

describe('CRM i18n Translations', () => {
  it('should be defined', () => {
    expect(CrmTranslations).toBeDefined();
  });

  it('should validate against TranslationBundleSchema', () => {
    expect(() => TranslationBundleSchema.parse(CrmTranslations)).not.toThrow();
  });

  it('should contain all supported locales', () => {
    expect(CrmTranslations).toHaveProperty('en');
    expect(CrmTranslations).toHaveProperty('zh');
    expect(CrmTranslations).toHaveProperty('ja');
  });

  it('should have non-empty objects section for each locale', () => {
    for (const locale of ['en', 'zh', 'ja']) {
      const data = CrmTranslations[locale];
      expect(data).toBeDefined();
      expect(data.objects).toBeDefined();
      expect(Object.keys(data.objects!).length).toBeGreaterThan(0);
    }
  });

  it('should be an array-compatible TranslationBundle (plugin format)', () => {
    // Per @objectstack/spec, plugin translations should be registered as TranslationBundle[]
    const asArray = [CrmTranslations];
    expect(Array.isArray(asArray)).toBe(true);
    expect(asArray.length).toBe(1);
    expect(() => TranslationBundleSchema.parse(asArray[0])).not.toThrow();
  });

  it('should have consistent object keys across all locales', () => {
    const enKeys = Object.keys(CrmTranslations.en.objects ?? {}).sort();
    const zhKeys = Object.keys(CrmTranslations['zh'].objects ?? {}).sort();
    const jaKeys = Object.keys(CrmTranslations['ja'].objects ?? {}).sort();
    expect(enKeys).toEqual(zhKeys);
    expect(enKeys).toEqual(jaKeys);
  });

  it('should have CRM objects (account, contact, lead, opportunity)', () => {
    const objects = CrmTranslations.en.objects ?? {};
    expect(objects).toHaveProperty('account');
    expect(objects).toHaveProperty('contact');
    expect(objects).toHaveProperty('lead');
    expect(objects).toHaveProperty('opportunity');
  });
});
