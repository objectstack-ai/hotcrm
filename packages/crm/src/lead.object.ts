
const Lead = {
  name: 'lead',
  label: '线索',
  labelPlural: '线索',
  icon: 'user-plus',
  description: '潜在客户线索管理，包括线索打分、公海池和自动分配',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true,
    enableDuplicateDetection: true
  },
  fields: {
    // Basic Information
    first_name: {
      type: 'text',
      label: '名',
      maxLength: 40
    },
    last_name: {
      type: 'text',
      label: '姓',
      required: true,
      maxLength: 80,
      searchable: true
    },
    company: {
      type: 'text',
      label: '公司',
      required: true,
      maxLength: 255,
      searchable: true
    },
    title: {
      type: 'text',
      label: '职位',
      maxLength: 128
    },
    // Contact Information
    email: {
      type: 'email',
      label: '邮箱',
      unique: true,
      searchable: true
    },
    phone: {
      type: 'phone',
      label: '电话'
    },
    mobile_phone: {
      type: 'phone',
      label: '手机'
    },
    website: {
      type: 'url',
      label: '网站'
    },
    // Address
    street: {
      type: 'text',
      label: '街道地址',
      maxLength: 255
    },
    city: {
      type: 'text',
      label: '城市',
      maxLength: 40
    },
    state: {
      type: 'text',
      label: '省/州',
      maxLength: 80
    },
    postal_code: {
      type: 'text',
      label: '邮编',
      maxLength: 20
    },
    country: {
      type: 'text',
      label: '国家',
      maxLength: 80
    },
    // Lead Classification
    status: {
      type: 'select',
      label: '状态',
      required: true,
      defaultValue: 'New',
      options: [
        { label: '🆕 新线索', value: 'New' },
        { label: '📞 联系中', value: 'Working' },
        { label: '🔄 培育中', value: 'Nurturing' },
        { label: '✅ 已转化', value: 'Converted' },
        { label: '❌ 不合格', value: 'Unqualified' }
      ]
    },
    rating: {
      type: 'select',
      label: '评级',
      options: [
        { label: '🔥 Hot (热)', value: 'Hot' },
        { label: '⚡ Warm (温)', value: 'Warm' },
        { label: '❄️ Cold (冷)', value: 'Cold' }
      ]
    },
    lead_source: {
      type: 'select',
      label: '线索来源',
      options: [
        { label: 'Web 官网', value: 'Web' },
        { label: 'phone Inquiry 电话咨询', value: 'phone Inquiry' },
        { label: 'Partner Referral 合作伙伴推荐', value: 'Partner Referral' },
        { label: 'Purchased List 购买名单', value: 'Purchased List' },
        { label: 'Trade Show 展会', value: 'Trade Show' },
        { label: 'Social Media 社交媒体', value: 'Social Media' },
        { label: 'Advertisement 广告', value: 'Advertisement' },
        { label: 'Other 其他', value: 'Other' }
      ]
    },
    industry: {
      type: 'select',
      label: '行业',
      options: [
        { label: '科技', value: 'Technology' },
        { label: '金融', value: 'Finance' },
        { label: '医疗', value: 'Healthcare' },
        { label: '制造', value: 'Manufacturing' },
        { label: '零售', value: 'Retail' },
        { label: '教育', value: 'Education' },
        { label: '房地产', value: 'Real Estate' },
        { label: '其他', value: 'Other' }
      ]
    },
    // Lead Scoring & AI
    lead_score: {
      type: 'number',
      label: '线索评分',
      precision: 0,
      min: 0,
      max: 100,
      readonly: true,
      description: 'AI 自动计算的线索质量分数 (0-100)'
    },
    data_completeness: {
      type: 'percent',
      label: '资料完整度',
      readonly: true,
      description: '线索信息填写完整度百分比'
    },
    last_activity_date: {
      type: 'datetime',
      label: '最后活动时间',
      readonly: true
    },
    number_of_activities: {
      type: 'number',
      label: '活动次数',
      readonly: true,
      precision: 0
    },
    // Public Pool (公海池)
    is_in_public_pool: {
      type: 'checkbox',
      label: '在公海池中',
      defaultValue: true,
      description: '是否在公海池中等待分配'
    },
    pool_entry_date: {
      type: 'datetime',
      label: '进入公海时间',
      readonly: true
    },
    claimed_date: {
      type: 'datetime',
      label: '认领时间',
      readonly: true
    },
    // Assignment
    owner_id: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    // Conversion
    converted_date: {
      type: 'datetime',
      label: '转化日期',
      readonly: true
    },
    converted_account_id: {
      type: 'lookup',
      label: '转化后的客户',
      reference: 'Account',
      readonly: true
    },
    converted_contact_id: {
      type: 'lookup',
      label: '转化后的联系人',
      reference: 'Contact',
      readonly: true
    },
    converted_opportunity_id: {
      type: 'lookup',
      label: '转化后的商机',
      reference: 'Opportunity',
      readonly: true
    },
    // Campaign
    campaign_id: {
      type: 'lookup',
      label: '营销活动',
      reference: 'Campaign'
    },
    // Additional Info
    number_of_employees: {
      type: 'number',
      label: '员工数',
      precision: 0
    },
    annual_revenue: {
      type: 'currency',
      label: '年营收',
      precision: 2
    },
    description: {
      type: 'textarea',
      label: '描述',
      maxLength: 32000
    },
    // AI Enhancement Fields
    a_i_summary: {
      type: 'textarea',
      label: 'AI 线索分析',
      readonly: true,
      maxLength: 2000,
      description: 'AI 生成的线索质量分析和建议'
    },
    a_i_recommended_action: {
      type: 'text',
      label: 'AI 推荐行动',
      readonly: true,
      maxLength: 255
    },
    email_signature_data: {
      type: 'textarea',
      label: '邮件签名提取信息',
      readonly: true,
      description: 'AI 从邮件签名提取的联系信息'
    }
  },
  relationships: [
    {
      name: 'Activities',
      type: 'hasMany',
      object: 'Activity',
      foreignKey: 'who_id',
      label: '活动记录'
    },
    {
      name: 'CampaignMembers',
      type: 'hasMany',
      object: 'CampaignMember',
      foreignKey: 'lead_id',
      label: '营销活动成员'
    }
  ],
  listViews: [
    {
      name: 'AllLeads',
      label: '所有线索',
      filters: [],
      columns: ['last_name', 'first_name', 'company', 'email', 'phone', 'status', 'rating', 'lead_score', 'owner_id'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'MyLeads',
      label: '我的线索',
      filters: [['owner_id', '=', '$currentUser']],
      columns: ['last_name', 'first_name', 'company', 'email', 'status', 'rating', 'lead_score', 'last_activity_date'],
      sort: [['lead_score', 'desc']]
    },
    {
      name: 'PublicPool',
      label: '公海池',
      filters: [
        ['is_in_public_pool', '=', true],
        ['status', 'not in', ['Converted', 'Unqualified']]
      ],
      columns: ['last_name', 'first_name', 'company', 'email', 'phone', 'rating', 'lead_score', 'pool_entry_date'],
      sort: [['lead_score', 'desc']]
    },
    {
      name: 'HighScoreLeads',
      label: '高分线索',
      filters: [
        ['lead_score', '>', 70],
        ['status', '!=', 'Converted']
      ],
      columns: ['last_name', 'first_name', 'company', 'email', 'lead_score', 'rating', 'last_activity_date', 'owner_id'],
      sort: [['lead_score', 'desc']]
    },
    {
      name: 'RecentLeads',
      label: '最近线索',
      filters: [['CreatedDate', 'last_n_days', 7]],
      columns: ['last_name', 'first_name', 'company', 'email', 'phone', 'lead_source', 'status', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ToBeNurtured',
      label: '待培育',
      filters: [['status', '=', 'Nurturing']],
      columns: ['last_name', 'first_name', 'company', 'email', 'rating', 'last_activity_date', 'number_of_activities', 'owner_id'],
      sort: [['last_activity_date', 'asc']]
    },
    {
      name: 'HotLeads',
      label: '热门线索',
      filters: [
        ['rating', '=', 'Hot'],
        ['status', 'not in', ['Converted', 'Unqualified']]
      ],
      columns: ['last_name', 'first_name', 'company', 'email', 'phone', 'lead_score', 'status', 'owner_id'],
      sort: [['lead_score', 'desc']]
    },
    {
      name: 'ReadyToConvert',
      label: '待转化',
      filters: [
        ['lead_score', '>', 80],
        ['status', 'not in', ['Converted', 'Unqualified']],
        ['data_completeness', '>', 80]
      ],
      columns: ['last_name', 'first_name', 'company', 'email', 'lead_score', 'data_completeness', 'status', 'owner_id'],
      sort: [['lead_score', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'EmailOrPhoneRequired',
      errorMessage: '邮箱或电话至少需要填写一个',
      formula: 'AND(ISBLANK(email), ISBLANK(phone), ISBLANK(mobile_phone))'
    },
    {
      name: 'ConvertedLeadReadOnly',
      errorMessage: '已转化的线索不能修改状态',
      formula: 'AND(status = "Converted", PRIORVALUE(status) = "Converted")'
    },
    {
      name: 'HighRevenueRequiresIndustry',
      errorMessage: '年营收超过1000万的线索必须选择行业',
      formula: 'AND(annual_revenue > 10000000, ISBLANK(industry))'
    },
    {
      name: 'HighScoreRequiresOwner',
      errorMessage: '高分线索(>70分)必须指定负责人且不能在公海池中',
      formula: 'AND(lead_score > 70, is_in_public_pool = true)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['first_name', 'last_name', 'company', 'title', 'email', 'phone', 'mobile_phone', 'website', 'industry']
      },
      {
        label: '分类与评分',
        columns: 2,
        fields: ['status', 'rating', 'lead_source', 'lead_score', 'data_completeness', 'campaign_id']
      },
      {
        label: '地址信息',
        columns: 2,
        fields: ['street', 'city', 'state', 'postal_code', 'country']
      },
      {
        label: '公司信息',
        columns: 2,
        fields: ['number_of_employees', 'annual_revenue']
      },
      {
        label: '活动信息',
        columns: 2,
        fields: ['last_activity_date', 'number_of_activities']
      },
      {
        label: '公海池管理',
        columns: 2,
        fields: ['is_in_public_pool', 'pool_entry_date', 'claimed_date', 'owner_id']
      },
      {
        label: '转化信息',
        columns: 2,
        fields: ['converted_date', 'converted_account_id', 'converted_contact_id', 'converted_opportunity_id']
      },
      {
        label: 'AI 智能分析',
        columns: 1,
        fields: ['a_i_summary', 'a_i_recommended_action', 'email_signature_data']
      },
      {
        label: '其他信息',
        columns: 1,
        fields: ['description']
      }
    ]
  }
};

export default Lead;
