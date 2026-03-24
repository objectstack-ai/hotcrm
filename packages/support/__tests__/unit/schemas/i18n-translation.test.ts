import { describe, it, expect } from 'vitest';
import { TranslationBundleSchema } from '@objectstack/spec/system';
import { SupportTranslations } from '../../../src/translations/index.js';

describe('Support i18n Translations', () => {
  it('should be defined', () => {
    expect(SupportTranslations).toBeDefined();
  });

  it('should validate against TranslationBundleSchema', () => {
    expect(() => TranslationBundleSchema.parse(SupportTranslations)).not.toThrow();
  });

  it('should contain all supported locales', () => {
    expect(SupportTranslations).toHaveProperty('en');
    expect(SupportTranslations).toHaveProperty('zh');
    expect(SupportTranslations).toHaveProperty('ja');
  });

  it('should have non-empty objects section for each locale', () => {
    for (const locale of ['en', 'zh', 'ja']) {
      const data = SupportTranslations[locale];
      expect(data).toBeDefined();
      expect(data.objects).toBeDefined();
      expect(Object.keys(data.objects!).length).toBeGreaterThan(0);
    }
  });

  it('should be an array-compatible TranslationBundle (plugin format)', () => {
    const asArray = [SupportTranslations];
    expect(Array.isArray(asArray)).toBe(true);
    expect(asArray.length).toBe(1);
    expect(() => TranslationBundleSchema.parse(asArray[0])).not.toThrow();
  });

  it('should have consistent object keys across all locales', () => {
    const enKeys = Object.keys(SupportTranslations.en.objects ?? {}).sort();
    const zhKeys = Object.keys(SupportTranslations['zh'].objects ?? {}).sort();
    const jaKeys = Object.keys(SupportTranslations['ja'].objects ?? {}).sort();
    expect(enKeys).toEqual(zhKeys);
    expect(enKeys).toEqual(jaKeys);
  });

  it('should have Support objects (case, knowledge_article, queue)', () => {
    const objects = SupportTranslations.en.objects ?? {};
    expect(objects).toHaveProperty('case');
    expect(objects).toHaveProperty('knowledge_article');
    expect(objects).toHaveProperty('queue');
  });
});
