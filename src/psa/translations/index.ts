// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/**
 * The PSA module's translations, in the four locales the app declares. In
 * phase 0 that is its own app's label and the groups and entry it declares;
 * they come and go with the package that owns their targets, as the order-to-
 * cash module's do — `src/marketing/translations/index.ts` carries the
 * reasoning.
 *
 * ⚠️ A row for an item this package does not register belongs to the package
 * that does — `test/i18n-package-ownership.test.ts` holds every pack to that.
 */
export const PsaTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'es-ES': esES,
};
