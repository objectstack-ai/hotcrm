// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';
import { bundle } from './_bundle';
import { en } from './en';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/**
 * Sales — every `sys_email_template` row this package's `notify` nodes name.
 *
 * Four locale packs crossed with fourteen template names: the rows a
 * recipient's own `sys_user.locale` is resolved against, per recipient, after
 * fan-out. Assembled here the way `translations/crm.translation.ts` assembles
 * the UI locale packs — one file per language, one file that collects them.
 */
export const SalesEmailTemplates: EmailTemplateDefinition[] = bundle({
  'en-US': en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'es-ES': esES,
});
