/**
 * NLQ (Natural Language Query) Configuration
 *
 * Defines example NLQ request schemas and field mappings for HotCRM,
 * validated against the @objectstack/spec NLQ schemas.
 */

import { NLQRequestSchema, NLQFieldMappingSchema } from '@objectstack/spec/ai';
import type { NLQRequest, NLQFieldMapping } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// Sample NLQ Requests
// ---------------------------------------------------------------------------

/** CRM query: top accounts by revenue */
export const crmAccountsQuery: NLQRequest = NLQRequestSchema.parse({
  query: 'Show me top 10 accounts by annual revenue',
  context: { defaultLimit: 10, timezone: 'UTC', locale: 'en-US' },
  includeAlternatives: true,
  maxAlternatives: 3,
  minConfidence: 0.7,
  executeQuery: false,
});

/** CRM query: open opportunities in pipeline */
export const crmOpportunitiesQuery: NLQRequest = NLQRequestSchema.parse({
  query: 'List all open opportunities closing this quarter with amount greater than 50000',
  context: { defaultLimit: 100, timezone: 'UTC', locale: 'en-US' },
  includeAlternatives: false,
  maxAlternatives: 3,
  minConfidence: 0.6,
  executeQuery: false,
});

/** Support query: unresolved high-priority cases */
export const supportCasesQuery: NLQRequest = NLQRequestSchema.parse({
  query: 'How many unresolved high-priority cases were created this week?',
  context: { defaultLimit: 100, timezone: 'UTC', locale: 'en-US' },
  includeAlternatives: false,
  maxAlternatives: 3,
  minConfidence: 0.7,
  executeQuery: false,
});

/** HR query: open positions by department */
export const hrPositionsQuery: NLQRequest = NLQRequestSchema.parse({
  query: 'Show open positions grouped by department with candidate count',
  context: { defaultLimit: 50, timezone: 'UTC', locale: 'en-US' },
  includeAlternatives: true,
  maxAlternatives: 2,
  minConfidence: 0.6,
  executeQuery: false,
});

// ---------------------------------------------------------------------------
// Field Mappings
// ---------------------------------------------------------------------------

export const crmFieldMappings: NLQFieldMapping[] = [
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'account name',
    objectField: 'account.name',
    object: 'account',
    field: 'name',
    confidence: 0.95,
  }),
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'annual revenue',
    objectField: 'account.annual_revenue',
    object: 'account',
    field: 'annual_revenue',
    confidence: 0.95,
  }),
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'deal amount',
    objectField: 'opportunity.amount',
    object: 'opportunity',
    field: 'amount',
    confidence: 0.9,
  }),
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'close date',
    objectField: 'opportunity.close_date',
    object: 'opportunity',
    field: 'close_date',
    confidence: 0.95,
  }),
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'stage',
    objectField: 'opportunity.stage',
    object: 'opportunity',
    field: 'stage',
    confidence: 0.85,
  }),
];

export const supportFieldMappings: NLQFieldMapping[] = [
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'case number',
    objectField: 'case.case_number',
    object: 'case',
    field: 'case_number',
    confidence: 0.95,
  }),
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'priority',
    objectField: 'case.priority',
    object: 'case',
    field: 'priority',
    confidence: 0.9,
  }),
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'status',
    objectField: 'case.status',
    object: 'case',
    field: 'status',
    confidence: 0.85,
  }),
];

export const hrFieldMappings: NLQFieldMapping[] = [
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'department',
    objectField: 'job_posting.department',
    object: 'job_posting',
    field: 'department',
    confidence: 0.9,
  }),
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'position title',
    objectField: 'job_posting.title',
    object: 'job_posting',
    field: 'title',
    confidence: 0.9,
  }),
  NLQFieldMappingSchema.parse({
    naturalLanguage: 'candidate name',
    objectField: 'candidate.full_name',
    object: 'candidate',
    field: 'full_name',
    confidence: 0.9,
  }),
];

// ---------------------------------------------------------------------------
// Typed NLQ Configuration
// ---------------------------------------------------------------------------

export interface NLQConfig {
  sampleQueries: {
    crm: NLQRequest[];
    support: NLQRequest[];
    hr: NLQRequest[];
  };
  fieldMappings: {
    crm: NLQFieldMapping[];
    support: NLQFieldMapping[];
    hr: NLQFieldMapping[];
  };
}

export const hotcrmNLQConfig: NLQConfig = {
  sampleQueries: {
    crm: [crmAccountsQuery, crmOpportunitiesQuery],
    support: [supportCasesQuery],
    hr: [hrPositionsQuery],
  },
  fieldMappings: {
    crm: crmFieldMappings,
    support: supportFieldMappings,
    hr: hrFieldMappings,
  },
};

export default hotcrmNLQConfig;
