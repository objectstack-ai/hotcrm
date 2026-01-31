import type { ObjectSchema } from '@objectstack/spec/data';

const EmailTemplate: ObjectSchema = {
  name: 'email_template',
  label: '邮件模板',
  labelPlural: '邮件模板',
  icon: 'mail',
  description: '营销邮件模板库，支持个性化令牌和动态内容块',
  enable: {
    searchEnabled: true,
    trackHistory: true,
    filesEnabled: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: '模板名称',
      required: true,
      maxLength: 255,
      searchEnabled: true,
      description: '邮件模板的唯一名称'
    },
    TemplateCode: {
      type: 'text',
      label: '模板代码',
      unique: true,
      maxLength: 80,
      description: '用于API调用的唯一模板标识符'
    },
    Description: {
      type: 'textarea',
      label: '描述',
      maxLength: 1000,
      description: '模板用途和场景说明'
    },
    
    // Template Type & Category
    TemplateType: {
      type: 'select',
      label: '模板类型',
      required: true,
      defaultValue: 'Marketing',
      options: [
        { label: '📢 营销邮件', value: 'Marketing' },
        { label: '📧 交易邮件', value: 'Transactional' },
        { label: '🔔 通知邮件', value: 'Notification' },
        { label: '👋 欢迎系列', value: 'Welcome' },
        { label: '🛒 购物车提醒', value: 'Cart Abandonment' },
        { label: '🎁 售后跟进', value: 'Post Purchase' },
        { label: '🔄 重新参与', value: 'Re-engagement' }
      ]
    },
    Category: {
      type: 'select',
      label: '分类',
      options: [
        { label: '产品发布', value: 'Product Launch' },
        { label: '活动邀请', value: 'Event Invitation' },
        { label: '新闻资讯', value: 'Newsletter' },
        { label: '促销优惠', value: 'Promotion' },
        { label: '客户关怀', value: 'Customer Care' },
        { label: '教育培训', value: 'Educational' }
      ]
    },
    
    // Template Content
    Subject: {
      type: 'text',
      label: '邮件主题',
      required: true,
      maxLength: 255,
      description: '支持个性化令牌，如 {{FirstName}}'
    },
    PreheaderText: {
      type: 'text',
      label: '预览文本',
      maxLength: 150,
      description: '邮件客户端显示的预览文本'
    },
    HtmlBody: {
      type: 'textarea',
      label: 'HTML 内容',
      required: true,
      maxLength: 65535,
      description: '邮件的 HTML 内容，支持令牌和动态内容块'
    },
    PlainTextBody: {
      type: 'textarea',
      label: '纯文本内容',
      maxLength: 32000,
      description: '纯文本版本，用于不支持HTML的邮件客户端'
    },
    
    // Personalization & Dynamic Content
    PersonalizationTokens: {
      type: 'textarea',
      label: '个性化令牌',
      readonly: true,
      maxLength: 2000,
      description: '模板中使用的所有令牌列表（自动提取）'
    },
    DynamicContentBlocks: {
      type: 'number',
      label: '动态内容块数量',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: '基于条件显示的动态内容块数量'
    },
    
    // Design Settings
    DesignSystem: {
      type: 'select',
      label: '设计系统',
      defaultValue: 'Custom',
      options: [
        { label: '自定义 HTML', value: 'Custom' },
        { label: '可视化编辑器', value: 'Visual Builder' },
        { label: '预设模板', value: 'Preset' }
      ]
    },
    DesignJson: {
      type: 'textarea',
      label: '设计配置 JSON',
      maxLength: 65535,
      description: '可视化编辑器的设计配置（JSON格式）'
    },
    
    // Status & Ownership
    Status: {
      type: 'select',
      label: '状态',
      required: true,
      defaultValue: 'Draft',
      options: [
        { label: '📝 草稿', value: 'Draft' },
        { label: '✅ 已发布', value: 'Published' },
        { label: '📦 已归档', value: 'Archived' }
      ]
    },
    IsActive: {
      type: 'checkbox',
      label: '是否启用',
      defaultValue: true,
      description: '只有启用的模板才能用于发送'
    },
    OwnerId: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    
    // A/B Testing
    IsABTest: {
      type: 'checkbox',
      label: '启用 A/B 测试',
      defaultValue: false
    },
    ABTestVariantId: {
      type: 'lookup',
      label: 'A/B 测试变体',
      reference: 'EmailTemplate',
      description: '关联的测试变体模板'
    },
    ABTestWinnerMetric: {
      type: 'select',
      label: 'A/B 测试胜出指标',
      options: [
        { label: '打开率', value: 'OpenRate' },
        { label: '点击率', value: 'ClickRate' },
        { label: '转化率', value: 'ConversionRate' }
      ]
    },
    
    // Usage Statistics
    TotalSent: {
      type: 'number',
      label: '总发送次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    TotalOpened: {
      type: 'number',
      label: '总打开次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    TotalClicked: {
      type: 'number',
      label: '总点击次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    AverageOpenRate: {
      type: 'percent',
      label: '平均打开率',
      readonly: true,
      description: '自动计算：总打开次数 / 总发送次数'
    },
    AverageClickRate: {
      type: 'percent',
      label: '平均点击率',
      readonly: true,
      description: '自动计算：总点击次数 / 总打开次数'
    },
    LastUsedDate: {
      type: 'datetime',
      label: '最后使用时间',
      readonly: true
    },
    
    // Deliverability
    SpamScore: {
      type: 'number',
      label: '垃圾邮件评分',
      precision: 1,
      readonly: true,
      description: '0-10分，分数越低越好'
    },
    HasUnsubscribeLink: {
      type: 'checkbox',
      label: '包含退订链接',
      defaultValue: false,
      readonly: true,
      description: '自动检测内容中是否包含退订链接'
    },
    
    // AI Enhancement
    AIGeneratedSubjectLines: {
      type: 'textarea',
      label: 'AI 生成主题行',
      readonly: true,
      maxLength: 2000,
      description: 'AI 推荐的替代主题行选项'
    },
    AIOptimizationSuggestions: {
      type: 'textarea',
      label: 'AI 优化建议',
      readonly: true,
      maxLength: 2000,
      description: 'AI 分析的改进建议（内容、设计、发送时间等）'
    }
  },
  relationships: [
    {
      name: 'Owner',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'OwnerId',
      label: '负责人'
    },
    {
      name: 'ABTestVariant',
      type: 'belongsTo',
      object: 'EmailTemplate',
      foreignKey: 'ABTestVariantId',
      label: 'A/B测试变体'
    }
  ],
  listViews: [
    {
      name: 'AllTemplates',
      label: '所有模板',
      filters: [],
      columns: ['Name', 'TemplateType', 'Category', 'Status', 'AverageOpenRate', 'TotalSent', 'LastUsedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActiveTemplates',
      label: '启用的模板',
      filters: [['IsActive', '=', true], ['Status', '=', 'Published']],
      columns: ['Name', 'TemplateType', 'Subject', 'AverageOpenRate', 'AverageClickRate', 'TotalSent'],
      sort: [['TotalSent', 'desc']]
    },
    {
      name: 'MyTemplates',
      label: '我的模板',
      filters: [['OwnerId', '=', '$CurrentUser.Id']],
      columns: ['Name', 'TemplateType', 'Status', 'LastUsedDate', 'TotalSent'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'HighPerformance',
      label: '高绩效模板',
      filters: [['AverageOpenRate', '>', 30], ['TotalSent', '>', 100]],
      columns: ['Name', 'TemplateType', 'AverageOpenRate', 'AverageClickRate', 'TotalSent'],
      sort: [['AverageOpenRate', 'desc']]
    },
    {
      name: 'ABTests',
      label: 'A/B 测试',
      filters: [['IsABTest', '=', true]],
      columns: ['Name', 'ABTestVariantId', 'ABTestWinnerMetric', 'AverageOpenRate', 'TotalSent'],
      sort: [['CreatedDate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireUnsubscribeLink',
      errorMessage: '营销邮件必须包含退订链接',
      formula: 'AND(TemplateType = "Marketing", NOT(HasUnsubscribeLink))'
    },
    {
      name: 'PublishedTemplateValidation',
      errorMessage: '发布的模板必须填写主题和HTML内容',
      formula: 'AND(Status = "Published", OR(ISBLANK(Subject), ISBLANK(HtmlBody)))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '模板信息',
        columns: 2,
        fields: ['Name', 'TemplateCode', 'TemplateType', 'Category', 'Status', 'IsActive', 'OwnerId']
      },
      {
        label: '邮件内容',
        columns: 1,
        fields: ['Subject', 'PreheaderText', 'HtmlBody', 'PlainTextBody']
      },
      {
        label: '设计配置',
        columns: 2,
        fields: ['DesignSystem', 'PersonalizationTokens', 'DynamicContentBlocks']
      },
      {
        label: 'A/B 测试',
        columns: 2,
        fields: ['IsABTest', 'ABTestVariantId', 'ABTestWinnerMetric']
      },
      {
        label: '使用统计',
        columns: 3,
        fields: ['TotalSent', 'TotalOpened', 'TotalClicked', 'AverageOpenRate', 'AverageClickRate', 'LastUsedDate']
      },
      {
        label: '可传递性',
        columns: 2,
        fields: ['SpamScore', 'HasUnsubscribeLink']
      },
      {
        label: 'AI 优化助手',
        columns: 1,
        fields: ['AIGeneratedSubjectLines', 'AIOptimizationSuggestions']
      },
      {
        label: '描述',
        columns: 1,
        fields: ['Description']
      }
    ]
  }
};

export default EmailTemplate;
