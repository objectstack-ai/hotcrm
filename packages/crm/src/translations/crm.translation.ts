import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en.js';
import { zh } from './zh.js';
import { ja } from './ja.js';

/**
 * CRM Sales Cloud — Internationalization (i18n)
 *
 * Demonstrates **per-locale file splitting** convention:
 * each language is defined in its own file (`en.ts`, `zh.ts`, `ja.ts`)
 * and assembled into a single `TranslationBundle` here.
 *
 * Enterprise-grade multi-language translations covering:
 * - 16 CRM objects: Account, Contact, Lead, Opportunity, Activity, Task, etc.
 * - Select-field option labels for each object
 * - App & navigation group labels
 * - Common UI messages, validation messages
 *
 * Supported locales: en, zh, ja
 */
export const CrmTranslations: TranslationBundle = {
  en,
  zh,
  ja,
};
