/**
 * CRM MCP Resources
 *
 * Exposes core CRM data (accounts, pipeline, forecasts, territories)
 * as Model Context Protocol resources for AI agent consumption.
 */

import type { MCPResource } from '@objectstack/spec/ai';
import { MCPResourceSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// account_list
// ---------------------------------------------------------------------------

export const AccountListResource = {
  uri: 'objectstack://crm/accounts',
  name: 'account_list',
  description:
    'Paginated list of CRM accounts with key fields including name, industry, owner, annual revenue, and health score.',
  mimeType: 'application/json',
  resourceType: 'json' as const,
  tags: ['crm', 'account', 'sales'],
  permissions: { read: true, write: false, delete: false },
  cacheable: true,
  cacheMaxAge: 300,
} satisfies MCPResource;

MCPResourceSchema.parse(AccountListResource);

// ---------------------------------------------------------------------------
// pipeline_summary
// ---------------------------------------------------------------------------

export const PipelineSummaryResource = {
  uri: 'objectstack://crm/pipeline/summary',
  name: 'pipeline_summary',
  description:
    'Aggregated sales pipeline summary with stage distribution, total value, weighted forecast, and velocity metrics.',
  mimeType: 'application/json',
  resourceType: 'json' as const,
  tags: ['crm', 'pipeline', 'sales', 'forecast'],
  permissions: { read: true, write: false, delete: false },
  cacheable: true,
  cacheMaxAge: 600,
} satisfies MCPResource;

MCPResourceSchema.parse(PipelineSummaryResource);

// ---------------------------------------------------------------------------
// forecast_data
// ---------------------------------------------------------------------------

export const ForecastDataResource = {
  uri: 'objectstack://crm/forecasts',
  name: 'forecast_data',
  description:
    'Revenue forecast data broken down by period, segment, and rep including best-case, commit, and closed totals.',
  mimeType: 'application/json',
  resourceType: 'json' as const,
  tags: ['crm', 'forecast', 'revenue'],
  permissions: { read: true, write: false, delete: false },
  cacheable: true,
  cacheMaxAge: 900,
} satisfies MCPResource;

MCPResourceSchema.parse(ForecastDataResource);

// ---------------------------------------------------------------------------
// territory_map
// ---------------------------------------------------------------------------

export const TerritoryMapResource = {
  uri: 'objectstack://crm/territories',
  name: 'territory_map',
  description:
    'Territory assignment map with region boundaries, assigned reps, account counts, and quota attainment per territory.',
  mimeType: 'application/json',
  resourceType: 'json' as const,
  tags: ['crm', 'territory', 'sales'],
  permissions: { read: true, write: false, delete: false },
  cacheable: true,
  cacheMaxAge: 1800,
} satisfies MCPResource;

MCPResourceSchema.parse(TerritoryMapResource);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  accountList: AccountListResource,
  pipelineSummary: PipelineSummaryResource,
  forecastData: ForecastDataResource,
  territoryMap: TerritoryMapResource,
};
