// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from './_guarded-iteration';
type Flow = Automation.Flow;

/**
 * Contract auto-expiration — scheduled daily sweep.
 *
 * Flips `activated` contracts past their `end_date` to `expired` and notifies
 * the owner. (Renewal *reminders* are a separate concern, handled by the
 * `contract_renewal` flow.)
 */
export const ContractExpirationFlow: Flow = {
  name: 'contract_expiration',
  label: 'Contract Auto-Expiration',
  description: 'Daily: expire activated contracts past their end_date and notify the owner.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049).
  runAs: 'system',
  variables: [],
  nodes: [
    { id: 'start', type: 'start', label: 'Start (daily 00:00)', config: { schedule: '0 0 * * *' } },
    {
      id: 'query_contracts', type: 'get_record', label: 'Find Expired Contracts',
      config: {
        objectName: 'crm_contract',
        filter: { status: 'activated', end_date: { $lt: cel`isoDate(today())` } },
        limit: 500,
        outputVariable: 'contractList',
      },
    },
    {
      id: 'loop_contracts', type: 'loop', label: 'For Each Contract',
      config: {
        collection: cel`contractList`,
        iteratorVariable: 'currentContract',
        body: guarded('contract', {
          nodes: [
            {
              id: 'mark_expired', type: 'update_record', label: 'Mark Expired',
              config: { objectName: 'crm_contract', filter: { id: cel`currentContract.id` }, fields: { status: 'expired' } },
            },
            {
              id: 'notify_owner', type: 'notify', label: 'Notify Owner',
              config: {
                recipients: [cel`has(currentContract.owner_id) ? currentContract.owner_id : null`],
                channels: ['inbox', 'email'],
                topic: 'contract_expired',
                template: 'crm.contract_expired',
                templateData: { contract_number: cel`currentContract.contract_number` },
                actionUrl: '/crm_contract/{{currentContract.id}}',
                // A schedule run has no organization: since 18.0.0-next.1 the
                // notification takes its owner from this record (objectstack#23284).
                sourceObject: 'crm_contract',
                sourceId: cel`currentContract.id`,
              },
            },
          ],
          edges: [
            { id: 'b1', source: 'mark_expired', target: 'notify_owner', type: 'default' },
          ],
        }),
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
