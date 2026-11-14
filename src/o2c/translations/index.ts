// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/**
 * The Order to Cash module's translations, in the four locales the app
 * declares: its objects, the navigation ids it contributes into the app
 * (`apps.crm_enterprise.navigation.ID`, the contributed ids alone) and its
 * manual. They come and go with the package that owns their targets, as the
 * marketing module's do — `src/marketing/translations/index.ts` carries the
 * reasoning. The menu GROUP's label is the app's, which keeps the group.
 *
 * ⚠️ A row for an item this package does not register belongs to the package
 * that does — `test/i18n-package-ownership.test.ts` holds every pack to that.
 */
export const O2cTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'es-ES': esES,
};
