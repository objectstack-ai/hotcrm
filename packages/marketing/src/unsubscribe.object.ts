import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Unsubscribe = ObjectSchema.create({
  name: 'unsubscribe',
  label: 'Unsubscribe Record',
  pluralLabel: 'Unsubscribe Records',
  icon: 'user-x',
  description: '邮件退订和退信管理，支持全局和特定列表退订',

  fields: {
    email: Field.email({
      label: 'Email Address',
      description: '退订的邮箱地址',
      required: true
    }),
    lead_id: Field.lookup('lead', {
      label: 'Lead',
      description: '关联的线索记录'
    }),
    contact_id: Field.lookup('contact', {
      label: 'Contact',
      description: '关联的联系人记录'
    }),
    unsubscribe_type: Field.select({
      label: 'Unsubscribe Type',
      description: '全局=退订所有营销邮件，列表/活动/主题=部分退订',
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
      description: '具体的列表、活动或主题标识',
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
      description: '用户填写的退订原因说明',
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
      description: '导致退订的营销活动'
    }),
    email_template_id: Field.lookup('email_template', {
      label: 'Triggering Email Template',
      description: '导致退订的邮件模板'
    }),
    marketing_list_id: Field.lookup('marketing_list', {
      label: 'Marketing List',
      description: '退订的营销列表'
    }),
    is_bounce: Field.boolean({
      label: 'Is Bounce',
      description: '此记录是由于邮件退信创建的',
      defaultValue: false
    }),
    bounce_type: Field.select({
      label: 'Bounce Type',
      description: '硬退信=永久失败，软退信=临时问题',
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
      description: '邮件服务器返回的退信详情',
      maxLength: 2000
    }),
    bounce_date: Field.datetime({
      label: 'Bounce Date',
      readonly: true
    }),
    bounce_count: Field.number({
      label: 'Bounce Count',
      description: '累计退信次数',
      defaultValue: 0,
      precision: 0
    }),
    is_resubscribed: Field.boolean({
      label: 'Has Resubscribed',
      description: '用户是否重新订阅',
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
      description: '退订时的IP地址',
      readonly: true,
      maxLength: 45
    }),
    user_agent: Field.text({
      label: 'User Agent',
      description: '退订时的浏览器信息',
      readonly: true,
      maxLength: 500
    }),
    unsubscribe_date: Field.datetime({
      label: 'Unsubscribe Date',
      description: '退订的日期时间',
      required: true,
      defaultValue: 'NOW()'
    }),
    is_gdpr_request: Field.boolean({
      label: 'GDPR Request',
      description: '是否为GDPR数据删除请求',
      defaultValue: false
    }),
    processed_date: Field.datetime({
      label: 'Processed Date',
      description: '退订请求的处理时间',
      readonly: true
    }),
    processed_by: Field.lookup('users', {
      label: 'Processed By',
      readonly: true
    }),
    subscription_duration_days: Field.number({
      label: 'Subscription Duration (Days)',
      description: '从订阅到退订的天数',
      readonly: true,
      precision: 0
    }),
    emails_received_before_unsubscribe: Field.number({
      label: 'Emails Received Before Unsubscribe',
      description: '退订前总共收到的营销邮件数',
      readonly: true,
      precision: 0
    }),
    last_email_opened_date: Field.datetime({
      label: 'Last Email Opened Date',
      readonly: true
    }),
    notes: Field.textarea({
      label: 'Notes',
      description: '内部备注和处理说明',
      maxLength: 2000
    }),
    allow_transactional_emails: Field.boolean({
      label: 'Allow Transactional Emails',
      description: '退订营销邮件但仍允许接收订单确认等交易邮件',
      defaultValue: true
    }),
    allow_system_notifications: Field.boolean({
      label: 'Allow System Notifications',
      description: '允许接收系统重要通知（密码重置等）',
      defaultValue: true
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
});