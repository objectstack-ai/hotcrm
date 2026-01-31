import type { ServiceObject } from '@objectstack/spec/data';

const MarketingList = {
  name: 'marketing_list',
  label: '营销列表',
  labelPlural: '营销列表',
  icon: 'users',
  description: '营销列表/细分管理，支持动态查询和静态成员',
  capabilities: {
    searchable: true,
    trackHistory: true,
    files: false
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: '列表名称',
      required: true,
      maxLength: 255,
      searchable: true
    },
    ListCode: {
      type: 'text',
      label: '列表代码',
      unique: true,
      maxLength: 80,
      description: '用于API调用的唯一标识符'
    },
    Description: {
      type: 'textarea',
      label: '描述',
      maxLength: 2000,
      description: '列表的用途和目标受众说明'
    },
    
    // List Type & Configuration
    ListType: {
      type: 'select',
      label: '列表类型',
      required: true,
      defaultValue: 'Static',
      options: [
        { label: '📌 静态列表', value: 'Static' },
        { label: '🔄 动态列表', value: 'Dynamic' },
        { label: '🔗 混合列表', value: 'Hybrid' }
      ],
      description: '静态=手动添加，动态=自动更新，混合=两者结合'
    },
    MemberType: {
      type: 'select',
      label: '成员类型',
      required: true,
      defaultValue: 'Lead',
      options: [
        { label: '📝 线索', value: 'Lead' },
        { label: '👤 联系人', value: 'Contact' },
        { label: '🏢 客户', value: 'Account' },
        { label: '🔀 混合', value: 'Mixed' }
      ]
    },
    
    // Dynamic List Configuration
    FilterCriteriaJson: {
      type: 'textarea',
      label: '筛选条件 JSON',
      maxLength: 65535,
      description: '动态列表的查询条件（ObjectQL格式）'
    },
    RefreshFrequency: {
      type: 'select',
      label: '刷新频率',
      options: [
        { label: '实时', value: 'Real-time' },
        { label: '每小时', value: 'Hourly' },
        { label: '每日', value: 'Daily' },
        { label: '每周', value: 'Weekly' },
        { label: '手动', value: 'Manual' }
      ],
      description: '动态列表成员更新频率'
    },
    LastRefreshedDate: {
      type: 'datetime',
      label: '最后刷新时间',
      readonly: true
    },
    
    // Campaign Association
    CampaignId: {
      type: 'lookup',
      label: '关联营销活动',
      reference: 'Campaign',
      description: '此列表关联的主要营销活动'
    },
    
    // List Segmentation
    SegmentCategory: {
      type: 'select',
      label: '细分类别',
      options: [
        { label: '🎯 行业', value: 'Industry' },
        { label: '📍 地理位置', value: 'Geographic' },
        { label: '💼 公司规模', value: 'Company Size' },
        { label: '🔥 参与度', value: 'Engagement Level' },
        { label: '📊 线索评分', value: 'Lead Score' },
        { label: '🎓 购买阶段', value: 'Buyer Journey' },
        { label: '🏷️ 产品兴趣', value: 'Product Interest' },
        { label: '🎨 自定义', value: 'Custom' }
      ]
    },
    TargetAudience: {
      type: 'textarea',
      label: '目标受众描述',
      maxLength: 2000,
      description: '此列表的目标受众特征'
    },
    
    // Status & Ownership
    Status: {
      type: 'select',
      label: '状态',
      required: true,
      defaultValue: 'Active',
      options: [
        { label: '✅ 活跃', value: 'Active' },
        { label: '⏸️ 暂停', value: 'Paused' },
        { label: '📦 已归档', value: 'Archived' }
      ]
    },
    IsActive: {
      type: 'checkbox',
      label: '是否启用',
      defaultValue: true
    },
    OwnerId: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    
    // Member Statistics
    TotalMembers: {
      type: 'number',
      label: '总成员数',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: '列表中的总成员数'
    },
    ActiveMembers: {
      type: 'number',
      label: '活跃成员数',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: '未退订且邮件可送达的成员数'
    },
    UnsubscribedMembers: {
      type: 'number',
      label: '已退订成员数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    BouncedMembers: {
      type: 'number',
      label: '退信成员数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    
    // Engagement Metrics
    AverageEngagementScore: {
      type: 'number',
      label: '平均参与度评分',
      precision: 2,
      readonly: true,
      description: '列表成员的平均参与度评分'
    },
    AverageLeadScore: {
      type: 'number',
      label: '平均线索评分',
      precision: 2,
      readonly: true,
      description: '列表中线索的平均评分'
    },
    TotalCampaignsSent: {
      type: 'number',
      label: '发送活动数',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: '使用此列表发送的营销活动数量'
    },
    
    // Email Deliverability
    DeliverabilityRate: {
      type: 'percent',
      label: '可送达率',
      readonly: true,
      description: '成功送达的邮件占比'
    },
    AverageOpenRate: {
      type: 'percent',
      label: '平均打开率',
      readonly: true,
      description: '此列表历史营销活动的平均打开率'
    },
    AverageClickRate: {
      type: 'percent',
      label: '平均点击率',
      readonly: true,
      description: '此列表历史营销活动的平均点击率'
    },
    
    // Suppression & Compliance
    SuppressDuplicates: {
      type: 'checkbox',
      label: '去重',
      defaultValue: true,
      description: '自动去除重复成员'
    },
    SuppressUnsubscribed: {
      type: 'checkbox',
      label: '排除已退订',
      defaultValue: true,
      description: '自动排除已退订的联系人'
    },
    SuppressBounced: {
      type: 'checkbox',
      label: '排除硬退信',
      defaultValue: true,
      description: '自动排除硬退信的邮箱地址'
    },
    IncludeOptedOutContacts: {
      type: 'checkbox',
      label: '包含营销退出联系人',
      defaultValue: false,
      description: '是否包含选择退出营销的联系人'
    },
    
    // GDPR & Privacy
    ConsentRequired: {
      type: 'checkbox',
      label: '需要营销同意',
      defaultValue: true,
      description: 'GDPR合规：只包含明确同意营销的联系人'
    },
    DataRetentionDays: {
      type: 'number',
      label: '数据保留天数',
      precision: 0,
      description: '成员数据保留期限（天）'
    },
    LastComplianceCheck: {
      type: 'datetime',
      label: '最后合规检查',
      readonly: true,
      description: '最后一次GDPR/隐私合规检查时间'
    },
    
    // Import/Export
    LastImportDate: {
      type: 'datetime',
      label: '最后导入时间',
      readonly: true
    },
    LastImportCount: {
      type: 'number',
      label: '最后导入数量',
      precision: 0,
      readonly: true
    },
    SourceSystem: {
      type: 'text',
      label: '来源系统',
      maxLength: 100,
      description: '成员的来源系统或渠道'
    },
    
    // AI Enhancement
    AISuggestedSegments: {
      type: 'textarea',
      label: 'AI 建议细分',
      readonly: true,
      maxLength: 2000,
      description: 'AI 分析建议的额外细分维度'
    },
    AIEngagementPrediction: {
      type: 'textarea',
      label: 'AI 参与度预测',
      readonly: true,
      maxLength: 2000,
      description: 'AI 预测的列表参与度趋势'
    },
    AISuggestedContent: {
      type: 'textarea',
      label: 'AI 内容建议',
      readonly: true,
      maxLength: 2000,
      description: 'AI 针对此列表推荐的内容主题'
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
      name: 'Owner',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'OwnerId',
      label: '负责人'
    }
  ],
  listViews: [
    {
      name: 'AllLists',
      label: '所有列表',
      filters: [],
      columns: ['Name', 'ListType', 'MemberType', 'TotalMembers', 'ActiveMembers', 'Status', 'LastRefreshedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActiveLists',
      label: '活跃列表',
      filters: [['Status', '=', 'Active'], ['IsActive', '=', true]],
      columns: ['Name', 'ListType', 'TotalMembers', 'AverageOpenRate', 'AverageClickRate', 'TotalCampaignsSent'],
      sort: [['TotalMembers', 'desc']]
    },
    {
      name: 'DynamicLists',
      label: '动态列表',
      filters: [['ListType', '=', 'Dynamic']],
      columns: ['Name', 'MemberType', 'RefreshFrequency', 'TotalMembers', 'LastRefreshedDate'],
      sort: [['LastRefreshedDate', 'desc']]
    },
    {
      name: 'MyLists',
      label: '我的列表',
      filters: [['OwnerId', '=', '$CurrentUser.Id']],
      columns: ['Name', 'ListType', 'TotalMembers', 'Status', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'HighEngagement',
      label: '高参与度列表',
      filters: [['AverageOpenRate', '>', 25], ['TotalCampaignsSent', '>', 3]],
      columns: ['Name', 'TotalMembers', 'AverageOpenRate', 'AverageClickRate', 'AverageEngagementScore'],
      sort: [['AverageOpenRate', 'desc']]
    },
    {
      name: 'NeedsCleanup',
      label: '需要清理',
      filters: [['UnsubscribedMembers', '>', 100]],
      columns: ['Name', 'TotalMembers', 'UnsubscribedMembers', 'BouncedMembers', 'LastRefreshedDate'],
      sort: [['UnsubscribedMembers', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'DynamicListRequiresFilter',
      errorMessage: '动态列表必须定义筛选条件',
      formula: 'AND(OR(ListType = "Dynamic", ListType = "Hybrid"), ISBLANK(FilterCriteriaJson))'
    },
    {
      name: 'ConsentRequiredForMarketing',
      errorMessage: '营销列表必须启用同意要求以符合GDPR',
      formula: 'AND(SegmentCategory = "Product Interest", NOT(ConsentRequired))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '列表信息',
        columns: 2,
        fields: ['Name', 'ListCode', 'ListType', 'MemberType', 'Status', 'IsActive', 'OwnerId', 'CampaignId']
      },
      {
        label: '细分配置',
        columns: 2,
        fields: ['SegmentCategory', 'TargetAudience']
      },
      {
        label: '动态列表配置',
        columns: 2,
        fields: ['FilterCriteriaJson', 'RefreshFrequency', 'LastRefreshedDate']
      },
      {
        label: '成员统计',
        columns: 4,
        fields: ['TotalMembers', 'ActiveMembers', 'UnsubscribedMembers', 'BouncedMembers']
      },
      {
        label: '参与度指标',
        columns: 3,
        fields: ['AverageEngagementScore', 'AverageLeadScore', 'TotalCampaignsSent']
      },
      {
        label: '邮件绩效',
        columns: 3,
        fields: ['DeliverabilityRate', 'AverageOpenRate', 'AverageClickRate']
      },
      {
        label: '排除规则',
        columns: 2,
        fields: ['SuppressDuplicates', 'SuppressUnsubscribed', 'SuppressBounced', 'IncludeOptedOutContacts']
      },
      {
        label: 'GDPR 合规',
        columns: 3,
        fields: ['ConsentRequired', 'DataRetentionDays', 'LastComplianceCheck']
      },
      {
        label: '导入/导出',
        columns: 3,
        fields: ['LastImportDate', 'LastImportCount', 'SourceSystem']
      },
      {
        label: 'AI 营销助手',
        columns: 1,
        fields: ['AISuggestedSegments', 'AIEngagementPrediction', 'AISuggestedContent']
      },
      {
        label: '描述',
        columns: 1,
        fields: ['Description']
      }
    ]
  }
};

export default MarketingList;
