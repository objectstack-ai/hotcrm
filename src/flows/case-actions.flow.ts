// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
import { CLAIMABLE_TARGET_STATUSES } from '../objects/_case-assignment';
type Flow = Automation.Flow;

/**
 * Screen flows behind the Claim Case / Escalate Case / Close Case header
 * actions.
 *
 * Why flows and not `body`-typed actions (verified against the running
 * 16.1.0 console, 2026-07-28):
 *
 *  - `type: 'modal'` never executes the body at all — on submit the console
 *    resolves the action `target` as an OBJECT name and dies on
 *    `GET /api/v1/meta/object/<target>` → 400 ("Error loading form").
 *  - `type: 'script'` DOES reach `POST /api/v1/actions/...`, but a body that
 *    UPDATES a record on an object with sharing rules is rejected by the
 *    sharing middleware ("FORBIDDEN: insufficient privileges to update
 *    crm_case …") — the sandbox execution context does not carry the caller
 *    identity, so `canEdit` fails even for the record owner. Inserts are
 *    unaffected (clone_opportunity works), updates are not.
 *  - Screen flows execute through the automation service, whose
 *    `update_record` nodes demonstrably write `crm_case` (the
 *    case_escalation record-change flow does exactly that in production).
 *
 * Same mechanism as `schedule_followup` / `lead_conversion`.
 */
export const EscalateCaseFlow: Flow = {
  name: 'escalate_case',
  label: 'Escalate Case',
  description: 'Collect an escalation reason, then flag and re-prioritise the case.',
  type: 'screen',
  status: 'active',

  variables: [
    // MUST be `recordId` — the console's flow-action contract seeds only that
    // name (and its camelCase object alias); a custom name arrives undefined.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'reason', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_case' } },
    {
      id: 'screen_1', type: 'screen', label: 'Escalate Case',
      config: {
        fields: [
          { name: 'reason', label: 'Escalation Reason', type: 'textarea', required: true },
        ],
      },
    },
    {
      // The USER-CONTEXT half of the escalation (#1434). Everything here is a
      // column the acting agent may legitimately write, so it is written with
      // their identity — this flow stays `runAs: 'user'`.
      //
      //   escalation_reason  the agent's own screen input
      //   priority           an ordinary editable field
      //   status             ordinary, and the hook trigger (below)
      //
      // The two stamps a person never types — `is_escalated` and
      // `escalated_date` — are `readonly: true` on `crm_case` and are written
      // by the `case_escalation_stamp` subflow that follows, with the system
      // context. See `src/flows/case-escalation-stamp.flow.ts`.
      //
      // ⚠️ `status: 'escalated'` MUST stay in this node, and not only because
      // it is user-writable: it is the trigger both escalation hooks key off —
      // `case_escalation_reassign` (`_case-assignment.ts`) gates on
      // `input.status !== 'escalated' || previous.status === 'escalated'`, and
      // `case_status_side_effects` (`case.hook.ts`) reads the same transition.
      // Keeping it here keeps the ownership hand-off and the side-effect tasks
      // firing from the ACTING USER's write, exactly as they did before the
      // split. Moving it into the elevated subflow would silently re-attribute
      // both to the system.
      //
      // It is also what suppresses a double-fire of the automatic
      // `case_escalation` record-change flow.
      id: 'escalate', type: 'update_record', label: 'Escalate Case',
      config: {
        objectName: 'crm_case',
        filter: { id: '{recordId}' },
        fields: {
          escalation_reason: '{reason}',
          status: 'escalated',
          priority: 'critical',
        },
      },
    },
    {
      // The ELEVATED half, and the only elevation in this flow: one
      // `runAs: 'system'` flow, one `update_record`, two readonly columns.
      // #1434's approved direction (decision batch #21 ②) — elevate the write,
      // not the flow.
      //
      // ⚠️ THIS NODE MUST RUN AFTER `escalate`, NOT BEFORE. `crm_case`'s
      // `escalation_reason_required` validation rejects any write whose merged
      // record has `is_escalated == true` and a blank `escalation_reason`. The
      // reason is written by the node above, so by the time the flag flips it
      // is already stored. Reversing these two nodes fires that validation
      // against a record with no reason yet and the stamp is rejected.
      //
      // ⛔ Do not "simplify" this by giving THIS flow `runAs: 'system'` and
      // folding the stamp back into the node above. That is option A, costed
      // and explicitly not adopted: it elevates every write this screen flow
      // makes and stops it carrying the acting user's context downstream.
      // `AGENTS.md` house rule 9 states it as standing policy.
      id: 'stamp_escalation', type: 'subflow', label: 'Stamp Escalation Flags',
      config: {
        flowName: 'case_escalation_stamp',
        input: { recordId: '{recordId}' },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'escalate', type: 'default' },
    { id: 'e3', source: 'escalate', target: 'stamp_escalation', type: 'default' },
    { id: 'e4', source: 'stamp_escalation', target: 'end', type: 'default' },
  ],
};

export const CloseCaseFlow: Flow = {
  name: 'close_case',
  label: 'Close Case',
  description: 'Collect the resolution, then close the case and stop the SLA clock.',
  type: 'screen',
  status: 'active',
  // `is_closed` is a readonly lifecycle field. This trusted screen flow owns
  // the transition and must therefore run with the system writer.
  //
  // ⛔ A HISTORICAL PRECEDENT, NOT A POLICY — do not cite this line to justify
  // elevating another screen flow (#1434, maintainer-approved decision batch
  // #21 ②). The standing rule is the opposite one: a screen flow stays
  // `runAs: 'user'` and a write that genuinely needs elevation is split into a
  // dedicated `system` sub-flow reached by a `subflow` node — see
  // `escalate_case` above and `src/flows/case-escalation-stamp.flow.ts`.
  // "Readonly stripped my write, so I made the flow system" is the pattern
  // that ruling exists to stop being copied; `AGENTS.md` house rule 9 carries
  // it as house policy. This flow predates that rule and has not been
  // re-shaped to match it.
  runAs: 'system',

  variables: [
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'resolution', type: 'text', isInput: true, isOutput: false },
    { name: 'resolved_by_article', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_case' } },
    {
      // The "attach the article that resolved it" affordance (#601). Optional
      // on purpose: most cases are not resolved out of the knowledge base, and
      // a required field here would be answered with a junk value rather than
      // left honest — which is worse than an absent link for a measure whose
      // whole job is to say how OFTEN the KB resolves a case.
      //
      // ⚠️ MEASURED LIMITATION, stated so nobody re-discovers it: a flow screen
      // field cannot name a target object. `ScreenFieldConfigSchema`
      // (`@objectstack/spec/automation`) has `name` / `label` / `type` /
      // `options` / `defaultValue` / `placeholder` / `visibleWhen` and NO
      // object or reference key, so `type: 'lookup'` has nothing to resolve a
      // record picker from — the same degradation `add_contact_to_campaign`
      // documents for a bare `{ type: 'lookup' }` action param, which it avoids
      // by being FIELD-BACKED, an escape a screen field does not have.
      //
      // So the real picker for this link is the `Resolved by Article` lookup in
      // the case's Resolution group, on the record form, and this screen field
      // is the CLOSE-PATH capture beside it. Both write the same column; the
      // action is `refreshAfter: true`, so the record form is what the agent
      // lands on immediately after closing.
      id: 'screen_1', type: 'screen', label: 'Close Case',
      config: {
        fields: [
          { name: 'resolution', label: 'Resolution', type: 'textarea', required: true },
          {
            name: 'resolved_by_article',
            label: 'Resolved by Article (optional)',
            type: 'lookup',
            required: false,
            placeholder: 'Knowledge article id, if the KB resolved this case',
          },
        ],
      },
    },
    {
      // `resolved_by_article` is written unconditionally, and a blank one is
      // normalised to NULL by `case_resolution_article_normalize`
      // (`src/objects/case.hook.ts`) rather than branched around here: MEASURED
      // on the real engine, a screen field left empty resumes as `''` and lands
      // as an empty string, which `count(resolved_by_article)` counts. A
      // `decision` node could not have branched it either — this repo has
      // measured `decision.config.condition` to be inert metadata
      // (`test/win-loss-capture.test.ts`'s table of five such surfaces).
      id: 'close', type: 'update_record', label: 'Close Case',
      config: {
        objectName: 'crm_case',
        filter: { id: '{recordId}' },
        fields: {
          is_closed: true,
          resolution: '{resolution}',
          status: 'closed',
          resolved_by_article: '{resolved_by_article}',
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'close', type: 'default' },
    { id: 'e3', source: 'close', target: 'end', type: 'default' },
  ],
};

/**
 * Claim Case — the triage claim gesture, given a button (#1144, piece 2).
 *
 * ## What this flow is, and what it deliberately is NOT
 *
 * The claim already exists as behaviour: an agent moves an unowned case out of
 * **Unassigned — triage** by setting its status to one that means a person is
 * on it, and `case_self_claim` (`src/objects/_case-assignment.ts`, priority
 * 260) stamps `owner_id` with the caller. Nothing on the screen said so, which
 * is the whole complaint this card carried.
 *
 * So this flow is **pure UI over the existing seam**. Its one write is the
 * STATUS MOVE. It does not write `owner_id`, and that is not a style choice:
 *
 *  - the #3004 transfer gate refuses any payload carrying `owner_id` inside the
 *    sharing MIDDLEWARE, upstream of the hook phase, and a screen flow's
 *    `update_record` runs as the caller — so a flow that wrote the column would
 *    be refused exactly like a hand-written update, loudly and always;
 *  - and `case_self_claim` guard 2 stands down the moment `owner_id` is already
 *    in the payload, so even a caller holding `allowTransfer` would take the
 *    claim seam out of the picture rather than drive it.
 *
 * Ownership therefore keeps exactly ONE writer. `test/claim-case-one-owner-writer.test.ts`
 * is that sentence turned into a guard, so it is enforced rather than intended.
 *
 * ## Why `runAs: 'user'`, spelled out rather than defaulted
 *
 * House rule 9 (`AGENTS.md`) already says a screen flow stays `runAs: 'user'`,
 * but here the default is LOAD-BEARING and worth reading twice: `case_self_claim`
 * returns early for a write with no user, and again for `ctx.session.isSystem`.
 * An elevated run of this flow would move the status and claim NOTHING — the
 * case would leave the triage tab still ownerless. The declaration is explicit
 * so the next author sees the coupling before reaching for elevation.
 *
 * ## Why a screen, and why the picker is derived
 *
 * The three statuses that claim are one concept with three faces, and which one
 * an agent picks is real information (`waiting_customer` straight off a triage
 * row is a different day's work from `in_progress`). The options are built from
 * {@link CLAIMABLE_TARGET_STATUSES} — the seam's own declared set — rather than
 * hand-copied, which is #490's lesson: a hand-copied subset silently dropped an
 * option from a picker and nothing noticed. A fourth claimable status makes the
 * label map below a COMPILE error rather than a quietly short picker.
 */
const CLAIM_STATUS_LABEL: Record<(typeof CLAIMABLE_TARGET_STATUSES)[number], string> = {
  in_progress: 'In Progress',
  waiting_customer: 'Waiting on Customer',
  waiting_support: 'Waiting on Support',
};

/** The picker, derived from the seam's set. Labels are pinned to `crm_case.status`'s own. */
const CLAIM_STATUS_OPTIONS = CLAIMABLE_TARGET_STATUSES.map((value) => ({
  value,
  label: CLAIM_STATUS_LABEL[value],
}));

export const ClaimCaseFlow: Flow = {
  name: 'claim_case',
  label: 'Claim Case',
  description: 'Take an unowned case out of triage by moving it to a status that means you are on it.',
  type: 'screen',
  status: 'active',
  // Load-bearing, not boilerplate — see the header. A system run claims nobody.
  runAs: 'user',

  variables: [
    // MUST be `recordId` — the console's flow-action contract seeds only that
    // name (and its camelCase object alias); a custom name arrives undefined.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'claimStatus', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_case' } },
    {
      id: 'screen_1', type: 'screen', label: 'Claim Case',
      config: {
        fields: [
          {
            name: 'claimStatus', label: 'Working status', type: 'select', required: true,
            defaultValue: 'in_progress',
            options: CLAIM_STATUS_OPTIONS,
          },
        ],
      },
    },
    {
      // ⛔ `status` is the ONLY field this node may ever carry. Adding
      // `owner_id` here does not "make the claim explicit" — it makes the write
      // refused by the transfer gate before any hook runs, and it takes
      // `case_self_claim` out of the path on the one caller it would reach.
      // The guard beside this file fails on any such addition.
      id: 'claim', type: 'update_record', label: 'Claim Case',
      config: {
        objectName: 'crm_case',
        filter: { id: '{recordId}' },
        fields: {
          status: '{claimStatus}',
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'claim', type: 'default' },
    { id: 'e3', source: 'claim', target: 'end', type: 'default' },
  ],
};
