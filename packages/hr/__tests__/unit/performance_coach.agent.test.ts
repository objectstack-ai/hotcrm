import { describe, it, expect, vi } from 'vitest';

// Mock @objectstack/spec/ai - Agent.create is a metadata declaration helper
vi.mock('@objectstack/spec/ai', () => ({
  Agent: {
    create: (config: any) => config
  }
}));

import { PerformanceCoachAgent } from '../../src/performance_coach.agent';

describe('PerformanceCoachAgent', () => {
  it('should be defined with correct name', () => {
    expect(PerformanceCoachAgent).toBeDefined();
    expect(PerformanceCoachAgent.name).toBe('performance_coach');
  });

  it('should have the correct role', () => {
    expect(PerformanceCoachAgent.role).toBe('Performance Coach');
  });

  it('should have a system prompt focused on OKRs and performance', () => {
    expect(PerformanceCoachAgent.instructions).toBeDefined();
    expect(PerformanceCoachAgent.instructions).toContain('OKR');
    expect(PerformanceCoachAgent.instructions).toContain('performance');
  });

  it('should define all required tools', () => {
    const toolNames = PerformanceCoachAgent.tools.map((t: any) => t.name);
    expect(toolNames).toContain('recommendOKRs');
    expect(toolNames).toContain('analyzePerformanceTrends');
    expect(toolNames).toContain('identifySkillGaps');
    expect(toolNames).toContain('generateDevelopmentPlan');
    expect(toolNames).toContain('benchmarkPerformance');
    expect(toolNames).toContain('suggestRecognition');
    expect(PerformanceCoachAgent.tools.length).toBe(6);
  });

  it('should have recommendOKRs tool with required parameters', () => {
    const tool = PerformanceCoachAgent.tools.find((t: any) => t.name === 'recommendOKRs');
    expect(tool).toBeDefined();
    expect(tool!.parameters.employee_id.required).toBe(true);
    expect(tool!.action).toBe('okr_recommendation');
  });

  it('should have identifySkillGaps tool with optional target role', () => {
    const tool = PerformanceCoachAgent.tools.find((t: any) => t.name === 'identifySkillGaps');
    expect(tool).toBeDefined();
    expect(tool!.parameters.employee_id.required).toBe(true);
    expect(tool!.parameters.target_role).toBeDefined();
    expect(tool!.action).toBe('skill_gap_analysis');
  });

  it('should have benchmarkPerformance tool with scope options', () => {
    const tool = PerformanceCoachAgent.tools.find((t: any) => t.name === 'benchmarkPerformance');
    expect(tool).toBeDefined();
    expect(tool!.parameters.benchmark_scope.enum).toContain('team');
    expect(tool!.parameters.benchmark_scope.enum).toContain('industry');
  });

  it('should configure GPT-4 model', () => {
    expect(PerformanceCoachAgent.model.provider).toBe('openai');
    expect(PerformanceCoachAgent.model.model).toBe('gpt-4');
  });

  it('should have safety restrictions preventing salary modifications', () => {
    expect(PerformanceCoachAgent.safety.restrictedActions).toContain('modify_salary');
    expect(PerformanceCoachAgent.safety.restrictedActions).toContain('change_performance_rating');
    expect(PerformanceCoachAgent.safety.restrictedActions).toContain('share_performance_data_externally');
  });

  it('should require approval for performance submissions', () => {
    expect(PerformanceCoachAgent.safety.requireApprovalFor).toContain('submit_performance_review');
  });

  it('should have read-only record access by default', () => {
    expect(PerformanceCoachAgent.capabilities.canRecommendOKRs).toBe(true);
    expect(PerformanceCoachAgent.capabilities.canUpdateRecords).toBe(false);
  });

  it('should provide conversation examples', () => {
    expect(PerformanceCoachAgent.examples).toBeDefined();
    expect(PerformanceCoachAgent.examples.length).toBeGreaterThan(0);
  });

  it('should enable monitoring', () => {
    expect(PerformanceCoachAgent.monitoring.trackUsage).toBe(true);
    expect(PerformanceCoachAgent.monitoring.trackAccuracy).toBe(true);
    expect(PerformanceCoachAgent.monitoring.feedbackLoop).toBe(true);
  });
});
