// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';
import {
  createCaseRoundRobinAssign,
  createCaseEscalationReassign,
  createCaseSelfClaim,
} from './_case-assignment';

/**
 * Case SLA & escalation hook.
 *
 * - Stamps `sla_due_date` on a case that has none, from the priority × account
 *   tier matrix in `_case-sla.ts` (⚠️ CALENDAR hours — this app has no
 *   business-hours calendar and the deadline does not skip nights, weekends or
 *   holidays).
 * - On escalation: creates a follow-up task OWNED BY the account owner (the
 *   single owner of escalation tasks — flows must not create their own).
 *   Owning it, not merely labelling it: `owner_id` is the one ownership column,
 *   so the person the task names is the person who can work it.
 * - On `resolved`: bumps account `last_activity_date`.
 *
 * ⚠️ Ownership assignment is NOT here: all three answers to "who should own
 * this case" live in `_case-assignment.ts` — the ownerless-intake round-robin,
 * the escalation hand-off to the `service_manager` pool, and the triage
 * self-claim. One module, so the app never grows two independently-authored
 * ownership paths on `crm_case`; its hooks are composed into this module's
 * default export below, so the registry still sees one `crm_case` hook set. In
 * particular the escalation hand-off is deliberately NOT a branch of
 * `case_status_side_effects` below: that hook writes through `ctx.api`, a seam
 * the #3004 transfer guard CAN see (which would demand
 * `crm_case.allowTransfer`) and a second write that re-enters the record-change
 * trigger surface. Both measurements are in `_case-assignment.ts`'s header.
 */

const caseValidation: Hook = {
  name: 'case_sla_defaults',
  object: 'crm_case',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Apply the priority × account-tier SLA matrix and the case lifecycle defaults.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const api = ctx.api as HookApi | undefined;

    // Guest (web-to-case) sanitisation. OVERWRITE with a safe value — never
    // `delete`.
    //
    // ⛔ Platform constraint: `delete ctx.input.<field>` in a hook is a SILENT
    // NO-OP. ObjectQL hands a hook `ctx.input` as `{ data, options }` and swaps
    // in a flat-record Proxy over it (`installFlatInput`, `@objectstack/objectql`
    // `src/hook-wrappers.ts`). That Proxy traps `get` / `set` / `has` /
    // `ownKeys` / `getOwnPropertyDescriptor` and routes each into `data` — but
    // it declares NO `deleteProperty` trap. A missing trap falls back to
    // `Reflect.deleteProperty(target, key)` on the WRAPPER, one level above the
    // record, so the delete removes a key that was never there:
    //
    //   delete input.owner_id   -> returns TRUE  (JS reports success)
    //   'owner_id' in input     -> still true
    //   input.owner_id          -> still the caller's value
    //   Object.keys(input)      -> still lists it
    //
    // Every read-back agrees the delete worked; the client's value reaches the
    // stored row. Assignment survives because `set` is trapped and writes into
    // `data`, which is the object the engine persists. Hence: assign, and never
    // trust `delete` here.
    //
    // ⚠️ `null` rather than `''` or `undefined`, all three measured on the
    // write path: `null` stores as null, `''` stores as an empty string (wrong
    // in a lookup — see `case_resolution_article_normalize` below), and
    // `undefined` stores the KEY with an undefined value rather than omitting
    // it, which is not the same as absent and is what a `has()`-guarded CEL
    // predicate then trips over. `null` is also what the downstream owner
    // writer reads as "ownerless": `case_auto_assign` stands down only on a
    // non-empty STRING `owner_id`, so a nulled column still reaches the
    // round-robin.
    //
    // ⚠️ `!ctx.session?.isSystem` is load-bearing. A predicate of
    // `!ctx.previous && !ctx.user?.id` conflates the two callers that both
    // arrive without a user id: an anonymous web-to-case submitter (untrusted,
    // the caller this branch exists for) and a SYSTEM write — seed load,
    // backfill, demo bootstrap, migration — the most trusted caller there is.
    // Elsewhere in this app that same absence is read the opposite way:
    // `lead_automation`'s converted-lead lock treats `!ctx.user?.id` as "system
    // write, allow it". Without the narrowing, a system insert that names an
    // owner has that owner blanked and every seeded or backfilled case lands
    // ownerless (eight cases in `test/unassigned-case-triage-reach.test.ts`
    // insert owned cases exactly that way). `ctx.session.isSystem` is the
    // discriminator: a system context arrives as `session: { isSystem: true }`
    // and an anonymous one carries no session at all. Narrowing only ever
    // REMOVES callers from the branch, so nothing sanitised today stops being.
    //
    // `escalation_reason` is stripped ALONGSIDE `is_escalated`, and the pair is
    // why: cleaning only the FLAG leaves the prose that explains the flag
    // writable, so a case could carry a stated escalation reason while
    // `is_escalated` is false — a contradiction on the record page's own
    // `escalation` field group, where a service agent reads both. It IS a
    // widening of a security control, so it is argued rather than assumed:
    // `escalation_reason` is pipeline, not a fact a submitter states about
    // themselves — the rule this branch declares — and every real writer is
    // staff-side (`case_escalation`, `case_sla_monitor`, the `escalate_case`
    // screen flow). The public `web_to_case` form (`src/views/case.view.ts`)
    // collects exactly `subject`, `description`, `type` and `priority`, so
    // nulling this drops nothing any guest surface asks for. `guest_portal`
    // grants `crm_case.allowCreate` at the OBJECT level with no field
    // allow-list, which is precisely why this branch is the field-level control
    // and why an omission from it is a hole rather than a second layer.
    //
    // ⚠️ What is measured here is the HOOK-LEVEL control. A real anonymous
    // write also crosses `plugin-security`'s middleware, and nobody has
    // measured that path — so this is coherence and defence in depth, NOT a
    // claim that a guest reaches the column in production.
    //
    // Nulling `escalation_reason` cannot trip the object's
    // `escalation_reason_required` validation: that rule fires only on
    // `is_escalated == true`, this same branch forces `is_escalated = false`,
    // and on the engine's insert path `validateRecord` /
    // `evaluateValidationRules` run AFTER the `beforeInsert` hooks, against the
    // row the hook has already rewritten.
    const isGuestSubmission = !ctx.previous && !ctx.user?.id && !ctx.session?.isSystem;
    if (isGuestSubmission) {
      if (!input.origin)   input.origin   = 'web';
      if (!input.status)   input.status   = 'new';
      // ⚠️ No `priority` default here, and the absence is deliberate. A
      // `if (!input.priority) input.priority = 'medium'` line here can never
      // execute: `crm_case.priority` declares its `low` option `default: true`,
      // and on the engine's own insert path `applyFieldDefaults` produces the
      // row that BECOMES `ctx.input.data` before `triggerHooks('beforeInsert')`
      // is called — so the slot is already full every time this branch runs.
      // Such a line reads as a declared intent ("guest submissions start at
      // medium") that the app does not honour. Whether a web-submitted case
      // SHOULD outrank a staff-created one is a product question, and it is not
      // settled by leaving dead code here that says it already is.
      input.owner_id          = null;
      input.is_escalated      = false;
      input.escalation_reason = null;
      input.internal_notes    = null;
      input.resolution        = null;
    }

    const priority =
      (typeof input.priority === 'string' && input.priority) ||
      (typeof ctx.previous?.priority === 'string' && (ctx.previous.priority as string)) ||
      undefined;

    // Materialise the urgency ordinal so queue views can sort by it. Sorting on
    // `priority` itself compares raw strings and inverts urgency
    // (medium > low > high > critical).
    //
    // ⚠️ The map is declared INLINE and duplicated in task.hook.ts on purpose:
    // L2 hook bodies run body-only in the QuickJS sandbox, so a shared module
    // constant resolves at authoring time and arrives as `undefined`. The two
    // maps key off different vocabularies (medium vs normal), but the UNKNOWN
    // fallback must stay identical on both objects — `0`, the unranked sentinel
    // that sorts below every real rank. `test/priority-rank-parity.test.ts`
    // pins that agreement.
    if (priority) {
      const rank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      input.priority_rank = rank[priority] ?? 0;
    }

    // ── SLA policy matrix: priority × account tier, in CALENDAR HOURS ──
    //
    // ⚠️ CALENDAR hours, not business hours. Every number below is added to the
    // wall clock: this app ships no business-hours calendar, no working-day
    // definition and no holiday list, so a P1 raised at 5pm on a Friday is due
    // at 9pm that same Friday. Stated here rather than hidden because it is the
    // one way these numbers get misread. The canonical write-up — including why
    // the `critical` row is flat at 4 — lives in `_case-sla.ts`.
    //
    // ⚠️ The table is declared INLINE and duplicated in `_case-sla.ts` on
    // purpose, for the same reason as the `rank` map above: L2 hook bodies run
    // body-only in the QuickJS sandbox, so a shared module constant resolves at
    // authoring time and arrives as `undefined`. The seed module imports the
    // real constant; this body cannot. `test/case-sla-matrix.test.ts` pins all
    // sixteen cells by driving THIS handler, so the copies cannot drift.
    if (priority && !input.sla_due_date && !ctx.previous?.sla_due_date) {
      const slaHours: Record<string, Record<string, number>> = {
        critical: { strategic: 4, enterprise: 4, mid_market: 4, smb: 4 },
        high: { strategic: 6, enterprise: 8, mid_market: 8, smb: 8 },
        medium: { strategic: 24, enterprise: 36, mid_market: 48, smb: 48 },
        low: { strategic: 96, enterprise: 120, mid_market: 168, smb: 168 },
      };
      // `smb` is both the loosest column and the `tier` field's own default, so
      // an unclassified account and an UNREADABLE one land on the same cell.
      // Erring loose is the safe direction: a tighter deadline invented out of
      // a permission error would manufacture breaches.
      const DEFAULT_TIER = 'smb';
      const row = slaHours[priority];
      // An unrecognised priority gets no clock at all rather than a guessed
      // one — the same refusal-to-invent as the `0` unranked sentinel above.
      if (row) {
        let tier = DEFAULT_TIER;
        // Only pay for the account read when the row actually varies by tier.
        // The `critical` row does not, which is what makes a critical case
        // behave EXACTLY as it did before this hook learned about accounts —
        // same 4 hours, same absence of any dependency on `ctx.api`.
        const variesByTier =
          row.strategic !== row.enterprise ||
          row.enterprise !== row.mid_market ||
          row.mid_market !== row.smb;
        const accountId =
          (typeof input.crm_account === 'string' && input.crm_account) ||
          (typeof ctx.previous?.crm_account === 'string' && (ctx.previous.crm_account as string)) ||
          undefined;
        if (variesByTier && accountId && api) {
          try {
            const found = await api.object('crm_account').find({
              where: { id: accountId }, fields: ['tier'], top: 1,
            });
            const rows = Array.isArray(found) ? found : [];
            const stored = rows.length ? rows[0].tier : undefined;
            if (typeof stored === 'string' && stored) tier = stored;
          } catch {
            // Best-effort tier resolution: the anonymous web-to-case grant can
            // create a case and read nothing else, and a denial there must not
            // reject the submission. Falling through leaves `tier` on the
            // default column. (No `console` in the L2 hook sandbox — cf. #471.)
          }
        }
        const hours = row[tier] ?? row[DEFAULT_TIER];
        // Milliseconds, not `setHours(getHours() + n)`: the latter does LOCAL
        // calendar arithmetic, so on a host in a DST-observing zone "+4 hours"
        // silently becomes 3 or 5 real hours across a transition — and a 168h
        // Low-priority clock crosses one twice a year by construction. These
        // are elapsed hours, so add elapsed milliseconds.
        input.sla_due_date = new Date(Date.now() + hours * 3_600_000).toISOString();
      }
    }

    // Closed flag/date + resolution time.
    const effStatus =
      (typeof input.status === 'string' && input.status) ||
      (typeof ctx.previous?.status === 'string' && (ctx.previous.status as string)) ||
      undefined;

    // `is_closed` is DERIVED from `status`, on every write including a guest's.
    // ⛔ Never make the recompute conditional on the caller: a guest's
    // `status: 'closed'` stored alongside `is_closed: false` contradicts
    // itself, and every consumer keyed on the flag — the pinned
    // `unassigned_triage` view, the `case_unassigned_triage_sharing` rule —
    // reads such a case as open backlog forever. A derived column is derived on
    // every write or it is not derived at all; the guest's own `is_closed` is
    // still ignored, because this recompute overwrites whatever they sent.
    if (typeof effStatus === 'string') input.is_closed = effStatus === 'closed';

    if (!isGuestSubmission) {
      const becameClosed = input.status === 'closed' && ctx.previous?.status !== 'closed';
      if (becameClosed && !input.closed_date && !ctx.previous?.closed_date) {
        input.closed_date = new Date().toISOString();
      }

      const closedDate =
        (typeof input.closed_date === 'string' && input.closed_date) ||
        (typeof ctx.previous?.closed_date === 'string' && (ctx.previous.closed_date as string)) ||
        undefined;
      const createdDate =
        (typeof input.created_date === 'string' && input.created_date) ||
        (typeof ctx.previous?.created_date === 'string' && (ctx.previous.created_date as string)) ||
        (typeof ctx.previous?.created_at === 'string' && (ctx.previous.created_at as string)) ||
        undefined;
      if (closedDate && createdDate) {
        const hrs = (new Date(closedDate).getTime() - new Date(createdDate).getTime()) / 3_600_000;
        if (Number.isFinite(hrs) && hrs >= 0) input.resolution_time_hours = Math.round(hrs * 10) / 10;
      }
    }
  },
};

const caseSideEffects: Hook = {
  name: 'case_status_side_effects',
  object: 'crm_case',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'Escalation tasks, resolved-date stamping, and account activity rollup.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    if (!previous) return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const caseId =
      (typeof input.id === 'string' && input.id) ||
      (typeof previous.id === 'string' ? (previous.id as string) : undefined);
    const accountId =
      (typeof input.crm_account === 'string' && input.crm_account) ||
      (typeof previous.crm_account === 'string' && previous.crm_account) ||
      undefined;

    // Escalation: open task for the account owner.
    //
    // ⚠️ `owner_id` is the platform ownership anchor, and planting a record
    // under ANOTHER user is a transfer: the #3004 guard denies it unless the
    // caller holds `allowTransfer`. This insert runs on `ctx.api`, which
    // carries the CALLER's context (not a system one), so the guard applies —
    // hence the `crm_task.allowTransfer` grant on `service_agent` (see
    // `src/profiles/service-agent.profile.ts`, and the canonical note in
    // `src/profiles/index.ts`). One ownership column means one answer, and the
    // answer is the person who must act.
    //
    // The CASE itself has already changed hands by the time this runs, on the
    // `beforeUpdate` seam of this very update (`case_escalation_reassign`) — so
    // this hook still writes no `crm_case.owner_id` and needs no
    // `crm_case.allowTransfer`. The task and the case are two different
    // hand-offs: the task goes to the ACCOUNT owner (commercial follow-up), the
    // case to a service manager (the work itself).
    if (input.status === 'escalated' && previous.status !== 'escalated' && accountId) {
      const account = await api.object('crm_account').findOne({ where: { id: accountId } });
      const ownerId = (account as { owner_id?: string } | null)?.owner_id ?? ctx.user?.id;
      const due = new Date();
      due.setDate(due.getDate() + 1);
      // Title the task with what the reader already knows the case by (#1208).
      // Title the task with what the reader already knows the case by. The
      // PRIMARY KEY is not that: every case surface in this app (record pages,
      // list views, breadcrumbs, the `display_title` formula on `crm_case`)
      // names a case `CASE-00039`, so a queue of urgent rows differing only in
      // a 16-character opaque id is a queue nobody can triage. The id is not
      // lost — it travels in `related_to_case` below, where a relationship
      // belongs.
      //
      // Both parts are read off `previous`, not fetched: an `afterUpdate`
      // pre-image is the WHOLE stored row (`driver.findOne` with no
      // projection), so `case_number` — an engine-issued autonumber, never
      // present on an update payload — and `subject` are both already in hand.
      // `subject` still prefers `input`, since an update may be changing it in
      // this very write.
      //
      // ⚠️ The 255 cap is not cosmetic. `crm_task.subject` declares
      // `maxLength: 255` and the engine ENFORCES it, while `crm_case.subject`
      // allows the same 255 — so `Escalated: ` + number + separator + a
      // max-length case subject is 279 characters and the insert is REJECTED.
      // This hook is `async: true` + `onError: 'log'`, so that rejection
      // surfaces nowhere: the escalation task would simply never exist.
      // Truncating the TAIL keeps the identifier — the discriminating half —
      // intact in a column that visibly truncates anyway.
      //
      // ⚠️ Composed INLINE rather than in a shared helper: hook bodies ship
      // body-only through QuickJS, and a module-scope reference makes
      // `extractHookBody` throw — which the CLI build CATCHES, silently
      // bundling the closure instead, with no gate going red. The pin runs this
      // out of the LOWERED body for exactly that reason
      // (`test/escalation-task-subject.test.ts`).
      const caseNumber = typeof previous.case_number === 'string' ? previous.case_number.trim() : '';
      const caseSubject =
        (typeof input.subject === 'string' && input.subject.trim()) ||
        (typeof previous.subject === 'string' && previous.subject.trim()) ||
        '';
      const label = [caseNumber, caseSubject].filter(Boolean).join(' · ');
      const titled = label ? `Escalated: ${label}` : 'Escalated case needs attention';
      await api.object('crm_task').insert({
        subject: titled.length > 255 ? `${titled.slice(0, 254)}…` : titled,
        status: 'not_started',
        priority: 'urgent',
        type: 'follow_up',
        due_date: due.toISOString().slice(0, 10),
        owner_id: ownerId,
        related_to_type: 'crm_case',
        related_to_case: caseId,
        related_to_account: accountId,
      });
    }

    // Resolution rollup. ⛔ No date is stamped here — `closed_date` belongs
    // exclusively to the `closed` transition (stamped by `case_sla_defaults`).
    // Writing it as a proxy for a resolved-date both corrupts resolution
    // metrics (a resolved-then-closed case keeps its resolve time as its close
    // time) and re-enters the record-change trigger surface.
    if (input.status === 'resolved' && previous.status !== 'resolved') {
      if (accountId) {
        await api.object('crm_account').update(
          { id: accountId, last_activity_date: new Date().toISOString().slice(0, 10) },
          { where: { id: accountId } },
        );
      }
    }
  },
};

/**
 * Ownerless-intake round-robin, composed from `_case-assignment.ts`.
 *
 * ⚠️ Listed AFTER `case_sla_defaults` here for readability only — runtime
 * ordering is decided by `priority` (250 vs 200), not by array position, and it
 * is load-bearing: `case_sla_defaults` strips a guest-supplied `owner_id` and
 * this hook must run after the strip, never before it.
 */
const caseAutoAssign: Hook = createCaseRoundRobinAssign();

/**
 * Escalation hand-off to the `service_manager` pool, composed from
 * `_case-assignment.ts`.
 *
 * Runs on `beforeUpdate` and mutates the escalation write itself — it issues no
 * operation of its own, which is what keeps it off the record-change trigger
 * surface.
 */
const caseEscalationReassign: Hook = createCaseEscalationReassign();

/**
 * Triage self-claim, composed from `_case-assignment.ts`.
 *
 * An agent who moves an unowned open case into a worked status becomes its
 * owner. ⚠️ Priority 260 puts it AFTER the escalation hand-off (250), and it
 * stands down whenever `owner_id` is already in the payload — so the two
 * ownership writers on this seam cannot both speak. Like the hand-off it issues
 * no operation of its own; unlike either sibling it reads no pool, because the
 * only user id it can write is the caller's own.
 */
const caseSelfClaim: Hook = createCaseSelfClaim();

/**
 * Normalise a BLANK `resolved_by_article` to NULL.
 *
 * Additive and deliberately independent of everything above: it touches no
 * ownership column and issues no operation of its own.
 *
 * ### Why it has to exist
 *
 * `resolved_by_article` is the column the deflection ratio on `case_metrics`
 * counts (`kb_resolved_count` = `count(resolved_by_article)` over closed cases).
 *
 * ⚠️ Platform behaviour, measured against the real automation engine: an
 * optional SCREEN field the agent leaves empty does not arrive as "absent" —
 * the resume carries `''`, and `update_record` writes that empty string into
 * the column:
 *
 *   supplied `'ka1'` → `resolved_by_article: "ka1"`
 *   left blank       → `resolved_by_article: ""`      ← counted by count(col)
 *   key omitted      → column not written at all      ← correct
 *
 * SQL `count(column)` counts every NON-NULL value, and `''` is not NULL. So
 * without this hook every case closed WITHOUT an article lands in the numerator
 * and the deflection rate reads 100% on a dashboard that raises no error while
 * doing it — a wrong ratio indistinguishable from a right one.
 *
 * Fixing it here rather than in the measure is deliberate: an empty string in a
 * lookup column is wrong for the record form, the list views, the reports and
 * any future reader too, so it is the STORED value that is corrected. Teaching
 * one measure to discount `''` is a lenient consumer papering over bad data,
 * and the next reader would not know to copy it.
 * `test/knowledge-deflection.test.ts` pins both halves.
 *
 * ⚠️ The blank test is spelled inline rather than lifted into a shared helper:
 * hook handlers lower to a metadata-only body and a free identifier would push
 * this one into the legacy runtime bundle instead
 * (`test/action-sandbox.test.ts` fails the build on it).
 */
const caseResolutionArticleNormalize: Hook = {
  name: 'case_resolution_article_normalize',
  object: 'crm_case',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 150,
  description: 'Normalise a blank resolved_by_article to null so the deflection measure counts only real links.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    // Only a write that CARRIES the key is normalised. An update that never
    // mentions the column must not clear a link somebody else set.
    if (!('resolved_by_article' in input)) return;
    const value = input.resolved_by_article;
    if (value === '' || value === undefined) {
      input.resolved_by_article = null;
      return;
    }
    if (typeof value === 'string' && value.trim() === '') {
      input.resolved_by_article = null;
    }
  },
};

export default [
  caseValidation,
  caseAutoAssign,
  caseEscalationReassign,
  caseSelfClaim,
  caseResolutionArticleNormalize,
  caseSideEffects,
];
