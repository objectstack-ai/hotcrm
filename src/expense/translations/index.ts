// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/**
 * The expense module's translations, in the four locales the app declares
 * (hotcrm#2556). They come and go with the package that owns their targets,
 * as the other modules' do — `src/marketing/translations/index.ts` carries
 * the reasoning.
 *
 * ⚠️ A row for an item this package does not register belongs to the package
 * that does — `test/i18n-package-ownership.test.ts` holds every pack to that.
 * The expense's Project field is Project Delivery's, so its label is there.
 */
export const ExpenseTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'es-ES': esES,
};
