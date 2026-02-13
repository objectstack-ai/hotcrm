import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ApiKey = ObjectSchema.create({
  name: 'api_key',
  label: 'API Key',
  pluralLabel: 'API Keys',
  icon: 'key',
  description: 'API key management for external access control',

  fields: {
    name: Field.text({
      label: 'Key Name',
      required: true,
      maxLength: 255
    }),
    key_hash: Field.text({
      label: 'Key Hash',
      required: true,
      maxLength: 500
    }),
    scopes: Field.textarea({
      label: 'Scopes',
      description: 'JSON array of granted scopes'
    }),
    rate_limit: Field.number({
      label: 'Rate Limit',
      defaultValue: 1000
    }),
    expires_at: Field.datetime({ label: 'Expires At' }),
    last_used: Field.datetime({ label: 'Last Used' }),
    created_by: Field.lookup('users', {
      label: 'Created By',
      defaultValue: '$currentUser'
    }),
    is_active: Field.boolean({
      label: 'Is Active',
      defaultValue: true
    }),
    usage_count: Field.number({
      label: 'Usage Count',
      defaultValue: 0
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: false,
    files: false
  },
});
