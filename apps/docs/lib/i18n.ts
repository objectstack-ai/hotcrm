import { defineI18n } from 'fumadocs-core/i18n';

// Supported locales for the docs site.
// - en:      English (default; untranslated pages fall back to this)
// - zh-Hans: 简体中文 (Simplified Chinese)
// - zh-Hant: 繁體中文 (Traditional Chinese)
export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh-Hans', 'zh-Hant'],
  fallbackLanguage: 'en',
  // Default locale has no URL prefix (`/docs`); others use `/zh-Hans/docs`, `/zh-Hant/docs`.
  hideLocale: 'default-locale',
});
