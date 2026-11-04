// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Enroll leads or contacts into this campaign.
 *
 * Flow-typed action: launches the `campaign_enrollment` screen flow (pick the
 * member side and its segment, enroll everyone eligible). This action is the
 * flow's entry point, following the proven `convert_lead` / `generate_quote`
 * pattern — the console's flow-action trigger sends `{ recordId, objectName }`.
 *
 * ⛔ Never rename `enroll_leads` to match the "Enroll Members" label. An action
 * name is a dispatch identifier that views, docs and the audit trail reference
 * by string; the label already carries the word correctly.
 *
 * Offered only to a caller who may create campaign members (#2167): the flow
 * inserts each member as the caller, so a profile without `allowCreate` on
 * `crm_campaign_member` would only be refused, person by person. The server
 * refusal is the gate; `visible` only stops offering a button that cannot
 * succeed. No `successMessage` here: the flow carries the run's own message,
 * and an action's would shadow it in the console.
 */
export const EnrollLeadsAction: Action = {
  name: 'enroll_leads',
  label: 'Enroll Members',
  objectName: 'crm_campaign',
  icon: 'user-plus',
  type: 'flow',
  target: 'campaign_enrollment',
  locations: ['record_header', 'record_more'],
  // Enrollment only makes sense while the campaign is open — the flow
  // double-checks this server-side.
  visible: P`has(record.status) && (record.status == "planning" || record.status == "in_progress") && current_user.can("crm_campaign_member", "create")`,
  refreshAfter: true,
};

/**
 * Mark a campaign member as having responded.
 *
 * The writer for the `responded` status, on the member row rather than on the
 * campaign: a rep hears back from one person, and one membership changes.
 * `num_responses` and `response_rate` count the `has_responded` flag that
 * status stamps, so an app with no writer for it reports a structural zero on
 * every campaign.
 *
 * A declarative update (`operation: 'update'`), written AS THE CALLER (#2167):
 * the member's own `allowEdit` decides who may record a response, exactly as
 * for an edit of the record. It was an elevated script body until #2167,
 * which let `sales_rep` and `sales_manager` flip a member their sets cannot
 * edit. The patch writes `status` alone; `campaign_member_lifecycle` stamps
 * `has_responded` and `response_date` from it in the same write, the one
 * stamping rule every path that sets the status goes through.
 *
 * `record_header` + `list_item`: `crm_campaign_member` ships no view of its
 * own — its rows are surfaced by the members related list on a campaign's
 * detail page (columns come from `highlightFields`), and `list_item` is the
 * per-row entry point there.
 */
export const MarkRespondedAction: Action = {
  name: 'mark_responded',
  label: 'Mark Responded',
  objectName: 'crm_campaign_member',
  icon: 'reply',
  operation: 'update',
  patch: { status: 'responded' },
  locations: ['record_header', 'list_item'],
  // Already-responded and converted members have nothing to record; an
  // unsubscribed member must not be dragged back into the funnel by a
  // mis-click (`campaign_member_optout_sync` has already opted that person out
  // of email, and this action would not undo that — leaving the two records
  // disagreeing about the same person). And it is offered only to a caller who
  // may edit the member, since the write is theirs (see the header).
  visible: P`has(record.status) && record.status == "sent" && current_user.can("crm_campaign_member", "edit")`,
  successMessage: 'Response recorded on this campaign member.',
  refreshAfter: true,
};
