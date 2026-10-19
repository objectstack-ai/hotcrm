// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Enroll ONE person in ONE campaign: the one enrollment flow per side, run as
 * the person who asked for it.
 *
 * ## Who calls these
 *
 * Every enrollment door in the app reaches the membership INSERT through one
 * of these two flows, and only through them:
 *
 *   - **Enroll Members** (`campaign_enrollment`) calls them per eligible
 *     person through its `subflow` nodes;
 *   - **Add to Campaign** on a lead (`create_campaign`) and on a contact
 *     (`add_contact_to_campaign`) is a `type: 'flow'` action that starts the
 *     side's flow directly, once per selected row.
 *
 * ## `runAs: 'user'` — the object's own `allowCreate` is the one gate (#2167)
 *
 * Ruled on #2167 (Q1 letter B): every enrollment door writes in the caller's
 * context, so `crm_campaign_member`'s own `allowCreate` decides who may
 * enroll, on every door alike. A profile without it (`sales_rep`,
 * `sales_manager`, whose sets say enrollment belongs to marketing) is refused
 * at the insert: the action answers 400 `FLOW_FAILED` with the permission
 * message, and `campaign_enrollment` counts the person as refused.
 *
 * These ran `runAs: 'system'` until #2167. The elevation was built (#1807)
 * for the readonly `added_date` stamp, a reason #2142 removed by moving the
 * stamp to the object's own write-moment default, which a user-context insert
 * applies too. All it still did was let those two profiles create members
 * their sets do not let them create. ⛔ Do not elevate these again to let
 * a profile enroll: grant `allowCreate` on its permission set instead, so the
 * profile says what the app does.
 *
 * ## The dedupe lives here, and nowhere else
 *
 * A person already on the campaign is skipped, so a re-run tops up rather
 * than double-enrolling (double rows inflated `num_sent` and the response
 * rate). The read runs as the caller too. Member rows are
 * `controlled_by_parent`, so a caller who can see the campaign sees all of
 * its members, and the read misses none of them. `enrolled` tells the caller
 * which of the two happened; `campaign_enrollment` counts on it.
 *
 * ## Two flows, not one branching flow
 *
 * `create_record`'s `fields` map is static, and the lead side and the contact
 * side write DIFFERENT lookup columns (`crm_lead` vs `crm_contact`) — the
 * dedupe is scoped that way on purpose, because a person enrolled as a lead
 * and again as a contact is two memberships, not a duplicate. A single flow
 * would need a decision node routing on which id happened to be supplied,
 * which is a second place to get that distinction wrong. Two flows with no
 * such branch say it once each.
 *
 * ## ⛔ What these flows deliberately do NOT do
 *
 * They decide nothing about WHO is eligible. The open-campaign gate, the
 * segment, and the opt-out honour stay in `campaign_enrollment`, and on Add
 * to Campaign the person picked the row.
 */

/**
 * Fields both flows write, minus the side's own person lookup.
 *
 * ⛔ No `added_date`. The enrollment stamp is the object's own write-moment
 * default (`campaign_member.object.ts`, #2142), so it lands on every insert,
 * these included; writing it here as well would make it a second writer of a
 * column that has exactly one.
 */
const MEMBERSHIP_FIELDS = {
  status: 'sent',
} as const;

/** `enrolled` starts false; only the insert's own out-edge sets it. */
const ENROLLED = { name: 'enrolled', type: 'boolean', isInput: false, isOutput: true, defaultValue: false };

export const CampaignLeadMemberEnrollFlow: Flow = {
  name: 'campaign_lead_member_enroll',
  label: 'Enroll Lead in Campaign',
  description:
    'Enroll one lead in one campaign as the caller, skipping a lead already on it. Called by campaign_enrollment and by the lead Add to Campaign action.',
  type: 'autolaunched',
  status: 'active',

  // ⭐ The caller's own create right is the gate — see the header.
  runAs: 'user',

  variables: [
    // Supplied by the caller's `subflow` node, or by the action door:
    // `leadId` is the action's `recordIdParam`, `campaignId` its param.
    { name: 'campaignId', type: 'text', isInput: true, isOutput: false },
    { name: 'leadId', type: 'text', isInput: true, isOutput: false },
    ENROLLED,
  ],

  nodes: [
    // `config: {}` — an autolaunched callee is handed its params by the
    // `subflow` executor or the action door and resolves no trigger record of
    // its own, so there is no `objectName` for the start node to load. Same
    // shape as `case_escalation_stamp`.
    { id: 'start', type: 'start', label: 'Start', config: {} },
    {
      id: 'find_existing_member', type: 'get_record', label: 'Already Enrolled?',
      config: {
        objectName: 'crm_campaign_member',
        filter: { crm_campaign: cel`campaignId`, crm_lead: cel`leadId` },
        outputVariable: 'existingMember',
      },
    },
    // Gateway only — the predicate lives on the out-edge.
    { id: 'check_not_enrolled', type: 'decision', label: 'New Member?' },
    {
      id: 'create_campaign_member', type: 'create_record', label: 'Add to Campaign',
      config: {
        objectName: 'crm_campaign_member',
        fields: { crm_campaign: cel`campaignId`, crm_lead: cel`leadId`, ...MEMBERSHIP_FIELDS },
      },
    },
    { id: 'mark_enrolled', type: 'assignment', label: 'Enrolled', config: { assignments: { enrolled: true } } },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'find_existing_member', type: 'default' },
    { id: 'e2', source: 'find_existing_member', target: 'check_not_enrolled', type: 'default' },
    // Already enrolled → no edge → the run ends with `enrolled` still false.
    { id: 'e3', source: 'check_not_enrolled', target: 'create_campaign_member', type: 'conditional', condition: P`existingMember == null`, label: 'Enroll' },
    { id: 'e4', source: 'create_campaign_member', target: 'mark_enrolled', type: 'default' },
    { id: 'e5', source: 'mark_enrolled', target: 'end', type: 'default' },
  ],
};

export const CampaignContactMemberEnrollFlow: Flow = {
  name: 'campaign_contact_member_enroll',
  label: 'Enroll Contact in Campaign',
  description:
    'Enroll one contact in one campaign as the caller, skipping a contact already on it. Called by campaign_enrollment and by the contact Add to Campaign action.',
  type: 'autolaunched',
  status: 'active',

  runAs: 'user',

  variables: [
    { name: 'campaignId', type: 'text', isInput: true, isOutput: false },
    { name: 'contactId', type: 'text', isInput: true, isOutput: false },
    ENROLLED,
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: {} },
    {
      // Scoped on `crm_contact`: a person enrolled as a LEAD and again as a
      // CONTACT is two memberships (see the header).
      id: 'find_existing_contact_member', type: 'get_record', label: 'Already Enrolled?',
      config: {
        objectName: 'crm_campaign_member',
        filter: { crm_campaign: cel`campaignId`, crm_contact: cel`contactId` },
        outputVariable: 'existingContactMember',
      },
    },
    { id: 'check_contact_not_enrolled', type: 'decision', label: 'New Member?' },
    {
      id: 'create_contact_member', type: 'create_record', label: 'Add Contact to Campaign',
      config: {
        objectName: 'crm_campaign_member',
        fields: { crm_campaign: cel`campaignId`, crm_contact: cel`contactId`, ...MEMBERSHIP_FIELDS },
      },
    },
    { id: 'mark_contact_enrolled', type: 'assignment', label: 'Enrolled', config: { assignments: { enrolled: true } } },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'find_existing_contact_member', type: 'default' },
    { id: 'e2', source: 'find_existing_contact_member', target: 'check_contact_not_enrolled', type: 'default' },
    { id: 'e3', source: 'check_contact_not_enrolled', target: 'create_contact_member', type: 'conditional', condition: P`existingContactMember == null`, label: 'Enroll' },
    { id: 'e4', source: 'create_contact_member', target: 'mark_contact_enrolled', type: 'default' },
    { id: 'e5', source: 'mark_contact_enrolled', target: 'end', type: 'default' },
  ],
};
