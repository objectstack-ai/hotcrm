// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';

/**
 * The one spelling of "a locale pack becomes `sys_email_template` rows",
 * shared by every package that owns notification templates.
 *
 * `EmailTemplateDefinition` carries ONE `locale` per row, so an n-language
 * bundle is n rows of the same `name` — that is the spec's own key, not a
 * convention this repo picked. Writing those rows out by hand would mean
 * repeating `name`, `category` and the row scaffolding four times per
 * template; here each locale pack states only what actually differs between
 * languages (the label and the two bodies) and this helper produces the rows.
 *
 * It lives in `src/sales/` because `src/service/` and `src/revenue/` both need
 * it: a source more than one package needs has one deterministic home, the
 * lowest package all its consumers depend on (AGENTS.md import rule 2), and
 * modules import it along their edge into sales — the same placement as
 * `flows/_guarded-iteration.ts` and `objects/_hook-api.ts`.
 */

/**
 * What one template looks like in ONE language — every field of
 * `EmailTemplateDefinition` whose value is genuinely per-locale.
 *
 * `label` is in here because it is the Studio display name an administrator
 * reads, so it localizes with the content; `name`, `category` and `active` are
 * not, and {@link bundle} supplies them once per row.
 */
export interface LocalizedEmailTemplate {
  /** Studio display label for this template, in this language. */
  label: string;
  /** Subject line; `{{var}}` holes are filled from the notify node's `templateData`. */
  subject: string;
  /** HTML body; same `{{var}}` holes. `bodyText` is derived by the service when omitted. */
  bodyHtml: string;
}

/** One language's face of every template a package owns, keyed by template name. */
export type EmailTemplatePack = Record<string, LocalizedEmailTemplate>;

/**
 * Cross a package's locale packs into the flat `(name, locale)` rows
 * `defineStack({ emailTemplates })` takes.
 *
 * ⚠️ The ENGLISH pack is registered under `en-US`, not `en`, and that is the
 * resolution ladder's doing rather than a style choice.
 * `EmailService.resolveAndRenderTemplate` matches `(name, locale)` EXACTLY,
 * then retries exactly once against its own `DEFAULT_TEMPLATE_LOCALE` — the
 * literal `'en-US'`. A recipient whose `sys_user.locale` is this app's default
 * `'en'` therefore misses on the first probe and lands on the second; a
 * recipient carrying `'en-US'` (or any locale this app ships no pack for)
 * lands on it directly. Tagging the rows `'en'` instead would invert that:
 * `'en-US'` is a truthy preferred locale, so the third probe is skipped and
 * the send fails with `TEMPLATE_NOT_FOUND`. `'en-US'` is the tag that cannot
 * strand a recipient.
 */
export const bundle = (packs: Record<string, EmailTemplatePack>): EmailTemplateDefinition[] =>
  Object.entries(packs).flatMap(([locale, pack]) =>
    Object.entries(pack).map(([name, row]) => ({ name, locale, category: 'workflow' as const, ...row })));
