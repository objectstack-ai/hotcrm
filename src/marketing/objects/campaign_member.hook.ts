// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Campaign member hooks — the writers that make the trimmed lifecycle honest
 * (#597).
 *
 * `crm_campaign_member` was the app's clearest case of declared-but-inert
 * metadata: a seven-value engagement lifecycle and two tracker stamps, with the
 * enrollment flow writing `sent` and nothing writing anything else, ever. The
 * object trim removed the values no writer could reach; these three hooks are
 * the other half of that trade — they give every value that SURVIVED a writer
 * that actually runs.
 *
 * - `campaign_member_lifecycle` (before) — keeps `has_responded` /
 *   `response_date` in lockstep with `status`, whichever end a caller writes.
 * - `campaign_member_optout_sync` (after) — round-trips `unsubscribed` to the
 *   member's lead/contact `email_opt_out`.
 * - `campaign_member_metrics_refresh` (after) — recomputes the campaign's
 *   metric block on every membership change, which is what makes a live
 *   campaign show live numbers.
 *
 * - `campaign_member_enrollment_gate` (before) — refuses a user's own create
 *   of a member, or move of one, into a campaign that is not open or for a
 *   person who opted out of email: the enroll flows' two gates, held on the
 *   object for the doors that skip those flows (#2344).
 *
 * ⚠️ The recompute block below is written out here and three more times in
 * `campaign.hook.ts`, deliberately: a sandboxed hook body cannot reach module
 * scope, so a shared import would stop the handler lowering to metadata (see
 * that file's header for the full reasoning). All four copies are asserted
 * character-identical by `test/campaign-member-lifecycle.test.ts`.
 */

/**
 * The enroll flows' two gates, on the object itself (#2344).
 *
 * `campaign_lead_member_enroll` and `campaign_contact_member_enroll` refuse a
 * campaign that is not Planning or In Progress (or no longer exists) and a
 * person with Email Opt Out ticked (#2336). Enroll Members and Add to Campaign
 * reach the insert only through them. A member created any other way did not:
 * the campaign's Campaign Members panel's **New**, a data import run as the
 * user, and `POST /api/v1/data/crm_campaign_member` all answered 201 on a
 * Completed campaign with an opted-out lead (measured on 18.2.0 at `0f17c6c`).
 * So this hook refuses the same two things on the object, for every user write.
 *
 * Why a `before*` hook and not something smaller, measured on 18.2.0:
 *
 *   - a `validations[]` rule sees only the member's own columns, and both
 *     gates read another record (the campaign's status, the person's flag);
 *   - there is no before-save flow trigger, so the flows' `end` refusals
 *     cannot be reused at the insert.
 *
 * What passes:
 *
 *   - system writes, which carry no `ctx.user` (this repo's system-write
 *     signal): the seed, an import run as system, and
 *     `campaign_lead_conversion_refresh`, whose promotion writes `status`
 *     alone and so is no enrollment either;
 *   - the enroll flows' own insert. It carries `ctx.provenance.flowRunId`
 *     (measured), but it is ⛔ deliberately not exempted on that mark: the
 *     flow has already checked the same two things a moment earlier, so this
 *     check answers the same and the insert goes through. Exempting every
 *     flow-run write would let the next flow that writes a member skip both
 *     gates, the same hole as before in a new place;
 *   - an edit that does not move the member, e.g. Mark Responded on a member
 *     of a Completed campaign, or Unsubscribed on a person who opted out.
 *
 * An edit that MOVES a member (a new campaign, Lead or Contact) is a new
 * enrollment, so it is checked like a create, on the record it would become.
 *
 * Reads run as the caller, as the flows' reads do: `crm_campaign` is
 * `public_read`, and a person the caller cannot read passes here as it passes
 * there.
 *
 * The codes follow the house refusal envelope (`src/sales/objects/_refusal.ts`):
 *
 *   - a campaign that is not open: `VALIDATION_FAILED` / 400. The campaign
 *     lookup's own `lookupFilters` already declare only Planning and In
 *     Progress campaigns as values for this field, so a closed one is a
 *     submitted value the object's own rules reject;
 *   - an opted-out person: `FORBIDDEN` / 403, a compliance flag that
 *     prohibits the write outright, the code `task_do_not_call_guard` and
 *     `event_do_not_call_guard` give Do Not Call, its phone-side twin.
 *
 * ⚠️ TWO COPIES, HELD TOGETHER BY A TEST. The open statuses, the `=== true`
 * opt-out reading and the three sentences are written out here and again as
 * CEL and templates in `src/marketing/flows/campaign-member-enroll.flow.ts`. A
 * lowered body cannot import, and a flow edge cannot call a hook, so they
 * cannot share one source. `test/campaign-member-direct-create-gates.test.ts`
 * drives both doors over every campaign status the object declares and both
 * opt-out states, and fails when their verdicts or their sentences part ways.
 * The English sentences are the flows' own; the flows' translations do not
 * reach a hook refusal, which 18.2.0 gives no translation key.
 */
const campaignMemberEnrollmentGate: Hook = {
  name: 'campaign_member_enrollment_gate',
  object: 'crm_campaign_member',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  description: 'Refuse a user enrolling a person in a campaign that is not open, or a person who opted out of email.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `src/sales/objects/_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(
      message: string,
      code: string,
      status: number,
      userMessage: string = message,
    ): Error {
      const err = new Error(message) as Error & {
        code: string;
        status: number;
        userMessage: string;
      };
      err.code = code;
      err.status = status;
      err.userMessage = userMessage;
      return err;
    }
    if (!ctx.user?.id) return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const input = ctx.input ?? {};
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const idOf = (value: unknown): string => (typeof value === 'string' ? value : '');

    // An update enrolls only when it moves the member. A key the write does
    // not carry, or carries unchanged (an edit form re-sends every field),
    // moves nothing.
    if (ctx.event === 'beforeUpdate') {
      const moves = ['crm_campaign', 'crm_lead', 'crm_contact'].some(
        (key) => key in input && idOf(input[key]) !== idOf(previous[key]),
      );
      if (!moves) return;
    }
    const pick = (key: string): string => idOf(key in input ? input[key] : previous[key]);
    const campaignId = pick('crm_campaign');
    const leadId = pick('crm_lead');
    const contactId = pick('crm_contact');

    // The campaign first, as the flows check it first. A blank campaign is
    // the required field's to refuse; an id that names no campaign is
    // refused here, as the flows refuse it.
    if (campaignId) {
      const campaign = await api.object('crm_campaign').findOne({
        where: { id: campaignId }, fields: ['id', 'status', 'display_title'],
      });
      const status = campaign && typeof campaign.status === 'string' ? campaign.status : '';
      if (status !== 'planning' && status !== 'in_progress') {
        const title = campaign && typeof campaign.display_title === 'string' && campaign.display_title !== ''
          ? campaign.display_title
          : 'The chosen campaign';
        throw refuse(
          `${title} is not open for enrollment, or no longer exists: only a Planning or In Progress campaign takes members. Nobody was enrolled.`,
          'VALIDATION_FAILED',
          400,
        );
      }
    }

    // Then the person. Refused only on a stored `true`, as the flows read it.
    if (leadId) {
      const lead = await api.object('crm_lead').findOne({
        where: { id: leadId }, fields: ['id', 'first_name', 'last_name', 'email_opt_out'],
      });
      if (lead?.email_opt_out === true) {
        const first = typeof lead.first_name === 'string' ? lead.first_name : '';
        const last = typeof lead.last_name === 'string' ? lead.last_name : '';
        throw refuse(
          `${first} ${last} has opted out of email, so the lead was not added to the campaign.`,
          'FORBIDDEN',
          403,
        );
      }
    }
    if (contactId) {
      const contact = await api.object('crm_contact').findOne({
        where: { id: contactId }, fields: ['id', 'full_name', 'email_opt_out'],
      });
      if (contact?.email_opt_out === true) {
        const name = typeof contact.full_name === 'string' && contact.full_name !== ''
          ? contact.full_name
          : 'This contact';
        throw refuse(
          `${name} has opted out of email, so the contact was not added to the campaign.`,
          'FORBIDDEN',
          403,
        );
      }
    }
  },
};

/**
 * Keep the response summary fields honest, on every write path.
 *
 * There are two ways a member becomes "responded" and they must not disagree:
 * the `mark_responded` action and a marketer flipping `status` on the record
 * detail page. Both write `status` and nothing else — the action's whole patch
 * is `{ status: 'responded' }` — so this hook is what stamps `has_responded` and
 * `response_date` on either path. Without it, a member reads `Responded` on the
 * status badge and `Has Responded: false` two rows below it, and
 * `test/seed-consistency.test.ts`'s "track the responded status exactly"
 * contract holds for seeded rows while runtime rows drift out of it.
 *
 * `converted` counts as responded too: a member cannot convert without having
 * responded first, and `has_responded` is the "did this person ever engage"
 * flag the response surfaces filter on. Because it means EVER, a responded
 * member who later unsubscribes keeps it (#2365); only a reset to `sent`
 * clears it, and the campaign's `num_responses` counts this flag.
 */
const campaignMemberLifecycle: Hook = {
  name: 'campaign_member_lifecycle',
  object: 'crm_campaign_member',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Keep has_responded / response_date in lockstep with the member status.',
  handler: async (ctx: HookContext) => {
    // D3 stand-down: a predicate update has ONE payload for every matched row,
    // so the `ctx.previous`-conditioned writes below would land on rows that
    // did not earn them — refused as a diverging key set, or stored silently
    // from the last row. Full account and the measurement: `forecast.hook.ts`.
    if (ctx.event === 'beforeUpdate' && ctx.dispatch?.mode === 'per-row') return;

    const { input } = ctx;
    const previous = ctx.previous;
    const status =
      (typeof input.status === 'string' && input.status) ||
      (typeof previous?.status === 'string' ? (previous.status as string) : undefined);
    if (!status) return;

    // The responded set is spelled INLINE, not lifted to a module constant: a
    // sandboxed body cannot reach module scope, and a handler that reads one
    // stops lowering to metadata (see `campaign.hook.ts`'s header).
    const responded = status === 'responded' || status === 'converted';
    const priorStatus = typeof previous?.status === 'string' ? (previous.status as string) : '';
    const wasResponded = priorStatus === 'responded' || priorStatus === 'converted';

    if (responded) {
      input.has_responded = true;
      // Stamp a response date only when the member is CROSSING into a responded
      // state and does not already carry one. Re-stamping on every later edit
      // would quietly move the response date forward each time somebody touched
      // the row, and response-time reporting reads this column.
      const existing = input.response_date ?? previous?.response_date;
      if (!wasResponded && (existing === undefined || existing === null || existing === '')) {
        input.response_date = new Date().toISOString();
      }
      return;
    }

    // Moving BACK to `sent` (a mis-click corrected, or a member reset for a
    // re-send) clears the summary with it: `sent` means "never engaged", and
    // `has_responded: true` left on a `sent` member is the same disagreement in
    // the other direction. A move to `unsubscribed` is NOT a move back (#2365,
    // ruled D4): the person did respond, and opting out afterwards does not
    // undo that, so the flag and the original `response_date` stay — and the
    // campaign's `num_responses`, which counts the flag, does not drop on every
    // unsubscribe. A member that responded, unsubscribed and is then reset to
    // `sent` is cleared too, hence the check on the stored flag.
    const hadResponse = wasResponded || previous?.has_responded === true;
    if (status === 'sent' && hadResponse && typeof input.status === 'string') {
      input.has_responded = false;
      input.response_date = null;
      return;
    }
    if (ctx.event === 'beforeInsert' && input.has_responded === undefined) {
      input.has_responded = false;
    }
  },
};

/**
 * Round-trip `unsubscribed` to the person's `email_opt_out`.
 *
 * This closes a loop the app already had one half of: `campaign_enrollment`
 * filters on `email_opt_out: false`, and the `send_email` action hides itself
 * on an opted-out contact — but NOTHING ever set the flag, so honouring it was
 * a promise about a column no user action could reach. Unsubscribing a member
 * marked the junction row and left the person enrollable by the very next
 * campaign, which is the failure mode an opt-out exists to prevent.
 *
 * Deliberately one-directional: member `unsubscribed` ⇒ person opted out.
 * The reverse (person opts out ⇒ close their open memberships) is NOT done
 * here — a past campaign's membership is a historical record, and rewriting it
 * would falsify what happened at the time.
 *
 * `async` + `onError: 'log'`: the member write is the user's action and must
 * not fail because the lead row is locked or gone. A missed sync is recovered
 * by the next unsubscribe; a rejected write loses the unsubscribe itself.
 *
 * `runAs: 'system'` (#2014, AGENTS.md rule 9). Members are worked by
 * marketing, and a contact is a master-detail child of its account, which a
 * marketing user may not edit — so the contact write was refused ("requires
 * edit access to its master record"), logged and swallowed, and the person
 * stayed enrollable by the next campaign. An unsubscribe has to reach the
 * person whoever recorded it, so the hook elevates; the member write stays the
 * caller's, and `updated_by` on the person still names them. Organization
 * (rule 10): it writes only the lead / contact the triggering member row
 * names, and the elevated `ctx.api` keeps the trigger's tenant.
 */
const campaignMemberOptOutSync: Hook = {
  name: 'campaign_member_optout_sync',
  object: 'crm_campaign_member',
  events: ['afterInsert', 'afterUpdate'],
  priority: 300,
  async: true,
  onError: 'log',
  runAs: 'system',
  description: 'Sync an unsubscribed member back to the lead/contact email_opt_out flag.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const { input } = ctx;
    const previous = ctx.previous;
    if (input?.status !== 'unsubscribed') return;
    // Already unsubscribed ⇒ already synced. Re-running would be harmless
    // (the write is idempotent) but it would also re-open a row on every
    // unrelated edit of an unsubscribed member.
    if (previous?.status === 'unsubscribed') return;

    const leadId =
      (typeof input?.crm_lead === 'string' && input.crm_lead) ||
      (typeof previous?.crm_lead === 'string' ? (previous.crm_lead as string) : undefined);
    const contactId =
      (typeof input?.crm_contact === 'string' && input.crm_contact) ||
      (typeof previous?.crm_contact === 'string' ? (previous.crm_contact as string) : undefined);

    // Exactly one of the two is set — `lead_or_contact_required` on the object
    // guarantees at least one, and the enrollment writers never set both. Both
    // branches run anyway rather than an if/else, so a row that somehow carries
    // both still opts out both people instead of half of them.
    if (leadId) {
      await api.object('crm_lead').update(
        { id: leadId, email_opt_out: true },
        { where: { id: leadId } },
      );
    }
    if (contactId) {
      await api.object('crm_contact').update(
        { id: contactId, email_opt_out: true },
        { where: { id: contactId } },
      );
    }
  },
};

/**
 * Recompute the campaign's metric block on every membership change.
 *
 * THIS is the hook the "metrics are live" acceptance criterion rests on:
 * enrolling a member, marking one responded, or removing one moves
 * `num_sent` / `num_responses` / `num_leads` / `num_converted_leads`
 * immediately — no waiting for the campaign to reach `completed`, which is
 * what the removed `campaign_snapshot_metrics` made everyone wait for.
 *
 * Both sides on update: moving a member between campaigns has to decrement the
 * old campaign as well as increment the new one.
 *
 * No loop: this writes `crm_campaign`, and the campaign-side refresh only fires
 * on a `status` transition, which a metric-only write does not carry.
 *
 * `runAs: 'system'` (#2014, AGENTS.md rule 9). A rollup must not depend on who
 * fired it. Run as a marketing user, the recompute counted only the deals that
 * user may see — a Private won deal is its owner's alone — and wrote the
 * smaller numbers over the right ones: measured, `num_won_opportunities` 2 → 1
 * and `actual_revenue` 1,100 → 100 the moment a marketer enrolled a member.
 * Elevated, every member write recomputes the same campaign the same way; the
 * member write itself stays the caller's. Organization (rule 10): every read
 * is keyed to the triggering member's campaign (and the leads that campaign's
 * members name), and the elevated `ctx.api` keeps the trigger's tenant.
 */
const campaignMemberMetricsRefresh: Hook = {
  name: 'campaign_member_metrics_refresh',
  object: 'crm_campaign_member',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 800,
  async: true,
  onError: 'log',
  runAs: 'system',
  description: 'Recompute the campaign metric block live whenever its membership changes.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const { input } = ctx;
    const previous = ctx.previous;
    const campaignIds = Array.from(new Set([
      typeof input?.crm_campaign === 'string' ? input.crm_campaign : '',
      typeof previous?.crm_campaign === 'string' ? (previous.crm_campaign as string) : '',
    ].filter(Boolean)));
    for (const id of campaignIds) {
      // ── recompute ── identical in all four refresh hooks; see the header.
      const memberRows = await api.object('crm_campaign_member').find({
        where: { crm_campaign: id }, fields: ['crm_lead', 'has_responded'], top: 5000,
      });
      const leadIds = Array.from(new Set(
        memberRows.map((r) => (typeof r.crm_lead === 'string' ? r.crm_lead : '')).filter(Boolean),
      ));
      const convertedLeads = leadIds.length > 0
        ? await api.object('crm_lead').count({ where: { id: { $in: leadIds }, is_converted: true } })
        : 0;
      const numOpportunities = await api.object('crm_opportunity').count({ where: { crm_campaign: id } });
      const numWon = await api.object('crm_opportunity').count({ where: { crm_campaign: id, stage: 'closed_won' } });
      const wonRows = await api.object('crm_opportunity').find({
        where: { crm_campaign: id, stage: 'closed_won' }, fields: ['amount'], top: 5000,
      });
      const actualRevenue = wonRows.reduce(
        (sum, row) => sum + (typeof row.amount === 'number' ? row.amount : Number(row.amount) || 0), 0,
      );
      await api.object('crm_campaign').update({
        id,
        num_sent: memberRows.length,
        num_responses: memberRows.filter((r) => r.has_responded === true).length,
        num_leads: leadIds.length,
        num_converted_leads: convertedLeads,
        num_opportunities: numOpportunities,
        num_won_opportunities: numWon,
        actual_revenue: actualRevenue,
      }, { where: { id } });
      // ── /recompute ──
    }
  },
};

export default [
  campaignMemberEnrollmentGate,
  campaignMemberLifecycle,
  campaignMemberOptOutSync,
  campaignMemberMetricsRefresh,
];
