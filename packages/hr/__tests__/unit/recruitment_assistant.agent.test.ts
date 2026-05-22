import { describe, it, expect, vi } from 'vitest';

// Mock @objectstack/spec/ai - Agent.create is a metadata declaration helper
vi.mock('@objectstack/spec/ai', () => ({
  Agent: {
    create: (config: any) => config
  }
}));

import { RecruitmentAssistantAgent } from '../../src/recruitment_assistant.agent';

describe('RecruitmentAssistantAgent', () => {
  it('should be defined with correct name', () => {
    expect(RecruitmentAssistantAgent).toBeDefined();
    expect(RecruitmentAssistantAgent.name).toBe('recruitment_assistant');
  });

  it('should have the correct role', () => {
    expect(RecruitmentAssistantAgent.role).toBe('Recruitment AI Assistant');
  });

  it('should have a system prompt focused on resume screening and interviews', () => {
    expect(RecruitmentAssistantAgent.instructions).toBeDefined();
    expect(RecruitmentAssistantAgent.instructions).toContain('screen');
    expect(RecruitmentAssistantAgent.instructions).toContain('interview');
  });

  it('should define all required tools', () => {
    const toolNames = RecruitmentAssistantAgent.tools.map((t: any) => t.name);
    expect(toolNames).toContain('screenResume');
    expect(toolNames).toContain('rankCandidates');
    expect(toolNames).toContain('scheduleInterview');
    expect(toolNames).toContain('generateInterviewKit');
    expect(toolNames).toContain('assessCulturalFit');
    expect(toolNames).toContain('getHiringPipelineInsights');
    expect(RecruitmentAssistantAgent.tools.length).toBe(6);
  });

  it('should have screenResume tool with required parameters', () => {
    const tool = RecruitmentAssistantAgent.tools.find((t: any) => t.name === 'screenResume');
    expect(tool).toBeDefined();
    expect(tool!.parameters.candidate_id.required).toBe(true);
    expect(tool!.parameters.position_id.required).toBe(true);
    expect(tool!.parameters.resume_text.required).toBe(true);
    expect(tool!.action).toBe('resume_screening');
  });

  it('should have scheduleInterview tool with required parameters', () => {
    const tool = RecruitmentAssistantAgent.tools.find((t: any) => t.name === 'scheduleInterview');
    expect(tool).toBeDefined();
    expect(tool!.parameters.candidate_id.required).toBe(true);
    expect(tool!.parameters.position_id.required).toBe(true);
    expect(tool!.parameters.interview_type.required).toBe(true);
    expect(tool!.action).toBe('interview_scheduling');
  });

  it('should have rankCandidates tool with default criteria weights', () => {
    const tool = RecruitmentAssistantAgent.tools.find((t: any) => t.name === 'rankCandidates');
    expect(tool).toBeDefined();
    expect(tool!.parameters.criteria_weights.defaultValue).toBeDefined();
    expect(tool!.parameters.criteria_weights.defaultValue.skills).toBe(0.35);
    expect(tool!.parameters.criteria_weights.defaultValue.experience).toBe(0.30);
  });

  it('should configure GPT-4 model with low temperature for objective screening', () => {
    expect(RecruitmentAssistantAgent.model.provider).toBe('openai');
    expect(RecruitmentAssistantAgent.model.model).toBe('gpt-4');
    expect(RecruitmentAssistantAgent.model.temperature).toBeLessThanOrEqual(0.5);
  });

  it('should have safety restrictions preventing unauthorized actions', () => {
    expect(RecruitmentAssistantAgent.safety.restrictedActions).toContain('reject_candidate_without_review');
    expect(RecruitmentAssistantAgent.safety.restrictedActions).toContain('access_salary_data');
    expect(RecruitmentAssistantAgent.safety.restrictedActions).toContain('share_candidate_data_externally');
  });

  it('should require approval for offers and rejections', () => {
    expect(RecruitmentAssistantAgent.safety.requireApprovalFor).toContain('extend_offer');
    expect(RecruitmentAssistantAgent.safety.requireApprovalFor).toContain('send_rejection_email');
  });

  it('should have read-only record access by default', () => {
    expect(RecruitmentAssistantAgent.capabilities.canScreenResumes).toBe(true);
    expect(RecruitmentAssistantAgent.capabilities.canScheduleInterviews).toBe(true);
    expect(RecruitmentAssistantAgent.capabilities.canUpdateRecords).toBe(false);
  });

  it('should provide conversation examples', () => {
    expect(RecruitmentAssistantAgent.examples).toBeDefined();
    expect(RecruitmentAssistantAgent.examples.length).toBeGreaterThan(0);
  });

  it('should enable monitoring', () => {
    expect(RecruitmentAssistantAgent.monitoring.trackUsage).toBe(true);
    expect(RecruitmentAssistantAgent.monitoring.trackAccuracy).toBe(true);
  });
});
