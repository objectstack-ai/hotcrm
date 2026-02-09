import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Unsubscribe = ObjectSchema.create({
  name: 'unsubscribe',
  label: 'Unsubscribe Record',
  pluralLabel: 'Unsubscribe Records',
  icon: 'user-x',
  description: 'Email unsubscribe and bounce management with global and list-specific opt-out support',

  fields: {
    email: Field.email({
      label: 'Email Address',
      description: 'Unsubscribed email address',
      required: true
    }),
    lead_id: Field.lookup('lead', {
      label: 'Lead',
      description: 'Associated lead record'
    }),
    contact_id: Field.lookup('contact', {
      label: 'Contact',
      description: 'Associated contact record'
    }),
    unsubscribe_type: Field.select({
      label: 'Unsubscribe Type',
      description: 'Global = unsubscribe from all marketing emails, List/Campaign/Topic = partial unsubscribe',
      required: true,
      defaultValue: 'Global',
      options: [
        {
          "label": "🌐 Global Unsubscribe",
          "value": "Global"
        },
        {
          "label": "📋 List Unsubscribe",
          "value": "List"
        },
        {
          "label": "📧 Campaign Unsubscribe",
          "value": "Campaign"
        },
        {
          "label": "📑 Topic Unsubscribe",
          "value": "Topic"
        }
      ]
    }),
    unsubscribe_scope: Field.text({
      label: 'Unsubscribe Scope',
      description: 'Specific list, campaign, or topic identifier',
      maxLength: 255
    }),
    unsubscribe_reason: Field.select({
      label: 'Unsubscribe Reason',
      options: [
        {
          "label": "📬 Too Frequent",
          "value": "Too Frequent"
        },
        {
          "label": "❌ Not Relevant",
          "value": "Not Relevant"
        },
        {
          "label": "🚫 Never Subscribed",
          "value": "Never Subscribed"
        },
        {
          "label": "📧 Wrong Email",
          "value": "Wrong email"
        },
        {
          "label": "🔒 Privacy Concerns",
          "value": "Privacy Concerns"
        },
        {
          "label": "❓ Other",
          "value": "Other"
        }
      ]
    }),
    reason_text: Field.textarea({
      label: 'Reason Details',
      description: 'Unsubscribe reason details provided by the user',
      maxLength: 2000
    }),
    unsubscribe_source: Field.select({
      label: 'Unsubscribe Source',
      required: true,
      defaultValue: 'email Link',
      options: [
        {
          "label": "📧 Email Unsubscribe Link",
          "value": "email Link"
        },
        {
          "label": "🌐 Preference Center",
          "value": "Preference Center"
        },
        {
          "label": "📞 Customer Request",
          "value": "Customer Request"
        },
        {
          "label": "🔧 Admin Action",
          "value": "Admin Action"
        },
        {
          "label": "📥 Bounce",
          "value": "Bounce"
        },
        {
          "label": "🤖 Automation",
          "value": "Automation"
        }
      ]
    }),
    campaign_id: Field.lookup('campaign', {
      label: 'Triggering Campaign',
      description: 'Campaign that triggered the unsubscribe'
    }),
    email_template_id: Field.lookup('email_template', {
      label: 'Triggering Email Template',
      description: 'Email template that triggered the unsubscribe'
    }),
    marketing_list_id: Field.lookup('marketing_list', {
      label: 'Marketing List',
      description: 'Marketing list unsubscribed from'
    }),
    is_bounce: Field.boolean({
      label: 'Is Bounce',
      description: 'This record was created due to an email bounce',
      defaultValue: false
    }),
    bounce_type: Field.select({
      label: 'Bounce Type',
      description: 'Hard bounce = permanent failure, Soft bounce = temporary issue',
      options: [
        {
          "label": "🔴 Hard Bounce",
          "value": "Hard Bounce"
        },
        {
          "label": "🟡 Soft Bounce",
          "value": "Soft Bounce"
        },
        {
          "label": "📧 Mailbox Not Found",
          "value": "Mailbox Not Found"
        },
        {
          "label": "📦 Mailbox Full",
          "value": "Mailbox Full"
        },
        {
          "label": "🚫 Rejected",
          "value": "Rejected"
        },
        {
          "label": "⏱️ Timeout",
          "value": "Timeout"
        }
      ]
    }),
    bounce_reason: Field.textarea({
      label: 'Bounce Reason',
      description: 'Bounce details returned by the mail server',
      maxLength: 2000
    }),
    bounce_date: Field.datetime({
      label: 'Bounce Date',
      readonly: true
    }),
    bounce_count: Field.number({
      label: 'Bounce Count',
      description: 'Cumulative bounce count',
      defaultValue: 0,
      precision: 0
    }),
    is_resubscribed: Field.boolean({
      label: 'Has Resubscribed',
      description: 'Whether the user has resubscribed',
      defaultValue: false,
      readonly: true
    }),
    resubscribe_date: Field.datetime({
      label: 'Resubscribe Date',
      readonly: true
    }),
    resubscribe_source: Field.text({
      label: 'Resubscribe Source',
      readonly: true,
      maxLength: 255
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      defaultValue: 'Active',
      options: [
        {
          "label": "✅ Active",
          "value": "Active"
        },
        {
          "label": "🔄 Resubscribed",
          "value": "Resubscribed"
        },
        {
          "label": "⏸️ Expired",
          "value": "Expired"
        },
        {
          "label": "❌ Cancelled",
          "value": "Cancelled"
        }
      ]
    }),
    ip_address: Field.text({
      label: 'IP Address',
      description: 'IP address at the time of unsubscribe',
      readonly: true,
      maxLength: 45
    }),
    user_agent: Field.text({
      label: 'User Agent',
      description: 'Browser information at the time of unsubscribe',
      readonly: true,
      maxLength: 500
    }),
    unsubscribe_date: Field.datetime({
      label: 'Unsubscribe Date',
      description: 'Date and time of the unsubscribe',
      required: true,
      defaultValue: 'NOW()'
    }),
    is_gdpr_request: Field.boolean({
      label: 'GDPR Request',
      description: 'Whether this is a GDPR data deletion request',
      defaultValue: false
    }),
    processed_date: Field.datetime({
      label: 'Processed Date',
      description: 'Processing time of the unsubscribe request',
      readonly: true
    }),
    processed_by: Field.lookup('users', {
      label: 'Processed By',
      readonly: true
    }),
    subscription_duration_days: Field.number({
      label: 'Subscription Duration (Days)',
      description: 'Number of days from subscription to unsubscribe',
      readonly: true,
      precision: 0
    }),
    emails_received_before_unsubscribe: Field.number({
      label: 'Emails Received Before Unsubscribe',
      description: 'Total number of marketing emails received before unsubscribe',
      readonly: true,
      precision: 0
    }),
    last_email_opened_date: Field.datetime({
      label: 'Last Email Opened Date',
      readonly: true
    }),
    notes: Field.textarea({
      label: 'Notes',
      description: 'Internal notes and processing details',
      maxLength: 2000
    }),
    allow_transactional_emails: Field.boolean({
      label: 'Allow Transactional Emails',
      description: 'Unsubscribed from marketing emails but still allows transactional emails such as order confirmations',
      defaultValue: true
    }),
    allow_system_notifications: Field.boolean({
      label: 'Allow System Notifications',
      description: 'Allow receiving important system notifications (password reset, etc.)',
      defaultValue: true
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
});