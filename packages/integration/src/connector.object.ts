import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Connector = ObjectSchema.create({
  name: 'connector',
  label: 'Connector',
  pluralLabel: 'Connectors',
  icon: 'plug',
  description: 'External service connector definitions for integration management',

  fields: {
    name: Field.text({
      label: 'Connector Name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'Description',
    }),
    connector_type: Field.select({
      label: 'Connector Type',
      options: [
        { label: 'REST API', value: 'rest_api' },
        { label: 'GraphQL', value: 'graphql' },
        { label: 'SOAP', value: 'soap' },
        { label: 'Database', value: 'database' },
        { label: 'File', value: 'file' }
      ]
    }),
    provider: Field.text({
      label: 'Provider',
      required: true,
      maxLength: 255
    }),
    auth_type: Field.select({
      label: 'Authentication Type',
      options: [
        { label: 'OAuth 2.0', value: 'oauth2' },
        { label: 'API Key', value: 'api_key' },
        { label: 'Basic Auth', value: 'basic' },
        { label: 'Token', value: 'token' },
        { label: 'None', value: 'none' }
      ]
    }),
    credentials_ref: Field.text({
      label: 'Credentials Reference',
      maxLength: 255
    }),
    base_url: Field.url({ label: 'Base URL' }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'inactive',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Error', value: 'error' }
      ]
    }),
    version: Field.text({
      label: 'Version',
      maxLength: 20
    }),
    icon: Field.text({
      label: 'Icon',
      maxLength: 100
    }),
    category: Field.select({
      label: 'Category',
      options: [
        { label: 'Communication', value: 'communication' },
        { label: 'Payment', value: 'payment' },
        { label: 'Storage', value: 'storage' },
        { label: 'CRM', value: 'crm' },
        { label: 'Marketing', value: 'marketing' }
      ]
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: false
  },
});
