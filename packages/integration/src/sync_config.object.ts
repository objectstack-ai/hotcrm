import { ObjectSchema, Field } from '@objectstack/spec/data';

export const SyncConfig = ObjectSchema.create({
  name: 'sync_config',
  label: 'Sync Configuration',
  pluralLabel: 'Sync Configurations',
  icon: 'refresh-cw',
  description: 'Data synchronization configuration between internal and external objects',

  fields: {
    name: Field.text({
      label: 'Sync Name',
      required: true,
      maxLength: 255
    }),
    connection_id: Field.lookup('connection', {
      label: 'Connection',
      required: true
    }),
    source_object: Field.text({
      label: 'Source Object',
      required: true,
      maxLength: 255
    }),
    target_object: Field.text({
      label: 'Target Object',
      required: true,
      maxLength: 255
    }),
    field_mapping: Field.textarea({
      label: 'Field Mapping',
      required: true,
      description: 'JSON field mapping configuration'
    }),
    direction: Field.select({
      label: 'Sync Direction',
      options: [
        { label: 'Inbound', value: 'inbound' },
        { label: 'Outbound', value: 'outbound' },
        { label: 'Bidirectional', value: 'bidirectional' }
      ]
    }),
    frequency: Field.select({
      label: 'Frequency',
      options: [
        { label: 'Realtime', value: 'realtime' },
        { label: 'Hourly', value: 'hourly' },
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Manual', value: 'manual' }
      ]
    }),
    conflict_resolution: Field.select({
      label: 'Conflict Resolution',
      options: [
        { label: 'Source Wins', value: 'source_wins' },
        { label: 'Target Wins', value: 'target_wins' },
        { label: 'Newest Wins', value: 'newest_wins' },
        { label: 'Manual', value: 'manual' }
      ]
    }),
    is_active: Field.boolean({
      label: 'Is Active',
      defaultValue: false
    }),
    last_sync: Field.datetime({ label: 'Last Sync' }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: false,
    files: false
  },
});
