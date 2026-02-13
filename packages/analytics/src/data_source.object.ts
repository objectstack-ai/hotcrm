import { ObjectSchema, Field } from '@objectstack/spec/data';

export const DataSource = ObjectSchema.create({
  name: 'data_source',
  label: 'Data Source',
  pluralLabel: 'Data Sources',
  icon: 'database',
  description: 'External data source connectors for analytics integration',

  fields: {
    name: Field.text({
      label: 'Data Source Name',
      required: true,
      maxLength: 255
    }),
    type: Field.select({
      label: 'Source Type',
      options: [
        { label: 'Database', value: 'database' },
        { label: 'API', value: 'api' },
        { label: 'File', value: 'file' },
        { label: 'Streaming', value: 'streaming' }
      ]
    }),
    connection_config: Field.textarea({
      label: 'Connection Configuration',
      description: 'JSON connection settings'
    }),
    sync_status: Field.select({
      label: 'Sync Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Error', value: 'error' },
        { label: 'Disconnected', value: 'disconnected' }
      ]
    }),
    last_sync: Field.datetime({
      label: 'Last Sync',
      readonly: true
    }),
    schema_mapping: Field.textarea({
      label: 'Schema Mapping',
      description: 'JSON schema mapping configuration'
    }),
    refresh_interval: Field.number({
      label: 'Refresh Interval (seconds)',
      min: 60
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});

export default DataSource;
