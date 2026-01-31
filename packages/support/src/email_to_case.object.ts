
const EmailToCase = {
  name: 'email_to_case',
  label: 'Email-to-Case Configuration',
  labelPlural: 'Email-to-Case Configurations',
  icon: 'envelope',
  description: 'Email-to-case automation configuration for automatic case creation',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: 'Configuration name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000
    },
    is_active: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // Email Configuration
    email_address: {
      type: 'email',
      label: 'Email Address',
      required: true,
      description: 'Support email address to monitor'
    },
    mailbox_type: {
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
    mail_server: {
      type: 'text',
      label: 'Mail Server',
      maxLength: 255,
      description: 'IMAP/POP3 server address'
    },
    mail_port: {
      type: 'number',
      label: 'Port',
      precision: 0,
      defaultValue: 993
    },
    use_s_s_l: {
      type: 'checkbox',
      label: 'Use SSL',
      defaultValue: true
    },
    username: {
      type: 'text',
      label: 'username',
      maxLength: 255
    },
    // Routing
    default_queue_id: {
      type: 'lookup',
      label: 'Default Queue',
      reference: 'Queue',
      required: true,
      description: 'Queue for new cases created from emails'
    },
    default_owner_id: {
      type: 'lookup',
      label: 'Default Owner',
      reference: 'User',
      description: 'Default case owner (if not using queue)'
    },
    default_priority: {
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
    default_case_type: {
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
    create_case_per_email: {
      type: 'checkbox',
      label: 'Create Case Per Email',
      defaultValue: true,
      description: 'Create new case for each email (vs. threading)'
    },
    thread_by_subject: {
      type: 'checkbox',
      label: 'Thread by Subject',
      defaultValue: true,
      description: 'Add to existing case if subject matches'
    },
    thread_window_hours: {
      type: 'number',
      label: 'Thread Window (Hours)',
      precision: 0,
      min: 1,
      defaultValue: 72,
      description: 'Time window for threading emails to same case'
    },
    // Contact Matching
    auto_match_contact: {
      type: 'checkbox',
      label: 'Auto Match Contact',
      defaultValue: true,
      description: 'Automatically match sender to existing contact'
    },
    create_contact_if_not_found: {
      type: 'checkbox',
      label: 'Create Contact If Not Found',
      defaultValue: true,
      description: 'Create new contact for unknown senders'
    },
    default_account_id: {
      type: 'lookup',
      label: 'Default Account',
      reference: 'Account',
      description: 'Account for cases when contact not found'
    },
    // Processing Rules
    process_unread_only: {
      type: 'checkbox',
      label: 'Process Unread Only',
      defaultValue: true
    },
    mark_as_read: {
      type: 'checkbox',
      label: 'Mark as Read',
      defaultValue: true,
      description: 'Mark email as read after processing'
    },
    move_to_folder: {
      type: 'text',
      label: 'Move to Folder',
      maxLength: 255,
      description: 'IMAP folder to move processed emails'
    },
    // Attachments
    save_attachments: {
      type: 'checkbox',
      label: 'Save Attachments',
      defaultValue: true
    },
    max_attachment_size: {
      type: 'number',
      label: 'Max Attachment Size (MB)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 25
    },
    allowed_file_types: {
      type: 'text',
      label: 'Allowed File Types',
      maxLength: 500,
      description: 'Comma-separated extensions (e.g., pdf,doc,docx,jpg,png)'
    },
    // AI Processing
    use_a_i_for_categorization: {
      type: 'checkbox',
      label: 'Use AI for Categorization',
      defaultValue: false,
      description: 'Use AI to auto-categorize and route cases'
    },
    use_a_i_for_priority: {
      type: 'checkbox',
      label: 'Use AI for Priority',
      defaultValue: false,
      description: 'Use AI to determine case priority'
    },
    use_a_i_sentiment_analysis: {
      type: 'checkbox',
      label: 'Use AI Sentiment Analysis',
      defaultValue: false
    },
    // Filtering
    subject_filters: {
      type: 'textarea',
      label: 'Subject Filters',
      maxLength: 2000,
      description: 'Keywords to filter emails (one per line)'
    },
    sender_filters: {
      type: 'textarea',
      label: 'Sender Filters',
      maxLength: 2000,
      description: 'Email addresses or domains to filter (one per line)'
    },
    exclude_auto_replies: {
      type: 'checkbox',
      label: 'Exclude Auto-Replies',
      defaultValue: true
    },
    // Auto Response
    send_auto_response: {
      type: 'checkbox',
      label: 'Send Auto Response',
      defaultValue: false
    },
    auto_response_template_id: {
      type: 'lookup',
      label: 'Auto Response Template',
      reference: 'EmailTemplate',
      description: 'Email template for auto-response'
    },
    // Polling
    polling_interval: {
      type: 'number',
      label: 'Polling Interval (Minutes)',
      precision: 0,
      min: 1,
      max: 60,
      defaultValue: 5,
      description: 'How often to check for new emails'
    },
    last_polled_date: {
      type: 'datetime',
      label: 'Last Polled',
      readonly: true
    },
    // Statistics
    total_emails_processed: {
      type: 'number',
      label: 'Emails Processed',
      precision: 0,
      readonly: true
    },
    cases_created: {
      type: 'number',
      label: 'Cases Created',
      precision: 0,
      readonly: true
    },
    failed_emails: {
      type: 'number',
      label: 'Failed Emails',
      precision: 0,
      readonly: true
    },
    last_error_date: {
      type: 'datetime',
      label: 'Last Error',
      readonly: true
    },
    last_error_message: {
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
      formula: 'AND(mailbox_type IN ("IMAP", "POP3"), ISBLANK(mail_server))'
    },
    {
      name: 'AutoResponseTemplateRequired',
      errorMessage: 'Auto response template is required when auto response is enabled',
      formula: 'AND(send_auto_response = true, ISBLANK(auto_response_template_id))'
    },
    {
      name: 'ThreadWindowRequired',
      errorMessage: 'Thread window is required when threading by subject',
      formula: 'AND(thread_by_subject = true, ISBLANK(thread_window_hours))'
    }
  ],
  listViews: [
    {
      name: 'AllConfigurations',
      label: 'All Configurations',
      filters: [],
      columns: ['name', 'email_address', 'mailbox_type', 'default_queue_id', 'is_active', 'cases_created'],
      sort: [['name', 'asc']]
    },
    {
      name: 'ActiveConfigurations',
      label: 'Active',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['name', 'email_address', 'default_queue_id', 'last_polled_date', 'cases_created', 'failed_emails'],
      sort: [['name', 'asc']]
    },
    {
      name: 'WithErrors',
      label: 'With Errors',
      filters: [
        ['failed_emails', '>', 0]
      ],
      columns: ['name', 'email_address', 'failed_emails', 'last_error_date', 'last_error_message'],
      sort: [['last_error_date', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Configuration Information',
        columns: 2,
        fields: ['name', 'description', 'is_active']
      },
      {
        label: 'Email Settings',
        columns: 2,
        fields: ['email_address', 'mailbox_type', 'mail_server', 'mail_port', 'use_s_s_l', 'username']
      },
      {
        label: 'Default Case Settings',
        columns: 2,
        fields: ['default_queue_id', 'default_owner_id', 'default_priority', 'default_case_type']
      },
      {
        label: 'Case Creation Rules',
        columns: 2,
        fields: ['create_case_per_email', 'thread_by_subject', 'thread_window_hours']
      },
      {
        label: 'Contact Matching',
        columns: 2,
        fields: ['auto_match_contact', 'create_contact_if_not_found', 'default_account_id']
      },
      {
        label: 'Processing Rules',
        columns: 2,
        fields: ['process_unread_only', 'mark_as_read', 'move_to_folder', 'polling_interval']
      },
      {
        label: 'Attachments',
        columns: 2,
        fields: ['save_attachments', 'max_attachment_size', 'allowed_file_types']
      },
      {
        label: 'AI Processing',
        columns: 2,
        fields: ['use_a_i_for_categorization', 'use_a_i_for_priority', 'use_a_i_sentiment_analysis']
      },
      {
        label: 'Filtering',
        columns: 2,
        fields: ['subject_filters', 'sender_filters', 'exclude_auto_replies']
      },
      {
        label: 'Auto Response',
        columns: 2,
        fields: ['send_auto_response', 'auto_response_template_id']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['last_polled_date', 'total_emails_processed', 'cases_created', 'failed_emails', 'last_error_date', 'last_error_message']
      }
    ]
  }
};

export default EmailToCase;
