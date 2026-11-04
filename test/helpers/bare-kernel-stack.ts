// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The app's stack for a HAND-ROLLED kernel — one that boots `ObjectQLPlugin`
 * and `AppPlugin` directly, without the platform's sharing plugin.
 *
 * Since #2395 the app declares ownership queues and assignment rules
 * (ADR-0142), and on 18.3.0 `ObjectQLPlugin` refuses to boot a stack that
 * declares them with no `ownership-queue` service registered: that service
 * lives in `@objectstack/plugin-sharing`. A bare rig measures something else
 * (a cascade, a roll-up, a freeze guard, a date bucket), so it boots the stack
 * with those two keys emptied, and an ownerless insert stays ownerless there,
 * as it did on an unstaffed pool before. Ownership routing itself is measured
 * on the full app in `test/ownership-queues.test.ts`.
 */
export const withoutOwnershipQueues = <T>(stack: T): T => {
  type Rec = Record<string, unknown>;
  /** Drop the two keys where they are; never add them where they are not (an artifact entry refuses unknown keys). */
  const strip = (s: Rec): Rec => {
    const { queues: _q, assignmentRules: _r, ...rest } = s;
    return rest;
  };
  const top = stack as Rec;
  // `objectstack.config.ts` is a composition (`{ manifest, packages, i18n }`):
  // each package entry carries its own collections under `manifest`. A flat
  // stack carries them itself.
  if (!Array.isArray(top.packages)) return strip(top) as T;
  return {
    ...top,
    packages: (top.packages as Rec[]).map((entry) =>
      entry.manifest && typeof entry.manifest === 'object' ? { ...entry, manifest: strip(entry.manifest as Rec) } : strip(entry)),
  } as T;
};
