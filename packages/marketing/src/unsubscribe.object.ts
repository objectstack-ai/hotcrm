import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Unsubscribe = ObjectSchema.create({
  name: 'unsubscribe',
  label: '退订记录',
  pluralLabel: '退订记录',
  icon: 'user-x',
  description: '邮件退订和退信管理，支持全局和特定列表退订',

  fields: {
    email: Field.email({
      label: '邮箱地址',
      description: '退订的邮箱地址',
      required: true
    }),
    lead_id: Field.lookup('lead', {
      label: '线索',
      description: '关联的线索记录'
    }),
    contact_id: Field.lookup('contact', {
      label: '联系人',
      description: '关联的联系人记录'
    }),
    unsubscribe_type: Field.select({
      label: '退订类型',
      description: '全局=退订所有营销邮件，列表/活动/主题=部分退订',
      required: true,
      defaultValue: 'Global',
      options: [
        {
          "label": "🌐 全局退订",
          "value": "Global"
        },
        {
          "label": "📋 列表退订",
          "value": "List"
        },
        {
          "label": "📧 活动退订",
          "value": "Campaign"
        },
        {
          "label": "📑 主题退订",
          "value": "Topic"
        }
      ]
    }),
    unsubscribe_scope: Field.text({
      label: '退订范围',
      description: '具体的列表、活动或主题标识',
      maxLength: 255
    }),
    unsubscribe_reason: Field.select({
      label: '退订原因',
      options: [
        {
          "label": "📬 邮件太频繁",
          "value": "Too Frequent"
        },
        {
          "label": "❌ 内容不相关",
          "value": "Not Relevant"
        },
        {
          "label": "🚫 从未订阅",
          "value": "Never Subscribed"
        },
        {
          "label": "📧 邮箱地址错误",
          "value": "Wrong email"
        },
        {
          "label": "🔒 隐私顾虑",
          "value": "Privacy Concerns"
        },
        {
          "label": "❓ 其他原因",
          "value": "Other"
        }
      ]
    }),
    reason_text: Field.textarea({
      label: '详细原因',
      description: '用户填写的退订原因说明',
      maxLength: 2000
    }),
    unsubscribe_source: Field.select({
      label: '退订来源',
      required: true,
      defaultValue: 'email Link',
      options: [
        {
          "label": "📧 邮件退订链接",
          "value": "email Link"
        },
        {
          "label": "🌐 退订中心",
          "value": "Preference Center"
        },
        {
          "label": "📞 客户请求",
          "value": "Customer Request"
        },
        {
          "label": "🔧 管理员操作",
          "value": "Admin Action"
        },
        {
          "label": "📥 退信",
          "value": "Bounce"
        },
        {
          "label": "🤖 自动化规则",
          "value": "Automation"
        }
      ]
    }),
    campaign_id: Field.lookup('campaign', {
      label: '触发活动',
      description: '导致退订的营销活动'
    }),
    email_template_id: Field.lookup('email_template', {
      label: '触发邮件模板',
      description: '导致退订的邮件模板'
    }),
    marketing_list_id: Field.lookup('marketing_list', {
      label: '营销列表',
      description: '退订的营销列表'
    }),
    is_bounce: Field.boolean({
      label: '是退信',
      description: '此记录是由于邮件退信创建的',
      defaultValue: false
    }),
    bounce_type: Field.select({
      label: '退信类型',
      description: '硬退信=永久失败，软退信=临时问题',
      options: [
        {
          "label": "🔴 硬退信",
          "value": "Hard Bounce"
        },
        {
          "label": "🟡 软退信",
          "value": "Soft Bounce"
        },
        {
          "label": "📧 邮箱不存在",
          "value": "Mailbox Not Found"
        },
        {
          "label": "📦 邮箱已满",
          "value": "Mailbox Full"
        },
        {
          "label": "🚫 被拒绝",
          "value": "Rejected"
        },
        {
          "label": "⏱️ 超时",
          "value": "Timeout"
        }
      ]
    }),
    bounce_reason: Field.textarea({
      label: '退信原因',
      description: '邮件服务器返回的退信详情',
      maxLength: 2000
    }),
    bounce_date: Field.datetime({
      label: '退信时间',
      readonly: true
    }),
    bounce_count: Field.number({
      label: '退信次数',
      description: '累计退信次数',
      defaultValue: 0,
      precision: 0
    }),
    is_resubscribed: Field.boolean({
      label: '已重新订阅',
      description: '用户是否重新订阅',
      defaultValue: false,
      readonly: true
    }),
    resubscribe_date: Field.datetime({
      label: '重新订阅时间',
      readonly: true
    }),
    resubscribe_source: Field.text({
      label: '重新订阅来源',
      readonly: true,
      maxLength: 255
    }),
    status: Field.select({
      label: '状态',
      required: true,
      defaultValue: 'Active',
      options: [
        {
          "label": "✅ 生效中",
          "value": "Active"
        },
        {
          "label": "🔄 已重新订阅",
          "value": "Resubscribed"
        },
        {
          "label": "⏸️ 已过期",
          "value": "Expired"
        },
        {
          "label": "❌ 已取消",
          "value": "Cancelled"
        }
      ]
    }),
    ip_address: Field.text({
      label: 'IP 地址',
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
      label: '退订时间',
      description: '退订的日期时间',
      required: true,
      defaultValue: 'NOW()'
    }),
    is_gdpr_request: Field.boolean({
      label: 'GDPR 请求',
      description: '是否为GDPR数据删除请求',
      defaultValue: false
    }),
    processed_date: Field.datetime({
      label: '处理时间',
      description: '退订请求的处理时间',
      readonly: true
    }),
    processed_by: Field.lookup('users', {
      label: '处理人',
      readonly: true
    }),
    subscription_duration_days: Field.number({
      label: '订阅持续天数',
      description: '从订阅到退订的天数',
      readonly: true,
      precision: 0
    }),
    emails_received_before_unsubscribe: Field.number({
      label: '退订前收到邮件数',
      description: '退订前总共收到的营销邮件数',
      readonly: true,
      precision: 0
    }),
    last_email_opened_date: Field.datetime({
      label: '最后打开邮件时间',
      readonly: true
    }),
    notes: Field.textarea({
      label: '备注',
      description: '内部备注和处理说明',
      maxLength: 2000
    }),
    allow_transactional_emails: Field.boolean({
      label: '允许交易邮件',
      description: '退订营销邮件但仍允许接收订单确认等交易邮件',
      defaultValue: true
    }),
    allow_system_notifications: Field.boolean({
      label: '允许系统通知',
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