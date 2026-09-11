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
  visible: P`has(record.status) && (record.status == "planning" || record.status == "in_progress")`,
  successMessage: 'Eligible members enrolled in campaign.',
  refreshAfter: true,
};

/**
 * Mark a campaign member as having responded.
 *
 * The writer for the `responded` status, on the member row rather than on the
 * campaign: a rep hears back from one person, and one membership changes.
 * `num_responses` and `response_rate` are computed off that status, so an app
 * with no writer for it reports a structural zero on every campaign.
 *
 * The body stamps all three response fields together, rather than relying on
 * `campaign_member_lifecycle` to back-fill two of them. Both paths are
 * exercised (a rep can also flip `status` on the record itself, which the hook
 * catches) but an action that writes a status and leaves the record internally
 * inconsistent for the length of a hook dispatch is a shape the detail page can
 * render mid-flight, and this one is cheap to get right at the source.
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
  // script, not modal — a `type: 'modal'` action has no server dispatch at all
  // and its body never runs (see `create_campaign`'s note in lead.actions.ts).
  type: 'script',
  body: {
    language: 'js',
    source: `
      const id = ctx.recordId;
      if (!id) throw new Error('mark_responded requires a recordId');
      const respondedAt = new Date().toISOString();
      await ctx.api.object('crm_campaign_member').update(
        { id, status: 'responded', has_responded: true, response_date: respondedAt },
        { where: { id } },
      );
      return { id, status: 'responded', response_date: respondedAt };
    `,
    capabilities: ['api.write'],
    timeoutMs: 5000,
  },
  locations: ['record_header', 'list_item'],
  // Already-responded and converted members have nothing to record; an
  // unsubscribed member must not be dragged back into the funnel by a
  // mis-click (`campaign_member_optout_sync` has already opted that person out
  // of email, and this action would not undo that — leaving the two records
  // disagreeing about the same person).
  visible: P`has(record.status) && record.status == "sent"`,
  successMessage: 'Response recorded on this campaign member.',
  refreshAfter: true,
};
