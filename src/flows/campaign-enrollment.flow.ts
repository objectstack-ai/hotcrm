// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Campaign Enrollment — screen flow to bulk-enroll leads into a campaign.
 *
 * Launched from the "Enroll Leads" action on a campaign record (the console's
 * flow-action trigger seeds `recordId`). It was previously a `schedule` flow
 * (Monday 9 AM cron) with `campaignId` / `leadStatus` input variables — but a
 * cron firing seeds NO inputs (only the console's flow-action trigger does,
 * cf. lead_conversion), so every run had both variables undefined: either it
 * matched no campaign, or it mass-enrolled every open lead into a null
 * campaign and died on the "Campaign required" validation. User-invoked with
 * a real campaign id, plus per-lead dedupe, it now does what the label says.
 *
 * Eligibility: leads in the chosen status, not converted, with an email, and
 * not opted out of email. Already-enrolled leads are skipped (idempotent —
 * re-running the action tops up new eligible leads only).
 *
 * Campaign metric rollups (num_sent etc.) are owned by the
 * `campaign_snapshot_metrics` hook — this flow does NOT write them (its old
 * per-run `num_sent = {leadList.length}` overwrite clobbered prior batches).
 */
export const CampaignEnrollmentFlow: Flow = {
  name: 'campaign_enrollment',
  label: 'Enroll Leads in Campaign',
  description: 'Bulk enroll eligible leads into this campaign (skips already-enrolled and opted-out leads).',
  type: 'screen',
  status: 'active',

  variables: [
    // `recordId` matches the console's flow-action trigger contract
    // ({ recordId, objectName }) — cf. lead_conversion / quote_generation.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'leadStatus', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_campaign' } },
    {
      id: 'screen_1', type: 'screen', label: 'Enrollment Criteria',
      config: {
        fields: [
          {
            name: 'leadStatus', label: 'Enroll leads in status', type: 'select', required: true,
            defaultValue: 'new',
            options: [
              { label: 'New', value: 'new' },
              { label: 'Contacted', value: 'contacted' },
              { label: 'Qualified', value: 'qualified' },
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
      // The gate itself is on edge `e4` — see the note there. This node carries
      // NO `config.condition`: the key is the trigger gate on a `start` node and
      // is read nowhere else, so a copy here would be a second, inert statement
      // of the predicate that no reader can tell apart from the live one
      // (flagged by `flow-inert-node-condition` from 17.0.0-rc.2, #4414).
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
        body: {
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
              id: 'check_not_enrolled', type: 'decision', label: 'New Member?',
              config: { condition: P`existingMember == null` },
            },
            {
              id: 'create_campaign_member', type: 'create_record', label: 'Add to Campaign',
              config: {
                objectName: 'crm_campaign_member',
                fields: { crm_campaign: '{recordId}', crm_lead: '{currentLead.id}', status: 'sent', added_date: '{NOW()}' },
              },
            },
          ],
          edges: [
            { id: 'b1', source: 'find_existing_member', target: 'check_not_enrolled', type: 'default' },
            // Already enrolled → no edge → next lead.
            { id: 'b2', source: 'check_not_enrolled', target: 'create_campaign_member', type: 'conditional', condition: P`existingMember == null`, label: 'Enroll' },
          ],
        },
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
    // THE live gate. A `decision` node's singular `config.condition` is never
    // read by the engine, so the branch lives here and only here.
    //
    // Only enroll into campaigns that are actually running (or planned):
    // topping up a completed/aborted campaign would corrupt its final snapshot
    // metrics. (Status values: planning / in_progress / completed / aborted.)
    //
    // TOTALITY (#643): `has(vars.campaignRecord)` first, then
    // `has(vars.campaignRecord.status)`. `campaignRecord` is a `get_record`
    // OUTPUT, and `findOne` answers a miss with `null` — so a campaign that was
    // deleted (or hidden by sharing) between the action click and this node
    // leaves the variable bound to null, and the unguarded read aborted with
    // `No such key: status`. Reproduced end-to-end: the run was recorded
    // `failed` and not one lead was enrolled. `status` itself is `required` on
    // `crm_campaign` today so the column is never sparse — but that is the
    // neighbouring schema doing the work, not this predicate, so it is guarded
    // too.
    { id: 'e4', source: 'check_campaign_open', target: 'query_leads', type: 'conditional', condition: P`has(vars.campaignRecord) && has(vars.campaignRecord.status)
      && (vars.campaignRecord.status == "planning" || vars.campaignRecord.status == "in_progress")`, label: 'Open' },
    { id: 'e5', source: 'query_leads', target: 'loop_leads', type: 'default' },
    { id: 'e6', source: 'loop_leads', target: 'end', type: 'default' },
  ],
};
