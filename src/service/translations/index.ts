// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationBundle } from '@objectstack/spec/system';
import { en } from './en';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/**
 * The support module's translations, in the four locales the app declares.
 *
 * A package translates the items it registers: its objects, the navigation
 * ids it contributes into the app (`apps.crm_enterprise.navigation.ID`, the
 * contributed ids alone), its dashboard, dataset, page, flows and reports.
 * While these rows sat in the app package's packs, `os validate` with this
 * module absent refused every one of them as `translation-target-unknown`
 * (ledger rows S3 and S4, `docs/architecture/module-split-hard-edges.md`);
 * here they come and go with the package that owns their targets (#2352).
 *
 * The platform loads each package's bundles into one i18n service that
 * deep-merges them per locale, so the console resolves these keys exactly as
 * it did from the app's pack. The locale SET is still the app's: `i18n` is a
 * single-valued stack key, declared once, in `src/sales/index.ts`.
 *
 * ⚠️ A row for an item this package does not register belongs to the package
 * that does — `test/i18n-package-ownership.test.ts` holds every pack to that.
 */
export const ServiceTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'es-ES': esES,
};
