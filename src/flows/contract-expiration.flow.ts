// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Contract auto-expiration — scheduled daily sweep.
 *
 * Migrated from the removed `contract_expiration_check` object workflow (7.7
 * dropped `workflows[]`). Flips `activated` contracts past their `end_date` to
 * `expired` and notifies the owner. (Renewal *reminders* are a separate concern
 * already handled by the `contract_renewal` flow.)
 */
export const ContractExpirationFlow: Flow = {
  name: 'contract_expiration',
  label: 'Contract Auto-Expiration',
  description: 'Daily: expire activated contracts past their end_date and notify the owner.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049, #1888).
  runAs: 'system',
  variables: [],
  nodes: [
    { id: 'start', type: 'start', label: 'Start (daily 00:00)', config: { schedule: '0 0 * * *' } },
    {
      id: 'query_contracts', type: 'get_record', label: 'Find Expired Contracts',
      config: {
        objectName: 'crm_contract',
        filter: { status: 'activated', end_date: { $lt: '{TODAY()}' } },
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
              id: 'mark_expired', type: 'update_record', label: 'Mark Expired',
              config: { objectName: 'crm_contract', filter: { id: '{currentContract.id}' }, fields: { status: 'expired' } },
            },
            {
              id: 'notify_owner', type: 'notify', label: 'Notify Owner',
              config: {
                recipients: ['{currentContract.owner}'],
                channels: ['inbox', 'email'],
                topic: 'contract_expired',
                title: 'Contract expired: {currentContract.contract_number}',
                message: 'Contract {currentContract.contract_number} reached its end date and has been marked expired.',
                actionUrl: '/crm_contract/{currentContract.id}',
              },
            },
          ],
          edges: [
            { id: 'b1', source: 'mark_expired', target: 'notify_owner', type: 'default' },
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
