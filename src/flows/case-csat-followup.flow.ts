// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Case CSAT Follow-up — close the loop after a case is resolved.
 *
 * The case object has a `customer_rating` field but nothing ever prompted for
 * it. This flow fires when a case is closed, waits a day so the resolution can
 * settle, then asks the owner to capture a satisfaction rating from the
 * contact — turning an unused field into a feedback loop.
 *
 * Capabilities exercised: record-change trigger + the **`wait` node** (timer) —
 * the single most valuable Flow capability the CRM was not using. The wait lets
 * a single flow span real elapsed time (BPMN intermediate timer / Temporal
 * sleep) instead of needing a second scheduled job.
 */
export const CaseCsatFollowupFlow: Flow = {
  name: 'case_csat_followup',
  label: 'Case CSAT Follow-up',
  description: 'When a case closes, wait a day then prompt the owner to collect a satisfaction rating.',
  type: 'record_change',
  status: 'active',

  variables: [],

  nodes: [
    {
      // Trigger wiring (7.4): bind to the ObjectQL afterUpdate hook and gate on
      // the close transition via a CEL `condition` (record vs previous), so the
      // flow fires once — when the case actually moves into `closed`.
      id: 'start', type: 'start', label: 'Start (case closed)',
      config: {
        objectName: 'crm_case',
        triggerType: 'record-after-update',
        // TOTALITY (#633): `has(...)` on every read, including the ones into
        // `previous`. `previous` is the driver's PRIOR row, so it is sparse on
        // driver-memory / driver-mongodb exactly like `record` is — measured,
        // `previous == null || previous.status != "closed"` still aborts when
        // `previous` is a row that simply has no `status` column. The
        // `previous == null` term is kept because it is the author's declared
        // intent for "no prior row: this is the close"; `!has(previous.status)`
        // extends that same answer to a prior row the driver returned without
        // the key. (`has()` on a null `previous` measures `false`, so the two
        // terms agree rather than fight.)
        condition: P`has(record.status) && record.status == "closed"
          && (previous == null || !has(previous.status) || previous.status != "closed")`,
      },
    },
    {
      // Pause the run for 24h, then resume on the timer (BPMN intermediate
      // timer event). No second job needed — the flow itself spans the delay.
      id: 'wait_1d', type: 'wait', label: 'Wait 1 Day',
      waitEventConfig: { eventType: 'timer', timerDuration: 'P1D' },
    },
    {
      id: 'notify_csat', type: 'notify', label: 'Request Satisfaction Rating',
      config: {
        recipients: ['{record.owner}'],
        channels: ['inbox', 'email'],
        topic: 'case_csat',
        title: 'Collect CSAT: case {record.case_number}',
        message: 'Case {record.case_number} closed yesterday. Reach out to the contact and log their satisfaction rating.',
        actionUrl: '/crm_case/{record.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'wait_1d', type: 'default' },
    { id: 'e2', source: 'wait_1d', target: 'notify_csat', type: 'default' },
    { id: 'e3', source: 'notify_csat', target: 'end', type: 'default' },
  ],
};
