import { describe, it, expect } from 'vitest';
import { TranslationBundleSchema } from '@objectstack/spec/system';
import { MarketingTranslations } from '../../../src/translations/index.js';

describe('Marketing i18n Translations', () => {
  it('should be defined', () => {
    expect(MarketingTranslations).toBeDefined();
  });

  it('should validate against TranslationBundleSchema', () => {
    expect(() => TranslationBundleSchema.parse(MarketingTranslations)).not.toThrow();
  });

  it('should contain all supported locales', () => {
    expect(MarketingTranslations).toHaveProperty('en');
    expect(MarketingTranslations).toHaveProperty('zh-CN');
    expect(MarketingTranslations).toHaveProperty('ja-JP');
  });

  it('should have non-empty objects section for each locale', () => {
    for (const locale of ['en', 'zh-CN', 'ja-JP']) {
      const data = MarketingTranslations[locale];
      expect(data).toBeDefined();
      expect(data.objects).toBeDefined();
      expect(Object.keys(data.objects!).length).toBeGreaterThan(0);
    }
  });

  it('should be an array-compatible TranslationBundle (plugin format)', () => {
    const asArray = [MarketingTranslations];
    expect(Array.isArray(asArray)).toBe(true);
    expect(asArray.length).toBe(1);
    expect(() => TranslationBundleSchema.parse(asArray[0])).not.toThrow();
  });

  it('should have consistent object keys across all locales', () => {
    const enKeys = Object.keys(MarketingTranslations.en.objects ?? {}).sort();
    const zhKeys = Object.keys(MarketingTranslations['zh-CN'].objects ?? {}).sort();
    const jaKeys = Object.keys(MarketingTranslations['ja-JP'].objects ?? {}).sort();
    expect(enKeys).toEqual(zhKeys);
    expect(enKeys).toEqual(jaKeys);
  });

  it('should have Marketing objects (campaign, email_template, journey)', () => {
    const objects = MarketingTranslations.en.objects ?? {};
    expect(objects).toHaveProperty('campaign');
    expect(objects).toHaveProperty('email_template');
    expect(objects).toHaveProperty('journey');
  });
});
