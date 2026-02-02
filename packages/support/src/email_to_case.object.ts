import { ObjectSchema, Field } from '@objectstack/spec/data';

export const EmailToCase = ObjectSchema.create({
  name: 'email_to_case',
  label: 'Email-to-Case Configuration',
  pluralLabel: 'Email-to-Case Configurations',
  icon: 'envelope',
  description: 'Email-to-case automation configuration for automatic case creation',

  fields: {
    name: Field.text({
      label: 'Configuration name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 2000
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    }),
    email_address: Field.email({
      label: 'Email Address',
      description: 'Support email address to monitor',
      required: true
    }),
    mailbox_type: Field.select({
      label: 'Mailbox Type',
      required: true,
      defaultValue: 'IMAP',
      options: [
        {
          "label": "IMAP",
          "value": "IMAP"
        },
        {
          "label": "POP3",
          "value": "POP3"
        },
        {
          "label": "Microsoft 365",
          "value": "Microsoft365"
        },
        {
          "label": "Gmail",
          "value": "Gmail"
        },
        {
          "label": "Exchange",
          "value": "Exchange"
        }
      ]
    }),
    mail_server: Field.text({
      label: 'Mail Server',
      description: 'IMAP/POP3 server address',
      maxLength: 255
    }),
    mail_port: Field.number({
      label: 'Port',
      defaultValue: 993,
      precision: 0
    }),
    use_ssl: Field.boolean({
      label: 'Use SSL',
      defaultValue: true
    }),
    username: Field.text({
      label: 'username',
      maxLength: 255
    }),
    default_queue_id: Field.lookup('Queue', {
      label: 'Default Queue',
      description: 'Queue for new cases created from emails',
      required: true
    }),
    default_owner_id: Field.lookup('users', {
      label: 'Default Owner',
      description: 'Default case owner (if not using queue)'
    }),
    default_priority: Field.select({
      label: 'Default Priority',
      defaultValue: 'Medium',
      options: [
        {
          "label": "Critical",
          "value": "Critical"
        },
        {
          "label": "High",
          "value": "High"
        },
        {
          "label": "Medium",
          "value": "Medium"
        },
        {
          "label": "Low",
          "value": "Low"
        }
      ]
    }),
    default_case_type: Field.select({
      label: 'Default Case Type',
      options: [
        {
          "label": "Problem",
          "value": "Problem"
        },
        {
          "label": "Question",
          "value": "Question"
        },
        {
          "label": "Incident",
          "value": "Incident"
        },
        {
          "label": "Feature Request",
          "value": "Feature Request"
        },
        {
          "label": "Training",
          "value": "Training"
        },
        {
          "label": "Maintenance",
          "value": "Maintenance"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    create_case_per_email: Field.boolean({
      label: 'Create Case Per Email',
      description: 'Create new case for each email (vs. threading)',
      defaultValue: true
    }),
    thread_by_subject: Field.boolean({
      label: 'Thread by Subject',
      description: 'Add to existing case if subject matches',
      defaultValue: true
    }),
    thread_window_hours: Field.number({
      label: 'Thread Window (Hours)',
      description: 'Time window for threading emails to same case',
      defaultValue: 72,
      min: 1,
      precision: 0
    }),
    auto_match_contact: Field.boolean({
      label: 'Auto Match Contact',
      description: 'Automatically match sender to existing contact',
      defaultValue: true
    }),
    create_contact_if_not_found: Field.boolean({
      label: 'Create Contact If Not Found',
      description: 'Create new contact for unknown senders',
      defaultValue: true
    }),
    default_account_id: Field.lookup('account', {
      label: 'Default Account',
      description: 'Account for cases when contact not found'
    }),
    process_unread_only: Field.boolean({
      label: 'Process Unread Only',
      defaultValue: true
    }),
    mark_as_read: Field.boolean({
      label: 'Mark as Read',
      description: 'Mark email as read after processing',
      defaultValue: true
    }),
    move_to_folder: Field.text({
      label: 'Move to Folder',
      description: 'IMAP folder to move processed emails',
      maxLength: 255
    }),
    save_attachments: Field.boolean({
      label: 'Save Attachments',
      defaultValue: true
    }),
    max_attachment_size: Field.number({
      label: 'Max Attachment Size (MB)',
      defaultValue: 25,
      min: 1,
      max: 100,
      precision: 0
    }),
    allowed_file_types: Field.text({
      label: 'Allowed File Types',
      description: 'Comma-separated extensions (e.g., pdf,doc,docx,jpg,png)',
      maxLength: 500
    }),
    use_ai_for_categorization: Field.boolean({
      label: 'Use AI for Categorization',
      description: 'Use AI to auto-categorize and route cases',
      defaultValue: false
    }),
    use_ai_for_priority: Field.boolean({
      label: 'Use AI for Priority',
      description: 'Use AI to determine case priority',
      defaultValue: false
    }),
    use_ai_sentiment_analysis: Field.boolean({
      label: 'Use AI Sentiment Analysis',
      defaultValue: false
    }),
    subject_filters: Field.textarea({
      label: 'Subject Filters',
      description: 'Keywords to filter emails (one per line)',
      maxLength: 2000
    }),
    sender_filters: Field.textarea({
      label: 'Sender Filters',
      description: 'Email addresses or domains to filter (one per line)',
      maxLength: 2000
    }),
    exclude_auto_replies: Field.boolean({
      label: 'Exclude Auto-Replies',
      defaultValue: true
    }),
    send_auto_response: Field.boolean({
      label: 'Send Auto Response',
      defaultValue: false
    }),
    auto_response_template_id: Field.lookup('EmailTemplate', {
      label: 'Auto Response Template',
      description: 'Email template for auto-response'
    }),
    polling_interval: Field.number({
      label: 'Polling Interval (Minutes)',
      description: 'How often to check for new emails',
      defaultValue: 5,
      min: 1,
      max: 60,
      precision: 0
    }),
    last_polled_date: Field.datetime({
      label: 'Last Polled',
      readonly: true
    }),
    total_emails_processed: Field.number({
      label: 'Emails Processed',
      readonly: true,
      precision: 0
    }),
    cases_created: Field.number({
      label: 'Cases Created',
      readonly: true,
      precision: 0
    }),
    failed_emails: Field.number({
      label: 'Failed Emails',
      readonly: true,
      precision: 0
    }),
    last_error_date: Field.datetime({
      label: 'Last Error',
      readonly: true
    }),
    last_error_message: Field.text({
      label: 'Last Error Message',
      readonly: true,
      maxLength: 500
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});