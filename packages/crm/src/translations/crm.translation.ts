import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en.js';
import { zhCN } from './zh-CN.js';
import { jaJP } from './ja-JP.js';

/**
 * CRM Sales Cloud — Internationalization (i18n)
 *
 * Demonstrates **per-locale file splitting** convention:
 * each language is defined in its own file (`en.ts`, `zh-CN.ts`, `ja-JP.ts`)
 * and assembled into a single `TranslationBundle` here.
 *
 * Enterprise-grade multi-language translations covering:
 * - 16 CRM objects: Account, Contact, Lead, Opportunity, Activity, Task, etc.
 * - Select-field option labels for each object
 * - App & navigation group labels
 * - Common UI messages, validation messages
 *
 * Supported locales: en, zh-CN, ja-JP
 */
export const CrmTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
};
