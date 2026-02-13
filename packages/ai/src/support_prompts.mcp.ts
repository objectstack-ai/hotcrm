/**
 * Support MCP Prompts
 *
 * Structured prompt templates for customer-support AI interactions including
 * case resolution suggestions, sentiment analysis, and escalation assessment.
 */

import type { MCPPrompt } from '@objectstack/spec/ai';
import { MCPPromptSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// case_resolution_suggestion
// ---------------------------------------------------------------------------

export const CaseResolutionSuggestionPrompt = {
  name: 'case_resolution_suggestion',
  description:
    'Analyse a support case and suggest step-by-step resolution guidance using the knowledge base and similar historical cases.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are a support resolution specialist for HotCRM. Analyse the support case details — subject, description, product area, customer tier, and prior interactions. Cross-reference the knowledge base and similar resolved cases to generate a ranked list of resolution steps. Include relevant article links and confidence levels.',
    },
    {
      role: 'user' as const,
      content:
        'Suggest a resolution for support case {{case_id}}. Review the case description, reproduction steps, and any prior agent notes. Provide a step-by-step resolution plan, reference applicable knowledge base articles, and flag any steps that require engineering escalation.',
    },
  ],
  arguments: [
    {
      name: 'case_id',
      description: 'Unique identifier of the support case',
      type: 'string' as const,
      required: true,
    },
  ],
  category: 'support',
  tags: ['support', 'case', 'resolution', 'knowledge_base'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(CaseResolutionSuggestionPrompt);

// ---------------------------------------------------------------------------
// customer_sentiment
// ---------------------------------------------------------------------------

export const CustomerSentimentPrompt = {
  name: 'customer_sentiment',
  description:
    'Analyse recent interactions for an account to determine overall customer sentiment and churn risk indicators.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are a customer experience analyst for HotCRM. Evaluate all recent touchpoints for the specified account — support cases, emails, call transcripts, NPS responses, and product usage patterns. Classify overall sentiment (positive, neutral, negative), identify key drivers, and assess churn risk with a confidence score.',
    },
    {
      role: 'user' as const,
      content:
        'Analyse customer sentiment for account {{account_id}}. Review the last 90 days of support cases, communication logs, and survey responses. Provide a sentiment score, highlight the top positive and negative drivers, and assess churn risk with recommended retention actions.',
    },
  ],
  arguments: [
    {
      name: 'account_id',
      description: 'Unique identifier of the customer account',
      type: 'string' as const,
      required: true,
    },
  ],
  category: 'support',
  tags: ['support', 'sentiment', 'customer_experience', 'churn'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(CustomerSentimentPrompt);

// ---------------------------------------------------------------------------
// escalation_assessment
// ---------------------------------------------------------------------------

export const EscalationAssessmentPrompt = {
  name: 'escalation_assessment',
  description:
    'Assess whether a support case warrants escalation based on severity, SLA status, customer impact, and historical patterns.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are an escalation manager for HotCRM. Evaluate the support case against escalation criteria: SLA compliance risk, customer tier and contract value, issue severity and blast radius, time-in-queue, repeated contacts on the same issue, and customer sentiment. Provide a clear escalation recommendation with justification.',
    },
    {
      role: 'user' as const,
      content:
        'Assess whether case {{case_id}} should be escalated. Evaluate SLA remaining time, customer tier, issue severity, number of reopens, and current agent workload. Provide an escalation recommendation (escalate / monitor / no action) with detailed justification and suggested escalation path if applicable.',
    },
  ],
  arguments: [
    {
      name: 'case_id',
      description: 'Unique identifier of the support case to assess',
      type: 'string' as const,
      required: true,
    },
  ],
  category: 'support',
  tags: ['support', 'escalation', 'sla', 'triage'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(EscalationAssessmentPrompt);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  caseResolutionSuggestion: CaseResolutionSuggestionPrompt,
  customerSentiment: CustomerSentimentPrompt,
  escalationAssessment: EscalationAssessmentPrompt,
};
