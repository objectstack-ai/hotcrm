// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';

import { enUS } from './en-US';
import { zhCN } from './zh-CN';
import { jaJP } from './ja-JP';
import { esES } from './es-ES';

/**
 * Email template barrel — the `sys_email_template` rows every `notify` node
 * resolves at delivery time.
 *
 * One template NAME per notification, four ROWS per name: the bundle is keyed
 * `(name, locale)` and the delivery path picks the row for the recipient's own
 * `sys_user.locale` after fan-out, so two people on one notification really do
 * read it in two languages. Per-locale file split, the same convention
 * `src/translations/` uses — see `en-US.ts` for why the English rows are
 * tagged `en-US` rather than `en`.
 */
export const CrmNotificationTemplates: EmailTemplateDefinition[] = [...enUS, ...zhCN, ...jaJP, ...esES];
