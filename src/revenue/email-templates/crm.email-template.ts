// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';
import { bundle, type TemplateVariables } from '../../sales/email-templates/_bundle';
import { en } from './en';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/** What each template reads, once for all four locales (`TemplateVariables`, hotcrm#2451). */
const VARIABLES: TemplateVariables = {
  'crm.quote_created': [{ name: 'quote_name' }],
};

/**
 * Revenue — every `sys_email_template` row this package's `notify` nodes name.
 *
 * Four locale packs crossed with one template name, `crm.quote_created`. `bundle()` is imported
 * along this module's edge into sales, the one deterministic home for a source
 * more than one package needs.
 */
export const RevenueEmailTemplates: EmailTemplateDefinition[] = bundle({
  'en-US': en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'es-ES': esES,
}, VARIABLES);
