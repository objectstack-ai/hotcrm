import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Integration Health Dashboard
 * Sync success rates, webhook deliveries, API usage metrics
 */
export const IntegrationDashboard = {
  name: 'integration_dashboard',
  label: 'Integration Health Dashboard',
  description: 'Monitor sync success rates, webhook deliveries, and API key usage',
  widgets: [
    {
      id: 'active_connectors',
      title: 'Active Connectors',
      type: 'metric' as const,
      object: 'connector',
      aggregate: 'count' as const,
      filter: { status: 'active' },
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'active_connections',
      title: 'Active Connections',
      type: 'metric' as const,
      object: 'connection',
      aggregate: 'count' as const,
      filter: { status: 'connected' },
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'active_syncs',
      title: 'Active Syncs',
      type: 'metric' as const,
      object: 'sync_config',
      aggregate: 'count' as const,
      filter: { is_active: true },
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'active_api_keys',
      title: 'Active API Keys',
      type: 'metric' as const,
      object: 'api_key',
      aggregate: 'count' as const,
      filter: { is_active: true },
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      id: 'sync_success_rate',
      title: 'Sync Success Rate',
      type: 'pie' as const,
      object: 'sync_log',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'webhook_delivery_status',
      title: 'Webhook Delivery Status',
      type: 'bar' as const,
      object: 'webhook_delivery',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'connectors_by_category',
      title: 'Connectors by Category',
      type: 'pie' as const,
      object: 'connector',
      categoryField: 'category',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      id: 'recent_sync_logs',
      title: 'Recent Sync Logs',
      type: 'table' as const,
      object: 'sync_log',
      aggregate: 'count' as const,
      filter: { status: { $ne: 'cancelled' } },
      layout: { x: 6, y: 6, w: 6, h: 4 },
      options: {
        columns: [
          { header: 'Name', accessorKey: 'name' },
          { header: 'Status', accessorKey: 'status' },
          { header: 'Records Processed', accessorKey: 'records_processed' },
          { header: 'Records Failed', accessorKey: 'records_failed' },
          { header: 'Started At', accessorKey: 'started_at' }
        ]
      }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(IntegrationDashboard);

export default IntegrationDashboard;
