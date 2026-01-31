import type { ObjectSchema } from '@objectstack/spec/data';

const Form: ObjectSchema = {
  name: 'form',
  label: '表单',
  labelPlural: '表单',
  icon: 'file-text',
  description: '营销表单构建器，支持拖放式设计和自动线索创建',
  enable: {
    searchEnabled: true,
    trackHistory: true,
    filesEnabled: false
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: '表单名称',
      required: true,
      maxLength: 255,
      searchEnabled: true
    },
    FormCode: {
      type: 'text',
      label: '表单代码',
      unique: true,
      maxLength: 80,
      description: '用于嵌入和API调用的唯一标识符'
    },
    Description: {
      type: 'textarea',
      label: '描述',
      maxLength: 1000
    },
    
    // Form Type & Purpose
    FormType: {
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
    CampaignId: {
      type: 'lookup',
      label: '关联营销活动',
      reference: 'Campaign',
      description: '通过此表单收集的线索会关联到此活动'
    },
    
    // Form Configuration
    FieldsJson: {
      type: 'textarea',
      label: '字段配置 JSON',
      required: true,
      maxLength: 65535,
      description: '表单字段定义（类型、标签、验证规则等）'
    },
    LayoutJson: {
      type: 'textarea',
      label: '布局配置 JSON',
      maxLength: 32000,
      description: '字段布局和样式配置'
    },
    ValidationRulesJson: {
      type: 'textarea',
      label: '验证规则 JSON',
      maxLength: 32000,
      description: '自定义字段验证规则'
    },
    
    // Submission Settings
    SubmitButtonText: {
      type: 'text',
      label: '提交按钮文本',
      defaultValue: '提交',
      maxLength: 50
    },
    SubmitSuccessMessage: {
      type: 'textarea',
      label: '提交成功消息',
      maxLength: 1000,
      description: '表单提交成功后显示的消息'
    },
    RedirectUrl: {
      type: 'url',
      label: '提交后重定向URL',
      description: '表单提交成功后跳转的页面（可选）'
    },
    
    // Lead/Contact Creation
    CreateLeadOnSubmit: {
      type: 'checkbox',
      label: '自动创建线索',
      defaultValue: true,
      description: '表单提交时自动创建线索记录'
    },
    LeadSource: {
      type: 'text',
      label: '线索来源',
      maxLength: 100,
      description: '自动创建线索时设置的来源字段值'
    },
    AutoAssignLeads: {
      type: 'checkbox',
      label: '自动分配线索',
      defaultValue: false,
      description: '根据分配规则自动分配新线索'
    },
    DefaultOwnerId: {
      type: 'lookup',
      label: '默认负责人',
      reference: 'User',
      description: '新线索的默认负责人（如果不自动分配）'
    },
    
    // Notifications
    SendConfirmationEmail: {
      type: 'checkbox',
      label: '发送确认邮件',
      defaultValue: false,
      description: '向提交者发送确认邮件'
    },
    ConfirmationEmailTemplateId: {
      type: 'lookup',
      label: '确认邮件模板',
      reference: 'EmailTemplate',
      description: '使用的确认邮件模板'
    },
    NotifyOwnerOnSubmit: {
      type: 'checkbox',
      label: '通知负责人',
      defaultValue: true,
      description: '表单提交时通知线索负责人'
    },
    NotificationEmailList: {
      type: 'text',
      label: '通知邮箱列表',
      maxLength: 500,
      description: '逗号分隔的邮箱地址，收到表单提交通知'
    },
    
    // Status & Publishing
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
      defaultValue: true
    },
    PublishedDate: {
      type: 'datetime',
      label: '发布时间',
      readonly: true
    },
    OwnerId: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    
    // Embed & Integration
    EmbedCode: {
      type: 'textarea',
      label: '嵌入代码',
      readonly: true,
      maxLength: 2000,
      description: '用于嵌入网站的HTML/JavaScript代码'
    },
    AllowedDomains: {
      type: 'text',
      label: '允许的域名',
      maxLength: 500,
      description: '可以嵌入此表单的域名列表（逗号分隔）'
    },
    
    // Analytics & Performance
    TotalSubmissions: {
      type: 'number',
      label: '总提交次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    TotalViews: {
      type: 'number',
      label: '总浏览次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    ConversionRate: {
      type: 'percent',
      label: '转化率',
      readonly: true,
      description: '自动计算：提交次数 / 浏览次数'
    },
    AverageCompletionTime: {
      type: 'number',
      label: '平均完成时间(秒)',
      precision: 0,
      readonly: true,
      description: '用户完成表单的平均时长'
    },
    AbandonmentRate: {
      type: 'percent',
      label: '放弃率',
      readonly: true,
      description: '开始填写但未提交的比例'
    },
    LastSubmissionDate: {
      type: 'datetime',
      label: '最后提交时间',
      readonly: true
    },
    
    // Spam Prevention
    EnableCaptcha: {
      type: 'checkbox',
      label: '启用验证码',
      defaultValue: true,
      description: '防止垃圾提交'
    },
    EnableHoneypot: {
      type: 'checkbox',
      label: '启用蜜罐字段',
      defaultValue: true,
      description: '隐藏字段防止机器人提交'
    },
    SpamSubmissionsBlocked: {
      type: 'number',
      label: '拦截的垃圾提交',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    
    // Progressive Profiling
    EnableProgressiveProfiling: {
      type: 'checkbox',
      label: '启用渐进式表单',
      defaultValue: false,
      description: '对已知联系人隐藏已有信息的字段'
    },
    MaxFieldsToShow: {
      type: 'number',
      label: '最多显示字段数',
      precision: 0,
      description: '渐进式表单每次最多显示的新字段数'
    },
    
    // Field Analytics
    MostAbandonedField: {
      type: 'text',
      label: '最常放弃字段',
      readonly: true,
      maxLength: 100,
      description: '用户最常在此字段处放弃表单'
    },
    FieldCompletionRatesJson: {
      type: 'textarea',
      label: '字段完成率 JSON',
      readonly: true,
      maxLength: 10000,
      description: '每个字段的完成率统计数据'
    },
    
    // AI Enhancement
    AIFormOptimization: {
      type: 'textarea',
      label: 'AI 表单优化建议',
      readonly: true,
      maxLength: 2000,
      description: 'AI 分析的表单改进建议（字段顺序、标签文本等）'
    },
    AIFieldSuggestions: {
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
      foreignKey: 'CampaignId',
      label: '营销活动'
    },
    {
      name: 'DefaultOwner',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'DefaultOwnerId',
      label: '默认负责人'
    },
    {
      name: 'Owner',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'OwnerId',
      label: '负责人'
    },
    {
      name: 'ConfirmationEmailTemplate',
      type: 'belongsTo',
      object: 'EmailTemplate',
      foreignKey: 'ConfirmationEmailTemplateId',
      label: '确认邮件模板'
    }
  ],
  listViews: [
    {
      name: 'AllForms',
      label: '所有表单',
      filters: [],
      columns: ['Name', 'FormType', 'Status', 'TotalSubmissions', 'ConversionRate', 'LastSubmissionDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActiveForms',
      label: '启用的表单',
      filters: [['IsActive', '=', true], ['Status', '=', 'Published']],
      columns: ['Name', 'FormType', 'TotalSubmissions', 'TotalViews', 'ConversionRate', 'CampaignId'],
      sort: [['TotalSubmissions', 'desc']]
    },
    {
      name: 'MyForms',
      label: '我的表单',
      filters: [['OwnerId', '=', '$CurrentUser.Id']],
      columns: ['Name', 'FormType', 'Status', 'TotalSubmissions', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'HighConversion',
      label: '高转化表单',
      filters: [['ConversionRate', '>', 20], ['TotalViews', '>', 50]],
      columns: ['Name', 'FormType', 'ConversionRate', 'TotalSubmissions', 'AverageCompletionTime'],
      sort: [['ConversionRate', 'desc']]
    },
    {
      name: 'NeedsOptimization',
      label: '需要优化',
      filters: [['AbandonmentRate', '>', 50], ['TotalViews', '>', 100]],
      columns: ['Name', 'AbandonmentRate', 'MostAbandonedField', 'AverageCompletionTime'],
      sort: [['AbandonmentRate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireFieldsJson',
      errorMessage: '表单必须定义字段配置',
      formula: 'ISBLANK(FieldsJson)'
    },
    {
      name: 'RequireConfirmationTemplate',
      errorMessage: '启用确认邮件时必须选择邮件模板',
      formula: 'AND(SendConfirmationEmail = TRUE, ISBLANK(ConfirmationEmailTemplateId))'
    },
    {
      name: 'RequireDefaultOwner',
      errorMessage: '未启用自动分配时必须设置默认负责人',
      formula: 'AND(CreateLeadOnSubmit = TRUE, AutoAssignLeads = FALSE, ISBLANK(DefaultOwnerId))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '表单信息',
        columns: 2,
        fields: ['Name', 'FormCode', 'FormType', 'Status', 'IsActive', 'OwnerId', 'CampaignId']
      },
      {
        label: '表单配置',
        columns: 1,
        fields: ['FieldsJson', 'LayoutJson', 'ValidationRulesJson']
      },
      {
        label: '提交设置',
        columns: 2,
        fields: ['SubmitButtonText', 'SubmitSuccessMessage', 'RedirectUrl']
      },
      {
        label: '线索创建',
        columns: 2,
        fields: ['CreateLeadOnSubmit', 'LeadSource', 'AutoAssignLeads', 'DefaultOwnerId']
      },
      {
        label: '通知设置',
        columns: 2,
        fields: ['SendConfirmationEmail', 'ConfirmationEmailTemplateId', 'NotifyOwnerOnSubmit', 'NotificationEmailList']
      },
      {
        label: '发布设置',
        columns: 2,
        fields: ['PublishedDate', 'EmbedCode', 'AllowedDomains']
      },
      {
        label: '提交统计',
        columns: 3,
        fields: ['TotalSubmissions', 'TotalViews', 'ConversionRate', 'AverageCompletionTime', 'AbandonmentRate', 'LastSubmissionDate']
      },
      {
        label: '垃圾防护',
        columns: 3,
        fields: ['EnableCaptcha', 'EnableHoneypot', 'SpamSubmissionsBlocked']
      },
      {
        label: '渐进式表单',
        columns: 2,
        fields: ['EnableProgressiveProfiling', 'MaxFieldsToShow']
      },
      {
        label: '字段分析',
        columns: 2,
        fields: ['MostAbandonedField', 'FieldCompletionRatesJson']
      },
      {
        label: 'AI 优化助手',
        columns: 1,
        fields: ['AIFormOptimization', 'AIFieldSuggestions']
      },
      {
        label: '描述',
        columns: 1,
        fields: ['Description']
      }
    ]
  }
};

export default Form;
