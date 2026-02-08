import { describe, it, expect } from 'vitest';

import {
  parseNaturalLanguageQuery,
  recommendVisualization,
  generateNarrative,
  suggestFollowUps,
  processNaturalLanguageQuery
} from '../../src/genai_reporting.action';

describe('GenAI Reporting - parseNaturalLanguageQuery', () => {
  it('should parse revenue by region query', () => {
    const result = parseNaturalLanguageQuery('Show me Q3 revenue by region');
    expect(result.objects).toContain('opportunity');
    expect(result.group_by).toContain('region');
    expect(result.aggregations.length).toBeGreaterThan(0);
    expect(result.aggregations[0].function).toBe('sum');
    expect(result.time_range.period).toContain('Q3');
  });

  it('should detect year-over-year comparison', () => {
    const result = parseNaturalLanguageQuery('Show me Q3 revenue by region vs last year');
    expect(result.comparison).toBeDefined();
    expect(result.comparison!.type).toBe('year_over_year');
  });

  it('should parse count-based queries', () => {
    const result = parseNaturalLanguageQuery('How many leads by industry');
    expect(result.objects).toContain('lead');
    expect(result.group_by).toContain('industry');
    expect(result.aggregations.some(a => a.function === 'count')).toBe(true);
  });

  it('should detect multiple objects', () => {
    const result = parseNaturalLanguageQuery('Show me deals and cases by status');
    expect(result.objects).toContain('opportunity');
    expect(result.objects).toContain('case');
    expect(result.group_by).toContain('status');
  });

  it('should handle YTD time range', () => {
    const result = parseNaturalLanguageQuery('Total revenue this year');
    expect(result.time_range.period).toContain('YTD');
  });

  it('should apply context filters when provided', () => {
    const context = { filters: { region: 'North America' } };
    const result = parseNaturalLanguageQuery('Show me sales by stage', context);
    expect(result.filters).toEqual([['region', '=', 'North America']]);
  });

  it('should detect ordering for top/bottom queries', () => {
    const result = parseNaturalLanguageQuery('Top revenue by region');
    expect(result.order_by.length).toBeGreaterThan(0);
    expect(result.order_by[0].direction).toBe('desc');
  });

  it('should default to opportunity for generic revenue queries', () => {
    const result = parseNaturalLanguageQuery('Show me total revenue');
    expect(result.objects).toContain('opportunity');
  });

  it('should parse average queries', () => {
    const result = parseNaturalLanguageQuery('Average deal size by industry');
    expect(result.aggregations.some(a => a.function === 'avg')).toBe(true);
  });

  it('should parse support-related queries', () => {
    const result = parseNaturalLanguageQuery('How many tickets by priority');
    expect(result.objects).toContain('case');
    expect(result.group_by).toContain('priority');
  });
});

describe('GenAI Reporting - recommendVisualization', () => {
  it('should recommend bar chart for single group aggregation', () => {
    const parsed = parseNaturalLanguageQuery('Revenue by region');
    const viz = recommendVisualization(parsed);
    expect(viz.type).toBe('bar_chart');
  });

  it('should recommend line chart for time series', () => {
    const parsed = parseNaturalLanguageQuery('Revenue by month');
    const viz = recommendVisualization(parsed);
    expect(viz.type).toBe('line_chart');
  });

  it('should recommend metric for single aggregation without grouping', () => {
    const parsed = parseNaturalLanguageQuery('Total revenue');
    const viz = recommendVisualization(parsed);
    expect(viz.type).toBe('metric');
  });

  it('should recommend heatmap for dual-dimension grouping', () => {
    const parsed = parseNaturalLanguageQuery('Revenue by region by industry');
    const viz = recommendVisualization(parsed);
    expect(viz.type).toBe('heatmap');
  });
});

describe('GenAI Reporting - generateNarrative', () => {
  it('should handle empty results', () => {
    const parsed = parseNaturalLanguageQuery('Revenue by region');
    const emptyResults = { data: [], columns: [], summary: { total_rows: 0, aggregations: {} } };
    const narrative = generateNarrative('Revenue by region', parsed, emptyResults);
    expect(narrative).toContain('No data found');
  });

  it('should generate narrative for results with data', () => {
    const parsed = parseNaturalLanguageQuery('Revenue by region');
    const results = {
      data: [{ region: 'North America', total_revenue: 500000 }],
      columns: [
        { name: 'region', type: 'string' as const, label: 'Region' },
        { name: 'total_revenue', type: 'currency' as const, label: 'Total Revenue' }
      ],
      summary: { total_rows: 1, aggregations: { total_revenue: 500000 } }
    };
    const narrative = generateNarrative('Revenue by region', parsed, results);
    expect(narrative).toContain('1 results');
    expect(narrative).toContain('500,000');
  });
});

describe('GenAI Reporting - suggestFollowUps', () => {
  it('should suggest comparisons when none present', () => {
    const parsed = parseNaturalLanguageQuery('Revenue by region');
    const suggestions = suggestFollowUps('Revenue by region', parsed);
    expect(suggestions.some(s => s.includes('vs last year'))).toBe(true);
  });

  it('should suggest drill-downs', () => {
    const parsed = parseNaturalLanguageQuery('Revenue by region');
    const suggestions = suggestFollowUps('Revenue by region', parsed);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(4);
  });

  it('should suggest related metrics for revenue queries', () => {
    const parsed = parseNaturalLanguageQuery('Total revenue');
    const suggestions = suggestFollowUps('Total revenue', parsed);
    expect(suggestions.some(s => s.includes('deal'))).toBe(true);
  });
});

describe('GenAI Reporting - processNaturalLanguageQuery', () => {
  it('should process a complete query end-to-end', async () => {
    const result = await processNaturalLanguageQuery({
      query: 'Show me Q3 revenue by region vs last year'
    });

    expect(result.original_query).toBe('Show me Q3 revenue by region vs last year');
    expect(result.parsed_query).toBeDefined();
    expect(result.results).toBeDefined();
    expect(result.visualization).toBeDefined();
    expect(result.narrative).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.follow_up_queries).toBeDefined();
  });

  it('should return results with proper column metadata', async () => {
    const result = await processNaturalLanguageQuery({
      query: 'Revenue by region'
    });

    expect(result.results.columns.length).toBeGreaterThan(0);
    result.results.columns.forEach(col => {
      expect(col.name).toBeDefined();
      expect(col.type).toBeDefined();
      expect(col.label).toBeDefined();
    });
  });

  it('should respect include_narrative option', async () => {
    const result = await processNaturalLanguageQuery({
      query: 'Revenue by region',
      include_narrative: false
    });

    expect(result.narrative).toBe('');
  });

  it('should calculate confidence score', async () => {
    // Well-formed query with clear intent
    const result = await processNaturalLanguageQuery({
      query: 'Show me Q3 revenue by region vs last year'
    });
    expect(result.confidence).toBeGreaterThanOrEqual(50);
  });

  it('should handle context with filters', async () => {
    const result = await processNaturalLanguageQuery({
      query: 'Sales by stage',
      context: {
        module: 'crm',
        filters: { owner_id: 'user_123' }
      }
    });

    expect(result.parsed_query.filters).toEqual([['owner_id', '=', 'user_123']]);
  });
});
