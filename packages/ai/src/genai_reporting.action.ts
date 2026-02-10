/**
 * GenAI Reporting Action
 *
 * Provides natural language query capabilities for complex data analytics.
 * Users can ask questions like "Show me Q3 revenue by region vs last year"
 * and receive structured query results, visualizations, and narrative insights.
 *
 * Part of Phase 2: Deep Intelligence.
 */

// ============================================================================
// 1. NATURAL LANGUAGE QUERY
// ============================================================================

export interface NaturalLanguageQueryRequest {
  /** The natural language question from the user */
  query: string;
  /** Optional context for the query (e.g., current dashboard, selected filters) */
  context?: {
    module?: string;
    time_range?: string;
    filters?: Record<string, string>;
  };
  /** Maximum number of results to return */
  limit?: number;
  /** Whether to include narrative explanation */
  include_narrative?: boolean;
}

export interface ParsedQuery {
  /** The data objects to query */
  objects: string[];
  /** Fields to select */
  fields: string[];
  /** Filters to apply */
  filters: Array<[string, string, string | number]>;
  /** Aggregation functions */
  aggregations: Array<{
    function: 'sum' | 'avg' | 'count' | 'min' | 'max';
    field: string;
    alias: string;
  }>;
  /** Group by fields */
  group_by: string[];
  /** Order by specification */
  order_by: Array<{ field: string; direction: 'asc' | 'desc' }>;
  /** Time range for the query */
  time_range: {
    start: string;
    end: string;
    period: string;
  };
  /** Comparison period (e.g., "vs last year") */
  comparison?: {
    type: 'previous_period' | 'year_over_year' | 'custom';
    start: string;
    end: string;
  };
}

export interface QueryResult {
  /** Raw data rows */
  data: Array<Record<string, string | number | null>>;
  /** Column metadata */
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'currency';
    label: string;
  }>;
  /** Summary statistics */
  summary: {
    total_rows: number;
    aggregations: Record<string, number>;
  };
}

export interface NaturalLanguageQueryResponse {
  /** The original query */
  original_query: string;
  /** Parsed query structure */
  parsed_query: ParsedQuery;
  /** Query results */
  results: QueryResult;
  /** Visualization recommendation */
  visualization: {
    type: 'bar_chart' | 'line_chart' | 'pie_chart' | 'table' | 'metric' | 'heatmap';
    config: Record<string, string | string[]>;
  };
  /** Narrative explanation of the results */
  narrative: string;
  /** Confidence in query interpretation */
  confidence: number;
  /** Suggested follow-up queries */
  follow_up_queries: string[];
}

/**
 * Helper: Parse a natural language query into a structured ObjectQL query
 */
export function parseNaturalLanguageQuery(query: string, context?: NaturalLanguageQueryRequest['context']): ParsedQuery {
  const lowerQuery = query.toLowerCase();

  // Detect target objects
  const objects: string[] = [];
  const objectMap: Record<string, string> = {
    'revenue': 'opportunity',
    'sales': 'opportunity',
    'deals': 'opportunity',
    'opportunities': 'opportunity',
    'pipeline': 'opportunity',
    'leads': 'lead',
    'cases': 'case',
    'tickets': 'case',
    'accounts': 'account',
    'customers': 'account',
    'contacts': 'contact',
    'invoices': 'invoice',
    'contracts': 'contract',
    'employees': 'employee',
    'candidates': 'candidate',
    'campaigns': 'campaign',
  };

  for (const [keyword, objectName] of Object.entries(objectMap)) {
    if (lowerQuery.includes(keyword)) {
      if (!objects.includes(objectName)) {
        objects.push(objectName);
      }
    }
  }

  // Default to opportunity for revenue-related queries
  if (objects.length === 0) {
    objects.push('opportunity');
  }

  // Detect aggregation functions
  const aggregations: ParsedQuery['aggregations'] = [];
  if (lowerQuery.includes('total') || lowerQuery.includes('sum')) {
    aggregations.push({ function: 'sum', field: 'amount', alias: 'total_amount' });
  }
  if (lowerQuery.includes('average') || lowerQuery.includes('avg')) {
    aggregations.push({ function: 'avg', field: 'amount', alias: 'avg_amount' });
  }
  if (lowerQuery.includes('count') || lowerQuery.includes('how many')) {
    aggregations.push({ function: 'count', field: 'id', alias: 'record_count' });
  }
  // Default: sum of amount for revenue queries
  if (aggregations.length === 0 && (lowerQuery.includes('revenue') || lowerQuery.includes('sales'))) {
    aggregations.push({ function: 'sum', field: 'amount', alias: 'total_revenue' });
  }

  // Detect group by fields
  const group_by: string[] = [];
  const groupByMap: Record<string, string> = {
    'by region': 'region',
    'by country': 'country',
    'by industry': 'industry',
    'by stage': 'stage',
    'by owner': 'owner_id',
    'by rep': 'owner_id',
    'by product': 'product_id',
    'by month': 'month',
    'by quarter': 'quarter',
    'by year': 'year',
    'by department': 'department',
    'by type': 'type',
    'by priority': 'priority',
    'by status': 'status',
  };

  for (const [keyword, field] of Object.entries(groupByMap)) {
    if (lowerQuery.includes(keyword)) {
      group_by.push(field);
    }
  }

  // Detect time range
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  let time_range = { start: '', end: '', period: 'quarter' };

  const quarterMatch = lowerQuery.match(/q([1-4])/);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1]);
    const startMonth = (q - 1) * 3;
    time_range = {
      start: `${currentYear}-${String(startMonth + 1).padStart(2, '0')}-01`,
      end: `${currentYear}-${String(startMonth + 3).padStart(2, '0')}-${q === 4 || q === 1 ? '31' : '30'}`,
      period: `Q${q} ${currentYear}`
    };
  } else if (lowerQuery.includes('this year') || lowerQuery.includes('ytd')) {
    time_range = {
      start: `${currentYear}-01-01`,
      end: now.toISOString().split('T')[0],
      period: `YTD ${currentYear}`
    };
  } else if (lowerQuery.includes('last year')) {
    time_range = {
      start: `${currentYear - 1}-01-01`,
      end: `${currentYear - 1}-12-31`,
      period: `${currentYear - 1}`
    };
  } else {
    // Default: current quarter
    const startMonth = (currentQuarter - 1) * 3;
    time_range = {
      start: `${currentYear}-${String(startMonth + 1).padStart(2, '0')}-01`,
      end: now.toISOString().split('T')[0],
      period: `Q${currentQuarter} ${currentYear}`
    };
  }

  // Detect comparison
  let comparison: ParsedQuery['comparison'] | undefined;
  if (lowerQuery.includes('vs last year') || lowerQuery.includes('year over year') || lowerQuery.includes('yoy')) {
    comparison = {
      type: 'year_over_year',
      start: time_range.start.replace(`${currentYear}`, `${currentYear - 1}`),
      end: time_range.end.replace(`${currentYear}`, `${currentYear - 1}`)
    };
  } else if (lowerQuery.includes('vs last quarter') || lowerQuery.includes('vs previous')) {
    comparison = {
      type: 'previous_period',
      start: '', // calculated dynamically
      end: ''
    };
  }

  // Build filters from context
  const filters: ParsedQuery['filters'] = [];
  if (context?.filters) {
    for (const [key, value] of Object.entries(context.filters)) {
      filters.push([key, '=', value]);
    }
  }

  // Detect field selections
  const fields = [...group_by];
  for (const agg of aggregations) {
    fields.push(agg.alias);
  }

  // Detect ordering
  const order_by: ParsedQuery['order_by'] = [];
  if (lowerQuery.includes('top') || lowerQuery.includes('highest') || lowerQuery.includes('best')) {
    order_by.push({ field: aggregations[0]?.alias || 'amount', direction: 'desc' });
  } else if (lowerQuery.includes('lowest') || lowerQuery.includes('worst') || lowerQuery.includes('bottom')) {
    order_by.push({ field: aggregations[0]?.alias || 'amount', direction: 'asc' });
  }

  return {
    objects,
    fields,
    filters,
    aggregations,
    group_by,
    order_by,
    time_range,
    comparison
  };
}

/**
 * Helper: Determine the best visualization type for the query results
 */
export function recommendVisualization(parsed: ParsedQuery): NaturalLanguageQueryResponse['visualization'] {
  const hasComparison = !!parsed.comparison;
  const hasTimeSeries = parsed.group_by.some(g =>
    ['month', 'quarter', 'year', 'week'].includes(g)
  );
  const groupCount = parsed.group_by.length;
  const hasAggregation = parsed.aggregations.length > 0;

  if (hasTimeSeries && hasComparison) {
    return {
      type: 'line_chart',
      config: {
        x_axis: parsed.group_by.find(g => ['month', 'quarter', 'year'].includes(g)) || 'period',
        y_axis: parsed.aggregations[0]?.alias || 'value',
        series: 'period_comparison'
      }
    };
  }

  if (hasTimeSeries) {
    return {
      type: 'line_chart',
      config: {
        x_axis: parsed.group_by.find(g => ['month', 'quarter', 'year'].includes(g)) || 'period',
        y_axis: parsed.aggregations[0]?.alias || 'value'
      }
    };
  }

  if (groupCount === 1 && hasAggregation) {
    return {
      type: 'bar_chart',
      config: {
        x_axis: parsed.group_by[0],
        y_axis: parsed.aggregations[0]?.alias || 'value'
      }
    };
  }

  if (groupCount >= 2) {
    return {
      type: 'heatmap',
      config: {
        x_axis: parsed.group_by[0],
        y_axis: parsed.group_by[1],
        value: parsed.aggregations[0]?.alias || 'value'
      }
    };
  }

  if (hasAggregation && groupCount === 0) {
    return {
      type: 'metric',
      config: {
        value: parsed.aggregations[0]?.alias || 'value'
      }
    };
  }

  return {
    type: 'table',
    config: {
      columns: parsed.fields
    }
  };
}

/**
 * Helper: Generate narrative explanation of results
 */
export function generateNarrative(
  query: string,
  parsed: ParsedQuery,
  results: QueryResult
): string {
  const { summary } = results;
  const period = parsed.time_range.period;

  if (results.data.length === 0) {
    return `No data found for "${query}" in the ${period} period. Try broadening your time range or adjusting filters.`;
  }

  const parts: string[] = [];

  // Summary line
  parts.push(`Showing ${summary.total_rows} results for ${period}.`);

  // Aggregation highlights
  for (const [key, value] of Object.entries(summary.aggregations)) {
    const formattedKey = key.replace(/_/g, ' ');
    if (key.includes('revenue') || key.includes('amount')) {
      parts.push(`Total ${formattedKey}: $${value.toLocaleString()}.`);
    } else {
      parts.push(`${formattedKey}: ${value.toLocaleString()}.`);
    }
  }

  // Top result highlight
  if (results.data.length > 0 && parsed.group_by.length > 0) {
    const topRow = results.data[0];
    const groupField = parsed.group_by[0];
    const valueField = parsed.aggregations[0]?.alias;
    if (topRow[groupField] && valueField && topRow[valueField]) {
      parts.push(`Top ${groupField}: ${topRow[groupField]} with ${typeof topRow[valueField] === 'number' ? topRow[valueField].toLocaleString() : topRow[valueField]}.`);
    }
  }

  // Comparison insight
  if (parsed.comparison) {
    parts.push(`Comparison period: ${parsed.comparison.type.replace(/_/g, ' ')}.`);
  }

  return parts.join(' ');
}

/**
 * Generate follow-up query suggestions
 */
export function suggestFollowUps(query: string, parsed: ParsedQuery): string[] {
  const suggestions: string[] = [];
  const lowerQuery = query.toLowerCase();

  // Suggest drill-downs
  if (parsed.group_by.length > 0) {
    if (!lowerQuery.includes('by month')) {
      suggestions.push(`${query} by month`);
    }
    if (!lowerQuery.includes('by region') && !lowerQuery.includes('by industry')) {
      suggestions.push(`${query} by region`);
    }
  }

  // Suggest comparisons
  if (!parsed.comparison) {
    suggestions.push(`${query} vs last year`);
  }

  // Suggest related metrics
  if (lowerQuery.includes('revenue')) {
    suggestions.push('Show me deal count by stage for the same period');
    suggestions.push('What is the average deal size this quarter?');
  }
  if (lowerQuery.includes('cases') || lowerQuery.includes('tickets')) {
    suggestions.push('What is the average resolution time?');
    suggestions.push('Show me CSAT scores by agent');
  }

  return suggestions.slice(0, 4);
}

/**
 * Process a natural language analytics query
 */
export async function processNaturalLanguageQuery(
  request: NaturalLanguageQueryRequest
): Promise<NaturalLanguageQueryResponse> {
  const { query, context, limit = 100, include_narrative = true } = request;

  // Parse the natural language query
  const parsed = parseNaturalLanguageQuery(query, context);

  // Build mock results based on parsed query (real implementation would use ObjectQL broker)
  const mockData = generateMockResults(parsed, limit);

  // Determine visualization
  const visualization = recommendVisualization(parsed);

  // Generate narrative
  const narrative = include_narrative
    ? generateNarrative(query, parsed, mockData)
    : '';

  // Suggest follow-ups
  const follow_up_queries = suggestFollowUps(query, parsed);

  // Calculate confidence based on parsing quality
  const confidence = calculateConfidence(parsed, query);

  return {
    original_query: query,
    parsed_query: parsed,
    results: mockData,
    visualization,
    narrative,
    confidence,
    follow_up_queries
  };
}

/**
 * Calculate confidence score based on how well we parsed the query
 */
function calculateConfidence(parsed: ParsedQuery, query: string): number {
  let score = 50; // Base confidence

  // Higher confidence if we identified objects
  if (parsed.objects.length > 0) score += 15;

  // Higher confidence if we found aggregations
  if (parsed.aggregations.length > 0) score += 10;

  // Higher confidence if we identified group by
  if (parsed.group_by.length > 0) score += 10;

  // Higher confidence if we identified time range
  if (parsed.time_range.start) score += 10;

  // Lower confidence for very short queries
  if (query.split(' ').length < 3) score -= 10;

  // Cap at 95 (never 100% confident on NL parsing)
  return Math.min(95, Math.max(10, score));
}

/**
 * Generate mock result data for development/testing
 */
function generateMockResults(parsed: ParsedQuery, limit: number): QueryResult {
  const columns: QueryResult['columns'] = [];
  const data: QueryResult['data'] = [];

  // Add group by columns
  for (const field of parsed.group_by) {
    columns.push({
      name: field,
      type: field === 'amount' || field === 'total_revenue' ? 'number' : 'string',
      label: field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    });
  }

  // Add aggregation columns
  for (const agg of parsed.aggregations) {
    columns.push({
      name: agg.alias,
      type: agg.field === 'amount' ? 'currency' : 'number',
      label: agg.alias.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    });
  }

  // Generate mock rows
  const sampleGroups: Record<string, string[]> = {
    region: ['North America', 'Europe', 'Asia Pacific', 'Latin America'],
    country: ['USA', 'UK', 'Germany', 'Japan', 'Brazil'],
    industry: ['technology', 'finance', 'healthcare', 'Manufacturing', 'Retail'],
    stage: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won'],
    quarter: ['Q1', 'Q2', 'Q3', 'Q4'],
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    status: ['open', 'in_progress', 'resolved', 'closed'],
    priority: ['low', 'medium', 'high', 'critical'],
    department: ['Engineering', 'Sales', 'Marketing', 'Support', 'HR'],
    type: ['new_business', 'Renewal', 'Upsell', 'Cross-sell'],
  };

  // Create rows based on group by
  if (parsed.group_by.length > 0) {
    const primaryGroup = parsed.group_by[0];
    const groupValues = sampleGroups[primaryGroup] || ['Group A', 'Group B', 'Group C'];
    const rowCount = Math.min(groupValues.length, limit);

    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, string | number | null> = {};
      row[primaryGroup] = groupValues[i];

      if (parsed.group_by.length > 1) {
        const secondGroup = parsed.group_by[1];
        row[secondGroup] = (sampleGroups[secondGroup] || ['A', 'B', 'C'])[i % 3];
      }

      for (const agg of parsed.aggregations) {
        if (agg.function === 'sum') {
          row[agg.alias] = Math.round((500000 - i * 80000) * (1 + Math.random() * 0.2));
        } else if (agg.function === 'avg') {
          row[agg.alias] = Math.round((75000 - i * 10000) * (1 + Math.random() * 0.1));
        } else if (agg.function === 'count') {
          row[agg.alias] = Math.round(50 - i * 8 + Math.random() * 5);
        } else {
          row[agg.alias] = Math.round(100000 * Math.random());
        }
      }

      data.push(row);
    }
  } else {
    // Single metric result
    const row: Record<string, string | number | null> = {};
    for (const agg of parsed.aggregations) {
      row[agg.alias] = agg.function === 'count' ? 142 : 2450000;
    }
    data.push(row);
  }

  // Calculate summary
  const aggregations: Record<string, number> = {};
  for (const agg of parsed.aggregations) {
    const values = data.map(d => (typeof d[agg.alias] === 'number' ? d[agg.alias] as number : 0));
    aggregations[agg.alias] = values.reduce((a, b) => a + b, 0);
  }

  return {
    data,
    columns,
    summary: {
      total_rows: data.length,
      aggregations
    }
  };
}

// Default export for module pattern consistency
export default {
  processNaturalLanguageQuery,
  parseNaturalLanguageQuery,
  recommendVisualization,
  generateNarrative,
  suggestFollowUps
};
