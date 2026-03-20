import { describe, it, expect } from 'vitest';
import { TranslationBundleSchema } from '@objectstack/spec/system';
import { FinanceTranslations } from '../../../src/translations/index.js';

describe('Finance i18n Translations', () => {
  it('should be defined', () => {
    expect(FinanceTranslations).toBeDefined();
  });

  it('should validate against TranslationBundleSchema', () => {
    expect(() => TranslationBundleSchema.parse(FinanceTranslations)).not.toThrow();
  });

  it('should contain all supported locales', () => {
    expect(FinanceTranslations).toHaveProperty('en');
    expect(FinanceTranslations).toHaveProperty('zh-CN');
    expect(FinanceTranslations).toHaveProperty('ja-JP');
  });

  it('should have non-empty objects section for each locale', () => {
    for (const locale of ['en', 'zh-CN', 'ja-JP']) {
      const data = FinanceTranslations[locale];
      expect(data).toBeDefined();
      expect(data.objects).toBeDefined();
      expect(Object.keys(data.objects!).length).toBeGreaterThan(0);
    }
  });

  it('should be an array-compatible TranslationBundle (plugin format)', () => {
    const asArray = [FinanceTranslations];
    expect(Array.isArray(asArray)).toBe(true);
    expect(asArray.length).toBe(1);
    expect(() => TranslationBundleSchema.parse(asArray[0])).not.toThrow();
  });

  it('should have consistent object keys across all locales', () => {
    const enKeys = Object.keys(FinanceTranslations.en.objects ?? {}).sort();
    const zhKeys = Object.keys(FinanceTranslations['zh-CN'].objects ?? {}).sort();
    const jaKeys = Object.keys(FinanceTranslations['ja-JP'].objects ?? {}).sort();
    expect(enKeys).toEqual(zhKeys);
    expect(enKeys).toEqual(jaKeys);
  });

  it('should have Finance objects (contract, invoice, payment)', () => {
    const objects = FinanceTranslations.en.objects ?? {};
    expect(objects).toHaveProperty('contract');
    expect(objects).toHaveProperty('invoice');
    expect(objects).toHaveProperty('payment');
  });
});
