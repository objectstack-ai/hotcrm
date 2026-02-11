import { describe, it, expect } from 'vitest';
import {
  CaseAutoEscalation,
  CaseHighPriorityAlert,
  CaseStaleCheck,
  CaseFirstResponseSLA,
  CaseEscalationWorkflows
} from '../../../src/case_escalation.workflow';
import { SupportPlugin } from '../../../src/plugin';

describe('CaseAutoEscalation', () => {
  it('should have correct name, object, and triggerType', () => {
    expect(CaseAutoEscalation.name).toBe('case_auto_escalation');
    expect(CaseAutoEscalation.object).toBe('case');
    expect(CaseAutoEscalation.triggerType).toBe('onUpdate');
  });

  it('should have correct condition for SLA violation on open, non-escalated cases', () => {
    expect(CaseAutoEscalation.condition).toBe(
      'is_sla_violated = true AND status != "closed" AND status != "resolved" AND is_escalated = false'
    );
  });

  it('should contain field update action for priority', () => {
    const priorityAction = CaseAutoEscalation.actions.find(
      (a: any) => a.type === 'fieldUpdate' && a.field === 'priority'
    );
    expect(priorityAction).toBeDefined();
    expect(priorityAction.formula).toBeDefined();
  });

  it('should contain field update action for is_escalated', () => {
    const action = CaseAutoEscalation.actions.find(
      (a: any) => a.type === 'fieldUpdate' && a.field === 'is_escalated'
    );
    expect(action).toBeDefined();
    expect(action.value).toBe(true);
  });

  it('should contain field update action for escalated_date', () => {
    const action = CaseAutoEscalation.actions.find(
      (a: any) => a.type === 'fieldUpdate' && a.field === 'escalated_date'
    );
    expect(action).toBeDefined();
    expect(action.value).toBe('NOW()');
  });

  it('should contain field update action for escalation_reason', () => {
    const action = CaseAutoEscalation.actions.find(
      (a: any) => a.type === 'fieldUpdate' && a.field === 'escalation_reason'
    );
    expect(action).toBeDefined();
    expect(action.value).toBe('SLA resolution target exceeded');
  });

  it('should contain an email alert action', () => {
    const emailAction = CaseAutoEscalation.actions.find(
      (a: any) => a.type === 'emailAlert'
    );
    expect(emailAction).toBeDefined();
    expect(emailAction.template).toBe('case_sla_escalation');
  });

  it('should be active', () => {
    expect(CaseAutoEscalation.active).toBe(true);
  });
});

describe('CaseHighPriorityAlert', () => {
  it('should have correct name and trigger on create or update', () => {
    expect(CaseHighPriorityAlert.name).toBe('case_high_priority_alert');
    expect(CaseHighPriorityAlert.triggerType).toBe('onCreateOrUpdate');
  });

  it('should trigger on critical priority change', () => {
    expect(CaseHighPriorityAlert.condition).toBe(
      'priority = "critical" AND ISCHANGED(priority)'
    );
  });

  it('should contain an email alert action', () => {
    const emailAction = CaseHighPriorityAlert.actions.find(
      (a: any) => a.type === 'emailAlert'
    );
    expect(emailAction).toBeDefined();
    expect(emailAction.template).toBe('critical_case_alert');
  });

  it('should contain a task creation action', () => {
    const taskAction = CaseHighPriorityAlert.actions.find(
      (a: any) => a.type === 'taskCreation'
    );
    expect(taskAction).toBeDefined();
    expect(taskAction.priority).toBe('critical');
  });

  it('should be active', () => {
    expect(CaseHighPriorityAlert.active).toBe(true);
  });
});

describe('CaseStaleCheck', () => {
  it('should be a scheduled workflow running daily at 08:00', () => {
    expect(CaseStaleCheck.triggerType).toBe('scheduled');
    expect(CaseStaleCheck.schedule).toEqual({
      frequency: 'daily',
      time: '08:00',
      timezone: 'UTC'
    });
  });

  it('should have correct condition for stale in-progress cases', () => {
    expect(CaseStaleCheck.condition).toBe(
      'status = "in_progress" AND modified_date < TODAY() - 3'
    );
  });

  it('should contain a task creation action', () => {
    const taskAction = CaseStaleCheck.actions.find(
      (a: any) => a.type === 'taskCreation'
    );
    expect(taskAction).toBeDefined();
    expect(taskAction.priority).toBe('high');
  });

  it('should contain an email alert action', () => {
    const emailAction = CaseStaleCheck.actions.find(
      (a: any) => a.type === 'emailAlert'
    );
    expect(emailAction).toBeDefined();
    expect(emailAction.template).toBe('stale_case_reminder');
  });

  it('should be active', () => {
    expect(CaseStaleCheck.active).toBe(true);
  });
});

describe('CaseFirstResponseSLA', () => {
  it('should trigger on create with response_due_date condition', () => {
    expect(CaseFirstResponseSLA.triggerType).toBe('onCreate');
    expect(CaseFirstResponseSLA.condition).toBe(
      'response_due_date != NULL AND status = "new"'
    );
  });

  it('should contain a task creation action', () => {
    const taskAction = CaseFirstResponseSLA.actions.find(
      (a: any) => a.type === 'taskCreation'
    );
    expect(taskAction).toBeDefined();
    expect(taskAction.dueDate).toBe('${response_due_date}');
  });

  it('should contain an email alert action', () => {
    const emailAction = CaseFirstResponseSLA.actions.find(
      (a: any) => a.type === 'emailAlert'
    );
    expect(emailAction).toBeDefined();
    expect(emailAction.template).toBe('case_first_response_assignment');
  });

  it('should be active', () => {
    expect(CaseFirstResponseSLA.active).toBe(true);
  });
});

describe('CaseEscalationWorkflows', () => {
  it('should contain all 4 workflows', () => {
    expect(Object.keys(CaseEscalationWorkflows)).toHaveLength(4);
    expect(CaseEscalationWorkflows.autoEscalation).toBe(CaseAutoEscalation);
    expect(CaseEscalationWorkflows.highPriorityAlert).toBe(CaseHighPriorityAlert);
    expect(CaseEscalationWorkflows.staleCheck).toBe(CaseStaleCheck);
    expect(CaseEscalationWorkflows.firstResponseSLA).toBe(CaseFirstResponseSLA);
  });
});

describe('SupportPlugin workflow registration', () => {
  it('should register all escalation workflows', () => {
    expect(SupportPlugin.workflows).toBeDefined();
    expect(SupportPlugin.workflows.case_auto_escalation).toBe(CaseAutoEscalation);
    expect(SupportPlugin.workflows.case_high_priority_alert).toBe(CaseHighPriorityAlert);
    expect(SupportPlugin.workflows.case_stale_check).toBe(CaseStaleCheck);
    expect(SupportPlugin.workflows.case_first_response_sla).toBe(CaseFirstResponseSLA);
  });
});
