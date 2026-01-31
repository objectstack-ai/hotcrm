
const MarketingList = {
  name: 'marketing_list',
  label: '营销列表',
  labelPlural: '营销列表',
  icon: 'users',
  description: '营销列表/细分管理，支持动态查询和静态成员',
  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: '列表名称',
      required: true,
      maxLength: 255,
      searchable: true
    },
    list_code: {
      type: 'text',
      label: '列表代码',
      unique: true,
      maxLength: 80,
      description: '用于API调用的唯一标识符'
    },
    description: {
      type: 'textarea',
      label: '描述',
      maxLength: 2000,
      description: '列表的用途和目标受众说明'
    },
    
    // List Type & Configuration
    list_type: {
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
    member_type: {
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
    filter_criteria_json: {
      type: 'textarea',
      label: '筛选条件 JSON',
      maxLength: 65535,
      description: '动态列表的查询条件（ObjectQL格式）'
    },
    refresh_frequency: {
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
    last_refreshed_date: {
      type: 'datetime',
      label: '最后刷新时间',
      readonly: true
    },
    
    // Campaign Association
    campaign_id: {
      type: 'lookup',
      label: '关联营销活动',
      reference: 'Campaign',
      description: '此列表关联的主要营销活动'
    },
    
    // List Segmentation
    segment_category: {
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
    target_audience: {
      type: 'textarea',
      label: '目标受众描述',
      maxLength: 2000,
      description: '此列表的目标受众特征'
    },
    
    // status & Ownership
    status: {
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
    is_active: {
      type: 'checkbox',
      label: '是否启用',
      defaultValue: true
    },
    owner_id: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    
    // Member Statistics
    total_members: {
      type: 'number',
      label: '总成员数',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: '列表中的总成员数'
    },
    active_members: {
      type: 'number',
      label: '活跃成员数',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: '未退订且邮件可送达的成员数'
    },
    unsubscribed_members: {
      type: 'number',
      label: '已退订成员数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    bounced_members: {
      type: 'number',
      label: '退信成员数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    
    // Engagement Metrics
    average_engagement_score: {
      type: 'number',
      label: '平均参与度评分',
      precision: 2,
      readonly: true,
      description: '列表成员的平均参与度评分'
    },
    average_lead_score: {
      type: 'number',
      label: '平均线索评分',
      precision: 2,
      readonly: true,
      description: '列表中线索的平均评分'
    },
    total_campaigns_sent: {
      type: 'number',
      label: '发送活动数',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: '使用此列表发送的营销活动数量'
    },
    
    // Email Deliverability
    deliverability_rate: {
      type: 'percent',
      label: '可送达率',
      readonly: true,
      description: '成功送达的邮件占比'
    },
    average_open_rate: {
      type: 'percent',
      label: '平均打开率',
      readonly: true,
      description: '此列表历史营销活动的平均打开率'
    },
    average_click_rate: {
      type: 'percent',
      label: '平均点击率',
      readonly: true,
      description: '此列表历史营销活动的平均点击率'
    },
    
    // Suppression & Compliance
    suppress_duplicates: {
      type: 'checkbox',
      label: '去重',
      defaultValue: true,
      description: '自动去除重复成员'
    },
    suppress_unsubscribed: {
      type: 'checkbox',
      label: '排除已退订',
      defaultValue: true,
      description: '自动排除已退订的联系人'
    },
    suppress_bounced: {
      type: 'checkbox',
      label: '排除硬退信',
      defaultValue: true,
      description: '自动排除硬退信的邮箱地址'
    },
    include_opted_out_contacts: {
      type: 'checkbox',
      label: '包含营销退出联系人',
      defaultValue: false,
      description: '是否包含选择退出营销的联系人'
    },
    
    // GDPR & Privacy
    consent_required: {
      type: 'checkbox',
      label: '需要营销同意',
      defaultValue: true,
      description: 'GDPR合规：只包含明确同意营销的联系人'
    },
    data_retention_days: {
      type: 'number',
      label: '数据保留天数',
      precision: 0,
      description: '成员数据保留期限（天）'
    },
    last_compliance_check: {
      type: 'datetime',
      label: '最后合规检查',
      readonly: true,
      description: '最后一次GDPR/隐私合规检查时间'
    },
    
    // Import/Export
    last_import_date: {
      type: 'datetime',
      label: '最后导入时间',
      readonly: true
    },
    last_import_count: {
      type: 'number',
      label: '最后导入数量',
      precision: 0,
      readonly: true
    },
    source_system: {
      type: 'text',
      label: '来源系统',
      maxLength: 100,
      description: '成员的来源系统或渠道'
    },
    
    // AI Enhancement
    a_i_suggested_segments: {
      type: 'textarea',
      label: 'AI 建议细分',
      readonly: true,
      maxLength: 2000,
      description: 'AI 分析建议的额外细分维度'
    },
    a_i_engagement_prediction: {
      type: 'textarea',
      label: 'AI 参与度预测',
      readonly: true,
      maxLength: 2000,
      description: 'AI 预测的列表参与度趋势'
    },
    a_i_suggested_content: {
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
      foreignKey: 'campaign_id',
      label: '营销活动'
    },
    {
      name: 'Owner',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'owner_id',
      label: '负责人'
    }
  ],
  listViews: [
    {
      name: 'AllLists',
      label: '所有列表',
      filters: [],
      columns: ['name', 'list_type', 'member_type', 'total_members', 'active_members', 'status', 'last_refreshed_date'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActiveLists',
      label: '活跃列表',
      filters: [['status', '=', 'Active'], ['is_active', '=', true]],
      columns: ['name', 'list_type', 'total_members', 'average_open_rate', 'average_click_rate', 'total_campaigns_sent'],
      sort: [['total_members', 'desc']]
    },
    {
      name: 'DynamicLists',
      label: '动态列表',
      filters: [['list_type', '=', 'Dynamic']],
      columns: ['name', 'member_type', 'refresh_frequency', 'total_members', 'last_refreshed_date'],
      sort: [['last_refreshed_date', 'desc']]
    },
    {
      name: 'MyLists',
      label: '我的列表',
      filters: [['owner_id', '=', '$CurrentUser.Id']],
      columns: ['name', 'list_type', 'total_members', 'status', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'HighEngagement',
      label: '高参与度列表',
      filters: [['average_open_rate', '>', 25], ['total_campaigns_sent', '>', 3]],
      columns: ['name', 'total_members', 'average_open_rate', 'average_click_rate', 'average_engagement_score'],
      sort: [['average_open_rate', 'desc']]
    },
    {
      name: 'NeedsCleanup',
      label: '需要清理',
      filters: [['unsubscribed_members', '>', 100]],
      columns: ['name', 'total_members', 'unsubscribed_members', 'bounced_members', 'last_refreshed_date'],
      sort: [['unsubscribed_members', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'DynamicListRequiresFilter',
      errorMessage: '动态列表必须定义筛选条件',
      formula: 'AND(OR(list_type = "Dynamic", list_type = "Hybrid"), ISBLANK(filter_criteria_json))'
    },
    {
      name: 'ConsentRequiredForMarketing',
      errorMessage: '营销列表必须启用同意要求以符合GDPR',
      formula: 'AND(segment_category = "Product Interest", NOT(consent_required))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '列表信息',
        columns: 2,
        fields: ['name', 'list_code', 'list_type', 'member_type', 'status', 'is_active', 'owner_id', 'campaign_id']
      },
      {
        label: '细分配置',
        columns: 2,
        fields: ['segment_category', 'target_audience']
      },
      {
        label: '动态列表配置',
        columns: 2,
        fields: ['filter_criteria_json', 'refresh_frequency', 'last_refreshed_date']
      },
      {
        label: '成员统计',
        columns: 4,
        fields: ['total_members', 'active_members', 'unsubscribed_members', 'bounced_members']
      },
      {
        label: '参与度指标',
        columns: 3,
        fields: ['average_engagement_score', 'average_lead_score', 'total_campaigns_sent']
      },
      {
        label: '邮件绩效',
        columns: 3,
        fields: ['deliverability_rate', 'average_open_rate', 'average_click_rate']
      },
      {
        label: '排除规则',
        columns: 2,
        fields: ['suppress_duplicates', 'suppress_unsubscribed', 'suppress_bounced', 'include_opted_out_contacts']
      },
      {
        label: 'GDPR 合规',
        columns: 3,
        fields: ['consent_required', 'data_retention_days', 'last_compliance_check']
      },
      {
        label: '导入/导出',
        columns: 3,
        fields: ['last_import_date', 'last_import_count', 'source_system']
      },
      {
        label: 'AI 营销助手',
        columns: 1,
        fields: ['a_i_suggested_segments', 'a_i_engagement_prediction', 'a_i_suggested_content']
      },
      {
        label: '描述',
        columns: 1,
        fields: ['description']
      }
    ]
  }
};

export default MarketingList;
