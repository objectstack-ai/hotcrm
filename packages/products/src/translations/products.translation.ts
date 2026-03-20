import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en.js';
import { zhCN } from './zh-CN.js';
import { jaJP } from './ja-JP.js';

/**
 * Products & Pricing — Internationalization (i18n)
 *
 * Per-locale file splitting convention.
 * Supported locales: en, zh-CN, ja-JP
 */
export const ProductsTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
};
