import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en.js';
import { zh } from './zh.js';
import { ja } from './ja.js';

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
 * Supported locales: en, zh, ja
 */
export const SupportTranslations: TranslationBundle = {
  en,
  zh,
  ja,
};
