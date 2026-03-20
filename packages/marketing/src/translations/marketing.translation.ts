import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en.js';
import { zhCN } from './zh-CN.js';
import { jaJP } from './ja-JP.js';

/**
 * Marketing Cloud — Internationalization (i18n)
 *
 * Per-locale file splitting convention:
 * each language is defined in its own file (`en.ts`, `zh-CN.ts`, `ja-JP.ts`)
 * and assembled into a single `TranslationBundle` here.
 *
 * Enterprise-grade multi-language translations covering:
 * - 16 Marketing objects: Campaign, Email Template, Landing Page, Journey, A/B Test, etc.
 * - Select-field option labels for each object
 * - App & navigation group labels
 * - Common UI messages, validation messages
 *
 * Supported locales: en, zh-CN, ja-JP
 */
export const MarketingTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
};
