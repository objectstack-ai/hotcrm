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
 * ## The two gates live here too, so every door answers alike (#2336)
 *
 * Before the dedupe, each flow refuses two enrollments, whichever door asked:
 *
 *   - a campaign that is not Planning or In Progress, or that no longer
 *     exists. Topping up a Completed or Aborted campaign rewrites the metrics
 *     it recorded (`num_sent`, `num_leads`, the response rate), and marketing
 *     reads its ROI from those;
 *   - a person who has opted out of email (`email_opt_out`). This is email
 *     campaign enrollment, and `campaign_member_optout_sync` writes that flag
 *     when a member unsubscribes.
 *
 * Each refusal is an `end` with `outcome: 'refused'` that names the campaign
 * or the person. Add to Campaign shows it in the refusal dialog instead of
 * its success toast, and nothing is written. Until #2336 only Enroll Members
 * held these two gates, so Add to Campaign enrolled an opted-out lead and
 * moved a Completed campaign's numbers. ⛔ Do not copy either check into an
 * action instead: a door that skips the flow would skip the gate.
 *
 * Enroll Members keeps its own campaign gate and its own `email_opt_out`
 * query filter, and they run first, so these refusals never fire inside its
 * loop. That order is load-bearing on 18.2.0: a refusal inside a structured
 * region is turned into an error, so the guarded iteration would count the
 * person as refused, when an opted-out person is a skip there (#2336).
 *
 * ## ⛔ What these flows deliberately do NOT do
 *
 * They pick nobody. The segment stays in `campaign_enrollment`, and on Add
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

/**
 * The campaign gate, read as the caller. `crm_campaign` is `public_read`, so
 * a caller who may enroll can read the campaign they picked.
 */
const GET_CAMPAIGN = {
  id: 'get_campaign', type: 'get_record', label: 'Get Campaign',
  config: { objectName: 'crm_campaign', filter: { id: cel`campaignId` }, outputVariable: 'campaignRecord' },
};

/** Gateway only: the predicate is on the out-edge, the refusal is its default edge. */
const CHECK_CAMPAIGN_OPEN = { id: 'check_campaign_open', type: 'decision', label: 'Campaign Open?' };

/**
 * The same open clause as `campaign_enrollment`'s `e4` / `e7`, guarded the
 * same way: `findOne` answers a missing campaign with null, and an unguarded
 * read would fail the run instead of refusing it.
 */
const CAMPAIGN_OPEN = P`has(vars.campaignRecord) && has(vars.campaignRecord.status)
  && (vars.campaignRecord.status == "planning" || vars.campaignRecord.status == "in_progress")`;

/**
 * A Completed or Aborted campaign, a status added later, and a campaign id
 * that names no campaign all end here. Translated as
 * `refusals.refuse_campaign_not_open.message` in the packs.
 */
const REFUSE_CAMPAIGN_NOT_OPEN = {
  id: 'refuse_campaign_not_open', type: 'end', label: 'Campaign Not Open',
  config: {
    outcome: 'refused',
    message: '{{ campaignRecord.display_title | default: "The chosen campaign" }} is not open for enrollment, or no longer exists: only a Planning or In Progress campaign takes members. Nobody was enrolled.',
  },
};

export const CampaignLeadMemberEnrollFlow: Flow = {
  name: 'campaign_lead_member_enroll',
  label: 'Enroll Lead in Campaign',
  description:
    'Enroll one lead in one campaign as the caller, skipping a lead already on it and refusing a campaign that is not open or a lead that opted out of email. Called by campaign_enrollment and by the lead Add to Campaign action.',
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
    GET_CAMPAIGN,
    CHECK_CAMPAIGN_OPEN,
    REFUSE_CAMPAIGN_NOT_OPEN,
    {
      id: 'get_lead', type: 'get_record', label: 'Get Lead',
      config: { objectName: 'crm_lead', filter: { id: cel`leadId` }, outputVariable: 'leadRecord' },
    },
    { id: 'check_lead_opted_in', type: 'decision', label: 'Opted In?' },
    {
      // Translated as `refusals.refuse_lead_opted_out.message` in the packs.
      id: 'refuse_lead_opted_out', type: 'end', label: 'Lead Opted Out',
      config: {
        outcome: 'refused',
        message: '{{ leadRecord.first_name }} {{ leadRecord.last_name }} has opted out of email, so the lead was not added to the campaign.',
      },
    },
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
    { id: 'e1', source: 'start', target: 'get_campaign', type: 'default' },
    { id: 'e2', source: 'get_campaign', target: 'check_campaign_open', type: 'default' },
    { id: 'e3', source: 'check_campaign_open', target: 'get_lead', type: 'conditional', condition: CAMPAIGN_OPEN, label: 'Open' },
    { id: 'e4', source: 'check_campaign_open', target: 'refuse_campaign_not_open', type: 'default', isDefault: true, label: 'Not open' },
    { id: 'e5', source: 'get_lead', target: 'check_lead_opted_in', type: 'default' },
    // Refused only on a stored `true`. A lead the caller cannot read binds
    // `leadRecord` to null and passes, so the insert answers for it as before.
    { id: 'e6', source: 'check_lead_opted_in', target: 'find_existing_member', type: 'conditional', condition: P`!has(vars.leadRecord) || !has(vars.leadRecord.email_opt_out) || vars.leadRecord.email_opt_out != true`, label: 'Opted in' },
    { id: 'e7', source: 'check_lead_opted_in', target: 'refuse_lead_opted_out', type: 'default', isDefault: true, label: 'Opted out' },
    { id: 'e8', source: 'find_existing_member', target: 'check_not_enrolled', type: 'default' },
    // Already enrolled → no edge → the run ends with `enrolled` still false.
    { id: 'e9', source: 'check_not_enrolled', target: 'create_campaign_member', type: 'conditional', condition: P`existingMember == null`, label: 'Enroll' },
    { id: 'e10', source: 'create_campaign_member', target: 'mark_enrolled', type: 'default' },
    { id: 'e11', source: 'mark_enrolled', target: 'end', type: 'default' },
  ],
};

export const CampaignContactMemberEnrollFlow: Flow = {
  name: 'campaign_contact_member_enroll',
  label: 'Enroll Contact in Campaign',
  description:
    'Enroll one contact in one campaign as the caller, skipping a contact already on it and refusing a campaign that is not open or a contact that opted out of email. Called by campaign_enrollment and by the contact Add to Campaign action.',
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
    GET_CAMPAIGN,
    CHECK_CAMPAIGN_OPEN,
    REFUSE_CAMPAIGN_NOT_OPEN,
    {
      id: 'get_contact', type: 'get_record', label: 'Get Contact',
      config: { objectName: 'crm_contact', filter: { id: cel`contactId` }, outputVariable: 'contactRecord' },
    },
    { id: 'check_contact_opted_in', type: 'decision', label: 'Opted In?' },
    {
      // Translated as `refusals.refuse_contact_opted_out.message` in the packs.
      id: 'refuse_contact_opted_out', type: 'end', label: 'Contact Opted Out',
      config: {
        outcome: 'refused',
        message: '{{ contactRecord.full_name | default: "This contact" }} has opted out of email, so the contact was not added to the campaign.',
      },
    },
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
    { id: 'e1', source: 'start', target: 'get_campaign', type: 'default' },
    { id: 'e2', source: 'get_campaign', target: 'check_campaign_open', type: 'default' },
    { id: 'e3', source: 'check_campaign_open', target: 'get_contact', type: 'conditional', condition: CAMPAIGN_OPEN, label: 'Open' },
    { id: 'e4', source: 'check_campaign_open', target: 'refuse_campaign_not_open', type: 'default', isDefault: true, label: 'Not open' },
    { id: 'e5', source: 'get_contact', target: 'check_contact_opted_in', type: 'default' },
    { id: 'e6', source: 'check_contact_opted_in', target: 'find_existing_contact_member', type: 'conditional', condition: P`!has(vars.contactRecord) || !has(vars.contactRecord.email_opt_out) || vars.contactRecord.email_opt_out != true`, label: 'Opted in' },
    { id: 'e7', source: 'check_contact_opted_in', target: 'refuse_contact_opted_out', type: 'default', isDefault: true, label: 'Opted out' },
    { id: 'e8', source: 'find_existing_contact_member', target: 'check_contact_not_enrolled', type: 'default' },
    { id: 'e9', source: 'check_contact_not_enrolled', target: 'create_contact_member', type: 'conditional', condition: P`existingContactMember == null`, label: 'Enroll' },
    { id: 'e10', source: 'create_contact_member', target: 'mark_contact_enrolled', type: 'default' },
    { id: 'e11', source: 'mark_contact_enrolled', target: 'end', type: 'default' },
  ],
};
