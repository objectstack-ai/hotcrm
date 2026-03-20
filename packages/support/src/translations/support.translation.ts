import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en.js';
import { zhCN } from './zh-CN.js';
import { jaJP } from './ja-JP.js';

/**
 * Customer Support — Internationalization (i18n)
 *
 * Per-locale file splitting convention:
 * each language is defined in its own file (`en.ts`, `zh-CN.ts`, `ja-JP.ts`)
 * and assembled into a single `TranslationBundle` here.
 *
 * Enterprise-grade multi-language translations covering:
 * - 23 Support objects: Case, Knowledge Article, SLA Policy, Queue, Chatbot, etc.
 * - Select-field option labels for each object
 * - App & navigation group labels
 * - Common UI messages, validation messages
 *
 * Supported locales: en, zh-CN, ja-JP
 */
export const SupportTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
};
