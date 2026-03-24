import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en.js';
import { zh } from './zh.js';
import { ja } from './ja.js';

/**
 * Finance — Internationalization (i18n)
 *
 * Per-locale file splitting convention.
 * Supported locales: en, zh, ja
 */
export const FinanceTranslations: TranslationBundle = {
  en,
  zh,
  ja,
};
