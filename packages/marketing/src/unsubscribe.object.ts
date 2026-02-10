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
      defaultValue: 'global',
      options: [
        {
          "label": "🌐 Global Unsubscribe",
          "value": "global"
        },
        {
          "label": "📋 List Unsubscribe",
          "value": "list"
        },
        {
          "label": "📧 Campaign Unsubscribe",
          "value": "campaign"
        },
        {
          "label": "📑 Topic Unsubscribe",
          "value": "topic"
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
          "value": "too_frequent"
        },
        {
          "label": "❌ Not Relevant",
          "value": "not_relevant"
        },
        {
          "label": "🚫 Never Subscribed",
          "value": "never_subscribed"
        },
        {
          "label": "📧 Wrong Email",
          "value": "wrong_email"
        },
        {
          "label": "🔒 Privacy Concerns",
          "value": "privacy_concerns"
        },
        {
          "label": "❓ Other",
          "value": "other"
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
      defaultValue: 'email_link',
      options: [
        {
          "label": "📧 Email Unsubscribe Link",
          "value": "email_link"
        },
        {
          "label": "🌐 Preference Center",
          "value": "preference_center"
        },
        {
          "label": "📞 Customer Request",
          "value": "customer_request"
        },
        {
          "label": "🔧 Admin Action",
          "value": "admin_action"
        },
        {
          "label": "📥 Bounce",
          "value": "bounce"
        },
        {
          "label": "🤖 Automation",
          "value": "automation"
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
          "value": "hard_bounce"
        },
        {
          "label": "🟡 Soft Bounce",
          "value": "soft_bounce"
        },
        {
          "label": "📧 Mailbox Not Found",
          "value": "mailbox_not_found"
        },
        {
          "label": "📦 Mailbox Full",
          "value": "mailbox_full"
        },
        {
          "label": "🚫 Rejected",
          "value": "rejected"
        },
        {
          "label": "⏱️ Timeout",
          "value": "timeout"
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
      defaultValue: 'active',
      options: [
        {
          "label": "✅ Active",
          "value": "active"
        },
        {
          "label": "🔄 Resubscribed",
          "value": "resubscribed"
        },
        {
          "label": "⏸️ Expired",
          "value": "expired"
        },
        {
          "label": "❌ Cancelled",
          "value": "cancelled"
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