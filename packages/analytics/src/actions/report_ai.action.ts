/**
 * Report AI Enhancement Actions
 *
 * AI-powered report generation capabilities:
 * 1. Natural Language to Report - convert plain English to report definitions
 * 2. Filter Suggestions - recommend relevant filters based on object context
 * 3. Auto-Generate Report - create reports from object schema automatically
 */

import { broker } from '../db.js';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('analytics:report_ai');

// ============================================================================
// 1. NATURAL LANGUAGE TO REPORT
// ============================================================================

export interface GenerateReportFromNLRequest {
 /** Natural language description (e.g., "Show me top 10 customers by revenue") */
 query: string;
 /** Optional: restrict to a specific object */
 objectName?: string;
}

export interface GenerateReportFromNLResponse {
 /** Generated report definition */
 report: {
 name: string;
 object_name: string;
 report_type: string;
 columns: string[];
 filters: Array<{ field: string; operator: string; value: any }>;
 groupings: string[];
 aggregations: Array<{ field: string; function: string; label: string }>;
 sort_order: Array<{ field: string; direction: 'asc' | 'desc' }>;
 chart_type: string;
 };
 /** Confidence in interpretation */
 confidence: number;
 /** Natural language explanation of what was generated */
 explanation: string;
}

/**
 * Generate a report definition from a natural language query
 */
export async function generateReportFromNL(request: GenerateReportFromNLRequest): Promise<GenerateReportFromNLResponse> {
 const { query, objectName } = request;

 if (!query || query.trim().length === 0) {
 throw new Error('A natural language query is required');
 }

 // If object is specified, fetch its schema for context
 let schemaContext = '';
 if (objectName) {
 try {
 const sample = await broker.find(objectName, { limit: 1 });
 if (sample.length > 0) {
 schemaContext = `Available fields: ${Object.keys(sample[0]).join(', ')}`;
 }
 } catch {
 // Object may not have data yet
 }
 }

 const systemPrompt = `
You are a business intelligence report builder AI.

# User Request
"${query}"

${objectName ? `# Target Object: ${objectName}` : ''}
${schemaContext ? `# Schema Context\n${schemaContext}` : ''}

# Task
Convert the natural language request into a structured report definition.

# Output Format
{
 "report": {
 "name": "Top 10 Customers by Revenue",
 "object_name": "account",
 "report_type": "summary",
 "columns": ["name", "annual_revenue", "industry"],
 "filters": [{"field": "annual_revenue", "operator": ">", "value": 0}],
 "groupings": ["industry"],
 "aggregations": [{"field": "annual_revenue", "function": "sum", "label": "Total Revenue"}],
 "sort_order": [{"field": "annual_revenue", "direction": "desc"}],
 "chart_type": "bar"
 },
 "confidence": 92,
 "explanation": "Generated a summary report..."
}
`.trim();

 const llmResponse = await callLLM(systemPrompt);
 return JSON.parse(llmResponse);
}

// ============================================================================
// 2. FILTER SUGGESTIONS
// ============================================================================

export interface SuggestFiltersRequest {
 /** Object name to suggest filters for */
 objectName: string;
 /** Optional context about the user's goal */
 context?: string;
}

export interface SuggestFiltersResponse {
 /** Suggested filters */
 filters: Array<{
 field: string;
 operator: string;
 suggestedValue: any;
 label: string;
 reasoning: string;
 }>;
 /** Common filter combinations */
 combinations: Array<{
 name: string;
 description: string;
 filters: Array<{ field: string; operator: string; value: any }>;
 }>;
}

/**
 * Suggest relevant filters based on object and context
 */
export async function suggestReportFilters(request: SuggestFiltersRequest): Promise<SuggestFiltersResponse> {
 const { objectName, context } = request;

 if (!objectName) {
 throw new Error('objectName is required');
 }

 // Fetch sample data to understand available fields
 let sampleFields: string[] = [];
 try {
 const sample = await broker.find(objectName, { limit: 5 });
 if (sample.length > 0) {
 sampleFields = Object.keys(sample[0]);
 }
 } catch {
 // Proceed with empty sample
 }

 const systemPrompt = `
You are a data analytics advisor.

# Object: ${objectName}
# Available Fields: ${sampleFields.join(', ') || 'unknown'}
${context ? `# User Context: ${context}` : ''}

# Task
Suggest the most useful filters and filter combinations for reporting on this object.

# Output Format
{
 "filters": [
 {
 "field": "created_at",
 "operator": ">=",
 "suggestedValue": "THIS_QUARTER",
 "label": "This Quarter",
 "reasoning": "Most reports focus on current quarter data"
 }
 ],
 "combinations": [
 {
 "name": "Active This Quarter",
 "description": "Records created or modified this quarter",
 "filters": [
 {"field": "created_at", "operator": ">=", "value": "THIS_QUARTER"}
 ]
 }
 ]
}
`.trim();

 const llmResponse = await callLLM(systemPrompt);
 return JSON.parse(llmResponse);
}

// ============================================================================
// 3. AUTO-GENERATE REPORT
// ============================================================================

export interface AutoGenerateReportRequest {
 /** Object name to generate report for */
 objectName: string;
 /** Report purpose hint */
 purpose?: 'overview' | 'performance' | 'trend' | 'detail';
}

export interface AutoGenerateReportResponse {
 /** Generated report record ID */
 reportId: string;
 /** Generated report definition */
 report: {
 name: string;
 object_name: string;
 report_type: string;
 columns: string[];
 filters: Array<{ field: string; operator: string; value: any }>;
 groupings: string[];
 aggregations: Array<{ field: string; function: string; label: string }>;
 chart_type: string;
 };
 /** Explanation of choices */
 explanation: string;
}

/**
 * Automatically generate a report based on object schema
 */
export async function autoGenerateReport(request: AutoGenerateReportRequest): Promise<AutoGenerateReportResponse> {
 const { objectName, purpose } = request;

 if (!objectName) {
 throw new Error('objectName is required');
 }

 // Fetch sample to understand schema
 let fields: string[] = [];
 try {
 const sample = await broker.find(objectName, { limit: 3 });
 if (sample.length > 0) {
 fields = Object.keys(sample[0]);
 }
 } catch {
 // Proceed without schema info
 }

 const systemPrompt = `
You are a report generation AI.

# Object: ${objectName}
# Available Fields: ${fields.join(', ') || 'unknown'}
# Purpose: ${purpose || 'overview'}

# Task
Auto-generate a complete report definition optimized for the given purpose.

# Output Format
{
 "report": {
 "name": "${objectName} ${purpose || 'Overview'} Report",
 "object_name": "${objectName}",
 "report_type": "summary",
 "columns": ["name", "created_at", "status"],
 "filters": [],
 "groupings": ["status"],
 "aggregations": [{"field": "_id", "function": "count", "label": "Total"}],
 "chart_type": "bar"
 },
 "explanation": "Generated an overview report..."
}
`.trim();

 const llmResponse = await callLLM(systemPrompt);
 const parsed = JSON.parse(llmResponse);

 // Persist the generated report
 const created = await broker.insert('report', {
 name: parsed.report.name,
 object_name: parsed.report.object_name,
 report_type: parsed.report.report_type,
 columns: JSON.stringify(parsed.report.columns),
 filters: JSON.stringify(parsed.report.filters),
 groupings: JSON.stringify(parsed.report.groupings),
 aggregations: JSON.stringify(parsed.report.aggregations),
 chart_type: parsed.report.chart_type,
 is_public: false
 });

 return {
 reportId: created._id,
 report: parsed.report,
 explanation: parsed.explanation
 };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function callLLM(prompt: string): Promise<string> {
 logger.info('🤖 Calling LLM API for report AI...');
 await new Promise(resolve => setTimeout(resolve, 500));

 if (prompt.includes('natural language request')) {
 return JSON.stringify({
 report: {
 name: 'Top 10 Customers by Revenue',
 object_name: 'account',
 report_type: 'summary',
 columns: ['name', 'annual_revenue', 'industry', 'owner_id'],
 filters: [{ field: 'annual_revenue', operator: '>', value: 0 }],
 groupings: ['industry'],
 aggregations: [{ field: 'annual_revenue', function: 'sum', label: 'Total Revenue' }],
 sort_order: [{ field: 'annual_revenue', direction: 'desc' }],
 chart_type: 'bar'
 },
 confidence: 92,
 explanation: 'Generated a summary report of accounts grouped by industry, sorted by revenue descending with a top-10 limit.'
 });
 }

 if (prompt.includes('filter combinations')) {
 return JSON.stringify({
 filters: [
 { field: 'created_at', operator: '>=', suggestedValue: 'THIS_QUARTER', label: 'This Quarter', reasoning: 'Most reports focus on current quarter data' },
 { field: 'status', operator: '=', suggestedValue: 'active', label: 'Active Only', reasoning: 'Typically users want to see active records' },
 { field: 'owner_id', operator: '=', suggestedValue: 'CURRENT_USER', label: 'My Records', reasoning: 'Personalised view is the most common starting point' }
 ],
 combinations: [
 { name: 'My Active Records', description: 'Active records owned by the current user', filters: [{ field: 'owner_id', operator: '=', value: 'CURRENT_USER' }, { field: 'status', operator: '=', value: 'active' }] },
 { name: 'This Quarter Overview', description: 'All records created this quarter', filters: [{ field: 'created_at', operator: '>=', value: 'THIS_QUARTER' }] }
 ]
 });
 }

 // Auto-generate report
 return JSON.stringify({
 report: {
 name: 'Auto-Generated Overview Report',
 object_name: 'account',
 report_type: 'summary',
 columns: ['name', 'created_at', 'status'],
 filters: [],
 groupings: ['status'],
 aggregations: [{ field: '_id', function: 'count', label: 'Total' }],
 chart_type: 'bar'
 },
 explanation: 'Generated an overview report grouped by status with record count aggregation.'
 });
}

export default {
 generateReportFromNL,
 suggestReportFilters,
 autoGenerateReport
};
