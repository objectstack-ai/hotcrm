import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Connection = ObjectSchema.create({
  name: 'connection',
  label: 'Connection',
  pluralLabel: 'Connections',
  icon: 'link',
  description: 'Active connections to external services via connectors',

  fields: {
    name: Field.text({
      label: 'Connection Name',
      required: true,
      maxLength: 255
    }),
    connector_id: Field.lookup('connector', {
      label: 'Connector',
      required: true
    }),
    tenant_id: Field.text({
      label: 'Tenant ID',
      maxLength: 255
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'disconnected',
      options: [
        { label: 'Connected', value: 'connected' },
        { label: 'Disconnected', value: 'disconnected' },
        { label: 'Expired', value: 'expired' },
        { label: 'Error', value: 'error' }
      ]
    }),
    auth_token_ref: Field.text({
      label: 'Auth Token Reference',
      maxLength: 500
    }),
    refresh_token_ref: Field.text({
      label: 'Refresh Token Reference',
      maxLength: 500
    }),
    expires_at: Field.datetime({ label: 'Expires At' }),
    last_used: Field.datetime({ label: 'Last Used' }),
    metadata: Field.textarea({
      label: 'Metadata',
      description: 'JSON metadata for connection configuration'
    }),
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
