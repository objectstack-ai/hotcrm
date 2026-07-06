// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Quote auto-expiration — scheduled daily sweep.
 *
 * Migrated from the removed `quote_expired_check` object workflow (7.7 dropped
 * `workflows[]`). Flips quotes past their `expiration_date` to `expired` unless
 * already accepted/rejected/expired.
 */
export const QuoteExpirationFlow: Flow = {
  name: 'quote_expiration',
  label: 'Quote Auto-Expiration',
  description: 'Daily: expire quotes past their expiration_date that are still open.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049, #1888).
  runAs: 'system',
  variables: [],
  nodes: [
    { id: 'start', type: 'start', label: 'Start (daily 01:00)', config: { schedule: '0 1 * * *' } },
    {
      id: 'query_quotes', type: 'get_record', label: 'Find Expired Quotes',
      config: {
        objectName: 'crm_quote',
        filter: { status: { $nin: ['accepted', 'rejected', 'expired'] }, expiration_date: { $lt: '{TODAY()}' } },
        limit: 500,
        outputVariable: 'quoteList',
      },
    },
    {
      id: 'loop_quotes', type: 'loop', label: 'For Each Quote',
      config: {
        collection: '{quoteList}',
        iteratorVariable: 'currentQuote',
        body: {
          nodes: [
            {
              id: 'mark_expired', type: 'update_record', label: 'Mark Expired',
              config: { objectName: 'crm_quote', filter: { id: '{currentQuote.id}' }, fields: { status: 'expired' } },
            },
          ],
          edges: [],
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'query_quotes', type: 'default' },
    { id: 'e2', source: 'query_quotes', target: 'loop_quotes', type: 'default' },
    { id: 'e3', source: 'loop_quotes', target: 'end', type: 'default' },
  ],
};
