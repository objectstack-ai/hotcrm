// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';
import { bundle } from '../../sales/email-templates/_bundle';
import { en } from './en';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/**
 * Project Delivery — every `sys_email_template` row this package's `notify`
 * nodes name: four locale packs crossed with the two budget notices
 * (`project_budget_alert`) and the two notices that turn an expense on an
 * over or locked project back to Draft (`expense_project_approval`,
 * hotcrm#2556). `bundle()` comes along this module's edge into
 * sales, as `src/service/email-templates/` takes it.
 */
export const PsaEmailTemplates: EmailTemplateDefinition[] = bundle({
  'en-US': en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'es-ES': esES,
});
