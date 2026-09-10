// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from './_guarded-iteration';
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
 */
export const CampaignEnrollmentFlow: Flow = {
  name: 'campaign_enrollment',
  label: 'Enroll Members in Campaign',
  description: 'Bulk enroll eligible leads or contacts into this campaign (skips already-enrolled and opted-out people).',
  type: 'screen',
  status: 'active',

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
     * Neither that key nor the seeding behaviour has been re-checked against the
     * current pin, 17.4.0 since PR #1814 (#1807) — nor was either re-checked on
     * the 17.3.0 pin that preceded it.
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
     * NO signal object; measured, it fails one node later at `query_leads`
     * regardless of this binding, because `{leadStatus}` resolves to nothing and
     * `get_record` refuses to run rather than widen the query.
     *
     * The literal lives HERE and nowhere else: the screen field derives its
     * prefill from this variable (`defaultValue: '{memberSource}'`).
     */
    { name: 'memberSource', type: 'text', isInput: true, isOutput: false, defaultValue: 'leads' },
    /**
     * `leadStatus` / `contactDepartment` deliberately carry NO `defaultValue`,
     * and the asymmetry with `memberSource` is the point. No condition in this
     * flow reads either one — they are interpolated into a `get_record`
     * `filter` — so the binding analysis in
     * `test/flow-variable-conditions.test.ts` does not cover them, and the CEL
     * abort it exists to prevent cannot happen here. An unresolved
     * interpolation makes `get_record` REFUSE TO RUN and name the offending
     * condition, because an absent condition widens a query instead of
     * narrowing it. Seeding these two would turn that loud refusal into a
     * silent enrolment of a segment nobody chose; their `required: true`
     * screen fields are what supply them.
     */
    { name: 'leadStatus', type: 'text', isInput: true, isOutput: false },
    { name: 'contactDepartment', type: 'text', isInput: true, isOutput: false },
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
            // single-authority form. It reaches the client
            // interpolated to the raw value, the string `leads`, which is what
            // a literal `defaultValue: 'leads'` used to send.
            name: 'memberSource', label: 'Enroll', type: 'select', required: true,
            defaultValue: '{memberSource}',
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
            // segment would interpolate into the filter as an empty string and
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
      config: { objectName: 'crm_campaign', filter: { id: '{recordId}' }, outputVariable: 'campaignRecord' },
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
          status: '{leadStatus}',
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
        collection: '{leadList}',
        iteratorVariable: 'currentLead',
        body: guarded('lead', {
          nodes: [
            {
              // Dedupe: skip leads already enrolled in THIS campaign, so a
              // re-run tops up instead of double-enrolling (double rows
              // inflated num_sent / response_rate).
              id: 'find_existing_member', type: 'get_record', label: 'Already Enrolled?',
              config: {
                objectName: 'crm_campaign_member',
                filter: { crm_campaign: '{recordId}', crm_lead: '{currentLead.id}' },
                outputVariable: 'existingMember',
              },
            },
            {
              // Gateway only — the predicate lives on the out-edge.
              id: 'check_not_enrolled', type: 'decision', label: 'New Member?',
            },
            {
              // ⭐ The INSERT is elevated, this flow is NOT. `added_date` is
              // `readonly: true`, and from @objectstack/objectql 17.4.0 the
              // readonly strip runs inside `engine.insert` for a non-system
              // caller as well as on update — so a write from this screen
              // flow's user context now loses the stamp. The remedy the
              // platform names is a system context; the remedy AGENTS.md house
              // rule 9 names is a dedicated `system` sub-flow rather than
              // elevating the screen flow. Both are satisfied here. ⛔ Do not
              // fold this back by giving THIS flow `runAs: 'system'`: it would
              // also lift RLS off `query_leads` / `query_contacts`, and
              // `crm_lead` is `sharingModel: 'private'`.
              // See `src/flows/campaign-member-enroll.flow.ts`.
              id: 'create_campaign_member', type: 'subflow', label: 'Add to Campaign',
              config: {
                flowName: 'campaign_lead_member_enroll',
                input: { campaignId: '{recordId}', leadId: '{currentLead.id}' },
              },
            },
          ],
          edges: [
            { id: 'b1', source: 'find_existing_member', target: 'check_not_enrolled', type: 'default' },
            // Already enrolled → no edge → next lead. This edge is the ONLY
            // site for the predicate: a `decision` node's singular
            // `config.condition` is never read, so a node copy would be inert.
            { id: 'b2', source: 'check_not_enrolled', target: 'create_campaign_member', type: 'conditional', condition: P`existingMember == null`, label: 'Enroll' },
          ],
        }),
      },
    },
    {
      id: 'query_contacts', type: 'get_record', label: 'Find Eligible Contacts',
      config: {
        objectName: 'crm_contact',
        filter: {
          department: '{contactDepartment}',
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
        collection: '{contactList}',
        iteratorVariable: 'currentContact',
        body: guarded('contact', {
          nodes: [
            {
              // Dedupe scoped on `crm_contact`, so a person enrolled as a LEAD
              // and again as a CONTACT is not treated as a duplicate: those are
              // two records of two different relationships, and the seed
              // datasets key them separately for the same reason.
              id: 'find_existing_contact_member', type: 'get_record', label: 'Already Enrolled?',
              config: {
                objectName: 'crm_campaign_member',
                filter: { crm_campaign: '{recordId}', crm_contact: '{currentContact.id}' },
                outputVariable: 'existingContactMember',
              },
            },
            {
              // Gateway only — the predicate lives on the out-edge.
              id: 'check_contact_not_enrolled', type: 'decision', label: 'New Member?',
            },
            {
              // The contact mirror of `create_campaign_member` above — same
              // elevation, same reason. See that node's note.
              id: 'create_contact_member', type: 'subflow', label: 'Add Contact to Campaign',
              config: {
                flowName: 'campaign_contact_member_enroll',
                input: { campaignId: '{recordId}', contactId: '{currentContact.id}' },
              },
            },
          ],
          edges: [
            { id: 'c1', source: 'find_existing_contact_member', target: 'check_contact_not_enrolled', type: 'default' },
            { id: 'c2', source: 'check_contact_not_enrolled', target: 'create_contact_member', type: 'conditional', condition: P`existingContactMember == null`, label: 'Enroll' },
          ],
        }),
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
    { id: 'e6', source: 'loop_leads', target: 'end', type: 'default' },
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
    { id: 'e9', source: 'loop_contacts', target: 'end', type: 'default' },
  ],
};
