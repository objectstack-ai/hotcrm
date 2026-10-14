// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { composeStacks } from '@objectstack/spec';

// The two package stacks, built — see `objectstack.composition.ts`, which also
// resolves the `HOTCRM_COMPOSITION` knob and records why that work cannot live
// in this file (⛔ this module may carry no named export: the build parses it
// against a `.strict` stack schema and fails on any key but the default).
import { serviceStack, appStack } from './objectstack.composition.js';

/**
 * ONE release artifact, TWO packages (ADR-0130 D4).
 *
 *  - `app.objectstack.hotcrm` (`src/sales/index.ts`) — the `type: 'app'`
 *    package a customer installs: sales, plus the `src/revenue/` and
 *    `src/marketing/` directories it still registers, the app and its
 *    navigation groups, the permission sets, the locale packs.
 *  - `app.objectstack.hotcrm.service` (`src/service/index.ts`) — the support
 *    module: cases and knowledge, and the five navigation entries it
 *    contributes into the app's groups.
 *
 * `manifest: 'preserve'` is the only option that separates "one artifact
 * carrying N packages" from the pick-one composition every other strategy
 * performs. It emits `packages[]`, one entry per input stack carrying that
 * package ASSEMBLED — its manifest plus the collections it owns. That list is
 * what `ObjectQL.registerApp` registers package by package, and it is where
 * per-package OWNERSHIP comes from. Each definition is carried ONCE, in the
 * body of the package that owns it: a multi-package artifact has no flattened
 * copy of its collections beside `packages[]` (ADR-0130 D4, 2026-09-22
 * addendum), so a reader wanting "every object of the app" resolves the
 * package bodies, as every platform reader does.
 *
 * The App package is LAST deliberately, and that is not the load-bearing half:
 *
 *  - the singular `manifest` is still picked by the default `'last'` rule, so
 *    the artifact identifies as the App a consumer installs (ADR-0019 D1),
 *    `app.objectstack.hotcrm`, not as one of its modules;
 *  - REGISTRATION order is decided by `dependencies` — the service module
 *    declares `app.objectstack.hotcrm`, and `packages[]` is sorted through the
 *    platform's one topological sorter (ADR-0130 D5, ADR-0116) — so the app
 *    registers first whatever slot it occupies here. An artifact that only
 *    worked because someone listed the packages in the right order is the
 *    failure ADR-0116 exists about, and it fails SILENTLY.
 *
 * `objectstack build` compiles this file into one `dist/objectstack.json`;
 * `objectstack dev` boots the same shape straight from source.
 */
export default composeStacks([serviceStack, appStack], { manifest: 'preserve' });
