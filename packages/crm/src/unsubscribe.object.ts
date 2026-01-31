import type { ObjectSchema } from '@objectstack/spec/data';

const Unsubscribe: ObjectSchema = {
  name: 'unsubscribe',
  label: '退订记录',
  labelPlural: '退订记录',
  icon: 'user-x',
  description: '邮件退订和退信管理，支持全局和特定列表退订',
  enable: {
    searchEnabled: true,
    trackHistory: true,
    filesEnabled: false
  },
  fields: {
    // Contact Information
    Email: {
      type: 'email',
      label: '邮箱地址',
      required: true,
      searchEnabled: true,
      description: '退订的邮箱地址'
    },
    LeadId: {
      type: 'lookup',
      label: '线索',
      reference: 'Lead',
      description: '关联的线索记录'
    },
    ContactId: {
      type: 'lookup',
      label: '联系人',
      reference: 'Contact',
      description: '关联的联系人记录'
    },
    
    // Unsubscribe Type
    UnsubscribeType: {
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
    UnsubscribeScope: {
      type: 'text',
      label: '退订范围',
      maxLength: 255,
      description: '具体的列表、活动或主题标识'
    },
    
    // Reason & Source
    UnsubscribeReason: {
      type: 'select',
      label: '退订原因',
      options: [
        { label: '📬 邮件太频繁', value: 'Too Frequent' },
        { label: '❌ 内容不相关', value: 'Not Relevant' },
        { label: '🚫 从未订阅', value: 'Never Subscribed' },
        { label: '📧 邮箱地址错误', value: 'Wrong Email' },
        { label: '🔒 隐私顾虑', value: 'Privacy Concerns' },
        { label: '❓ 其他原因', value: 'Other' }
      ]
    },
    ReasonText: {
      type: 'textarea',
      label: '详细原因',
      maxLength: 2000,
      description: '用户填写的退订原因说明'
    },
    UnsubscribeSource: {
      type: 'select',
      label: '退订来源',
      required: true,
      defaultValue: 'Email Link',
      options: [
        { label: '📧 邮件退订链接', value: 'Email Link' },
        { label: '🌐 退订中心', value: 'Preference Center' },
        { label: '📞 客户请求', value: 'Customer Request' },
        { label: '🔧 管理员操作', value: 'Admin Action' },
        { label: '📥 退信', value: 'Bounce' },
        { label: '🤖 自动化规则', value: 'Automation' }
      ]
    },
    
    // Campaign/Email Context
    CampaignId: {
      type: 'lookup',
      label: '触发活动',
      reference: 'Campaign',
      description: '导致退订的营销活动'
    },
    EmailTemplateId: {
      type: 'lookup',
      label: '触发邮件模板',
      reference: 'EmailTemplate',
      description: '导致退订的邮件模板'
    },
    MarketingListId: {
      type: 'lookup',
      label: '营销列表',
      reference: 'MarketingList',
      description: '退订的营销列表'
    },
    
    // Bounce Information
    IsBounce: {
      type: 'checkbox',
      label: '是退信',
      defaultValue: false,
      description: '此记录是由于邮件退信创建的'
    },
    BounceType: {
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
    BounceReason: {
      type: 'textarea',
      label: '退信原因',
      maxLength: 2000,
      description: '邮件服务器返回的退信详情'
    },
    BounceDate: {
      type: 'datetime',
      label: '退信时间',
      readonly: true
    },
    BounceCount: {
      type: 'number',
      label: '退信次数',
      precision: 0,
      defaultValue: 0,
      description: '累计退信次数'
    },
    
    // Re-subscription
    IsResubscribed: {
      type: 'checkbox',
      label: '已重新订阅',
      defaultValue: false,
      readonly: true,
      description: '用户是否重新订阅'
    },
    ResubscribeDate: {
      type: 'datetime',
      label: '重新订阅时间',
      readonly: true
    },
    ResubscribeSource: {
      type: 'text',
      label: '重新订阅来源',
      maxLength: 255,
      readonly: true
    },
    
    // Status
    Status: {
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
    IpAddress: {
      type: 'text',
      label: 'IP 地址',
      maxLength: 45,
      readonly: true,
      description: '退订时的IP地址'
    },
    UserAgent: {
      type: 'text',
      label: 'User Agent',
      maxLength: 500,
      readonly: true,
      description: '退订时的浏览器信息'
    },
    
    // Compliance & Legal
    UnsubscribeDate: {
      type: 'datetime',
      label: '退订时间',
      required: true,
      defaultValue: 'NOW()',
      description: '退订的日期时间'
    },
    IsGdprRequest: {
      type: 'checkbox',
      label: 'GDPR 请求',
      defaultValue: false,
      description: '是否为GDPR数据删除请求'
    },
    ProcessedDate: {
      type: 'datetime',
      label: '处理时间',
      readonly: true,
      description: '退订请求的处理时间'
    },
    ProcessedBy: {
      type: 'lookup',
      label: '处理人',
      reference: 'User',
      readonly: true
    },
    
    // Analytics
    SubscriptionDurationDays: {
      type: 'number',
      label: '订阅持续天数',
      precision: 0,
      readonly: true,
      description: '从订阅到退订的天数'
    },
    EmailsReceivedBeforeUnsubscribe: {
      type: 'number',
      label: '退订前收到邮件数',
      precision: 0,
      readonly: true,
      description: '退订前总共收到的营销邮件数'
    },
    LastEmailOpenedDate: {
      type: 'datetime',
      label: '最后打开邮件时间',
      readonly: true
    },
    
    // Notes
    Notes: {
      type: 'textarea',
      label: '备注',
      maxLength: 2000,
      description: '内部备注和处理说明'
    },
    
    // Preferences (for partial unsubscribe)
    AllowTransactionalEmails: {
      type: 'checkbox',
      label: '允许交易邮件',
      defaultValue: true,
      description: '退订营销邮件但仍允许接收订单确认等交易邮件'
    },
    AllowSystemNotifications: {
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
      foreignKey: 'LeadId',
      label: '线索'
    },
    {
      name: 'Contact',
      type: 'belongsTo',
      object: 'Contact',
      foreignKey: 'ContactId',
      label: '联系人'
    },
    {
      name: 'Campaign',
      type: 'belongsTo',
      object: 'Campaign',
      foreignKey: 'CampaignId',
      label: '营销活动'
    },
    {
      name: 'EmailTemplate',
      type: 'belongsTo',
      object: 'EmailTemplate',
      foreignKey: 'EmailTemplateId',
      label: '邮件模板'
    },
    {
      name: 'MarketingList',
      type: 'belongsTo',
      object: 'MarketingList',
      foreignKey: 'MarketingListId',
      label: '营销列表'
    },
    {
      name: 'ProcessedBy',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'ProcessedBy',
      label: '处理人'
    }
  ],
  listViews: [
    {
      name: 'AllUnsubscribes',
      label: '所有退订',
      filters: [],
      columns: ['Email', 'UnsubscribeType', 'UnsubscribeReason', 'Status', 'UnsubscribeDate', 'CampaignId'],
      sort: [['UnsubscribeDate', 'desc']]
    },
    {
      name: 'GlobalUnsubscribes',
      label: '全局退订',
      filters: [['UnsubscribeType', '=', 'Global'], ['Status', '=', 'Active']],
      columns: ['Email', 'UnsubscribeReason', 'UnsubscribeSource', 'UnsubscribeDate', 'ProcessedDate'],
      sort: [['UnsubscribeDate', 'desc']]
    },
    {
      name: 'RecentUnsubscribes',
      label: '最近退订',
      filters: [['UnsubscribeDate', '>=', 'LAST_N_DAYS:7']],
      columns: ['Email', 'UnsubscribeType', 'UnsubscribeReason', 'CampaignId', 'UnsubscribeDate'],
      sort: [['UnsubscribeDate', 'desc']]
    },
    {
      name: 'Bounces',
      label: '退信记录',
      filters: [['IsBounce', '=', true]],
      columns: ['Email', 'BounceType', 'BounceCount', 'BounceDate', 'BounceReason'],
      sort: [['BounceDate', 'desc']]
    },
    {
      name: 'HardBounces',
      label: '硬退信',
      filters: [['BounceType', '=', 'Hard Bounce']],
      columns: ['Email', 'BounceCount', 'BounceDate', 'BounceReason', 'CampaignId'],
      sort: [['BounceDate', 'desc']]
    },
    {
      name: 'Resubscribed',
      label: '已重新订阅',
      filters: [['IsResubscribed', '=', true]],
      columns: ['Email', 'UnsubscribeDate', 'ResubscribeDate', 'SubscriptionDurationDays'],
      sort: [['ResubscribeDate', 'desc']]
    },
    {
      name: 'GdprRequests',
      label: 'GDPR 请求',
      filters: [['IsGdprRequest', '=', true]],
      columns: ['Email', 'UnsubscribeDate', 'ProcessedDate', 'ProcessedBy', 'Status'],
      sort: [['UnsubscribeDate', 'desc']]
    },
    {
      name: 'NeedProcessing',
      label: '待处理',
      filters: [['Status', '=', 'Active'], ['ProcessedDate', '=', null]],
      columns: ['Email', 'UnsubscribeType', 'UnsubscribeDate', 'IsGdprRequest'],
      sort: [['UnsubscribeDate', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireLeadOrContact',
      errorMessage: '退订记录必须关联线索或联系人',
      formula: 'AND(ISBLANK(LeadId), ISBLANK(ContactId))'
    },
    {
      name: 'BounceRequiresBounceType',
      errorMessage: '退信记录必须填写退信类型',
      formula: 'AND(IsBounce = TRUE, ISBLANK(BounceType))'
    },
    {
      name: 'ListUnsubscribeRequiresList',
      errorMessage: '列表退订必须指定营销列表',
      formula: 'AND(UnsubscribeType = "List", ISBLANK(MarketingListId))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '退订信息',
        columns: 2,
        fields: ['Email', 'LeadId', 'ContactId', 'UnsubscribeType', 'UnsubscribeScope', 'Status']
      },
      {
        label: '退订原因',
        columns: 2,
        fields: ['UnsubscribeReason', 'ReasonText', 'UnsubscribeSource', 'UnsubscribeDate']
      },
      {
        label: '触发活动',
        columns: 3,
        fields: ['CampaignId', 'EmailTemplateId', 'MarketingListId']
      },
      {
        label: '退信信息',
        columns: 2,
        fields: ['IsBounce', 'BounceType', 'BounceReason', 'BounceDate', 'BounceCount']
      },
      {
        label: '重新订阅',
        columns: 3,
        fields: ['IsResubscribed', 'ResubscribeDate', 'ResubscribeSource']
      },
      {
        label: '技术信息',
        columns: 2,
        fields: ['IpAddress', 'UserAgent']
      },
      {
        label: '合规处理',
        columns: 3,
        fields: ['IsGdprRequest', 'ProcessedDate', 'ProcessedBy']
      },
      {
        label: '分析数据',
        columns: 3,
        fields: ['SubscriptionDurationDays', 'EmailsReceivedBeforeUnsubscribe', 'LastEmailOpenedDate']
      },
      {
        label: '邮件偏好',
        columns: 2,
        fields: ['AllowTransactionalEmails', 'AllowSystemNotifications']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['Notes']
      }
    ]
  }
};

export default Unsubscribe;
