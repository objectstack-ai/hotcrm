
const Unsubscribe = {
  name: 'unsubscribe',
  label: '退订记录',
  labelPlural: '退订记录',
  icon: 'user-x',
  description: '邮件退订和退信管理，支持全局和特定列表退订',
  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
  fields: {
    // Contact Information
    email: {
      type: 'email',
      label: '邮箱地址',
      required: true,
      searchable: true,
      description: '退订的邮箱地址'
    },
    lead_id: {
      type: 'lookup',
      label: '线索',
      reference: 'lead',
      description: '关联的线索记录'
    },
    contact_id: {
      type: 'lookup',
      label: '联系人',
      reference: 'contact',
      description: '关联的联系人记录'
    },
    
    // Unsubscribe Type
    unsubscribe_type: {
      type: 'select',
      label: '退订类型',
      required: true,
      defaultValue: 'Global',
      options: [
        { label: '🌐 全局退订', value: 'Global' },
        { label: '📋 列表退订', value: 'List' },
        { label: '📧 活动退订', value: 'Campaign' },
        { label: '📑 主题退订', value: 'Topic' }
      ],
      description: '全局=退订所有营销邮件，列表/活动/主题=部分退订'
    },
    unsubscribe_scope: {
      type: 'text',
      label: '退订范围',
      maxLength: 255,
      description: '具体的列表、活动或主题标识'
    },
    
    // Reason & Source
    unsubscribe_reason: {
      type: 'select',
      label: '退订原因',
      options: [
        { label: '📬 邮件太频繁', value: 'Too Frequent' },
        { label: '❌ 内容不相关', value: 'Not Relevant' },
        { label: '🚫 从未订阅', value: 'Never Subscribed' },
        { label: '📧 邮箱地址错误', value: 'Wrong email' },
        { label: '🔒 隐私顾虑', value: 'Privacy Concerns' },
        { label: '❓ 其他原因', value: 'Other' }
      ]
    },
    reason_text: {
      type: 'textarea',
      label: '详细原因',
      maxLength: 2000,
      description: '用户填写的退订原因说明'
    },
    unsubscribe_source: {
      type: 'select',
      label: '退订来源',
      required: true,
      defaultValue: 'email Link',
      options: [
        { label: '📧 邮件退订链接', value: 'email Link' },
        { label: '🌐 退订中心', value: 'Preference Center' },
        { label: '📞 客户请求', value: 'Customer Request' },
        { label: '🔧 管理员操作', value: 'Admin Action' },
        { label: '📥 退信', value: 'Bounce' },
        { label: '🤖 自动化规则', value: 'Automation' }
      ]
    },
    
    // Campaign/email Context
    campaign_id: {
      type: 'lookup',
      label: '触发活动',
      reference: 'campaign',
      description: '导致退订的营销活动'
    },
    email_template_id: {
      type: 'lookup',
      label: '触发邮件模板',
      reference: 'EmailTemplate',
      description: '导致退订的邮件模板'
    },
    marketing_list_id: {
      type: 'lookup',
      label: '营销列表',
      reference: 'MarketingList',
      description: '退订的营销列表'
    },
    
    // Bounce Information
    is_bounce: {
      type: 'checkbox',
      label: '是退信',
      defaultValue: false,
      description: '此记录是由于邮件退信创建的'
    },
    bounce_type: {
      type: 'select',
      label: '退信类型',
      options: [
        { label: '🔴 硬退信', value: 'Hard Bounce' },
        { label: '🟡 软退信', value: 'Soft Bounce' },
        { label: '📧 邮箱不存在', value: 'Mailbox Not Found' },
        { label: '📦 邮箱已满', value: 'Mailbox Full' },
        { label: '🚫 被拒绝', value: 'Rejected' },
        { label: '⏱️ 超时', value: 'Timeout' }
      ],
      description: '硬退信=永久失败，软退信=临时问题'
    },
    bounce_reason: {
      type: 'textarea',
      label: '退信原因',
      maxLength: 2000,
      description: '邮件服务器返回的退信详情'
    },
    bounce_date: {
      type: 'datetime',
      label: '退信时间',
      readonly: true
    },
    bounce_count: {
      type: 'number',
      label: '退信次数',
      precision: 0,
      defaultValue: 0,
      description: '累计退信次数'
    },
    
    // Re-subscription
    is_resubscribed: {
      type: 'checkbox',
      label: '已重新订阅',
      defaultValue: false,
      readonly: true,
      description: '用户是否重新订阅'
    },
    resubscribe_date: {
      type: 'datetime',
      label: '重新订阅时间',
      readonly: true
    },
    resubscribe_source: {
      type: 'text',
      label: '重新订阅来源',
      maxLength: 255,
      readonly: true
    },
    
    // status
    status: {
      type: 'select',
      label: '状态',
      required: true,
      defaultValue: 'Active',
      options: [
        { label: '✅ 生效中', value: 'Active' },
        { label: '🔄 已重新订阅', value: 'Resubscribed' },
        { label: '⏸️ 已过期', value: 'Expired' },
        { label: '❌ 已取消', value: 'Cancelled' }
      ]
    },
    
    // IP & User Agent
    ip_address: {
      type: 'text',
      label: 'IP 地址',
      maxLength: 45,
      readonly: true,
      description: '退订时的IP地址'
    },
    user_agent: {
      type: 'text',
      label: 'User Agent',
      maxLength: 500,
      readonly: true,
      description: '退订时的浏览器信息'
    },
    
    // Compliance & Legal
    unsubscribe_date: {
      type: 'datetime',
      label: '退订时间',
      required: true,
      defaultValue: 'NOW()',
      description: '退订的日期时间'
    },
    is_gdpr_request: {
      type: 'checkbox',
      label: 'GDPR 请求',
      defaultValue: false,
      description: '是否为GDPR数据删除请求'
    },
    processed_date: {
      type: 'datetime',
      label: '处理时间',
      readonly: true,
      description: '退订请求的处理时间'
    },
    processed_by: {
      type: 'lookup',
      label: '处理人',
      reference: 'users',
      readonly: true
    },
    
    // Analytics
    subscription_duration_days: {
      type: 'number',
      label: '订阅持续天数',
      precision: 0,
      readonly: true,
      description: '从订阅到退订的天数'
    },
    emails_received_before_unsubscribe: {
      type: 'number',
      label: '退订前收到邮件数',
      precision: 0,
      readonly: true,
      description: '退订前总共收到的营销邮件数'
    },
    last_email_opened_date: {
      type: 'datetime',
      label: '最后打开邮件时间',
      readonly: true
    },
    
    // notes
    notes: {
      type: 'textarea',
      label: '备注',
      maxLength: 2000,
      description: '内部备注和处理说明'
    },
    
    // Preferences (for partial unsubscribe)
    allow_transactional_emails: {
      type: 'checkbox',
      label: '允许交易邮件',
      defaultValue: true,
      description: '退订营销邮件但仍允许接收订单确认等交易邮件'
    },
    allow_system_notifications: {
      type: 'checkbox',
      label: '允许系统通知',
      defaultValue: true,
      description: '允许接收系统重要通知（密码重置等）'
    }
  },
  relationships: [
    {
      name: 'Lead',
      type: 'belongsTo',
      object: 'Lead',
      foreignKey: 'lead_id',
      label: '线索'
    },
    {
      name: 'Contact',
      type: 'belongsTo',
      object: 'Contact',
      foreignKey: 'contact_id',
      label: '联系人'
    },
    {
      name: 'Campaign',
      type: 'belongsTo',
      object: 'Campaign',
      foreignKey: 'campaign_id',
      label: '营销活动'
    },
    {
      name: 'EmailTemplate',
      type: 'belongsTo',
      object: 'EmailTemplate',
      foreignKey: 'email_template_id',
      label: '邮件模板'
    },
    {
      name: 'MarketingList',
      type: 'belongsTo',
      object: 'MarketingList',
      foreignKey: 'marketing_list_id',
      label: '营销列表'
    },
    {
      name: 'processed_by',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'processed_by',
      label: '处理人'
    }
  ],
  listViews: [
    {
      name: 'AllUnsubscribes',
      label: '所有退订',
      filters: [],
      columns: ['email', 'unsubscribe_type', 'unsubscribe_reason', 'status', 'unsubscribe_date', 'campaign_id'],
      sort: [['unsubscribe_date', 'desc']]
    },
    {
      name: 'GlobalUnsubscribes',
      label: '全局退订',
      filters: [['unsubscribe_type', '=', 'Global'], ['status', '=', 'Active']],
      columns: ['email', 'unsubscribe_reason', 'unsubscribe_source', 'unsubscribe_date', 'processed_date'],
      sort: [['unsubscribe_date', 'desc']]
    },
    {
      name: 'RecentUnsubscribes',
      label: '最近退订',
      filters: [['unsubscribe_date', '>=', 'LAST_N_DAYS:7']],
      columns: ['email', 'unsubscribe_type', 'unsubscribe_reason', 'campaign_id', 'unsubscribe_date'],
      sort: [['unsubscribe_date', 'desc']]
    },
    {
      name: 'Bounces',
      label: '退信记录',
      filters: [['is_bounce', '=', true]],
      columns: ['email', 'bounce_type', 'bounce_count', 'bounce_date', 'bounce_reason'],
      sort: [['bounce_date', 'desc']]
    },
    {
      name: 'HardBounces',
      label: '硬退信',
      filters: [['bounce_type', '=', 'Hard Bounce']],
      columns: ['email', 'bounce_count', 'bounce_date', 'bounce_reason', 'campaign_id'],
      sort: [['bounce_date', 'desc']]
    },
    {
      name: 'Resubscribed',
      label: '已重新订阅',
      filters: [['is_resubscribed', '=', true]],
      columns: ['email', 'unsubscribe_date', 'resubscribe_date', 'subscription_duration_days'],
      sort: [['resubscribe_date', 'desc']]
    },
    {
      name: 'GdprRequests',
      label: 'GDPR 请求',
      filters: [['is_gdpr_request', '=', true]],
      columns: ['email', 'unsubscribe_date', 'processed_date', 'processed_by', 'status'],
      sort: [['unsubscribe_date', 'desc']]
    },
    {
      name: 'NeedProcessing',
      label: '待处理',
      filters: [['status', '=', 'Active'], ['processed_date', '=', null]],
      columns: ['email', 'unsubscribe_type', 'unsubscribe_date', 'is_gdpr_request'],
      sort: [['unsubscribe_date', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireLeadOrContact',
      errorMessage: '退订记录必须关联线索或联系人',
      formula: 'AND(ISBLANK(lead_id), ISBLANK(contact_id))'
    },
    {
      name: 'BounceRequiresBounceType',
      errorMessage: '退信记录必须填写退信类型',
      formula: 'AND(is_bounce = TRUE, ISBLANK(bounce_type))'
    },
    {
      name: 'ListUnsubscribeRequiresList',
      errorMessage: '列表退订必须指定营销列表',
      formula: 'AND(unsubscribe_type = "List", ISBLANK(marketing_list_id))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '退订信息',
        columns: 2,
        fields: ['email', 'lead_id', 'contact_id', 'unsubscribe_type', 'unsubscribe_scope', 'status']
      },
      {
        label: '退订原因',
        columns: 2,
        fields: ['unsubscribe_reason', 'reason_text', 'unsubscribe_source', 'unsubscribe_date']
      },
      {
        label: '触发活动',
        columns: 3,
        fields: ['campaign_id', 'email_template_id', 'marketing_list_id']
      },
      {
        label: '退信信息',
        columns: 2,
        fields: ['is_bounce', 'bounce_type', 'bounce_reason', 'bounce_date', 'bounce_count']
      },
      {
        label: '重新订阅',
        columns: 3,
        fields: ['is_resubscribed', 'resubscribe_date', 'resubscribe_source']
      },
      {
        label: '技术信息',
        columns: 2,
        fields: ['ip_address', 'user_agent']
      },
      {
        label: '合规处理',
        columns: 3,
        fields: ['is_gdpr_request', 'processed_date', 'processed_by']
      },
      {
        label: '分析数据',
        columns: 3,
        fields: ['subscription_duration_days', 'emails_received_before_unsubscribe', 'last_email_opened_date']
      },
      {
        label: '邮件偏好',
        columns: 2,
        fields: ['allow_transactional_emails', 'allow_system_notifications']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default Unsubscribe;
