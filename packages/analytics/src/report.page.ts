import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Report Builder Page Layout
 * Provides filter panels, column selector, preview, and export capabilities
 */
export const ReportPage = {
  name: 'report_detail',
  object: 'report',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Report Builder',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['analyst', 'manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'report_type', 'object_name', 'chart_type', 'last_run_at']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['builder', 'preview', 'schedule', 'history']
          }
        }
      ]
    },
    {
      name: 'builder',
      components: [
        {
          type: 'record:details' as const,
          label: 'Filter Panel',
          properties: {
            fields: [
              'object_name', 'report_type', 'filters',
              'groupings', 'sort_order'
            ],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Column Selector',
          properties: {
            fields: [
              'columns', 'aggregations', 'chart_type'
            ],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'preview',
      components: [
        {
          type: 'record:details' as const,
          label: 'Report Preview',
          properties: {
            fields: [
              'name', 'report_type', 'run_count', 'last_run_at',
              'is_public', 'folder'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'schedule',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Scheduled Deliveries',
          properties: {
            object: 'report_schedule',
            columns: ['name', 'frequency', 'next_run', 'recipients', 'is_active'],
            sort: [{ field: 'next_run', direction: 'asc' }],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    },
    {
      name: 'history',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Execution History',
          properties: {
            object: 'snapshot',
            columns: ['name', 'snapshot_date', 'record_count', 'status'],
            sort: [{ field: 'snapshot_date', direction: 'desc' }],
            actions: ['new']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ReportPage);

export default ReportPage;
