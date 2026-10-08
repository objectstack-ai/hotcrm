// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { bootStackOnce, type BootOptions, type VerifyStack } from '@objectstack/verify';
import { RecordChangeTriggerPlugin } from '@objectstack/trigger-record-change';
import { MessagingServicePlugin } from '@objectstack/service-messaging';
import { ApprovalsServicePlugin } from '@objectstack/plugin-approvals';
import { AuditPlugin } from '@objectstack/plugin-audit';
import artifact from '../../objectstack.config';

/**
 * The app, booted through the platform's own in-process handle.
 *
 * Every suite that needs the real engine — a hook, a flow, an action, the
 * runtime registry — reaches it through `@objectstack/verify`'s `bootStackOnce`
 * over the SHIPPED artifact (`objectstack.config`, both packages, as
 * `packages[]`). Nothing here executes anything: the boot, the write door
 * (`hooks.run` / `seed` / `rows`), the flow door (`flows.run` /
 * `flows.resume`), the action door (`actions.run`) and the registry
 * (`metadata`) are the platform's.
 *
 * ### Why one shared options object
 *
 * `bootStackOnce` memoises by (`config`, `opts`) IDENTITY. Every suite passes
 * this one constant, so every suite asking for "the app" gets one boot per
 * module registry instead of one per call. A suite that needs a different
 * boot (another driver, a tenancy posture, an override SecurityPlugin) calls
 * `bootStack` / `bootStackOnce` with its own options and says why.
 *
 * ### `extraPlugins` — the capabilities this app declares that the lean boot omits
 *
 * `bootStack` mounts objectql, the datasource, auth, security, sharing,
 * settings, analytics and — with `automation: true` — the automation service.
 * `objectstack serve` additionally mounts what this app's `requires[]`
 * (`src/sales/index.ts`) and the platform's always-on slate resolve to. Four of
 * those decide behaviour the suites pin, and the boot without them was
 * MEASURED to lack them (no `sys_inbox_message`, no `sys_approval_request`, no
 * `sys_activity`, and no record-change flow fired on a write):
 *
 *  - `triggers`   → `RecordChangeTriggerPlugin` — a write fires the
 *                   `record_change` flows bound to it, as on a real install;
 *  - `approvals`  → `ApprovalsServicePlugin` — the `approval` flow node;
 *  - `messaging`  → `MessagingServicePlugin` — the `notify` flow node delivers
 *                   to the inbox instead of degrading to a logged no-op;
 *  - audit        → `AuditPlugin` — `sys_activity` / `sys_comment`, which the
 *                   activity action bodies write (paired with auth+security by
 *                   `objectstack serve`).
 *
 * `extraPlugins` is the slot the handle documents for exactly this. The
 * capability → plugin mapping itself is the CLI's `CAPABILITY_PROVIDERS`,
 * which is not exported, so the four are named here: that list is the one
 * local path this boot keeps, reported upstream as a platform gap rather than
 * grown.
 *
 * ### What a suite sharing this boot must not assume
 *
 * The boot replays the app's seed data (`data[]`), exactly as `objectstack
 * dev` does, and every test in a file writes into the same database. So a
 * suite scopes every read to the rows it wrote (by id, or by a value only its
 * fixture carries), never asserts an exact count over a whole object, and
 * never calls `stop()`.
 */
process.env.OS_REGISTRY_LOG ??= 'silent';

export const HOTCRM_BOOT: BootOptions = {
  automation: true,
  extraPlugins: [
    new MessagingServicePlugin(),
    new ApprovalsServicePlugin(),
    new AuditPlugin(),
    new RecordChangeTriggerPlugin(),
  ],
};

/** The app's stack — one boot per module registry (see above). */
export const hotcrmStack = (): Promise<VerifyStack> => bootStackOnce(artifact, HOTCRM_BOOT);

/**
 * The names of every object the booted runtime registers that this app does
 * not author — the platform's objects, read from the registry rather than from
 * any package roster.
 */
export const platformObjectNames = (stack: VerifyStack, appObjectNames: ReadonlySet<string>): Set<string> =>
  new Set(stack.metadata.objects().map((o) => o.name).filter((n) => !appObjectNames.has(n)));

/** Every field the runtime registers on `object` — authored and system-injected. */
export const registeredFields = (stack: VerifyStack, object: string): string[] =>
  Object.keys(stack.metadata.object(object)?.fields ?? {});
