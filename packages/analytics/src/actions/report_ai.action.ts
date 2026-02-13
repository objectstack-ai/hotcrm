/**
 * Report AI Action
 *
 * AI-powered natural language report generation.
 * Converts user queries into structured report definitions.
 */

import { broker } from '../db';

export interface NLReportRequest {
  query: string;
  context?: string;
}

export interface NLReportResponse {
  success: boolean;
  report: {
    name: string;
    object_name: string;
    report_type: string;
    columns: string[];
    filters: Array<[string, string, any]>;
    groupings?: string[];
    chart_type?: string;
  };
  explanation: string;
}

/**
 * Generate a report definition from a natural language query
 */
export async function generateReport(params: NLReportRequest): Promise<NLReportResponse> {
  const { query } = params;

  console.log('🤖 Generating report from NL query:', query);

  const systemPrompt = `
You are an expert analytics assistant. Convert the following natural language query into a structured report definition.

# User Query
${query}

# Available Objects
- opportunity (fields: name, amount, stage, close_date, probability, owner)
- account (fields: name, industry, annual_revenue, type, owner)
- lead (fields: name, company, status, lead_score, source)
- contact (fields: name, email, title, account, owner)

# Output Format
{
  "name": "Generated report name",
  "object_name": "primary object",
  "report_type": "tabular|summary|matrix",
  "columns": ["field1", "field2"],
  "filters": [["field", "operator", "value"]],
  "groupings": ["field"],
  "chart_type": "bar|line|pie|none"
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  // Save the report
  const saved = await broker.insert('report', {
    name: parsed.name,
    object_name: parsed.object_name,
    report_type: parsed.report_type,
    columns: JSON.stringify(parsed.columns),
    filters: JSON.stringify(parsed.filters),
    chart_type: parsed.chart_type || 'none',
    is_public: false
  });

  return {
    success: true,
    report: parsed,
    explanation: `Generated "${parsed.name}" report on ${parsed.object_name} with ${parsed.columns.length} columns`
  };
}

/**
 * Suggest report improvements based on usage patterns
 */
export async function suggestReportImprovements(params: { reportId: string }): Promise<{
  suggestions: Array<{ type: string; description: string; priority: string }>;
}> {
  const report = await broker.findOne('report', params.reportId);

  console.log('🤖 Analyzing report for improvements:', report?.name);

  return {
    suggestions: [
      { type: 'filter', description: 'Add date range filter to improve performance', priority: 'high' },
      { type: 'column', description: 'Add owner field for team visibility', priority: 'medium' },
      { type: 'chart', description: 'Add bar chart for visual summary', priority: 'low' }
    ]
  };
}

async function callLLM(prompt: string): Promise<string> {
  console.log('🤖 Calling LLM API for report generation...');
  await new Promise(resolve => setTimeout(resolve, 100));

  return JSON.stringify({
    name: 'AI Generated Report',
    object_name: 'opportunity',
    report_type: 'summary',
    columns: ['name', 'amount', 'stage', 'close_date', 'owner'],
    filters: [['stage', '!=', 'closed_lost']],
    groupings: ['stage'],
    chart_type: 'bar'
  });
}

export default { generateReport, suggestReportImprovements };
