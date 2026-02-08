import { describe, it, expect, vi } from 'vitest';

// Mock @objectstack/spec/ai - Agent.create is a metadata declaration helper
vi.mock('@objectstack/spec/ai', () => ({
  Agent: {
    create: (config: any) => config
  }
}));

import { SalesCoPilotAgent } from '../../src/sales_copilot.agent';

describe('SalesCoPilotAgent', () => {
  it('should be defined with correct name', () => {
    expect(SalesCoPilotAgent).toBeDefined();
    expect(SalesCoPilotAgent.name).toBe('sales_copilot');
  });

  it('should have the correct role', () => {
    expect(SalesCoPilotAgent.role).toBe('Sales Co-Pilot');
  });

  it('should have a system prompt focused on deal velocity and stage analysis', () => {
    expect(SalesCoPilotAgent.systemPrompt).toBeDefined();
    expect(SalesCoPilotAgent.systemPrompt).toContain('deal velocity');
    expect(SalesCoPilotAgent.systemPrompt).toContain('next-best-actions');
  });

  it('should define all required tools', () => {
    const toolNames = SalesCoPilotAgent.tools.map((t: any) => t.name);
    expect(toolNames).toContain('analyzeVelocity');
    expect(toolNames).toContain('suggestNextActions');
    expect(toolNames).toContain('assessDealRisk');
    expect(toolNames).toContain('forecastCloseDate');
    expect(toolNames).toContain('getStakeholderMap');
    expect(toolNames).toContain('compareWinPatterns');
    expect(toolNames).toContain('analyzePipeline');
    expect(SalesCoPilotAgent.tools.length).toBe(7);
  });

  it('should have analyzeVelocity tool with required parameters', () => {
    const tool = SalesCoPilotAgent.tools.find((t: any) => t.name === 'analyzeVelocity');
    expect(tool).toBeDefined();
    expect(tool!.parameters.opportunity_id.required).toBe(true);
    expect(tool!.action).toBe('deal_velocity_analysis');
  });

  it('should have suggestNextActions tool with required parameters', () => {
    const tool = SalesCoPilotAgent.tools.find((t: any) => t.name === 'suggestNextActions');
    expect(tool).toBeDefined();
    expect(tool!.parameters.opportunity_id.required).toBe(true);
    expect(tool!.action).toBe('next_best_actions');
  });

  it('should have analyzePipeline tool for portfolio-level insights', () => {
    const tool = SalesCoPilotAgent.tools.find((t: any) => t.name === 'analyzePipeline');
    expect(tool).toBeDefined();
    expect(tool!.parameters.owner_id.required).toBe(true);
    expect(tool!.action).toBe('pipeline_intelligence');
  });

  it('should configure GPT-4 model', () => {
    expect(SalesCoPilotAgent.model.provider).toBe('openai');
    expect(SalesCoPilotAgent.model.model).toBe('gpt-4');
  });

  it('should have safety restrictions preventing pricing modifications', () => {
    expect(SalesCoPilotAgent.safety.restrictedActions).toContain('modify_pricing_without_approval');
    expect(SalesCoPilotAgent.safety.restrictedActions).toContain('delete_opportunity');
  });

  it('should require approval for stage changes', () => {
    expect(SalesCoPilotAgent.safety.requireApprovalFor).toContain('change_opportunity_stage');
  });

  it('should have read-only record access by default', () => {
    expect(SalesCoPilotAgent.capabilities.canAnalyzePipeline).toBe(true);
    expect(SalesCoPilotAgent.capabilities.canUpdateRecords).toBe(false);
  });

  it('should have content filter enabled', () => {
    expect(SalesCoPilotAgent.safety.enableContentFilter).toBe(true);
  });

  it('should provide conversation examples', () => {
    expect(SalesCoPilotAgent.examples).toBeDefined();
    expect(SalesCoPilotAgent.examples.length).toBeGreaterThan(0);
  });

  it('should enable monitoring with feedback loop', () => {
    expect(SalesCoPilotAgent.monitoring.trackUsage).toBe(true);
    expect(SalesCoPilotAgent.monitoring.feedbackLoop).toBe(true);
  });
});
