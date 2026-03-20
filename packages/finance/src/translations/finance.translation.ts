import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en.js';
import { zhCN } from './zh-CN.js';
import { jaJP } from './ja-JP.js';

/**
 * Finance — Internationalization (i18n)
 *
 * Per-locale file splitting convention.
 * Supported locales: en, zh-CN, ja-JP
 */
export const FinanceTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
};
