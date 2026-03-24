import { describe, it, expect } from 'vitest';
import { TranslationBundleSchema } from '@objectstack/spec/system';
import { HRTranslations } from '../../../src/translations/index.js';

describe('HR i18n Translations', () => {
  it('should be defined', () => {
    expect(HRTranslations).toBeDefined();
  });

  it('should validate against TranslationBundleSchema', () => {
    expect(() => TranslationBundleSchema.parse(HRTranslations)).not.toThrow();
  });

  it('should contain all supported locales', () => {
    expect(HRTranslations).toHaveProperty('en');
    expect(HRTranslations).toHaveProperty('zh');
    expect(HRTranslations).toHaveProperty('ja');
  });

  it('should have non-empty objects section for each locale', () => {
    for (const locale of ['en', 'zh', 'ja']) {
      const data = HRTranslations[locale];
      expect(data).toBeDefined();
      expect(data.objects).toBeDefined();
      expect(Object.keys(data.objects!).length).toBeGreaterThan(0);
    }
  });

  it('should be an array-compatible TranslationBundle (plugin format)', () => {
    const asArray = [HRTranslations];
    expect(Array.isArray(asArray)).toBe(true);
    expect(asArray.length).toBe(1);
    expect(() => TranslationBundleSchema.parse(asArray[0])).not.toThrow();
  });

  it('should have consistent object keys across all locales', () => {
    const enKeys = Object.keys(HRTranslations.en.objects ?? {}).sort();
    const zhKeys = Object.keys(HRTranslations['zh'].objects ?? {}).sort();
    const jaKeys = Object.keys(HRTranslations['ja'].objects ?? {}).sort();
    expect(enKeys).toEqual(zhKeys);
    expect(enKeys).toEqual(jaKeys);
  });

  it('should have HR objects (employee, department, candidate)', () => {
    const objects = HRTranslations.en.objects ?? {};
    expect(objects).toHaveProperty('employee');
    expect(objects).toHaveProperty('department');
    expect(objects).toHaveProperty('candidate');
  });
});
