import { describe, it, expect } from 'vitest';
import { WorkflowRuleSchema, TimeTriggerSchema } from '@objectstack/spec/automation';
import { ValidatedCaseLifecycleStateMachine } from '../../../src/case.statemachine';
import { ValidatedWorkflows } from '../../../src/case_escalation.workflow';
import { ValidatedTimeTriggers } from '../../../src/case_sla.timetrigger';

describe('Support Automation Schema Compliance', () => {
  describe('CaseStateMachine', () => {
    it('should be defined (validated at module load)', () => {
      expect(ValidatedCaseLifecycleStateMachine).toBeDefined();
    });

    it('should have an id property', () => {
      expect(ValidatedCaseLifecycleStateMachine.id).toBeTruthy();
    });
  });

  describe('Case Escalation Workflows (ValidatedWorkflows)', () => {
    it('should be defined', () => {
      expect(ValidatedWorkflows).toBeDefined();
    });

    it('each workflow should re-validate against WorkflowRuleSchema', () => {
      for (const [, workflow] of Object.entries(ValidatedWorkflows)) {
        expect(() => WorkflowRuleSchema.parse(workflow)).not.toThrow();
      }
    });
  });

  describe('Case SLA Time Triggers (ValidatedTimeTriggers)', () => {
    it('should be defined', () => {
      expect(ValidatedTimeTriggers).toBeDefined();
    });

    it('each trigger should re-validate against TimeTriggerSchema', () => {
      for (const [, trigger] of Object.entries(ValidatedTimeTriggers)) {
        expect(() => TimeTriggerSchema.parse(trigger)).not.toThrow();
      }
    });
  });
});
