// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Contract Renewal — scheduled daily sweep for contracts entering their
 * renewal-notice window.
 *
 * Business gap this closes: the data model ships `end_date`, `auto_renewal`
 * and `renewal_notice_days` on every contract, but nothing consumed them —
 * renewals depended on someone remembering. This flow operationalises those
 * fields: each morning it finds `activated` contracts whose `end_date` falls
 * inside their per-contract notice window, books a renewal task for the owner,
 * notifies them, and — when `auto_renewal` is on — opens an `existing_renewal`
 * opportunity pre-filled from the contract value so the deal is already in the
 * pipeline.
 *
 * Capabilities exercised: scheduled trigger + `loop` over a query result +
 * per-record `decision` gates + `notify` (ADR-0012).
 */
export const ContractRenewalFlow: Flow = {
  name: 'contract_renewal',
  label: 'Contract Renewal Reminder',
  description: 'Daily sweep: open renewal tasks/opportunities for contracts nearing end_date.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049, #1888).
  runAs: 'system',

  variables: [],

  nodes: [
    { id: 'start', type: 'start', label: 'Start (daily 08:00)', config: { schedule: '0 8 * * *' } },
    {
      // Broad pre-filter (next 120 days — must cover the LARGEST
      // renewal_notice_days in use, seeds go up to 90); the per-record notice
      // window is applied in the decision node below so each contract honours
      // its own renewal_notice_days. A pre-filter narrower than the largest
      // notice period silently truncates it (a 90-day contract was invisible
      // until 60 days out).
      id: 'query_contracts', type: 'get_record', label: 'Find Expiring Contracts',
      config: {
        objectName: 'crm_contract',
        filter: { status: 'activated', end_date: { $gte: '{TODAY()}', $lte: '{TODAY() + 120}' } },
        limit: 500,
        outputVariable: 'contractList',
      },
    },
    {
      id: 'loop_contracts', type: 'loop', label: 'For Each Contract',
      config: {
        collection: '{contractList}',
        iteratorVariable: 'currentContract',
        body: {
          nodes: [
            {
              id: 'check_notice_window', type: 'decision', label: 'Within Notice Window?',
              // `end_date` is a DATE field and arrives as `YYYY-MM-DD`, but CEL's
              // `timestamp()` only accepts a full ISO 8601 datetime and throws
              // otherwise ("timestamp() requires a string in ISO 8601 format").
              // Appending the time part is what makes this evaluate instead of
              // blowing up mid-sweep — a defect that only became REACHABLE once
              // the condition was wrapped as a real CEL envelope, because the
              // old bare string was never evaluated at all.
              //
              // TOTALITY (#643): `currentContract` is a LOOP ITEM over
              // `contractList`, which `get_record` filled from `data.find` —
              // every element is a raw driver row, sparse in exactly the way
              // #633 measured. `end_date` is `required` on `crm_contract` so
              // that column is always written, but `renewal_notice_days`
              // (`defaultValue: 30`) and `auto_renewal` (`defaultValue: false`)
              // are only DEFAULTED, and a row written before the default
              // existed carries neither the column nor a value. Both operands
              // additionally need `!= null`, because the abort here is not the
              // usual overload error: `null + "T00:00:00Z"` and `int(null)`
              // each blow up inside the function call, one contract into a
              // 500-row sweep, taking the whole scheduled run with them.
              config: { condition: P`has(vars.currentContract) && has(vars.currentContract.end_date) && has(vars.currentContract.renewal_notice_days)
                && vars.currentContract.end_date != null && vars.currentContract.renewal_notice_days != null
                && timestamp(vars.currentContract.end_date + "T00:00:00Z") <= daysFromNow(int(vars.currentContract.renewal_notice_days))` },
            },
            {
              // Idempotency gate: the sweep matches the same contract every
              // day of its notice window — without this it created a duplicate
              // task + notification (and, below, a duplicate pipeline-inflating
              // renewal opportunity) per day. An open renewal task for this
              // contract means this window was already handled.
              id: 'find_existing_task', type: 'get_record', label: 'Already Reminded?',
              config: {
                objectName: 'crm_task',
                filter: {
                  related_to_account: '{currentContract.crm_account}',
                  subject: 'Renewal due: contract {currentContract.contract_number}',
                  status: { $nin: ['completed'] },
                },
                outputVariable: 'existingRenewalTask',
              },
            },
            {
              id: 'check_not_reminded', type: 'decision', label: 'First Reminder?',
              config: { condition: P`existingRenewalTask == null` },
            },
            {
              id: 'create_renewal_task', type: 'create_record', label: 'Create Renewal Task',
              config: {
                objectName: 'crm_task',
                fields: {
                  subject: 'Renewal due: contract {currentContract.contract_number}',
                  type: 'follow_up', priority: 'high', status: 'not_started',
                  due_date: '{currentContract.end_date}',
                  owner_id: '{currentContract.owner_id}',
                  related_to_type: 'crm_account',
                  related_to_account: '{currentContract.crm_account}',
                },
              },
            },
            {
              id: 'notify_owner', type: 'notify', label: 'Notify Owner',
              config: {
                recipients: ['{currentContract.owner_id}'],
                channels: ['inbox', 'email'],
                topic: 'contract_renewal',
                title: 'Contract renewal due: {currentContract.contract_number}',
                message: 'Contract {currentContract.contract_number} ends on {currentContract.end_date}. Start the renewal conversation now.',
                actionUrl: '/crm_contract/{currentContract.id}',
              },
            },
            {
              id: 'check_auto_renewal', type: 'decision', label: 'Auto-Renewal On?',
              // TOTALITY (#643): same loop item, same sparse driver row. Only
              // an explicit `true` opens a renewal deal, so an absent column
              // reads as "auto-renewal off" — the conservative branch.
              config: { condition: P`has(vars.currentContract) && has(vars.currentContract.auto_renewal)
                && vars.currentContract.auto_renewal == true` },
            },
            {
              // Second gate: never open a second renewal opportunity while one
              // is still in flight for this account (belt-and-braces for the
              // case where the task was completed but the deal is still open).
              id: 'find_existing_renewal_opp', type: 'get_record', label: 'Open Renewal Deal Exists?',
              config: {
                objectName: 'crm_opportunity',
                filter: {
                  crm_account: '{currentContract.crm_account}',
                  type: 'existing_renewal',
                  stage: { $nin: ['closed_won', 'closed_lost'] },
                },
                outputVariable: 'existingRenewalOpp',
              },
            },
            {
              id: 'check_no_open_renewal', type: 'decision', label: 'No Open Renewal Deal?',
              config: { condition: P`existingRenewalOpp == null` },
            },
            {
              id: 'create_renewal_opp', type: 'create_record', label: 'Open Renewal Opportunity',
              config: {
                objectName: 'crm_opportunity',
                fields: {
                  name: 'Renewal — {currentContract.contract_number}',
                  crm_account: '{currentContract.crm_account}',
                  amount: '{currentContract.contract_value}',
                  stage: 'proposal',
                  type: 'existing_renewal',
                  close_date: '{currentContract.end_date}',
                  owner_id: '{currentContract.owner_id}',
                  next_step: 'Confirm renewal terms with customer',
                },
              },
            },
          ],
          edges: [
            // Only act when inside the per-contract notice window; gates with
            // no matching edge simply end the iteration, so the loop moves on.
            // Guarded identically to `check_notice_window` — see the note there.
            // The EDGE is the live site: the engine never reads a `decision`
            // node's singular `config.condition`, only `config.conditions[]`.
            { id: 'b1', source: 'check_notice_window', target: 'find_existing_task', type: 'conditional', condition: P`has(vars.currentContract) && has(vars.currentContract.end_date) && has(vars.currentContract.renewal_notice_days)
              && vars.currentContract.end_date != null && vars.currentContract.renewal_notice_days != null
              && timestamp(vars.currentContract.end_date + "T00:00:00Z") <= daysFromNow(int(vars.currentContract.renewal_notice_days))`, label: 'In window' },
            { id: 'b2', source: 'find_existing_task', target: 'check_not_reminded', type: 'default' },
            { id: 'b3', source: 'check_not_reminded', target: 'create_renewal_task', type: 'conditional', condition: P`existingRenewalTask == null`, label: 'First reminder' },
            { id: 'b4', source: 'create_renewal_task', target: 'notify_owner', type: 'default' },
            { id: 'b5', source: 'notify_owner', target: 'check_auto_renewal', type: 'default' },
            { id: 'b6', source: 'check_auto_renewal', target: 'find_existing_renewal_opp', type: 'conditional', condition: P`has(vars.currentContract) && has(vars.currentContract.auto_renewal)
              && vars.currentContract.auto_renewal == true`, label: 'Auto-renew' },
            { id: 'b7', source: 'find_existing_renewal_opp', target: 'check_no_open_renewal', type: 'default' },
            { id: 'b8', source: 'check_no_open_renewal', target: 'create_renewal_opp', type: 'conditional', condition: P`existingRenewalOpp == null`, label: 'Open renewal deal' },
          ],
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'query_contracts', type: 'default' },
    { id: 'e2', source: 'query_contracts', target: 'loop_contracts', type: 'default' },
    { id: 'e3', source: 'loop_contracts', target: 'end', type: 'default' },
  ],
};
