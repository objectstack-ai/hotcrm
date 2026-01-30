import type { ServiceObject } from '@objectstack/spec/data';

const EmailToCase = {
  name: 'email_to_case',
  label: 'Email-to-Case Configuration',
  labelPlural: 'Email-to-Case Configurations',
  icon: 'envelope',
  description: 'Email-to-case automation configuration for automatic case creation',
  capabilities: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Configuration Name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000
    },
    IsActive: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // Email Configuration
    EmailAddress: {
      type: 'email',
      label: 'Email Address',
      required: true,
      description: 'Support email address to monitor'
    },
    MailboxType: {
      type: 'select',
      label: 'Mailbox Type',
      required: true,
      defaultValue: 'IMAP',
      options: [
        { label: 'IMAP', value: 'IMAP' },
        { label: 'POP3', value: 'POP3' },
        { label: 'Microsoft 365', value: 'Microsoft365' },
        { label: 'Gmail', value: 'Gmail' },
        { label: 'Exchange', value: 'Exchange' }
      ]
    },
    MailServer: {
      type: 'text',
      label: 'Mail Server',
      maxLength: 255,
      description: 'IMAP/POP3 server address'
    },
    MailPort: {
      type: 'number',
      label: 'Port',
      precision: 0,
      defaultValue: 993
    },
    UseSSL: {
      type: 'checkbox',
      label: 'Use SSL',
      defaultValue: true
    },
    Username: {
      type: 'text',
      label: 'Username',
      maxLength: 255
    },
    // Routing
    DefaultQueueId: {
      type: 'lookup',
      label: 'Default Queue',
      reference: 'Queue',
      required: true,
      description: 'Queue for new cases created from emails'
    },
    DefaultOwnerId: {
      type: 'lookup',
      label: 'Default Owner',
      reference: 'User',
      description: 'Default case owner (if not using queue)'
    },
    DefaultPriority: {
      type: 'select',
      label: 'Default Priority',
      defaultValue: 'Medium',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    DefaultCaseType: {
      type: 'select',
      label: 'Default Case Type',
      options: [
        { label: 'Problem', value: 'Problem' },
        { label: 'Question', value: 'Question' },
        { label: 'Incident', value: 'Incident' },
        { label: 'Feature Request', value: 'Feature Request' },
        { label: 'Training', value: 'Training' },
        { label: 'Maintenance', value: 'Maintenance' },
        { label: 'Other', value: 'Other' }
      ]
    },
    // Case Creation Rules
    CreateCasePerEmail: {
      type: 'checkbox',
      label: 'Create Case Per Email',
      defaultValue: true,
      description: 'Create new case for each email (vs. threading)'
    },
    ThreadBySubject: {
      type: 'checkbox',
      label: 'Thread by Subject',
      defaultValue: true,
      description: 'Add to existing case if subject matches'
    },
    ThreadWindowHours: {
      type: 'number',
      label: 'Thread Window (Hours)',
      precision: 0,
      min: 1,
      defaultValue: 72,
      description: 'Time window for threading emails to same case'
    },
    // Contact Matching
    AutoMatchContact: {
      type: 'checkbox',
      label: 'Auto Match Contact',
      defaultValue: true,
      description: 'Automatically match sender to existing contact'
    },
    CreateContactIfNotFound: {
      type: 'checkbox',
      label: 'Create Contact If Not Found',
      defaultValue: true,
      description: 'Create new contact for unknown senders'
    },
    DefaultAccountId: {
      type: 'lookup',
      label: 'Default Account',
      reference: 'Account',
      description: 'Account for cases when contact not found'
    },
    // Processing Rules
    ProcessUnreadOnly: {
      type: 'checkbox',
      label: 'Process Unread Only',
      defaultValue: true
    },
    MarkAsRead: {
      type: 'checkbox',
      label: 'Mark as Read',
      defaultValue: true,
      description: 'Mark email as read after processing'
    },
    MoveToFolder: {
      type: 'text',
      label: 'Move to Folder',
      maxLength: 255,
      description: 'IMAP folder to move processed emails'
    },
    // Attachments
    SaveAttachments: {
      type: 'checkbox',
      label: 'Save Attachments',
      defaultValue: true
    },
    MaxAttachmentSize: {
      type: 'number',
      label: 'Max Attachment Size (MB)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 25
    },
    AllowedFileTypes: {
      type: 'text',
      label: 'Allowed File Types',
      maxLength: 500,
      description: 'Comma-separated extensions (e.g., pdf,doc,docx,jpg,png)'
    },
    // AI Processing
    UseAIForCategorization: {
      type: 'checkbox',
      label: 'Use AI for Categorization',
      defaultValue: false,
      description: 'Use AI to auto-categorize and route cases'
    },
    UseAIForPriority: {
      type: 'checkbox',
      label: 'Use AI for Priority',
      defaultValue: false,
      description: 'Use AI to determine case priority'
    },
    UseAISentimentAnalysis: {
      type: 'checkbox',
      label: 'Use AI Sentiment Analysis',
      defaultValue: false
    },
    // Filtering
    SubjectFilters: {
      type: 'textarea',
      label: 'Subject Filters',
      maxLength: 2000,
      description: 'Keywords to filter emails (one per line)'
    },
    SenderFilters: {
      type: 'textarea',
      label: 'Sender Filters',
      maxLength: 2000,
      description: 'Email addresses or domains to filter (one per line)'
    },
    ExcludeAutoReplies: {
      type: 'checkbox',
      label: 'Exclude Auto-Replies',
      defaultValue: true
    },
    // Auto Response
    SendAutoResponse: {
      type: 'checkbox',
      label: 'Send Auto Response',
      defaultValue: false
    },
    AutoResponseTemplateId: {
      type: 'lookup',
      label: 'Auto Response Template',
      reference: 'EmailTemplate',
      description: 'Email template for auto-response'
    },
    // Polling
    PollingInterval: {
      type: 'number',
      label: 'Polling Interval (Minutes)',
      precision: 0,
      min: 1,
      max: 60,
      defaultValue: 5,
      description: 'How often to check for new emails'
    },
    LastPolledDate: {
      type: 'datetime',
      label: 'Last Polled',
      readonly: true
    },
    // Statistics
    TotalEmailsProcessed: {
      type: 'number',
      label: 'Emails Processed',
      precision: 0,
      readonly: true
    },
    CasesCreated: {
      type: 'number',
      label: 'Cases Created',
      precision: 0,
      readonly: true
    },
    FailedEmails: {
      type: 'number',
      label: 'Failed Emails',
      precision: 0,
      readonly: true
    },
    LastErrorDate: {
      type: 'datetime',
      label: 'Last Error',
      readonly: true
    },
    LastErrorMessage: {
      type: 'text',
      label: 'Last Error Message',
      maxLength: 500,
      readonly: true
    }
  },
  validationRules: [
    {
      name: 'MailServerRequired',
      errorMessage: 'Mail server is required for IMAP/POP3 mailbox types',
      formula: 'AND(MailboxType IN ("IMAP", "POP3"), ISBLANK(MailServer))'
    },
    {
      name: 'AutoResponseTemplateRequired',
      errorMessage: 'Auto response template is required when auto response is enabled',
      formula: 'AND(SendAutoResponse = true, ISBLANK(AutoResponseTemplateId))'
    },
    {
      name: 'ThreadWindowRequired',
      errorMessage: 'Thread window is required when threading by subject',
      formula: 'AND(ThreadBySubject = true, ISBLANK(ThreadWindowHours))'
    }
  ],
  listViews: [
    {
      name: 'AllConfigurations',
      label: 'All Configurations',
      filters: [],
      columns: ['Name', 'EmailAddress', 'MailboxType', 'DefaultQueueId', 'IsActive', 'CasesCreated'],
      sort: [['Name', 'asc']]
    },
    {
      name: 'ActiveConfigurations',
      label: 'Active',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'EmailAddress', 'DefaultQueueId', 'LastPolledDate', 'CasesCreated', 'FailedEmails'],
      sort: [['Name', 'asc']]
    },
    {
      name: 'WithErrors',
      label: 'With Errors',
      filters: [
        ['FailedEmails', '>', 0]
      ],
      columns: ['Name', 'EmailAddress', 'FailedEmails', 'LastErrorDate', 'LastErrorMessage'],
      sort: [['LastErrorDate', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Configuration Information',
        columns: 2,
        fields: ['Name', 'Description', 'IsActive']
      },
      {
        label: 'Email Settings',
        columns: 2,
        fields: ['EmailAddress', 'MailboxType', 'MailServer', 'MailPort', 'UseSSL', 'Username']
      },
      {
        label: 'Default Case Settings',
        columns: 2,
        fields: ['DefaultQueueId', 'DefaultOwnerId', 'DefaultPriority', 'DefaultCaseType']
      },
      {
        label: 'Case Creation Rules',
        columns: 2,
        fields: ['CreateCasePerEmail', 'ThreadBySubject', 'ThreadWindowHours']
      },
      {
        label: 'Contact Matching',
        columns: 2,
        fields: ['AutoMatchContact', 'CreateContactIfNotFound', 'DefaultAccountId']
      },
      {
        label: 'Processing Rules',
        columns: 2,
        fields: ['ProcessUnreadOnly', 'MarkAsRead', 'MoveToFolder', 'PollingInterval']
      },
      {
        label: 'Attachments',
        columns: 2,
        fields: ['SaveAttachments', 'MaxAttachmentSize', 'AllowedFileTypes']
      },
      {
        label: 'AI Processing',
        columns: 2,
        fields: ['UseAIForCategorization', 'UseAIForPriority', 'UseAISentimentAnalysis']
      },
      {
        label: 'Filtering',
        columns: 2,
        fields: ['SubjectFilters', 'SenderFilters', 'ExcludeAutoReplies']
      },
      {
        label: 'Auto Response',
        columns: 2,
        fields: ['SendAutoResponse', 'AutoResponseTemplateId']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['LastPolledDate', 'TotalEmailsProcessed', 'CasesCreated', 'FailedEmails', 'LastErrorDate', 'LastErrorMessage']
      }
    ]
  }
};

export default EmailToCase;
