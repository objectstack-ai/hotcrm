import { ObjectSchema, Field } from '@objectstack/spec/data';

export const DataSource = ObjectSchema.create({
  name: 'data_source',
  label: 'Data Source',
  fields: {
    name: Field.text({ label: 'Source Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 }),
    source_type: Field.select({
      label: 'Source Type',
      required: true,
      options: [
        { label: 'Internal Object', value: 'internal' },
        { label: 'Database', value: 'database' },
        { label: 'REST API', value: 'rest_api' },
        { label: 'CSV Upload', value: 'csv' },
        { label: 'Data Warehouse', value: 'warehouse' }
      ]
    }),
    connection_string: Field.textarea({ label: 'Connection Config (JSON)', maxLength: 5000 }),
    sync_status: Field.select({
      label: 'Sync Status',
      options: [
        { label: 'Connected', value: 'connected' },
        { label: 'Disconnected', value: 'disconnected' },
        { label: 'Syncing', value: 'syncing' },
        { label: 'Error', value: 'error' }
      ],
      defaultValue: 'disconnected'
    }),
    last_sync: Field.datetime({ label: 'Last Sync' }),
    schema_mapping: Field.textarea({ label: 'Schema Mapping (JSON)', maxLength: 10000 }),
    refresh_frequency: Field.select({
      label: 'Refresh Frequency',
      options: [
        { label: 'Real-time', value: 'realtime' },
        { label: 'Hourly', value: 'hourly' },
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Manual', value: 'manual' }
      ],
      defaultValue: 'daily'
    }),
    owner_id: Field.lookup('users', { label: 'Owner' })
  }
});
