// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * The campaign-membership INSERT — the one elevated step behind Enroll Members.
 *
 * ## Why these two flows exist
 *
 * `crm_campaign_member.added_date` is `readonly: true`: nobody is meant to
 * hand-edit when a membership was created.
 *
 * ⭐ From `@objectstack/objectql` 17.4.0 the readonly strip covers INSERT as
 * well as UPDATE, which is the reason this file exists. Its changelog states
 * the BREAKING behaviour change: *"a static `readonly` field is now stripped
 * from a **non-system caller's INSERT payload inside `engine.insert`**, exactly
 * as it already was on `engine.update`"*, and it names the remedy in the same
 * sentence —
 * *"Seeding a read-only column at create time is a **system** act — use
 * `context.isSystem`, a flow's `runAs: 'system'`, a system hook or a seed."*
 * `objectstack validate` says the same thing at author time through
 * `flow-update-readonly-field`.
 *
 * ⛔ The remedy is NOT to elevate `campaign_enrollment`. That flow is a screen
 * flow a marketer launches from a campaign record, and `AGENTS.md` house rule 9
 * ("Elevate as little as possible") is explicit: *"A screen
 * flow stays `runAs: 'user'`. A write that genuinely needs elevation is split
 * into a dedicated `system` sub-flow and called through a `subflow` node. ⛔ Do
 * not elevate a whole flow to make `readonly` take effect."* Elevating the
 * parent would also lift row-level security off its two bulk reads — and
 * `crm_lead` is `sharingModel: 'private'`, so a rep clicking Enroll Members
 * would silently enroll the whole organisation's lead pool instead of the leads
 * they can see. That is a product change, not a migration.
 *
 * So the shape is the one `case_escalation_stamp` already uses for
 * `escalate_case`: the parent keeps the marketer's identity for the campaign
 * read, the eligibility queries and the per-member dedupe, and hands ONLY the
 * insert to a dedicated `runAs: 'system'` callee.
 *
 * ELEVATION IS NOT ANONYMITY: `resolveRunDataContext`
 * returns `{ isSystem: true, actor, ...userId }` for a `runAs: 'system'` run, so
 * the membership row is still attributed to the marketer who enrolled it — only
 * the readonly strip's `if (!opCtx.context?.isSystem)` branch is skipped.
 *
 * ## Two flows, not one branching flow
 *
 * `create_record`'s `fields` map is static, and the lead branch and the contact
 * branch write DIFFERENT lookup columns (`crm_lead` vs `crm_contact`) — the
 * dedupe in the parent is scoped that way on purpose, because a person enrolled
 * as a lead and again as a contact is two memberships, not a duplicate. A
 * single callee would need a decision node routing on which id happened to be
 * supplied, which is a second place to get that distinction wrong. Two callees
 * with no branching at all say it once each.
 *
 * ## ⛔ What these flows deliberately do NOT do
 *
 * They insert one membership row and nothing else. The open-campaign gate, the
 * eligibility filters, the opt-out honour and the already-enrolled dedupe all
 * stay in `campaign_enrollment` under the marketer's context — moving any of
 * them here would elevate a read that has no business being elevated.
 */

/** Fields both callees write, minus the branch's own person lookup. */
const MEMBERSHIP_FIELDS = {
  status: 'sent',
  // The readonly stamp this elevation exists for.
  added_date: '{NOW()}',
} as const;

export const CampaignLeadMemberEnrollFlow: Flow = {
  name: 'campaign_lead_member_enroll',
  label: 'Enroll Lead in Campaign',
  description:
    'Insert one lead campaign-membership row with its readonly added_date stamp, using the system context. Called by campaign_enrollment through a subflow node.',
  type: 'autolaunched',
  status: 'active',

  // ⭐ THE ENTIRE POINT OF THIS FILE — see the header. One `create_record`.
  runAs: 'system',

  variables: [
    // Supplied by the caller's `subflow` node.
    { name: 'campaignId', type: 'text', isInput: true, isOutput: false },
    { name: 'leadId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    // `config: {}` — an autolaunched callee is handed its params by the
    // `subflow` executor and resolves no trigger record of its own, so there is
    // no `objectName` for the start node to load. Same shape as
    // `case_escalation_stamp`, measured in `test/readonly-write-semantics.test.ts`.
    { id: 'start', type: 'start', label: 'Start', config: {} },
    {
      id: 'create_campaign_member', type: 'create_record', label: 'Add to Campaign',
      config: {
        objectName: 'crm_campaign_member',
        // ⛔ Do not add fields here. Every column in this node is written with
        // the elevated context; anything a marketer may legitimately type
        // belongs in `campaign_enrollment` instead.
        fields: { crm_campaign: '{campaignId}', crm_lead: '{leadId}', ...MEMBERSHIP_FIELDS },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'create_campaign_member', type: 'default' },
    { id: 'e2', source: 'create_campaign_member', target: 'end', type: 'default' },
  ],
};

export const CampaignContactMemberEnrollFlow: Flow = {
  name: 'campaign_contact_member_enroll',
  label: 'Enroll Contact in Campaign',
  description:
    'Insert one contact campaign-membership row with its readonly added_date stamp, using the system context. Called by campaign_enrollment through a subflow node.',
  type: 'autolaunched',
  status: 'active',

  runAs: 'system',

  variables: [
    { name: 'campaignId', type: 'text', isInput: true, isOutput: false },
    { name: 'contactId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: {} },
    {
      id: 'create_contact_member', type: 'create_record', label: 'Add Contact to Campaign',
      config: {
        objectName: 'crm_campaign_member',
        fields: { crm_campaign: '{campaignId}', crm_contact: '{contactId}', ...MEMBERSHIP_FIELDS },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'create_contact_member', type: 'default' },
    { id: 'e2', source: 'create_contact_member', target: 'end', type: 'default' },
  ],
};
