/**
 * HR MCP Prompts
 *
 * Structured prompt templates for HR AI interactions including
 * candidate assessment, performance review drafting, and succession analysis.
 */

import type { MCPPrompt } from '@objectstack/spec/ai';
import { MCPPromptSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// candidate_assessment
// ---------------------------------------------------------------------------

export const CandidateAssessmentPrompt = {
  name: 'candidate_assessment',
  description:
    'Evaluate a candidate against a specific position by analysing skills, experience, culture fit, and growth potential.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are a talent assessment specialist for HotCRM. Perform a structured evaluation of the candidate against the target position requirements. Assess technical skills alignment, relevant experience, leadership potential, and culture fit. Apply bias-mitigation checks and present a balanced scorecard with strengths, gaps, and an overall recommendation.',
    },
    {
      role: 'user' as const,
      content:
        'Assess candidate {{candidate_id}} for the {{position}} position. Evaluate skills match, years of relevant experience, career trajectory, and cultural alignment. Provide a structured scorecard with ratings across key dimensions and an overall hiring recommendation (strong hire / hire / no hire).',
    },
  ],
  arguments: [
    {
      name: 'candidate_id',
      description: 'Unique identifier of the candidate',
      type: 'string' as const,
      required: true,
    },
    {
      name: 'position',
      description: 'Target position title or job requisition identifier',
      type: 'string' as const,
      required: true,
    },
  ],
  category: 'hr',
  tags: ['hr', 'recruitment', 'candidate', 'assessment'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(CandidateAssessmentPrompt);

// ---------------------------------------------------------------------------
// performance_review_draft
// ---------------------------------------------------------------------------

export const PerformanceReviewDraftPrompt = {
  name: 'performance_review_draft',
  description:
    'Draft a structured performance review for an employee based on goals, accomplishments, peer feedback, and metrics for a given period.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are an HR performance management assistant for HotCRM. Draft a balanced, constructive performance review using the employee\'s goal attainment data, 360-degree feedback, project contributions, and key metrics. Structure the review with: summary, key accomplishments, areas for improvement, goal progress, and development recommendations. Maintain an objective, encouraging tone.',
    },
    {
      role: 'user' as const,
      content:
        'Draft a performance review for employee {{employee_id}} covering the {{period}} review period. Summarise goal achievement, highlight top accomplishments, note areas for development, incorporate peer and manager feedback, and propose goals for the next period.',
    },
  ],
  arguments: [
    {
      name: 'employee_id',
      description: 'Unique identifier of the employee',
      type: 'string' as const,
      required: true,
    },
    {
      name: 'period',
      description: 'Review period (e.g., Q1-2025, H2-2024, FY2024)',
      type: 'string' as const,
      required: true,
    },
  ],
  category: 'hr',
  tags: ['hr', 'performance', 'review', 'talent_management'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(PerformanceReviewDraftPrompt);

// ---------------------------------------------------------------------------
// succession_analysis
// ---------------------------------------------------------------------------

export const SuccessionAnalysisPrompt = {
  name: 'succession_analysis',
  description:
    'Analyse succession readiness for key roles within a department, identifying high-potential successors and development gaps.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are a workforce planning strategist for HotCRM. Analyse the specified department\'s succession pipeline for critical leadership and specialist roles. Evaluate bench strength, identify high-potential internal candidates, assess readiness timelines, and flag roles with insufficient successor depth. Recommend targeted development actions to close readiness gaps.',
    },
    {
      role: 'user' as const,
      content:
        'Perform a succession analysis for the {{department}} department. Identify critical roles at risk, map potential internal successors with readiness levels (ready now / ready in 1-2 years / development needed), highlight single points of failure, and recommend development plans to strengthen the succession pipeline.',
    },
  ],
  arguments: [
    {
      name: 'department',
      description: 'Department name or identifier to analyse',
      type: 'string' as const,
      required: true,
    },
  ],
  category: 'hr',
  tags: ['hr', 'succession', 'workforce_planning', 'talent_management'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(SuccessionAnalysisPrompt);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  candidateAssessment: CandidateAssessmentPrompt,
  performanceReviewDraft: PerformanceReviewDraftPrompt,
  successionAnalysis: SuccessionAnalysisPrompt,
};
