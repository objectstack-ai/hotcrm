import { describe, it, expect } from 'vitest';
import { WorkflowRuleSchema } from '@objectstack/spec/automation';
import { ValidatedWorkflows } from '../../../src/lead.workflow';
import { ValidatedLeadLifecycleStateMachine } from '../../../src/lead.statemachine';
import { ValidatedOpportunityLifecycleStateMachine } from '../../../src/opportunity.statemachine';

describe('CRM Automation Schema Compliance', () => {
  describe('Lead Workflows (ValidatedWorkflows)', () => {
    it('should be defined', () => {
      expect(ValidatedWorkflows).toBeDefined();
    });

    it('should contain all expected workflow entries', () => {
      expect(ValidatedWorkflows.leadAutoAssignment).toBeDefined();
      expect(ValidatedWorkflows.leadAutoScoring).toBeDefined();
      expect(ValidatedWorkflows.leadNurturing).toBeDefined();
      expect(ValidatedWorkflows.leadEnrichment).toBeDefined();
    });

    it('each workflow should re-validate against WorkflowRuleSchema', () => {
      for (const [, workflow] of Object.entries(ValidatedWorkflows)) {
        expect(() => WorkflowRuleSchema.parse(workflow)).not.toThrow();
      }
    });
  });

  describe('LeadStateMachine', () => {
    it('should be defined (validated at module load)', () => {
      expect(ValidatedLeadLifecycleStateMachine).toBeDefined();
    });

    it('should have an id property', () => {
      expect(ValidatedLeadLifecycleStateMachine.id).toBeTruthy();
    });
  });

  describe('OpportunityStateMachine', () => {
    it('should be defined (validated at module load)', () => {
      expect(ValidatedOpportunityLifecycleStateMachine).toBeDefined();
    });

    it('should have an id property', () => {
      expect(ValidatedOpportunityLifecycleStateMachine.id).toBeTruthy();
    });
  });
});
