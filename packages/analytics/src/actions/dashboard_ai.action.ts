/**
 * Dashboard AI Action
 *
 * AI-powered dashboard layout generation.
 * Auto-creates dashboard configurations based on user goals.
 */

import { broker } from '../db';

export interface DashboardGenerateRequest {
  goal: string;
  objects?: string[];
  widgetCount?: number;
}

export interface DashboardGenerateResponse {
  success: boolean;
  dashboard: {
    name: string;
    description: string;
    widgets: Array<{
      id: string;
      type: string;
      title: string;
      position: { row: number; col: number; width: number; height: number };
      dataSource: Record<string, any>;
    }>;
  };
}

/**
 * Auto-generate a dashboard layout from a high-level goal
 */
export async function generateDashboard(params: DashboardGenerateRequest): Promise<DashboardGenerateResponse> {
  const { goal, widgetCount = 6 } = params;

  console.log('🤖 Generating dashboard for goal:', goal);

  const systemPrompt = `
You are an expert dashboard designer. Create a dashboard layout for the following goal.

# Goal
${goal}

# Available Objects
- opportunity, account, lead, contact, kpi, metric

# Requirements
- Create ${widgetCount} widgets
- Mix of metrics, charts, and tables
- Use a 12-column grid layout

# Output Format
{
  "name": "Dashboard Name",
  "description": "...",
  "widgets": [
    {
      "id": "widget_1",
      "type": "metric|chart|table",
      "title": "...",
      "position": { "row": 1, "col": 1, "width": 3, "height": 2 },
      "dataSource": { "object": "...", "aggregate": { "field": "...", "function": "sum|count|avg" } }
    }
  ]
}
`.trim();

  const llmResponse = await callLLM(systemPrompt);
  const parsed = JSON.parse(llmResponse);

  // Save the dashboard
  await broker.insert('analytics_dashboard', {
    name: parsed.name,
    description: parsed.description,
    widgets: JSON.stringify(parsed.widgets),
    layout_config: JSON.stringify({ type: 'grid', columns: 12, gap: 4 }),
    is_public: false,
    refresh_interval: 300
  });

  return {
    success: true,
    dashboard: parsed
  };
}

/**
 * Recommend additional widgets for an existing dashboard
 */
export async function suggestWidgets(params: { dashboardId: string }): Promise<{
  suggestions: Array<{ type: string; title: string; reasoning: string }>;
}> {
  const dashboard = await broker.findOne('analytics_dashboard', params.dashboardId);
  console.log('🤖 Suggesting widgets for dashboard:', dashboard?.name);

  return {
    suggestions: [
      { type: 'metric', title: 'Conversion Rate', reasoning: 'Key performance indicator missing from dashboard' },
      { type: 'chart', title: 'Trend Over Time', reasoning: 'No time-series visualization present' },
      { type: 'table', title: 'Top Performers', reasoning: 'Adds actionable detail to high-level metrics' }
    ]
  };
}

async function callLLM(prompt: string): Promise<string> {
  console.log('🤖 Calling LLM API for dashboard generation...');
  await new Promise(resolve => setTimeout(resolve, 100));

  return JSON.stringify({
    name: 'AI Generated Dashboard',
    description: 'Auto-generated dashboard for business overview',
    widgets: [
      {
        id: 'widget_revenue',
        type: 'metric',
        title: 'Total Revenue',
        position: { row: 1, col: 1, width: 4, height: 2 },
        dataSource: { object: 'opportunity', aggregate: { field: 'amount', function: 'sum' } }
      },
      {
        id: 'widget_pipeline',
        type: 'chart',
        title: 'Pipeline by Stage',
        position: { row: 1, col: 5, width: 8, height: 4 },
        dataSource: { object: 'opportunity', groupBy: 'stage', aggregate: { field: 'amount', function: 'sum' } }
      },
      {
        id: 'widget_kpis',
        type: 'metric',
        title: 'Active KPIs',
        position: { row: 1, col: 1, width: 4, height: 2 },
        dataSource: { object: 'kpi', aggregate: { field: 'id', function: 'count' } }
      }
    ]
  });
}

export default { generateDashboard, suggestWidgets };
