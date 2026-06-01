// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/** Case Escalation — auto-escalate high-priority cases */
export const CaseEscalationFlow: Flow = {
  name: 'case_escalation',
  label: 'Case Escalation Process',
  description: 'Automatically escalate high-priority cases',
  type: 'record_change',

  variables: [
    { name: 'caseId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    {
      id: 'start', type: 'start', label: 'Start',
      config: { objectName: 'crm_case', criteria: 'priority = "critical" OR (priority = "high" AND account.type = "customer")' },
    },
    {
      id: 'get_case', type: 'get_record', label: 'Get Case Record',
      config: { objectName: 'crm_case', filter: { id: '{caseId}' }, outputVariable: 'caseRecord' },
    },
    {
      id: 'assign_senior_agent', type: 'update_record', label: 'Assign to Senior Agent',
      config: {
        objectName: 'crm_case', filter: { id: '{caseId}' },
        fields: { owner: '{caseRecord.owner.manager}', is_escalated: true, escalated_date: '{NOW()}', status: 'escalated' },
      },
    },
    {
      id: 'create_task', type: 'create_record', label: 'Create Follow-up Task',
      config: {
        objectName: 'crm_task',
        fields: {
          subject: 'Follow up on escalated case: {caseRecord.case_number}',
          related_to_type: 'crm_case',
          related_to_case: '{caseId}',
          owner: '{caseRecord.owner}',
          priority: 'high', status: 'not_started', due_date: '{TODAY() + 1}',
        },
      },
    },
    {
      // ADR-0012: the dedicated `notify` node dispatches through the messaging
      // service (inbox + email + push). The legacy `script` + `actionType:'email'`
      // shape is a no-op stub in 7.4 and never delivered anything.
      id: 'notify_team', type: 'notify', label: 'Notify Support Team',
      config: {
        to: ['{caseRecord.owner}', '{caseRecord.owner.manager}'],
        channels: ['inbox', 'email'],
        severity: 'high',
        topic: 'case_escalated',
        title: 'Case escalated: {caseRecord.case_number}',
        body: 'Case {caseRecord.case_number} ({caseRecord.priority}) for {caseRecord.crm_account.name} has been escalated and reassigned.',
        actionUrl: '/crm_case/{caseId}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_case', type: 'default' },
    { id: 'e2', source: 'get_case', target: 'assign_senior_agent', type: 'default' },
    { id: 'e3', source: 'assign_senior_agent', target: 'create_task', type: 'default' },
    { id: 'e4', source: 'create_task', target: 'notify_team', type: 'default' },
    { id: 'e5', source: 'notify_team', target: 'end', type: 'default' },
  ],
};
