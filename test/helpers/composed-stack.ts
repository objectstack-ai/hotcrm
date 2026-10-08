// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { composeStacks } from '@objectstack/spec';
import { SchemaRegistry } from '@objectstack/objectql';
import { serviceStack, appStack } from '../../objectstack.composition';

/**
 * Every collection of the app, in ONE stack — what the suites read.
 *
 * `objectstack.config.ts` composes the two package stacks with
 * `manifest: 'preserve'`, and a multi-package `preserve` composition carries
 * each definition ONCE, in the body of the package that owns it: the artifact
 * has `packages[]` and no flattened `objects` / `views` / `flows` / … beside
 * it (ADR-0130 D4, 2026-09-22 addendum). That is right for the artifact and
 * useless to a suite asking "every object of the app", which is the question
 * almost every suite here asks — they pin this app's business facts, and the
 * app a customer installs is the whole artifact, both packages.
 *
 * So this composes the SAME two built stacks with the platform's own
 * `composeStacks` in its default, flattening mode: every collection
 * concatenated in stack order (service first, the app last), objects merged
 * under the default `objectConflict: 'error'`, and the singular `manifest`
 * picked by the default `'last'` rule — the app package's, exactly as the
 * artifact's own `manifest` is. ⛔ Nothing here re-implements a platform
 * reader: it is the platform's composition over the very values the config
 * composes, and `test/package-ownership.test.ts` holds the two views to the
 * same contents.
 *
 * Two things this view deliberately does NOT carry, so a suite that needs them
 * reads them where they live:
 *
 *  - PER-PACKAGE ownership — read `objectstack.config`'s `packages[]`, or
 *    `serviceStack` / `appStack` from `objectstack.composition.ts`.
 *  - the service module's `navigationContributions` — they are part of its
 *    manifest, and the singular manifest here is the app's. Read
 *    `serviceStack.manifest.navigationContributions`.
 *
 * A suite that BOOTS the app (`new AppPlugin(…)`) hands it the real artifact,
 * `objectstack.config`, not this view: the registration path is part of what
 * such a suite measures.
 */
const composedStack = composeStacks([serviceStack, appStack]);

export default composedStack;

export type AnyRec = Record<string, any>;

/**
 * Locale packs, flattened to `[locale, pack]` pairs.
 *
 * `translations` holds ONE `TranslationBundle` keyed by locale
 * (`{ en: {...}, 'zh-CN': {...} }`) — NOT a list of per-locale records. A
 * `translations.find(t => t.locale === 'zh-CN')` therefore matches nothing and
 * silently turns its test into a no-op, which is how the navigation guard in
 * `test/action-references.test.ts` spent its life passing without asserting
 * anything.
 *
 * Read off the composed view rather than the booted registry on purpose: the
 * handle's `metadata` carries no translation type (`metadata.types()` lists
 * none), and the locale packs are authored app metadata, not a runtime fact.
 */
export const localePacks: [string, AnyRec][] = ((composedStack as AnyRec).translations ?? []).flatMap(
  (bundle: AnyRec) => Object.entries(bundle) as [string, AnyRec][],
);
export const packFor = (locale: string): AnyRec | undefined =>
  localePacks.find(([name]) => name === locale)?.[1];

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

/**
 * Every app of the artifact AS SERVED — each package's `navigationContributions`
 * folded into the app's navigation tree by the platform's own fold.
 *
 * The service module puts five entries into the app's menu through its
 * manifest (`nav_case`, `nav_knowledge`, `nav_service_dashboard`,
 * `nav_my_cases`, `nav_report_sla`), so the app's AUTHORED `navigation` no
 * longer carries them, and a suite that walks it alone would call them
 * unreachable. What a user sees is the folded tree:
 * `SchemaRegistry.applyNavContributions` — the method `GET /api/v1/meta/app`
 * serves through — appends each contribution into the group it names, in
 * `priority` order, after the group's own children. This registers the same two
 * package stacks into a bare registry and reads the apps back through it, so
 * the order a suite sees is the order the console renders, and ⛔ no suite
 * re-implements the fold.
 */
export const servedApps = (): AnyRec[] => {
  const registry = new SchemaRegistry();
  for (const stack of [serviceStack, appStack] as AnyRec[]) {
    const packageId = String(stack.manifest?.id);
    for (const app of (stack.apps ?? []) as AnyRec[]) registry.registerApp(app, packageId);
    for (const contribution of (stack.manifest?.navigationContributions ?? []) as AnyRec[]) {
      registry.registerAppNavContribution(contribution as never, packageId);
    }
  }
  return registry.getAllApps() as AnyRec[];
};

/**
 * One app AS SERVED, by name — see {@link servedApps}. Throws rather than
 * answering `undefined`: a suite walking an empty navigation tree passes over
 * nothing, which is the failure every navigation pin here guards against.
 */
export const servedApp = (name: string): AnyRec => {
  const app = servedApps().find((candidate) => candidate.name === name);
  if (!app) throw new Error(`no app named "${name}" is registered by any package of the artifact`);
  return app;
};
