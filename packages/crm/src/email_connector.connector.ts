import type { Connector } from '@objectstack/spec/automation';
import { ConnectorSchema } from '@objectstack/spec/automation';

export const EmailConnector = {
  id: 'email_connector',
  name: 'Email Connector',
  description: 'Integrates with Gmail and Outlook for email activity logging, sending, and thread search.',
  version: '1.0.0',
  icon: 'mail',
  category: 'communication',
  baseUrl: 'https://api.email-provider.com/v1',
  authentication: {
    type: 'oauth2',
    fields: [
      {
        name: 'client_id',
        label: 'Client ID',
        type: 'text',
        description: 'OAuth2 application client ID',
        required: true,
        placeholder: 'your-client-id',
      },
      {
        name: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        description: 'OAuth2 application client secret',
        required: true,
        placeholder: 'your-client-secret',
      },
    ],
    oauth2: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://mail.read',
        'https://mail.send',
      ],
      clientIdField: 'client_id',
      clientSecretField: 'client_secret',
    },
    test: {
      url: '/me/profile',
      method: 'GET',
    },
  },
  operations: [
    {
      id: 'sync_emails',
      name: 'Sync Emails',
      description: 'Retrieve and sync emails from the connected mailbox into CRM activities.',
      type: 'read',
      inputSchema: [
        { name: 'folder', label: 'Folder', type: 'string', required: false },
        { name: 'since', label: 'Since Date', type: 'date', required: false },
        { name: 'limit', label: 'Limit', type: 'number', required: false },
      ],
      supportsPagination: true,
      supportsFiltering: true,
    },
    {
      id: 'send_email',
      name: 'Send Email',
      description: 'Send an email through the connected email provider.',
      type: 'write',
      inputSchema: [
        { name: 'to', label: 'To', type: 'string', required: true },
        { name: 'subject', label: 'Subject', type: 'string', required: true },
        { name: 'body', label: 'Body', type: 'string', required: true },
        { name: 'cc', label: 'CC', type: 'string', required: false },
        { name: 'bcc', label: 'BCC', type: 'string', required: false },
      ],
      supportsPagination: false,
      supportsFiltering: false,
    },
    {
      id: 'search_threads',
      name: 'Search Threads',
      description: 'Search email threads by keyword, sender, or date range.',
      type: 'search',
      inputSchema: [
        { name: 'query', label: 'Search Query', type: 'string', required: true },
        { name: 'from', label: 'From Address', type: 'string', required: false },
        { name: 'date_range', label: 'Date Range', type: 'string', required: false },
      ],
      supportsPagination: true,
      supportsFiltering: true,
    },
    {
      id: 'log_email_as_activity',
      name: 'Log Email as Activity',
      description: 'Log an email as a CRM activity linked to a contact or account.',
      type: 'action',
      inputSchema: [
        { name: 'email_id', label: 'Email ID', type: 'string', required: true },
        { name: 'contact_id', label: 'Contact ID', type: 'string', required: false },
        { name: 'account_id', label: 'Account ID', type: 'string', required: false },
      ],
      supportsPagination: false,
      supportsFiltering: false,
    },
  ],
  triggers: [
    {
      id: 'new_email',
      name: 'New Email Received',
      description: 'Fires when a new email is received in the connected mailbox.',
      type: 'webhook',
    },
  ],
  rateLimit: {
    requestsPerSecond: 10,
    requestsPerMinute: 250,
  },
  author: 'HotCRM',
  documentation: 'https://docs.hotcrm.com/connectors/email',
  tags: ['email', 'gmail', 'outlook', 'activity-logging'],
  verified: true,
} satisfies Connector;

ConnectorSchema.parse(EmailConnector);

export default EmailConnector;
