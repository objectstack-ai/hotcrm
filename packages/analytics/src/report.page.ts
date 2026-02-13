import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Report Detail Page Layout
 * Report builder with configuration, preview, and scheduling
 */
export const ReportPage = {
  name: 'report_detail',
  object: 'report',
  type: 'record' as const,
  label: 'Report Builder',
  template: 'default',
  isDefault: true,

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'report_type', 'object_name', 'chart_type', 'is_public']
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
            tabs: ['report_config', 'filters_sort', 'schedule']
          }
        }
      ]
    },
    {
      name: 'report_config',
      components: [
        {
          type: 'record:details' as const,
          label: 'Report Configuration',
          properties: {
            fields: [
              'name', 'description', 'object_name', 'report_type',
              'columns', 'groupings_down', 'groupings_across',
              'chart_type', 'is_public', 'folder'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'filters_sort',
      components: [
        {
          type: 'record:details' as const,
          label: 'Filters & Sorting',
          properties: {
            fields: ['filters', 'sort_order'],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'schedule',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Schedules',
          properties: {
            object: 'report_schedule',
            columns: ['name', 'frequency', 'recipients', 'format', 'next_run', 'is_active'],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ReportPage);

export default ReportPage;
