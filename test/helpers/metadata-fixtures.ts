// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import stack from '../../objectstack.config';

/**
 * Derived views of `objectstack.config` shared by the dangling-reference guard
 * suites.
 *
 * `test/metadata-references.test.ts` had grown to 99,872 bytes against the
 * 100KB ceiling in `scripts/check-source-hygiene.mjs`, so #814 split it by
 * family into `metadata-references` (pages, forms, cross-surface),
 * `view-references`, `action-references` and `i18n-references`. All four
 * resolve names against the same derivations, and copying them four times
 * would mean four places to fix when one of them is wrong — which has already
 * happened once, to the locale-pack flatten documented below.
 *
 * This module holds no assertions and is not named `*.test.ts`, so vitest —
 * whose `include` collects only files under `test/` ending in `.test.ts` —
 * does not pick it up as a suite.
 */

export type AnyRec = Record<string, any>;
export const objects: AnyRec[] = (stack as any).objects ?? [];
export const pages: AnyRec[] = (stack as any).pages ?? [];
export const views: AnyRec[] = (stack as any).views ?? [];
export const profiles: AnyRec[] = (stack as any).permissions ?? [];
export const stackActions: AnyRec[] = (stack as any).actions ?? [];

export const objectNames = new Set(objects.map((o) => o.name));
export const profileNames = new Set(profiles.map((p) => p.name));

/**
 * Locale packs, flattened to `[locale, pack]` pairs.
 *
 * `stack.translations` holds ONE `TranslationBundle` keyed by locale
 * (`{ en: {...}, 'zh-CN': {...} }`) — NOT a list of per-locale records. A
 * `translations.find(t => t.locale === 'zh-CN')` therefore matches nothing and
 * silently turns its test into a no-op, which is how the navigation guard in
 * `test/action-references.test.ts` spent its life passing without asserting
 * anything.
 */
export const localePacks: [string, AnyRec][] = ((stack as any).translations ?? []).flatMap(
  (bundle: AnyRec) => Object.entries(bundle) as [string, AnyRec][],
);
export const packFor = (locale: string): AnyRec | undefined =>
  localePacks.find(([name]) => name === locale)?.[1];

/**
 * Audit columns the platform adds to every object. They are real at runtime
 * (`?sort=created_at desc` works) but never appear in the authored `fields`
 * map, so a reference to one is legitimate.
 */
const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by'];

/**
 * System objects the installed platform plugins actually register, verified
 * against the 16.1.0 bundles in node_modules:
 *   - @objectstack/platform-objects — sys_user, sys_email, sys_file, … (the
 *     large core set; only the ones app metadata references are listed here)
 *   - @objectstack/plugin-approvals — sys_approval, sys_approval_request,
 *     sys_approval_action, … (note: there is NO `sys_approval_process`)
 *   - the activity/comment timeline objects used by `record:activity` and the
 *     log_call / log_meeting actions
 * A reference to a `sys_*` name outside this set matches nothing at runtime.
 */
export const PLATFORM_OBJECTS = new Set([
  'sys_user',
  'sys_organization',
  'sys_team',
  'sys_email',
  'sys_email_template',
  'sys_file',
  'sys_attachment',
  'sys_notification',
  'sys_inbox_message',
  'sys_activity',
  'sys_comment',
  'sys_approval',
  'sys_approval_request',
  'sys_approval_action',
  'sys_approval_approver',
  'sys_approval_delegation',
]);

export const fieldsOf = (obj: string) => [
  ...Object.keys(objects.find((o) => o.name === obj)?.fields ?? {}),
  ...SYSTEM_FIELDS,
];

/** Walk an arbitrary metadata tree, yielding every node that has a `type`. */
export function* walk(node: unknown): Generator<AnyRec> {
  if (Array.isArray(node)) {
    for (const item of node) yield* walk(item);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const rec = node as AnyRec;
  if (typeof rec.type === 'string') yield rec;
  for (const value of Object.values(rec)) yield* walk(value);
}
