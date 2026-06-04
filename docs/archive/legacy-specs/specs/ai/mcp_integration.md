# MCP Integration

> Source: `packages/ai/src/mcp_server.config.ts`

## Overview

HotCRM exposes its AI capabilities through a **Model Context Protocol (MCP)** server. The server is defined declaratively in `mcp_server.config.ts` and exported as `hotcrmMCPServerConfig`. It provides **8 tools**, **4 resources**, and **3 prompts** that AI agents can discover and invoke at runtime.

## Server Configuration

```typescript
const config: MCPServerConfig = {
  name: 'hotcrm_ai_server',
  label: 'HotCRM AI Server',
  version: '1.0.0',
  transport: {
    type: 'stdio',
    command: 'node',
    args: ['dist/mcp-server.js'],
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  autoStart: true,
  restartOnFailure: true,
  healthCheck: { enabled: true, interval: 30, timeout: 5 },
  // ... tools, resources, prompts
};
```

### Transport Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `MCPTransportType` | `'stdio'` | Transport type (`stdio`) |
| `command` | `string` | `'node'` | Process command |
| `args` | `string[]` | `['dist/mcp-server.js']` | Command arguments |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `retryAttempts` | `number` | `3` | Max retries on failure |
| `retryDelay` | `number` | `1000` | Delay between retries (ms) |

### Server Capabilities

| Capability | Enabled |
|------------|---------|
| `tools` | ✅ |
| `resources` | ✅ |
| `prompts` | ✅ |
| `logging` | ✅ |
| `sampling` | ❌ |
| `resourceTemplates` | ❌ |

Protocol version: `2024-11-05`

---

## Tools (8)

Every tool has `sideEffects: 'read'` (no mutations) and returns structured JSON.

### 1. `lead_scoring`

Score leads based on engagement signals and demographic fit.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lead_id` | string | ✅ | — | Lead ID |
| `scoring_model` | string | — | `'default'` | Scoring model variant |
| `include_factors` | boolean | — | `true` | Include scoring breakdown |

**Handler:** `crm.lead_scoring.execute`
**Returns:** Lead score with breakdown factors.

### 2. `opportunity_forecast`

Forecast opportunity close probability using historical win/loss patterns.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `opportunity_id` | string | ✅ | — | Opportunity ID |
| `horizon_days` | number | — | `90` | Forecast horizon in days |
| `include_similar_deals` | boolean | — | `false` | Include similar deal analysis |

**Handler:** `crm.opportunity_forecast.execute`
**Returns:** Close probability, expected date, and confidence interval.

### 3. `case_classification`

AI-classify support cases by category, priority, and sentiment.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `case_id` | string | ✅ | — | Support case ID |
| `reclassify` | boolean | — | `false` | Force reclassification |

**Handler:** `support.case_classification.execute`
**Returns:** Category, priority, sentiment, and confidence.

### 4. `knowledge_search`

Semantic search across the knowledge base using vector embeddings.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | ✅ | — | Natural language query |
| `top_k` | number | — | `5` | Number of results |
| `category` | string | — | — | Filter by KB category |
| `min_score` | number | — | `0.7` | Minimum similarity (0–1) |

**Handler:** `support.knowledge_search.execute`
**Returns:** Ranked list of articles with relevance scores.

### 5. `candidate_screening`

AI screening for candidates against job requirements and culture fit.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `candidate_id` | string | ✅ | — | Candidate ID |
| `job_id` | string | ✅ | — | Job posting ID |
| `include_bias_check` | boolean | — | `true` | Include bias detection |

**Handler:** `hr.candidate_screening.execute`
**Returns:** Skills match, experience fit, and recommendation.

### 6. `revenue_forecast`

Revenue forecasting using pipeline data and historical trends.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | ✅ | — | Forecast period (e.g. `Q1-2025`) |
| `segment` | string | — | — | Business segment |
| `model` | string | — | `'ensemble'` | Model: `linear`, `arima`, or `ensemble` |

**Handler:** `finance.revenue_forecast.execute`
**Returns:** Projections, confidence intervals, and drivers.

### 7. `campaign_optimization`

Optimize campaign ROI through channel mix and audience targeting.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `campaign_id` | string | ✅ | — | Campaign ID |
| `budget_constraint` | number | — | — | Max budget |
| `objective` | string | — | `'roi'` | Objective: `roi`, `conversions`, or `reach` |

**Handler:** `marketing.campaign_optimization.execute`
**Returns:** Optimization recommendations with projected impact.

### 8. `pricing_recommendation`

Generate pricing recommendations based on market data and margins.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `product_id` | string | ✅ | — | Product ID |
| `market` | string | — | — | Target market/region |
| `strategy` | string | — | `'value'` | Strategy: `competitive`, `value`, or `cost_plus` |
| `include_elasticity` | boolean | — | `false` | Include elasticity analysis |

**Handler:** `products.pricing_recommendation.execute`
**Returns:** Recommended price, margin analysis, and competitive positioning.

---

## Resources (4)

Resources expose read-only, cacheable JSON data that agents can fetch for context.

| Resource | URI | Cache TTL | Description |
|----------|-----|-----------|-------------|
| `account_context` | `hotcrm://crm/account_context` | 300s | Account activities, open opportunities, health score |
| `pipeline_summary` | `hotcrm://crm/pipeline_summary` | 600s | Stage distribution, velocity metrics, forecast |
| `case_metrics` | `hotcrm://support/case_metrics` | 300s | Open count, avg resolution time, CSAT trends |
| `hr_dashboard` | `hotcrm://hr/hr_dashboard` | 900s | Headcount, open positions, attrition, hiring funnel |

All resources use `application/json` MIME type with `resourceType: 'json'`.

---

## Prompts (3)

Prompts provide pre-built system + user message templates for common AI workflows.

### 1. `sales_briefing`

Generate a sales briefing for an upcoming meeting.

| Argument | Type | Required | Default |
|----------|------|----------|---------|
| `account_id` | string | ✅ | — |
| `contact_name` | string | ✅ | — |
| `meeting_date` | string | ✅ | — |
| `focus_areas` | string | — | `'general'` |

**System message:** Acts as a sales intelligence assistant producing concise, actionable briefings with account history, open opportunities, recent interactions, and talking points.

### 2. `case_resolution`

Suggest resolution steps for a support case.

| Argument | Type | Required | Default |
|----------|------|----------|---------|
| `case_id` | string | ✅ | — |
| `priority` | string | — | `'medium'` |
| `context` | string | — | — |

**System message:** Acts as a support resolution assistant analyzing the case and suggesting step-by-step guidance with KB article references.

### 3. `candidate_evaluation`

Evaluate a candidate against job requirements.

| Argument | Type | Required | Default |
|----------|------|----------|---------|
| `candidate_id` | string | ✅ | — |
| `job_id` | string | ✅ | — |
| `criteria` | string | — | `'skills,experience,culture_fit'` |

**System message:** Acts as an HR evaluation assistant providing structured, fair assessments with bias detection.

---

## Adding a Custom MCP Tool

To expose a new business action as an MCP tool:

### 1. Create the action in your package

```typescript
// packages/crm/src/account_health.action.ts
import { PredictionService } from '@hotcrm/ai';

export async function execute(params: { account_id: string }) {
  const result = await PredictionService.predict({
    modelId: 'churn-prediction-v1',
    features: { accountId: params.account_id },
  });

  return {
    health_score: result.prediction.score,
    risk_level: result.prediction.class,
    confidence: result.confidence,
  };
}
```

### 2. Add the tool definition to `mcp_server.config.ts`

```typescript
const accountHealth: MCPTool = {
  name: 'account_health',
  description: 'Evaluate account health and churn risk',
  handler: 'crm.account_health.execute',
  parameters: [
    {
      name: 'account_id',
      type: 'string',
      description: 'ID of the account',
      required: true,
    },
  ],
  returns: {
    type: 'object',
    description: 'Health score, risk level, and confidence',
  },
  sideEffects: 'read',
  category: 'crm',
  tags: ['crm', 'account', 'health', 'churn'],
};
```

### 3. Register it in the tools array

```typescript
const mcpTools: MCPTool[] = [
  // ... existing tools
  accountHealth,
];
```

The tool will be automatically discoverable by any MCP-compatible AI agent after the server restarts.

### Tool Conventions

- **Naming:** Use `snake_case` for tool names (e.g. `lead_scoring`, `account_health`).
- **Handler format:** `{package}.{action_name}.execute` — maps to the action file in the corresponding package.
- **Side effects:** Use `'read'` for queries, `'write'` for mutations. All current tools are read-only.
- **Categories:** Match the business package: `crm`, `support`, `hr`, `finance`, `marketing`, `products`.
- **Tags:** Include the category, entity, and capability for discoverability.
