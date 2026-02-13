import { ObjectSchema, Field } from '@objectstack/spec/data';

export const SyncLog = ObjectSchema.create({
  name: 'sync_log',
  label: 'Sync Log',
  pluralLabel: 'Sync Logs',
  icon: 'file-text',
  description: 'Execution log entries for data synchronization runs',

  fields: {
    name: Field.text({
      label: 'Log Name',
      maxLength: 255
    }),
    sync_config_id: Field.lookup('sync_config', {
      label: 'Sync Configuration',
      required: true
    }),
    started_at: Field.datetime({
      label: 'Started At',
      required: true
    }),
    completed_at: Field.datetime({ label: 'Completed At' }),
    records_processed: Field.number({ label: 'Records Processed' }),
    records_failed: Field.number({ label: 'Records Failed' }),
    error_details: Field.textarea({
      label: 'Error Details',
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Running', value: 'running' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' }
      ]
    }),
    duration_ms: Field.number({ label: 'Duration (ms)' })
  },

  enable: {
    searchable: true,
    trackHistory: false,
    activities: false,
    feeds: false,
    files: false
  },
});
