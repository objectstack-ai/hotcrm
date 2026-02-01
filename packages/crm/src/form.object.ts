
const Form = {
  name: 'form',
  label: '表单',
  labelPlural: '表单',
  icon: 'file-text',
  description: '营销表单构建器，支持拖放式设计和自动线索创建',
  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: '表单名称',
      required: true,
      maxLength: 255,
      searchable: true
    },
    form_code: {
      type: 'text',
      label: '表单代码',
      unique: true,
      maxLength: 80,
      description: '用于嵌入和API调用的唯一标识符'
    },
    description: {
      type: 'textarea',
      label: '描述',
      maxLength: 1000
    },
    
    // Form Type & Purpose
    form_type: {
      type: 'select',
      label: '表单类型',
      required: true,
      defaultValue: 'Lead Capture',
      options: [
        { label: '📝 线索收集', value: 'Lead Capture' },
        { label: '📅 活动注册', value: 'Event Registration' },
        { label: '🎁 资源下载', value: 'Resource Download' },
        { label: '📞 联系我们', value: 'Contact Us' },
        { label: '💬 反馈调查', value: 'Feedback Survey' },
        { label: '🎯 需求评估', value: 'Needs Assessment' },
        { label: '📺 网络研讨会', value: 'Webinar Registration' }
      ]
    },
    campaign_id: {
      type: 'lookup',
      label: '关联营销活动',
      reference: 'campaign',
      description: '通过此表单收集的线索会关联到此活动'
    },
    
    // Form Configuration
    fields_json: {
      type: 'textarea',
      label: '字段配置 JSON',
      required: true,
      maxLength: 65535,
      description: '表单字段定义（类型、标签、验证规则等）'
    },
    layout_json: {
      type: 'textarea',
      label: '布局配置 JSON',
      maxLength: 32000,
      description: '字段布局和样式配置'
    },
    validation_rules_json: {
      type: 'textarea',
      label: '验证规则 JSON',
      maxLength: 32000,
      description: '自定义字段验证规则'
    },
    
    // Submission Settings
    submit_button_text: {
      type: 'text',
      label: '提交按钮文本',
      defaultValue: '提交',
      maxLength: 50
    },
    submit_success_message: {
      type: 'textarea',
      label: '提交成功消息',
      maxLength: 1000,
      description: '表单提交成功后显示的消息'
    },
    redirect_url: {
      type: 'url',
      label: '提交后重定向URL',
      description: '表单提交成功后跳转的页面（可选）'
    },
    
    // Lead/Contact Creation
    create_lead_on_submit: {
      type: 'checkbox',
      label: '自动创建线索',
      defaultValue: true,
      description: '表单提交时自动创建线索记录'
    },
    lead_source: {
      type: 'text',
      label: '线索来源',
      maxLength: 100,
      description: '自动创建线索时设置的来源字段值'
    },
    auto_assign_leads: {
      type: 'checkbox',
      label: '自动分配线索',
      defaultValue: false,
      description: '根据分配规则自动分配新线索'
    },
    default_owner_id: {
      type: 'lookup',
      label: '默认负责人',
      reference: 'User',
      description: '新线索的默认负责人（如果不自动分配）'
    },
    
    // Notifications
    send_confirmation_email: {
      type: 'checkbox',
      label: '发送确认邮件',
      defaultValue: false,
      description: '向提交者发送确认邮件'
    },
    confirmation_email_template_id: {
      type: 'lookup',
      label: '确认邮件模板',
      reference: 'EmailTemplate',
      description: '使用的确认邮件模板'
    },
    notify_owner_on_submit: {
      type: 'checkbox',
      label: '通知负责人',
      defaultValue: true,
      description: '表单提交时通知线索负责人'
    },
    notification_email_list: {
      type: 'text',
      label: '通知邮箱列表',
      maxLength: 500,
      description: '逗号分隔的邮箱地址，收到表单提交通知'
    },
    
    // status & Publishing
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
      defaultValue: true
    },
    published_date: {
      type: 'datetime',
      label: '发布时间',
      readonly: true
    },
    owner_id: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    
    // Embed & Integration
    embed_code: {
      type: 'textarea',
      label: '嵌入代码',
      readonly: true,
      maxLength: 2000,
      description: '用于嵌入网站的HTML/JavaScript代码'
    },
    allowed_domains: {
      type: 'text',
      label: '允许的域名',
      maxLength: 500,
      description: '可以嵌入此表单的域名列表（逗号分隔）'
    },
    
    // Analytics & Performance
    total_submissions: {
      type: 'number',
      label: '总提交次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    total_views: {
      type: 'number',
      label: '总浏览次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    conversion_rate: {
      type: 'percent',
      label: '转化率',
      readonly: true,
      description: '自动计算：提交次数 / 浏览次数'
    },
    average_completion_time: {
      type: 'number',
      label: '平均完成时间(秒)',
      precision: 0,
      readonly: true,
      description: '用户完成表单的平均时长'
    },
    abandonment_rate: {
      type: 'percent',
      label: '放弃率',
      readonly: true,
      description: '开始填写但未提交的比例'
    },
    last_submission_date: {
      type: 'datetime',
      label: '最后提交时间',
      readonly: true
    },
    
    // Spam Prevention
    enable_captcha: {
      type: 'checkbox',
      label: '启用验证码',
      defaultValue: true,
      description: '防止垃圾提交'
    },
    enable_honeypot: {
      type: 'checkbox',
      label: '启用蜜罐字段',
      defaultValue: true,
      description: '隐藏字段防止机器人提交'
    },
    spam_submissions_blocked: {
      type: 'number',
      label: '拦截的垃圾提交',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    
    // Progressive Profiling
    enable_progressive_profiling: {
      type: 'checkbox',
      label: '启用渐进式表单',
      defaultValue: false,
      description: '对已知联系人隐藏已有信息的字段'
    },
    max_fields_to_show: {
      type: 'number',
      label: '最多显示字段数',
      precision: 0,
      description: '渐进式表单每次最多显示的新字段数'
    },
    
    // Field Analytics
    most_abandoned_field: {
      type: 'text',
      label: '最常放弃字段',
      readonly: true,
      maxLength: 100,
      description: '用户最常在此字段处放弃表单'
    },
    field_completion_rates_json: {
      type: 'textarea',
      label: '字段完成率 JSON',
      readonly: true,
      maxLength: 10000,
      description: '每个字段的完成率统计数据'
    },
    
    // AI Enhancement
    ai_form_optimization: {
      type: 'textarea',
      label: 'AI 表单优化建议',
      readonly: true,
      maxLength: 2000,
      description: 'AI 分析的表单改进建议（字段顺序、标签文本等）'
    },
    ai_field_suggestions: {
      type: 'textarea',
      label: 'AI 字段建议',
      readonly: true,
      maxLength: 2000,
      description: 'AI 推荐添加或删除的字段'
    }
  },
  relationships: [
    {
      name: 'Campaign',
      type: 'belongsTo',
      object: 'Campaign',
      foreignKey: 'campaign_id',
      label: '营销活动'
    },
    {
      name: 'DefaultOwner',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'default_owner_id',
      label: '默认负责人'
    },
    {
      name: 'Owner',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'owner_id',
      label: '负责人'
    },
    {
      name: 'ConfirmationEmailTemplate',
      type: 'belongsTo',
      object: 'EmailTemplate',
      foreignKey: 'confirmation_email_template_id',
      label: '确认邮件模板'
    }
  ],
  listViews: [
    {
      name: 'AllForms',
      label: '所有表单',
      filters: [],
      columns: ['name', 'form_type', 'status', 'total_submissions', 'conversion_rate', 'last_submission_date'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActiveForms',
      label: '启用的表单',
      filters: [['is_active', '=', true], ['status', '=', 'Published']],
      columns: ['name', 'form_type', 'total_submissions', 'total_views', 'conversion_rate', 'campaign_id'],
      sort: [['total_submissions', 'desc']]
    },
    {
      name: 'MyForms',
      label: '我的表单',
      filters: [['owner_id', '=', '$CurrentUser.Id']],
      columns: ['name', 'form_type', 'status', 'total_submissions', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'HighConversion',
      label: '高转化表单',
      filters: [['conversion_rate', '>', 20], ['total_views', '>', 50]],
      columns: ['name', 'form_type', 'conversion_rate', 'total_submissions', 'average_completion_time'],
      sort: [['conversion_rate', 'desc']]
    },
    {
      name: 'NeedsOptimization',
      label: '需要优化',
      filters: [['abandonment_rate', '>', 50], ['total_views', '>', 100]],
      columns: ['name', 'abandonment_rate', 'most_abandoned_field', 'average_completion_time'],
      sort: [['abandonment_rate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireFieldsJson',
      errorMessage: '表单必须定义字段配置',
      formula: 'ISBLANK(fields_json)'
    },
    {
      name: 'RequireConfirmationTemplate',
      errorMessage: '启用确认邮件时必须选择邮件模板',
      formula: 'AND(send_confirmation_email = TRUE, ISBLANK(confirmation_email_template_id))'
    },
    {
      name: 'RequireDefaultOwner',
      errorMessage: '未启用自动分配时必须设置默认负责人',
      formula: 'AND(create_lead_on_submit = TRUE, auto_assign_leads = FALSE, ISBLANK(default_owner_id))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '表单信息',
        columns: 2,
        fields: ['name', 'form_code', 'form_type', 'status', 'is_active', 'owner_id', 'campaign_id']
      },
      {
        label: '表单配置',
        columns: 1,
        fields: ['fields_json', 'layout_json', 'validation_rules_json']
      },
      {
        label: '提交设置',
        columns: 2,
        fields: ['submit_button_text', 'submit_success_message', 'redirect_url']
      },
      {
        label: '线索创建',
        columns: 2,
        fields: ['create_lead_on_submit', 'lead_source', 'auto_assign_leads', 'default_owner_id']
      },
      {
        label: '通知设置',
        columns: 2,
        fields: ['send_confirmation_email', 'confirmation_email_template_id', 'notify_owner_on_submit', 'notification_email_list']
      },
      {
        label: '发布设置',
        columns: 2,
        fields: ['published_date', 'embed_code', 'allowed_domains']
      },
      {
        label: '提交统计',
        columns: 3,
        fields: ['total_submissions', 'total_views', 'conversion_rate', 'average_completion_time', 'abandonment_rate', 'last_submission_date']
      },
      {
        label: '垃圾防护',
        columns: 3,
        fields: ['enable_captcha', 'enable_honeypot', 'spam_submissions_blocked']
      },
      {
        label: '渐进式表单',
        columns: 2,
        fields: ['enable_progressive_profiling', 'max_fields_to_show']
      },
      {
        label: '字段分析',
        columns: 2,
        fields: ['most_abandoned_field', 'field_completion_rates_json']
      },
      {
        label: 'AI 优化助手',
        columns: 1,
        fields: ['ai_form_optimization', 'ai_field_suggestions']
      },
      {
        label: '描述',
        columns: 1,
        fields: ['description']
      }
    ]
  }
};

export default Form;
