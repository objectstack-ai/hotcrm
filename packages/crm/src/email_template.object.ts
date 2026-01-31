
const EmailTemplate = {
  name: 'email_template',
  label: '邮件模板',
  labelPlural: '邮件模板',
  icon: 'mail',
  description: '营销邮件模板库，支持个性化令牌和动态内容块',
  enable: {
    searchable: true,
    trackHistory: true,
    files: true
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: '模板名称',
      required: true,
      maxLength: 255,
      searchable: true,
      description: '邮件模板的唯一名称'
    },
    template_code: {
      type: 'text',
      label: '模板代码',
      unique: true,
      maxLength: 80,
      description: '用于API调用的唯一模板标识符'
    },
    description: {
      type: 'textarea',
      label: '描述',
      maxLength: 1000,
      description: '模板用途和场景说明'
    },
    
    // Template Type & category
    template_type: {
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
    category: {
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
    subject: {
      type: 'text',
      label: '邮件主题',
      required: true,
      maxLength: 255,
      description: '支持个性化令牌，如 {{FirstName}}'
    },
    preheader_text: {
      type: 'text',
      label: '预览文本',
      maxLength: 150,
      description: '邮件客户端显示的预览文本'
    },
    html_body: {
      type: 'textarea',
      label: 'HTML 内容',
      required: true,
      maxLength: 65535,
      description: '邮件的 HTML 内容，支持令牌和动态内容块'
    },
    plain_text_body: {
      type: 'textarea',
      label: '纯文本内容',
      maxLength: 32000,
      description: '纯文本版本，用于不支持HTML的邮件客户端'
    },
    
    // Personalization & Dynamic Content
    personalization_tokens: {
      type: 'textarea',
      label: '个性化令牌',
      readonly: true,
      maxLength: 2000,
      description: '模板中使用的所有令牌列表（自动提取）'
    },
    dynamic_content_blocks: {
      type: 'number',
      label: '动态内容块数量',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: '基于条件显示的动态内容块数量'
    },
    
    // Design Settings
    design_system: {
      type: 'select',
      label: '设计系统',
      defaultValue: 'Custom',
      options: [
        { label: '自定义 HTML', value: 'Custom' },
        { label: '可视化编辑器', value: 'Visual Builder' },
        { label: '预设模板', value: 'Preset' }
      ]
    },
    design_json: {
      type: 'textarea',
      label: '设计配置 JSON',
      maxLength: 65535,
      description: '可视化编辑器的设计配置（JSON格式）'
    },
    
    // status & Ownership
    status: {
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
    is_active: {
      type: 'checkbox',
      label: '是否启用',
      defaultValue: true,
      description: '只有启用的模板才能用于发送'
    },
    owner_id: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    
    // A/B Testing
    is_a_b_test: {
      type: 'checkbox',
      label: '启用 A/B 测试',
      defaultValue: false
    },
    a_b_test_variant_id: {
      type: 'lookup',
      label: 'A/B 测试变体',
      reference: 'EmailTemplate',
      description: '关联的测试变体模板'
    },
    a_b_test_winner_metric: {
      type: 'select',
      label: 'A/B 测试胜出指标',
      options: [
        { label: '打开率', value: 'OpenRate' },
        { label: '点击率', value: 'ClickRate' },
        { label: '转化率', value: 'ConversionRate' }
      ]
    },
    
    // Usage Statistics
    total_sent: {
      type: 'number',
      label: '总发送次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    total_opened: {
      type: 'number',
      label: '总打开次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    total_clicked: {
      type: 'number',
      label: '总点击次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    average_open_rate: {
      type: 'percent',
      label: '平均打开率',
      readonly: true,
      description: '自动计算：总打开次数 / 总发送次数'
    },
    average_click_rate: {
      type: 'percent',
      label: '平均点击率',
      readonly: true,
      description: '自动计算：总点击次数 / 总打开次数'
    },
    last_used_date: {
      type: 'datetime',
      label: '最后使用时间',
      readonly: true
    },
    
    // Deliverability
    spam_score: {
      type: 'number',
      label: '垃圾邮件评分',
      precision: 1,
      readonly: true,
      description: '0-10分，分数越低越好'
    },
    has_unsubscribe_link: {
      type: 'checkbox',
      label: '包含退订链接',
      defaultValue: false,
      readonly: true,
      description: '自动检测内容中是否包含退订链接'
    },
    
    // AI Enhancement
    a_i_generated_subject_lines: {
      type: 'textarea',
      label: 'AI 生成主题行',
      readonly: true,
      maxLength: 2000,
      description: 'AI 推荐的替代主题行选项'
    },
    a_i_optimization_suggestions: {
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
      foreignKey: 'owner_id',
      label: '负责人'
    },
    {
      name: 'ABTestVariant',
      type: 'belongsTo',
      object: 'EmailTemplate',
      foreignKey: 'a_b_test_variant_id',
      label: 'A/B测试变体'
    }
  ],
  listViews: [
    {
      name: 'AllTemplates',
      label: '所有模板',
      filters: [],
      columns: ['name', 'template_type', 'category', 'status', 'average_open_rate', 'total_sent', 'last_used_date'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActiveTemplates',
      label: '启用的模板',
      filters: [['is_active', '=', true], ['status', '=', 'Published']],
      columns: ['name', 'template_type', 'subject', 'average_open_rate', 'average_click_rate', 'total_sent'],
      sort: [['total_sent', 'desc']]
    },
    {
      name: 'MyTemplates',
      label: '我的模板',
      filters: [['owner_id', '=', '$CurrentUser.Id']],
      columns: ['name', 'template_type', 'status', 'last_used_date', 'total_sent'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'HighPerformance',
      label: '高绩效模板',
      filters: [['average_open_rate', '>', 30], ['total_sent', '>', 100]],
      columns: ['name', 'template_type', 'average_open_rate', 'average_click_rate', 'total_sent'],
      sort: [['average_open_rate', 'desc']]
    },
    {
      name: 'ABTests',
      label: 'A/B 测试',
      filters: [['is_a_b_test', '=', true]],
      columns: ['name', 'a_b_test_variant_id', 'a_b_test_winner_metric', 'average_open_rate', 'total_sent'],
      sort: [['CreatedDate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireUnsubscribeLink',
      errorMessage: '营销邮件必须包含退订链接',
      formula: 'AND(template_type = "Marketing", NOT(has_unsubscribe_link))'
    },
    {
      name: 'PublishedTemplateValidation',
      errorMessage: '发布的模板必须填写主题和HTML内容',
      formula: 'AND(status = "Published", OR(ISBLANK(subject), ISBLANK(html_body)))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '模板信息',
        columns: 2,
        fields: ['name', 'template_code', 'template_type', 'category', 'status', 'is_active', 'owner_id']
      },
      {
        label: '邮件内容',
        columns: 1,
        fields: ['subject', 'preheader_text', 'html_body', 'plain_text_body']
      },
      {
        label: '设计配置',
        columns: 2,
        fields: ['design_system', 'personalization_tokens', 'dynamic_content_blocks']
      },
      {
        label: 'A/B 测试',
        columns: 2,
        fields: ['is_a_b_test', 'a_b_test_variant_id', 'a_b_test_winner_metric']
      },
      {
        label: '使用统计',
        columns: 3,
        fields: ['total_sent', 'total_opened', 'total_clicked', 'average_open_rate', 'average_click_rate', 'last_used_date']
      },
      {
        label: '可传递性',
        columns: 2,
        fields: ['spam_score', 'has_unsubscribe_link']
      },
      {
        label: 'AI 优化助手',
        columns: 1,
        fields: ['a_i_generated_subject_lines', 'a_i_optimization_suggestions']
      },
      {
        label: '描述',
        columns: 1,
        fields: ['description']
      }
    ]
  }
};

export default EmailTemplate;
