import { describe, it, expect } from 'vitest';
import { MCPPromptSchema } from '@objectstack/spec/ai';
import {
  DealAnalysisPrompt,
  Customer360SummaryPrompt,
  NextBestActionPrompt,
  WinLossAnalysisPrompt,
} from '../../../src/crm_prompts.mcp';
import {
  CaseResolutionSuggestionPrompt,
  CustomerSentimentPrompt,
  EscalationAssessmentPrompt,
} from '../../../src/support_prompts.mcp';
import {
  CandidateAssessmentPrompt,
  PerformanceReviewDraftPrompt,
  SuccessionAnalysisPrompt,
} from '../../../src/hr_prompts.mcp';

// ---------------------------------------------------------------------------
// CRM Prompts
// ---------------------------------------------------------------------------

describe('CRM MCP Prompts Metadata Compliance', () => {
  const prompts = [
    { name: 'DealAnalysisPrompt', prompt: DealAnalysisPrompt },
    { name: 'Customer360SummaryPrompt', prompt: Customer360SummaryPrompt },
    { name: 'NextBestActionPrompt', prompt: NextBestActionPrompt },
    { name: 'WinLossAnalysisPrompt', prompt: WinLossAnalysisPrompt },
  ];

  it('should export a collection of prompts', () => {
    expect(prompts.length).toBeGreaterThan(0);
  });

  describe.each(prompts)('$name', ({ prompt }) => {
    it('should be defined', () => {
      expect(prompt).toBeDefined();
    });

    it('should validate against MCPPromptSchema', () => {
      expect(() => MCPPromptSchema.parse(prompt)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Support Prompts
// ---------------------------------------------------------------------------

describe('Support MCP Prompts Metadata Compliance', () => {
  const prompts = [
    { name: 'CaseResolutionSuggestionPrompt', prompt: CaseResolutionSuggestionPrompt },
    { name: 'CustomerSentimentPrompt', prompt: CustomerSentimentPrompt },
    { name: 'EscalationAssessmentPrompt', prompt: EscalationAssessmentPrompt },
  ];

  it('should export a collection of prompts', () => {
    expect(prompts.length).toBeGreaterThan(0);
  });

  describe.each(prompts)('$name', ({ prompt }) => {
    it('should be defined', () => {
      expect(prompt).toBeDefined();
    });

    it('should validate against MCPPromptSchema', () => {
      expect(() => MCPPromptSchema.parse(prompt)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// HR Prompts
// ---------------------------------------------------------------------------

describe('HR MCP Prompts Metadata Compliance', () => {
  const prompts = [
    { name: 'CandidateAssessmentPrompt', prompt: CandidateAssessmentPrompt },
    { name: 'PerformanceReviewDraftPrompt', prompt: PerformanceReviewDraftPrompt },
    { name: 'SuccessionAnalysisPrompt', prompt: SuccessionAnalysisPrompt },
  ];

  it('should export a collection of prompts', () => {
    expect(prompts.length).toBeGreaterThan(0);
  });

  describe.each(prompts)('$name', ({ prompt }) => {
    it('should be defined', () => {
      expect(prompt).toBeDefined();
    });

    it('should validate against MCPPromptSchema', () => {
      expect(() => MCPPromptSchema.parse(prompt)).not.toThrow();
    });
  });
});
