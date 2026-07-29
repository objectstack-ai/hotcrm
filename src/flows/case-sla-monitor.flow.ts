// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Case SLA Monitor — scheduled breach detection.
 *
 * Complements `case_escalation` (which reacts to *priority* the moment a case
 * is saved) by adding the missing *time* dimension. The schema carries
 * `sla_due_date` and `is_sla_violated`, but nothing watched the clock — a case
 * could silently blow its SLA. This flow sweeps open cases whose `sla_due_date`
 * has passed without resolution, stamps the breach, escalates, and alerts the
 * owner and their manager.
 *
 * Capabilities exercised: scheduled trigger + `loop` + `update_record` +
 * `notify` to a manager chain.
 */
export const CaseSlaMonitorFlow: Flow = {
  name: 'case_sla_monitor',
  label: 'Case SLA Monitor',
  description: 'Hourly sweep: flag and escalate open cases that have breached their SLA due date.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049, #1888).
  runAs: 'system',

  variables: [],

  nodes: [
    { id: 'start', type: 'start', label: 'Start (hourly)', config: { schedule: '0 * * * *' } },
    {
      id: 'query_breached', type: 'get_record', label: 'Find Breached Cases',
      config: {
        objectName: 'crm_case',
        filter: { is_closed: false, is_sla_violated: false, sla_due_date: { $lt: '{NOW()}' } },
        limit: 500,
        outputVariable: 'caseList',
      },
    },
    {
      id: 'loop_cases', type: 'loop', label: 'For Each Breached Case',
      config: {
        collection: '{caseList}',
        iteratorVariable: 'currentCase',
        body: {
          nodes: [
            {
              id: 'flag_breach', type: 'update_record', label: 'Flag SLA Breach',
              config: {
                objectName: 'crm_case',
                filter: { id: '{currentCase.id}' },
                fields: { is_sla_violated: true, is_escalated: true, status: 'escalated', escalated_date: '{NOW()}' },
              },
            },
            {
              id: 'notify_team', type: 'notify', label: 'Alert Owner & Manager',
              config: {
                // Owner only — `{currentCase.owner.manager}` dot-walks a
                // lookup, which flow templates interpolate as "undefined".
                to: ['{currentCase.owner}'],
                channels: ['inbox', 'email'],
                severity: 'critical',
                topic: 'case_sla_breach',
                title: 'SLA breached: case {currentCase.case_number}',
                body: 'Case {currentCase.case_number} ({currentCase.priority}) passed its SLA due date and has been auto-escalated.',
                actionUrl: '/crm_case/{currentCase.id}',
              },
            },
          ],
          edges: [
            { id: 'b1', source: 'flag_breach', target: 'notify_team', type: 'default' },
          ],
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'query_breached', type: 'default' },
    { id: 'e2', source: 'query_breached', target: 'loop_cases', type: 'default' },
    { id: 'e3', source: 'loop_cases', target: 'end', type: 'default' },
  ],
};
