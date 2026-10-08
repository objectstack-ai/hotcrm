// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { vi } from 'vitest';
import { QuickJSScriptRunner, hookBodyRunnerFactory } from '@objectstack/runtime';
import { extractHookBody } from '@objectstack/cli/hook-body';
import { bootStackOnce, type BootOptions, type VerifyStack } from '@objectstack/verify';
import { RecordChangeTriggerPlugin } from '@objectstack/trigger-record-change';
import { MessagingServicePlugin } from '@objectstack/service-messaging';
import { ApprovalsServicePlugin } from '@objectstack/plugin-approvals';
import { AuditPlugin } from '@objectstack/plugin-audit';
import { EmailServicePlugin } from '@objectstack/plugin-email';
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
 * (`src/sales/index.ts`) and the platform's always-on slate resolve to. Five of
 * those decide behaviour the suites pin, and the boot without them was
 * MEASURED to lack them (no `sys_inbox_message`, no `sys_approval_request`, no
 * `sys_activity`, no `sys_email`, and no record-change flow fired on a write):
 *
 *  - `triggers`   → `RecordChangeTriggerPlugin` — a write fires the
 *                   `record_change` flows bound to it, as on a real install;
 *  - `approvals`  → `ApprovalsServicePlugin` — the `approval` flow node;
 *  - `messaging`  → `MessagingServicePlugin` — the `notify` flow node delivers
 *                   to the inbox instead of degrading to a logged no-op;
 *  - audit        → `AuditPlugin` — `sys_activity` / `sys_comment`, which the
 *                   activity action bodies write (paired with auth+security by
 *                   `objectstack serve`);
 *  - email        → `EmailServicePlugin` — `sys_email`, which `send_email`
 *                   writes (always-on in the platform's capability slate).
 *
 * `extraPlugins` is the slot the handle documents for exactly this. The
 * capability → plugin mapping itself is the CLI's `CAPABILITY_PROVIDERS`,
 * which is not exported, so the five are named here: that list is the one
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

/**
 * The app's boot options, with fresh plugin instances — a plugin instance
 * belongs to the one kernel it is registered on. `overrides` is for a suite
 * whose subject IS another boot dimension (the datasource, say), and that
 * suite says why beside its call.
 */
export const bootOptions = (overrides: Partial<BootOptions> = {}): BootOptions => ({
  automation: true,
  extraPlugins: [
    new MessagingServicePlugin(),
    new ApprovalsServicePlugin(),
    new AuditPlugin(),
    new EmailServicePlugin(),
    new RecordChangeTriggerPlugin(),
  ],
  ...overrides,
});

export const HOTCRM_BOOT: BootOptions = bootOptions();

/** The app's stack — one boot per module registry (see above). */
export const hotcrmStack = (): Promise<VerifyStack> => bootStackOnce(artifact, HOTCRM_BOOT);

/**
 * The app on the SPARSE datasource (`driver-memory`): a column a row was never
 * written with comes back ABSENT rather than NULL — the shape `driver-mongodb`
 * also produces, and the one AGENTS.md's predicate-totality rule is about. Only
 * for a suite whose claim is about that shape.
 */
export const HOTCRM_MEMORY_BOOT: BootOptions = bootOptions({ databaseDriver: 'memory' });
export const hotcrmMemoryStack = (): Promise<VerifyStack> => bootStackOnce(artifact, HOTCRM_MEMORY_BOOT);

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

type Row = Record<string, any>;

/** A signed-up person: their bearer token and their user id. */
export interface Person {
  token: string;
  id: string;
}

/**
 * Sign up a person and give them the standing a fixture names — position rows
 * (`sys_user_position.position` holds the position NAME, which is what
 * `expandPositionUsers` filters on) and permission-set grants
 * (`sys_user_permission_set.permission_set_id`, the set's row id).
 *
 * Fixture SETUP, written as the system through `seed`, the way the platform's
 * own bootstrap writes RBAC rows: the person is not the surface under test, and
 * routing their provisioning through a caller's data door would make the proof
 * depend on that caller's grants. A fresh sign-up is a plain member until then.
 */
export async function signUpPerson(
  stack: VerifyStack,
  email: string,
  opts: { name?: string; positions?: string[]; permissionSets?: string[] } = {},
): Promise<Person> {
  const token = await stack.signUp(email, undefined, opts.name);
  const id = String((await stack.contextFor(token)).userId);
  for (const position of opts.positions ?? []) {
    await stack.seed('sys_user_position', [{ user_id: id, position }]);
  }
  for (const name of opts.permissionSets ?? []) {
    const [set] = await stack.rows('sys_permission_set', { name });
    if (!set) throw new Error(`no permission set named "${name}" is registered on this stack`);
    await stack.seed('sys_user_permission_set', [{ user_id: id, permission_set_id: set.id }]);
  }
  return { token, id };
}

/**
 * The run history of `flowName` for the record `recordId` triggered — the
 * engine's own `sys_automation_run` rows, `summary_json` parsed. A
 * record-triggered flow's result never reaches the writer whose save fired it,
 * so this is where its verdict is read: `status`, `error`, and the summary's
 * per-node and per-gate accounting. No row at all means the start condition
 * did not hold (the engine records no run for a trigger it declined).
 */
export async function flowRuns(stack: VerifyStack, flowName: string, recordId: string): Promise<Row[]> {
  const rows = await stack.rows('sys_automation_run', { flow_name: flowName, trigger_record_id: recordId });
  return rows.map((r) => ({ ...r, summary: r.summary_json ? JSON.parse(String(r.summary_json)) : undefined }));
}

/**
 * The notifications addressed to `userId` (optionally of one `topic`) — the
 * messaging outbox's `inbox`-channel rows, written inside the run that called
 * `notify`. The inbox row itself lands later, when the dispatcher drains the
 * outbox, so a count read off `sys_inbox_message` right after the write is a
 * race; this one is not. `payload` carries the template, its data and the
 * action URL.
 */
export const notificationsTo = (stack: VerifyStack, userId: string, topic?: string): Promise<Row[]> =>
  stack.rows('sys_notification_delivery', { recipient_id: userId, channel: 'inbox', ...(topic ? { topic } : {}) });

/**
 * Evaluate a flow condition on the booted stack's own automation service —
 * the evaluator every flow of this app runs its start conditions and edges
 * through — exactly as the engine does: a bare string start condition is
 * wrapped into its CEL envelope first. For a predicate whose fact is the
 * truth table itself, over record shapes no write can produce (a key a sparse
 * datasource omits, a prior row the engine did not read). The automation
 * service is a kernel service the handle does not front.
 */
export const conditionHolds = (stack: VerifyStack, condition: unknown, vars: Record<string, unknown>): boolean => {
  const automation = stack.kernel.getService<{ evaluateCondition(c: unknown, v: Map<string, unknown>): boolean }>('automation');
  const expr = typeof condition === 'string' ? { dialect: 'cel', source: condition } : condition;
  return automation.evaluateCondition(expr, new Map(Object.entries(vars)));
};

// ─────────────────────── the doors the handle does not have (platform gaps) ────
//
// What this app's business facts turn on and the 17.7.0 handle has no door
// for keeps ONE local path each here — the engine's own `objectql` /
// `automation` service on the verify-booted kernel, nothing re-implemented —
// until the handle grows one. Each is reported upstream as a platform gap;
// ⛔ a fact that needs another path is a new gap to report, not a helper to
// grow here.

/** The system context the platform's own automation and seed loader write under. */
const SYSTEM = { isSystem: true } as const;

/**
 * A system-context UPDATE (no user, no session). `seed` is the handle's system
 * door and it only inserts; `hooks.run` always runs as a signed-in person.
 */
export const systemUpdate = (stack: VerifyStack, object: string, doc: Row): Promise<Row> =>
  stack.kernel.getService<Row>('objectql').update(object, doc, { where: { id: doc.id }, context: SYSTEM });

/**
 * A PREDICATE (bulk) UPDATE as `as`: one payload for every row `where`
 * matches (`multi: true`) — the engine's `updateMany` dispatch. `hooks.run`
 * addresses exactly one row by `input.id`, and the REST bulk ingress
 * (`POST /data/:object/updateMany`) iterates by-id updates, so the handle has no
 * door onto the predicate path at all.
 */
export const predicateUpdate = async (
  stack: VerifyStack,
  object: string,
  doc: Row,
  where: Row,
  as: string,
): Promise<unknown> =>
  stack.kernel.getService<Row>('objectql').update(object, doc, { where, multi: true, context: await stack.contextFor(as) });

/**
 * A GUEST write: an anonymous public-form submission (web-to-case /
 * web-to-lead) — no user AND no `isSystem`, the context the app's guest
 * branches key on. The platform's anonymous door is `POST /forms/:slug/submit`
 * (`@objectstack/rest` `registerFormEndpoints`), which writes under exactly
 * this execution context: the form's one-object grant, the `guest_portal`
 * permission set, `anonymous`. The handle's dispatcher does not serve that
 * route (measured on 17.7.0: `ENDPOINT_NOT_FOUND`), `hooks.run` needs a
 * signed-in person, `seed` is the most trusted caller there is, and an
 * unauthenticated `POST /api/v1/data/<object>` answers 401, so the handle
 * offers no way to reach that branch at all. The door also drops every key the
 * form does not collect; a fixture that passes another key is modelling a form
 * that collects it.
 */
export const guestInsert = (stack: VerifyStack, object: string, doc: Row): Promise<Row> =>
  stack.kernel.getService<Row>('objectql').insert(object, doc, {
    context: { publicFormGrant: { object }, permissions: ['guest_portal'], anonymous: true },
  });

/**
 * Run a record-triggered flow on `record` through the booted automation
 * service, the way the record-change trigger hands it a write, with no trigger
 * user — for the two triggers no handle door produces. Every write door fires a
 * record flow on a row the engine just wrote, as a person (`hooks.run`) or not
 * at all (`seed` skips record-change flows, as the platform's seed replay
 * does). So neither a USER-LESS trigger (an integration's or a system job's
 * write) nor a record the engine no longer holds (deleted between the trigger
 * and the flow's `get_record`) has a door. Resolves with the engine's own
 * result.
 */
export const runRecordFlow = (stack: VerifyStack, flowName: string, object: string, record: Row): Promise<Row> =>
  stack.kernel.getService<Row>('automation').execute(flowName, {
    record, object, event: 'record_change', params: { ...record },
  });

/** One write the engine received while a recorder was attached. */
export interface EngineWrite {
  op: 'insert' | 'update' | 'delete';
  object: string;
  /**
   * The argument list as the caller handed it over — each plain-object argument
   * copied at call time, because the engine's own `before*` hooks write into
   * the document in place afterwards.
   */
  args: unknown[];
  /** How the engine answered it — awaited by a suite that must see an `async` hook finish. */
  settled: Promise<{ ok: true; value: unknown } | { ok: false; error: unknown }>;
}

/**
 * Watch the writes the engine receives — and, for a suite whose fact is about
 * what happens when one is REFUSED, refuse it.
 *
 * Two things the handle cannot show: what a hook HANDED the engine (a refused
 * write leaves no row to read back), and when an `async: true` hook has
 * finished (the write that fired it has already returned). Both are read off
 * the real engine's own `insert` / `update` / `delete`, through a spy that
 * calls straight through; `fault` swaps one call's answer for a rejection,
 * which is how "the engine refused this write" is staged without a stand-in
 * engine. `restore()` detaches it — call it in a `finally`.
 */
export function recordEngineWrites(
  stack: VerifyStack,
  fault?: (op: EngineWrite['op'], object: string, args: unknown[]) => Error | undefined,
) {
  const ql = stack.kernel.getService<Row>('objectql');
  const writes: EngineWrite[] = [];
  const spies = (['insert', 'update', 'delete'] as const).map((op) => {
    const real = ql[op].bind(ql) as (...args: unknown[]) => Promise<unknown>;
    return vi.spyOn(ql, op).mockImplementation(((...args: unknown[]) => {
      const object = String(args[0]);
      const handedOver = args.map((a) => (a && typeof a === 'object' && !Array.isArray(a) ? { ...(a as Row) } : a));
      const injected = fault?.(op, object, args);
      const answer = injected ? Promise.reject(injected) : real(...args);
      writes.push({
        op, object, args: handedOver,
        settled: answer.then((value) => ({ ok: true as const, value }), (error) => ({ ok: false as const, error })),
      });
      return answer;
    }) as never);
  });
  return {
    writes,
    /** The writes one object received, optionally of one kind. */
    of: (object: string, op?: EngineWrite['op']) =>
      writes.filter((w) => w.object === object && (op === undefined || w.op === op)),
    restore: () => { for (const spy of spies) spy.mockRestore(); },
  };
}

/** Today as `YYYY-MM-DD`, on the UTC calendar — matching what the hooks stamp. */
export const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * `YYYY-MM-DD` `days` from now (negative for the past), on the **UTC calendar
 * throughout** — the same calendar `today()` renders on, and the one the
 * platform resolves a bare `{TODAY()}` token to.
 *
 * ⚠️ The arithmetic must NOT go through `setDate`/`getDate`. Those read and
 * write the **local** calendar, and rendering the result with `toISOString()`
 * then mixes two calendars inside one expression. Across a DST spring-forward
 * the local day is 23 h long, so a `setDate` shift preserves wall-clock time and
 * the instant lands one UTC day late. No run at `TZ=UTC` can catch that.
 */
export const daysFromNow = (days: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Run a hook the way the SHIPPED artifact runs it: the body `objectstack build`
 * lowers it to (the platform's own `extractHookBody`), in the runtime's QuickJS
 * sandbox (`hookBodyRunnerFactory`), against the real engine of the booted
 * stack. Resolves with the write's input after the sandbox wrote its mutations
 * back; rejects with what the shipped path throws (`SandboxError`).
 *
 * The handle boots the source config, so every write through it runs a hook's
 * handler in-process — the one form production never runs. A fact that is
 * about the SHIPPED path itself (what a REST caller receives when a lowered
 * body refuses) has no door on the 17.7.0 handle; this is its one path,
 * reported upstream. Every other suite drives hooks through `hooks.run`.
 */
let shippedRunner: QuickJSScriptRunner | undefined;
export async function runShippedHook(
  stack: VerifyStack,
  hook: Row,
  ctx: { event: string; input?: Row; previous?: Row; as?: string },
): Promise<Row> {
  const { source, capabilities } = extractHookBody(hook.handler, `hook '${String(hook.name)}'`);
  const bind = hookBodyRunnerFactory((shippedRunner ??= new QuickJSScriptRunner()), {
    ql: stack.kernel.getService('objectql') as never,
    appId: 'hotcrm',
  });
  const handler = bind({
    name: hook.name, object: hook.object, events: hook.events,
    body: { language: 'js', source, capabilities, timeoutMs: 5000 },
  } as never);
  if (!handler) throw new Error(`hook ${String(hook.name)}: the platform refused its lowered body`);
  // The caller, as the platform resolves them — the execution context the
  // engine hands every hook, which is what the sandbox's `ctx.api` reads under.
  const executionContext = ctx.as ? await stack.contextFor(ctx.as) : undefined;
  const user = executionContext?.userId ? { id: executionContext.userId } : undefined;
  const input: Row = { ...(ctx.input ?? {}) };
  await handler({ event: ctx.event, input, previous: ctx.previous, user, executionContext, object: hook.object });
  return input;
}
