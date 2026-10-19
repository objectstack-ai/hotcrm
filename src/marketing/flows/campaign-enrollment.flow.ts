// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from '../../sales/flows/_guarded-iteration';
type Flow = Automation.Flow;

/**
 * Campaign Enrollment — screen flow to bulk-enroll leads OR contacts into a
 * campaign.
 *
 * Launched from the "Enroll Members" action on a campaign record. ⛔ Never turn
 * this into a `schedule` flow: a cron firing seeds NO input variables — only the
 * console's flow-action trigger does (cf. lead_conversion) — so `recordId` and
 * the segment fields arrive undefined, and the run either matches no campaign or
 * mass-enrolls every open lead into a null campaign.
 *
 * The contact branch mirrors the lead branch rather than being a second dialect:
 * same open-campaign gate, same eligibility shape, same per-member dedupe, same
 * `sent` + `added_date` stamp. Segmentation mirrors too — leads are segmented by
 * `status` (where they are in qualification); contacts have no such column, so
 * they are segmented by `department`, the field that answers "who is this person
 * at the account", which is what a campaign targeting an existing customer base
 * selects on.
 *
 * Eligibility, both sides: has an email, and is not opted out of email; leads
 * additionally must not already be converted (a converted lead is now a contact,
 * and would otherwise be enrollable through both branches as two people).
 * Already-enrolled people are skipped, so re-running the action tops up rather
 * than duplicating.
 *
 * ⛔ This flow does NOT write the campaign metric rollups (`num_sent` etc.) —
 * the campaign metric hooks own them and refresh on every membership change. A
 * per-run `num_sent = {leadList.length}` overwrite here clobbers prior batches.
 *
 * ## Who may enroll, and what the run says (#2167)
 *
 * The insert and the already-enrolled check are the two per-person flows in
 * `campaign-member-enroll.flow.ts`, and they run as the caller, like this
 * flow: a profile without `allowCreate` on `crm_campaign_member` is refused
 * there, person by person. The guarded iteration contains each refusal, and
 * the run counts both outcomes (Q2 letter a): a run that refused anyone ends
 * `refused` with both counts in its message, and a clean run ends `completed`
 * with the static `successMessage` below. Which person failed, and why, is
 * the failed step the run log keeps for each refused iteration.
 */
export const CampaignEnrollmentFlow: Flow = {
  name: 'campaign_enrollment',
  label: 'Enroll Members in Campaign',
  description: 'Bulk enroll eligible leads or contacts into this campaign (skips already-enrolled and opted-out people).',
  type: 'screen',
  status: 'active',
  // The clean run's message, and the ONLY place it is written: the Enroll
  // Members action declares none, so the console shows this one (translated
  // as `flows.campaign_enrollment.successMessage` in the packs). A plain
  // string; the engine interpolates nothing here, which is why the counts
  // live on the refused ending instead.
  successMessage: 'Eligible members enrolled in campaign.',

  variables: [
    // `recordId` matches the console's flow-action trigger contract
    // ({ recordId, objectName }) — cf. lead_conversion / quote_generation.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    /**
     * `memberSource` is BOUND BY THIS DECLARATION — not by a seeding node.
     *
     * Both branch edges (`e4` / `e7`) read `vars.memberSource`, so it must be
     * bound on every path reaching them. `FlowVariableSchema` carries
     * `defaultValue` and the engine seeds it before the start node runs, so this
     * key alone binds the name — while a caller-supplied
     * `context.params.memberSource` still WINS over it.
     *
     * ⚠️ Measured on the 17.1.0 spec, with the schema key re-checked on 17.2.0.
     * Neither that key nor the seeding behaviour was re-checked on 17.3.0 or
     * 17.4.0 (PR #1814, #1807), nor on 17.5.0, 17.6.0, 17.7.0, or the 18.0.0-next line
     * through 18.0.0-next.5 (#2031, #2105, #2124, #2136, #2179).
     *
     * ⛔ Never seed this with an assignment node instead. An assignment is
     * unconditional, so it CLOBBERS a supplied param — measured: launching with
     * `params.memberSource = 'contacts'` ran the LEAD branch. It also restates a
     * default the screen field carries, with nothing keeping the two in step.
     *
     * A second, independent reason no seeding node is needed here: the
     * `memberSource` screen field below is `required: true`, and since
     * 17.0.0-rc.2 the SERVER holds a screen resume to the declared field
     * contract. A resume signal omitting `memberSource` is refused with
     * `INVALID_SCREEN_INPUT` and the run stays paused, so the ordinary resume
     * path cannot reach an unbound read at all — unlike `lead_conversion`'s
     * checkbox, which is deliberately not `required` and therefore has an
     * unanswered state. The one path that skips that check is a resume carrying
     * NO signal object; measured on 17.x, it fails one node later at
     * `query_leads` regardless of this binding, because `leadStatus` is unbound
     * and the query never runs widened. Since 18.0.0-next.0 the filter operand
     * is a CEL envelope, and an unbound variable fails the run before the query
     * (the platform's `flow-value-slot-template-dialect-refused` contract; not
     * re-measured here).
     *
     * The literal lives HERE and nowhere else: the screen field derives its
     * prefill from this variable (its `defaultValue` envelope reads `memberSource`).
     */
    { name: 'memberSource', type: 'text', isInput: true, isOutput: false, defaultValue: 'leads' },
    /**
     * `leadStatus` / `contactDepartment` deliberately carry NO `defaultValue`,
     * and the asymmetry with `memberSource` is the point. No condition in this
     * flow reads either one — each is a `get_record` `filter` operand — so the
     * binding analysis in `test/flow-variable-conditions.test.ts` does not
     * cover them. An unbound one fails the run before the query is made (the
     * 18.0.0-next.0 filter-operand contract), because an absent condition
     * widens a query instead of narrowing it. Seeding these two would turn that
     * loud failure into a silent enrolment of a segment nobody chose; their
     * `required: true` screen fields are what supply them.
     */
    { name: 'leadStatus', type: 'text', isInput: true, isOutput: false },
    { name: 'contactDepartment', type: 'text', isInput: true, isOutput: false },
    // The two counts the refused ending reports. Not inputs: a caller has no
    // business seeding a count.
    { name: 'enrolledCount', type: 'number', isInput: false, isOutput: false, defaultValue: 0 },
    { name: 'refusedCount', type: 'number', isInput: false, isOutput: false, defaultValue: 0 },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_campaign' } },
    {
      id: 'screen_1', type: 'screen', label: 'Enrollment Criteria',
      config: {
        fields: [
          {
            // Prefill DERIVED from the variable, so the default is written
            // once (on the declaration) rather than restated here — the
            // single-authority form. The envelope is evaluated before the
            // screen goes on the wire, so the client receives the raw value,
            // the string `leads`, which is what a literal
            // `defaultValue: 'leads'` used to send.
            name: 'memberSource', label: 'Enroll', type: 'select', required: true,
            defaultValue: cel`memberSource`,
            options: [
              { label: 'Leads', value: 'leads' },
              { label: 'Contacts', value: 'contacts' },
            ],
          },
          {
            name: 'leadStatus', label: 'Enroll leads in status', type: 'select', required: true,
            defaultValue: 'new',
            options: [
              { label: 'New', value: 'new' },
              { label: 'Contacted', value: 'contacted' },
              { label: 'Qualified', value: 'qualified' },
            ],
          },
          {
            // Required, like `leadStatus`, and for the same reason: a blank
            // segment would reach the filter as an empty string and
            // silently match the contacts with NO department rather than all of
            // them. Both branches make the caller name a segment.
            name: 'contactDepartment', label: 'Enroll contacts in department',
            type: 'select', required: true, defaultValue: 'executive',
            options: [
              { label: 'Executive', value: 'executive' },
              { label: 'Sales', value: 'sales' },
              { label: 'Marketing', value: 'marketing' },
              { label: 'Engineering', value: 'engineering' },
              { label: 'Support', value: 'support' },
              { label: 'Finance', value: 'finance' },
              { label: 'Human Resources', value: 'hr' },
              { label: 'Operations', value: 'operations' },
            ],
          },
        ],
      },
    },
    {
      id: 'get_campaign', type: 'get_record', label: 'Get Campaign',
      config: { objectName: 'crm_campaign', filter: { id: cel`recordId` }, outputVariable: 'campaignRecord' },
    },
    {
      // The gate itself is on edges `e4` / `e7` — see the notes there. This node
      // carries NO `config.condition`: the key is the trigger gate on a `start`
      // node and is read nowhere else, so a copy here would be a second, inert
      // statement of the predicate that no reader can tell apart from the live
      // one (flagged by `flow-inert-node-condition` from 17.0.0-rc.2).
      id: 'check_campaign_open', type: 'decision', label: 'Campaign Open?',
    },
    {
      id: 'query_leads', type: 'get_record', label: 'Find Eligible Leads',
      config: {
        objectName: 'crm_lead',
        filter: {
          status: cel`leadStatus`,
          is_converted: false,
          email: { $ne: null },
          // This is email-campaign enrollment — honour the opt-out flag.
          // `campaign_member_optout_sync` populates it: an unsubscribed member
          // round-trips to the person's `email_opt_out`.
          email_opt_out: false,
        },
        limit: 1000,
        outputVariable: 'leadList',
      },
    },
    {
      id: 'loop_leads', type: 'loop', label: 'Process Each Lead',
      config: {
        collection: cel`leadList`,
        iteratorVariable: 'currentLead',
        body: guarded('lead', {
          nodes: [
            {
              // The per-person flow inserts the member, or skips a lead this
              // campaign already has, as the caller; `enrolled` says which.
              // ⛔ Do not give THIS flow `runAs: 'system'` to let a profile
              // enroll: it would also lift RLS off `query_leads` /
              // `query_contacts`, and `crm_lead` is `sharingModel: 'private'`.
              // See `src/marketing/flows/campaign-member-enroll.flow.ts`.
              id: 'create_campaign_member', type: 'subflow', label: 'Add to Campaign',
              config: {
                flowName: 'campaign_lead_member_enroll',
                input: { campaignId: cel`recordId`, leadId: cel`currentLead.id` },
                outputVariable: 'leadEnrolment',
              },
            },
            {
              // Gateway only — the predicate lives on the out-edge.
              id: 'check_lead_enrolled', type: 'decision', label: 'Enrolled?',
            },
            {
              id: 'count_enrolled_lead', type: 'assignment', label: 'Count Enrolled',
              config: { assignments: { enrolledCount: cel`enrolledCount + 1` } },
            },
          ],
          edges: [
            { id: 'b1', source: 'create_campaign_member', target: 'check_lead_enrolled', type: 'default' },
            // Already enrolled → no edge → next lead, counted as neither.
            { id: 'b2', source: 'check_lead_enrolled', target: 'count_enrolled_lead', type: 'conditional', condition: P`leadEnrolment.enrolled == true`, label: 'Enrolled' },
          ],
        // A refused lead is caught here and counted.
        }, { refusedCount: cel`refusedCount + 1` }),
      },
    },
    {
      id: 'query_contacts', type: 'get_record', label: 'Find Eligible Contacts',
      config: {
        objectName: 'crm_contact',
        filter: {
          department: cel`contactDepartment`,
          email: { $ne: null },
          // Same opt-out honour as the lead branch. There is no `is_converted`
          // twin here: a contact IS the converted end state.
          email_opt_out: false,
        },
        limit: 1000,
        outputVariable: 'contactList',
      },
    },
    {
      id: 'loop_contacts', type: 'loop', label: 'Process Each Contact',
      config: {
        collection: cel`contactList`,
        iteratorVariable: 'currentContact',
        body: guarded('contact', {
          nodes: [
            {
              // The contact mirror of `create_campaign_member` above. Its
              // dedupe is scoped on `crm_contact`, so a person enrolled as a
              // LEAD is not a duplicate of the same person as a CONTACT.
              id: 'create_contact_member', type: 'subflow', label: 'Add Contact to Campaign',
              config: {
                flowName: 'campaign_contact_member_enroll',
                input: { campaignId: cel`recordId`, contactId: cel`currentContact.id` },
                outputVariable: 'contactEnrolment',
              },
            },
            { id: 'check_contact_enrolled', type: 'decision', label: 'Enrolled?' },
            {
              id: 'count_enrolled_contact', type: 'assignment', label: 'Count Enrolled',
              config: { assignments: { enrolledCount: cel`enrolledCount + 1` } },
            },
          ],
          edges: [
            { id: 'c1', source: 'create_contact_member', target: 'check_contact_enrolled', type: 'default' },
            { id: 'c2', source: 'check_contact_enrolled', target: 'count_enrolled_contact', type: 'conditional', condition: P`contactEnrolment.enrolled == true`, label: 'Enrolled' },
          ],
        }, { refusedCount: cel`refusedCount + 1` }),
      },
    },
    // Gateway only — the two complementary predicates live on `e10` / `e11`.
    { id: 'check_refused', type: 'decision', label: 'Anyone Refused?' },
    {
      // Q2 letter a (#2167): any refusal ends the run `refused`, with both
      // counts. The console shows it with Close only, and no completion
      // toast. Translated as `refusals.end_refused.message` in the packs.
      id: 'end_refused', type: 'end', label: 'Enrollment Refused',
      config: {
        outcome: 'refused',
        message: 'Enrollment refused for {{refusedCount}} of the people selected: {{enrolledCount}} enrolled, {{refusedCount}} refused. A refused person was not added to the campaign; the flow run log records why for each one.',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'get_campaign', type: 'default' },
    { id: 'e3', source: 'get_campaign', target: 'check_campaign_open', type: 'default' },
    // Closed campaign → no edge → flow ends without enrolling.
    //
    // THE live gate, on the EDGES and only here. A `decision` node's singular
    // `config.condition` is never read by the engine.
    //
    // Only enroll into campaigns that are actually running (or planned):
    // topping up a completed/aborted campaign would corrupt its recorded
    // metrics. (Status values: planning / in_progress / completed / aborted.)
    //
    // TOTALITY: `has(vars.campaignRecord)` first, then
    // `has(vars.campaignRecord.status)`. `campaignRecord` is a `get_record`
    // OUTPUT, and `findOne` answers a miss with `null` — so a campaign that was
    // deleted (or hidden by sharing) between the action click and this node
    // leaves the variable bound to null, and an unguarded read aborts with
    // `No such key: status`, recording the run `failed` with not one lead
    // enrolled. `status` is `required` on `crm_campaign` today so the column is
    // never sparse — but that is the neighbouring schema doing the work, not
    // this predicate, so it is guarded too.
    //
    // TWO conditional out-edges, one per member side. The open-campaign clause
    // is repeated on both rather than hoisted to a second decision node: the
    // gate IS the edge predicate here, so a separate "which side" node would
    // need its own out-edges carrying the same clause anyway, and a node
    // stating it once in `config.condition` is inert.
    { id: 'e4', source: 'check_campaign_open', target: 'query_leads', type: 'conditional', condition: P`has(vars.campaignRecord) && has(vars.campaignRecord.status)
      && (vars.campaignRecord.status == "planning" || vars.campaignRecord.status == "in_progress")
      && vars.memberSource != "contacts"`, label: 'Open · Leads' },
    { id: 'e5', source: 'query_leads', target: 'loop_leads', type: 'default' },
    { id: 'e6', source: 'loop_leads', target: 'check_refused', type: 'default' },
    // The contact branch. `memberSource` carries no `has()` guard on either
    // edge, deliberately: its `flow.variables` declaration carries
    // `defaultValue: 'leads'`, which the engine seeds before the start node, so
    // it is bound on every path that reaches here — and on the ordinary resume
    // path the server has already refused any signal that omitted the
    // `required` screen field. A guard would have buried the policy ("no answer
    // means leads") inside a predicate and left the graph defect in place — see
    // test/flow-variable-conditions.test.ts.
    { id: 'e7', source: 'check_campaign_open', target: 'query_contacts', type: 'conditional', condition: P`has(vars.campaignRecord) && has(vars.campaignRecord.status)
      && (vars.campaignRecord.status == "planning" || vars.campaignRecord.status == "in_progress")
      && vars.memberSource == "contacts"`, label: 'Open · Contacts' },
    { id: 'e8', source: 'query_contacts', target: 'loop_contacts', type: 'default' },
    { id: 'e9', source: 'loop_contacts', target: 'check_refused', type: 'default' },
    // Complementary conditionals rather than an `isDefault` fallback, so the
    // pair reads as one cut and neither edge depends on branch-label routing.
    { id: 'e10', source: 'check_refused', target: 'end_refused', type: 'conditional', condition: P`vars.refusedCount > 0`, label: 'Refused' },
    { id: 'e11', source: 'check_refused', target: 'end', type: 'conditional', condition: P`vars.refusedCount == 0`, label: 'Clean' },
  ],
};
