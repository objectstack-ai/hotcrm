import { describe, it, expect } from 'vitest';
import {
  LeadToClosePipeline,
  Customer360Intelligence,
  ChurnPreventionWorkflow,
  IntelligentCaseResolution,
  TalentAcquisitionPipeline,
  RevenueOptimizationWorkflow,
  AgentWorkflows,
} from '../../../ai/src/agent_workflows';

describe('LeadToClosePipeline', () => {
  it('should have correct name and category', () => {
    expect(LeadToClosePipeline.name).toBe('lead_to_close_pipeline');
    expect(LeadToClosePipeline.category).toBe('sales');
  });

  it('should trigger on lead qualification event', () => {
    expect(LeadToClosePipeline.trigger.type).toBe('event');
    expect(LeadToClosePipeline.trigger.source).toBe('lead.status_changed_to_qualified');
  });

  it('should have 5 steps in correct order', () => {
    expect(LeadToClosePipeline.steps).toHaveLength(5);
    expect(LeadToClosePipeline.steps.map(s => s.id)).toEqual([
      'score_lead',
      'enrich_account',
      'forecast_deal',
      'generate_briefing',
      'recommend_pricing',
    ]);
  });

  it('should have step dependencies forming a DAG', () => {
    expect(LeadToClosePipeline.steps[0].dependsOn).toBeUndefined();
    expect(LeadToClosePipeline.steps[1].dependsOn).toEqual(['score_lead']);
    expect(LeadToClosePipeline.steps[2].dependsOn).toEqual(['enrich_account']);
    expect(LeadToClosePipeline.steps[3].dependsOn).toEqual(['forecast_deal']);
    expect(LeadToClosePipeline.steps[4].dependsOn).toEqual(['forecast_deal']);
  });

  it('should conditionally recommend pricing only for high-score leads', () => {
    const pricingStep = LeadToClosePipeline.steps.find(s => s.id === 'recommend_pricing');
    expect(pricingStep?.condition).toBe('score_lead.score >= 70');
  });

  it('should reference valid MCP tools', () => {
    const validTools = [
      'lead_scoring', 'account_context', 'opportunity_forecast',
      'sales_briefing', 'pricing_recommendation',
    ];
    for (const step of LeadToClosePipeline.steps) {
      expect(validTools).toContain(step.tool);
    }
  });

  it('should be active with version 1.0.0', () => {
    expect(LeadToClosePipeline.active).toBe(true);
    expect(LeadToClosePipeline.version).toBe('1.0.0');
  });
});

describe('Customer360Intelligence', () => {
  it('should have correct name and category', () => {
    expect(Customer360Intelligence.name).toBe('customer_360_intelligence');
    expect(Customer360Intelligence.category).toBe('analytics');
  });

  it('should be manually triggered', () => {
    expect(Customer360Intelligence.trigger.type).toBe('manual');
  });

  it('should have 5 steps spanning CRM, Support, Finance, and Marketing', () => {
    expect(Customer360Intelligence.steps).toHaveLength(5);
    const tools = Customer360Intelligence.steps.map(s => s.tool);
    expect(tools).toContain('account_context');
    expect(tools).toContain('pipeline_summary');
    expect(tools).toContain('case_metrics');
    expect(tools).toContain('revenue_forecast');
    expect(tools).toContain('campaign_optimization');
  });

  it('should conditionally run campaign performance step', () => {
    const step = Customer360Intelligence.steps.find(s => s.id === 'campaign_performance');
    expect(step?.condition).toBe('input.campaign_id != null');
  });

  it('should have revenue forecast depend on pipeline summary', () => {
    const step = Customer360Intelligence.steps.find(s => s.id === 'revenue_forecast');
    expect(step?.dependsOn).toEqual(['pipeline_summary']);
  });

  it('should be active', () => {
    expect(Customer360Intelligence.active).toBe(true);
  });
});

describe('ChurnPreventionWorkflow', () => {
  it('should have correct name and category', () => {
    expect(ChurnPreventionWorkflow.name).toBe('churn_prevention');
    expect(ChurnPreventionWorkflow.category).toBe('retention');
  });

  it('should run on a weekly schedule', () => {
    expect(ChurnPreventionWorkflow.trigger.type).toBe('scheduled');
    expect(ChurnPreventionWorkflow.trigger.schedule).toEqual({
      frequency: 'weekly',
      time: '07:00',
      timezone: 'UTC',
    });
  });

  it('should have 4 steps', () => {
    expect(ChurnPreventionWorkflow.steps).toHaveLength(4);
  });

  it('should only suggest retention if renewal probability < 0.6', () => {
    const step = ChurnPreventionWorkflow.steps.find(s => s.id === 'resolution_plan');
    expect(step?.condition).toBe('renewal_prediction.probability < 0.6');
  });

  it('should have resolution depend on both renewal prediction and case sentiment', () => {
    const step = ChurnPreventionWorkflow.steps.find(s => s.id === 'resolution_plan');
    expect(step?.dependsOn).toEqual(['renewal_prediction', 'case_sentiment']);
  });

  it('should be active', () => {
    expect(ChurnPreventionWorkflow.active).toBe(true);
  });
});

describe('IntelligentCaseResolution', () => {
  it('should have correct name and category', () => {
    expect(IntelligentCaseResolution.name).toBe('intelligent_case_resolution');
    expect(IntelligentCaseResolution.category).toBe('support');
  });

  it('should trigger on case creation event', () => {
    expect(IntelligentCaseResolution.trigger.type).toBe('event');
    expect(IntelligentCaseResolution.trigger.source).toBe('case.created');
  });

  it('should have 3 steps: classify, search, suggest', () => {
    expect(IntelligentCaseResolution.steps).toHaveLength(3);
    expect(IntelligentCaseResolution.steps.map(s => s.id)).toEqual([
      'classify',
      'search_kb',
      'suggest_resolution',
    ]);
  });

  it('should use case_classification, knowledge_search, and case_resolution tools', () => {
    const tools = IntelligentCaseResolution.steps.map(s => s.tool);
    expect(tools).toEqual(['case_classification', 'knowledge_search', 'case_resolution']);
  });

  it('should be active', () => {
    expect(IntelligentCaseResolution.active).toBe(true);
  });
});

describe('TalentAcquisitionPipeline', () => {
  it('should have correct name and category', () => {
    expect(TalentAcquisitionPipeline.name).toBe('talent_acquisition_pipeline');
    expect(TalentAcquisitionPipeline.category).toBe('hr');
  });

  it('should trigger on application submission event', () => {
    expect(TalentAcquisitionPipeline.trigger.type).toBe('event');
    expect(TalentAcquisitionPipeline.trigger.source).toBe('application.submitted');
  });

  it('should have 3 steps', () => {
    expect(TalentAcquisitionPipeline.steps).toHaveLength(3);
    expect(TalentAcquisitionPipeline.steps.map(s => s.id)).toEqual([
      'screen_candidate',
      'evaluate_candidate',
      'hr_context',
    ]);
  });

  it('should include bias check in screening', () => {
    const step = TalentAcquisitionPipeline.steps.find(s => s.id === 'screen_candidate');
    expect(step?.parameters.include_bias_check).toBe(true);
  });

  it('should be active', () => {
    expect(TalentAcquisitionPipeline.active).toBe(true);
  });
});

describe('RevenueOptimizationWorkflow', () => {
  it('should have correct name and category', () => {
    expect(RevenueOptimizationWorkflow.name).toBe('revenue_optimization');
    expect(RevenueOptimizationWorkflow.category).toBe('finance');
  });

  it('should run on a monthly schedule', () => {
    expect(RevenueOptimizationWorkflow.trigger.type).toBe('scheduled');
    expect(RevenueOptimizationWorkflow.trigger.schedule).toEqual({
      frequency: 'monthly',
      time: '06:00',
      timezone: 'UTC',
    });
  });

  it('should have 3 steps', () => {
    expect(RevenueOptimizationWorkflow.steps).toHaveLength(3);
  });

  it('should conditionally run campaign and pricing steps', () => {
    const campaign = RevenueOptimizationWorkflow.steps.find(s => s.id === 'campaign_roi');
    const pricing = RevenueOptimizationWorkflow.steps.find(s => s.id === 'pricing');
    expect(campaign?.condition).toBe('input.campaign_id != null');
    expect(pricing?.condition).toBe('input.product_id != null');
  });

  it('should be active', () => {
    expect(RevenueOptimizationWorkflow.active).toBe(true);
  });
});

describe('AgentWorkflows collection', () => {
  it('should contain all 6 workflows', () => {
    expect(Object.keys(AgentWorkflows)).toHaveLength(6);
    expect(AgentWorkflows.leadToClose).toBe(LeadToClosePipeline);
    expect(AgentWorkflows.customer360).toBe(Customer360Intelligence);
    expect(AgentWorkflows.churnPrevention).toBe(ChurnPreventionWorkflow);
    expect(AgentWorkflows.intelligentCaseResolution).toBe(IntelligentCaseResolution);
    expect(AgentWorkflows.talentAcquisition).toBe(TalentAcquisitionPipeline);
    expect(AgentWorkflows.revenueOptimization).toBe(RevenueOptimizationWorkflow);
  });

  it('should have unique names across all workflows', () => {
    const names = Object.values(AgentWorkflows).map(w => w.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should have all workflows active', () => {
    for (const workflow of Object.values(AgentWorkflows)) {
      expect(workflow.active).toBe(true);
    }
  });

  it('should have all workflow names in snake_case', () => {
    for (const workflow of Object.values(AgentWorkflows)) {
      expect(workflow.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('should have all step IDs in snake_case', () => {
    for (const workflow of Object.values(AgentWorkflows)) {
      for (const step of workflow.steps) {
        expect(step.id).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    }
  });

  it('should have timeouts on all steps', () => {
    for (const workflow of Object.values(AgentWorkflows)) {
      for (const step of workflow.steps) {
        expect(step.timeout).toBeGreaterThan(0);
      }
    }
  });
});
