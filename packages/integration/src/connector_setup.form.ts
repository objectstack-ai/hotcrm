import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Connector Setup Form Definition
 * Wizard-style layout for creating and configuring connector records.
 * Sections cover connector info, authentication, and configuration settings.
 */
export const ConnectorSetupForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'connector'
  },
  sections: [
    {
      label: 'Connector Info',
      columns: '2' as const,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'connector_type', required: true, helpText: 'Select the type of external system to connect' },
        { field: 'name', required: true, placeholder: 'Enter a descriptive name for this connector' },
        { field: 'description' }
      ]
    },
    {
      label: 'Authentication',
      columns: '2' as const,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'auth_type', required: true, helpText: 'Authentication method for the external system' },
        { field: 'api_key', placeholder: 'Enter API key' },
        { field: 'api_secret', placeholder: 'Enter API secret' },
        { field: 'oauth_token', placeholder: 'OAuth token' }
      ]
    },
    {
      label: 'Configuration',
      columns: '2' as const,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'base_url', placeholder: 'https://api.example.com' },
        { field: 'timeout_seconds', helpText: 'Request timeout in seconds' },
        { field: 'retry_count', helpText: 'Number of retry attempts on failure' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(ConnectorSetupForm);

export default ConnectorSetupForm;
