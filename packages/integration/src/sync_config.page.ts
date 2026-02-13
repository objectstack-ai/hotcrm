import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Sync Configuration Detail Page Layout
 * Sync configuration with field mapping editor
 */
export const SyncConfigPage = {
  name: 'sync_config_detail',
  object: 'sync_config',
  type: 'record' as const,
  label: 'Sync Configuration Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['integration_admin', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'direction', 'frequency', 'is_active', 'last_sync']
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
            tabs: ['sync_info', 'field_mapping', 'sync_history']
          }
        }
      ]
    },
    {
      name: 'sync_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Sync Configuration',
          properties: {
            fields: [
              'name', 'connection_id', 'source_object', 'target_object',
              'direction', 'frequency', 'conflict_resolution',
              'is_active', 'last_sync', 'owner_id'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'field_mapping',
      components: [
        {
          type: 'record:details' as const,
          label: 'Field Mapping Editor',
          properties: {
            fields: ['field_mapping'],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'sync_history',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Sync History',
          properties: {
            object: 'sync_log',
            columns: ['started_at', 'completed_at', 'status', 'records_processed', 'records_failed', 'duration_ms'],
            sort: [{ field: 'started_at', direction: 'desc' }],
            actions: ['new']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(SyncConfigPage);

export default SyncConfigPage;
