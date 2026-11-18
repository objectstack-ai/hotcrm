// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';
import { bundle, type TemplateVariables } from '../../sales/email-templates/_bundle';
import { en } from './en';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/** What each template reads, once for all four locales (`TemplateVariables`, hotcrm#2451). */
const VARIABLES: TemplateVariables = {
  'crm.expense_report_project_over': [{ name: 'name' }, { name: 'project' }],
  'crm.expense_report_project_locked': [{ name: 'name' }, { name: 'project' }],
};

/**
 * The expense module (hotcrm#2556) — every `sys_email_template` row this
 * package's `notify` nodes name: four locale packs crossed with the two
 * notices that turn an expense report on an over or locked project back to
 * Draft (`expense_report_project_approval`, hotcrm#2559). `bundle()` comes along this module's edge
 * into sales, as `src/service/email-templates/` takes it.
 */
export const ExpenseEmailTemplates: EmailTemplateDefinition[] = bundle({
  'en-US': en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'es-ES': esES,
}, VARIABLES);
