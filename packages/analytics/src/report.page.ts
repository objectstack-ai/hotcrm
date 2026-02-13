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
  label: 'Report Builder',

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'type', 'status', 'data_source', 'last_run_at']
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
              'data_source', 'type', 'date_range_start', 'date_range_end',
              'filters', 'group_by', 'sort_by'
            ],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Column Selector',
          properties: {
            fields: [
              'columns', 'aggregations', 'calculated_fields'
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
              'name', 'type', 'row_count', 'last_run_at',
              'execution_time_ms', 'output_format'
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
            columns: ['name', 'frequency', 'next_run_at', 'recipients', 'is_active'],
            sort: [{ field: 'next_run_at', direction: 'asc' }],
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
            columns: ['name', 'snapshot_date', 'record_count', 'created_by'],
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
