import type { ServiceObject } from '@objectstack/spec/data';

const Lead = {
  name: 'Lead',
  label: '线索',
  labelPlural: '线索',
  icon: 'user-plus',
  description: '潜在客户线索管理，包括线索打分、公海池和自动分配',
  capabilities: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true,
    enableDuplicateDetection: true
  },
  fields: {
    // Basic Information
    FirstName: {
      type: 'text',
      label: '名',
      maxLength: 40
    },
    LastName: {
      type: 'text',
      label: '姓',
      required: true,
      maxLength: 80,
      searchable: true
    },
    Company: {
      type: 'text',
      label: '公司',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Title: {
      type: 'text',
      label: '职位',
      maxLength: 128
    },
    // Contact Information
    Email: {
      type: 'email',
      label: '邮箱',
      unique: true,
      searchable: true
    },
    Phone: {
      type: 'phone',
      label: '电话'
    },
    MobilePhone: {
      type: 'phone',
      label: '手机'
    },
    Website: {
      type: 'url',
      label: '网站'
    },
    // Address
    Street: {
      type: 'text',
      label: '街道地址',
      maxLength: 255
    },
    City: {
      type: 'text',
      label: '城市',
      maxLength: 40
    },
    State: {
      type: 'text',
      label: '省/州',
      maxLength: 80
    },
    PostalCode: {
      type: 'text',
      label: '邮编',
      maxLength: 20
    },
    Country: {
      type: 'text',
      label: '国家',
      maxLength: 80
    },
    // Lead Classification
    Status: {
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
    Rating: {
      type: 'select',
      label: '评级',
      options: [
        { label: '🔥 Hot (热)', value: 'Hot' },
        { label: '⚡ Warm (温)', value: 'Warm' },
        { label: '❄️ Cold (冷)', value: 'Cold' }
      ]
    },
    LeadSource: {
      type: 'select',
      label: '线索来源',
      options: [
        { label: 'Web 官网', value: 'Web' },
        { label: 'Phone Inquiry 电话咨询', value: 'Phone Inquiry' },
        { label: 'Partner Referral 合作伙伴推荐', value: 'Partner Referral' },
        { label: 'Purchased List 购买名单', value: 'Purchased List' },
        { label: 'Trade Show 展会', value: 'Trade Show' },
        { label: 'Social Media 社交媒体', value: 'Social Media' },
        { label: 'Advertisement 广告', value: 'Advertisement' },
        { label: 'Other 其他', value: 'Other' }
      ]
    },
    Industry: {
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
    LeadScore: {
      type: 'number',
      label: '线索评分',
      precision: 0,
      min: 0,
      max: 100,
      readonly: true,
      description: 'AI 自动计算的线索质量分数 (0-100)'
    },
    DataCompleteness: {
      type: 'percent',
      label: '资料完整度',
      readonly: true,
      description: '线索信息填写完整度百分比'
    },
    LastActivityDate: {
      type: 'datetime',
      label: '最后活动时间',
      readonly: true
    },
    NumberOfActivities: {
      type: 'number',
      label: '活动次数',
      readonly: true,
      precision: 0
    },
    // Public Pool (公海池)
    IsInPublicPool: {
      type: 'checkbox',
      label: '在公海池中',
      defaultValue: true,
      description: '是否在公海池中等待分配'
    },
    PoolEntryDate: {
      type: 'datetime',
      label: '进入公海时间',
      readonly: true
    },
    ClaimedDate: {
      type: 'datetime',
      label: '认领时间',
      readonly: true
    },
    // Assignment
    OwnerId: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    // Conversion
    ConvertedDate: {
      type: 'datetime',
      label: '转化日期',
      readonly: true
    },
    ConvertedAccountId: {
      type: 'lookup',
      label: '转化后的客户',
      reference: 'Account',
      readonly: true
    },
    ConvertedContactId: {
      type: 'lookup',
      label: '转化后的联系人',
      reference: 'Contact',
      readonly: true
    },
    ConvertedOpportunityId: {
      type: 'lookup',
      label: '转化后的商机',
      reference: 'Opportunity',
      readonly: true
    },
    // Campaign
    CampaignId: {
      type: 'lookup',
      label: '营销活动',
      reference: 'Campaign'
    },
    // Additional Info
    NumberOfEmployees: {
      type: 'number',
      label: '员工数',
      precision: 0
    },
    AnnualRevenue: {
      type: 'currency',
      label: '年营收',
      precision: 2
    },
    Description: {
      type: 'textarea',
      label: '描述',
      maxLength: 32000
    },
    // AI Enhancement Fields
    AISummary: {
      type: 'textarea',
      label: 'AI 线索分析',
      readonly: true,
      maxLength: 2000,
      description: 'AI 生成的线索质量分析和建议'
    },
    AIRecommendedAction: {
      type: 'text',
      label: 'AI 推荐行动',
      readonly: true,
      maxLength: 255
    },
    EmailSignatureData: {
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
      foreignKey: 'WhoId',
      label: '活动记录'
    },
    {
      name: 'CampaignMembers',
      type: 'hasMany',
      object: 'CampaignMember',
      foreignKey: 'LeadId',
      label: '营销活动成员'
    }
  ],
  listViews: [
    {
      name: 'AllLeads',
      label: '所有线索',
      filters: [],
      columns: ['LastName', 'FirstName', 'Company', 'Email', 'Phone', 'Status', 'Rating', 'LeadScore', 'OwnerId'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'MyLeads',
      label: '我的线索',
      filters: [['OwnerId', '=', '$currentUser']],
      columns: ['LastName', 'FirstName', 'Company', 'Email', 'Status', 'Rating', 'LeadScore', 'LastActivityDate'],
      sort: [['LeadScore', 'desc']]
    },
    {
      name: 'PublicPool',
      label: '公海池',
      filters: [
        ['IsInPublicPool', '=', true],
        ['Status', 'not in', ['Converted', 'Unqualified']]
      ],
      columns: ['LastName', 'FirstName', 'Company', 'Email', 'Phone', 'Rating', 'LeadScore', 'PoolEntryDate'],
      sort: [['LeadScore', 'desc']]
    },
    {
      name: 'HighScoreLeads',
      label: '高分线索',
      filters: [
        ['LeadScore', '>', 70],
        ['Status', '!=', 'Converted']
      ],
      columns: ['LastName', 'FirstName', 'Company', 'Email', 'LeadScore', 'Rating', 'LastActivityDate', 'OwnerId'],
      sort: [['LeadScore', 'desc']]
    },
    {
      name: 'RecentLeads',
      label: '最近线索',
      filters: [['CreatedDate', 'last_n_days', 7]],
      columns: ['LastName', 'FirstName', 'Company', 'Email', 'Phone', 'LeadSource', 'Status', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ToBeNurtured',
      label: '待培育',
      filters: [['Status', '=', 'Nurturing']],
      columns: ['LastName', 'FirstName', 'Company', 'Email', 'Rating', 'LastActivityDate', 'NumberOfActivities', 'OwnerId'],
      sort: [['LastActivityDate', 'asc']]
    },
    {
      name: 'HotLeads',
      label: '热门线索',
      filters: [
        ['Rating', '=', 'Hot'],
        ['Status', 'not in', ['Converted', 'Unqualified']]
      ],
      columns: ['LastName', 'FirstName', 'Company', 'Email', 'Phone', 'LeadScore', 'Status', 'OwnerId'],
      sort: [['LeadScore', 'desc']]
    },
    {
      name: 'ReadyToConvert',
      label: '待转化',
      filters: [
        ['LeadScore', '>', 80],
        ['Status', 'not in', ['Converted', 'Unqualified']],
        ['DataCompleteness', '>', 80]
      ],
      columns: ['LastName', 'FirstName', 'Company', 'Email', 'LeadScore', 'DataCompleteness', 'Status', 'OwnerId'],
      sort: [['LeadScore', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'EmailOrPhoneRequired',
      errorMessage: '邮箱或电话至少需要填写一个',
      formula: 'AND(ISBLANK(Email), ISBLANK(Phone), ISBLANK(MobilePhone))'
    },
    {
      name: 'ConvertedLeadReadOnly',
      errorMessage: '已转化的线索不能修改状态',
      formula: 'AND(Status = "Converted", PRIORVALUE(Status) = "Converted")'
    },
    {
      name: 'HighRevenueRequiresIndustry',
      errorMessage: '年营收超过1000万的线索必须选择行业',
      formula: 'AND(AnnualRevenue > 10000000, ISBLANK(Industry))'
    },
    {
      name: 'HighScoreRequiresOwner',
      errorMessage: '高分线索(>70分)必须指定负责人且不能在公海池中',
      formula: 'AND(LeadScore > 70, IsInPublicPool = true)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['FirstName', 'LastName', 'Company', 'Title', 'Email', 'Phone', 'MobilePhone', 'Website', 'Industry']
      },
      {
        label: '分类与评分',
        columns: 2,
        fields: ['Status', 'Rating', 'LeadSource', 'LeadScore', 'DataCompleteness', 'CampaignId']
      },
      {
        label: '地址信息',
        columns: 2,
        fields: ['Street', 'City', 'State', 'PostalCode', 'Country']
      },
      {
        label: '公司信息',
        columns: 2,
        fields: ['NumberOfEmployees', 'AnnualRevenue']
      },
      {
        label: '活动信息',
        columns: 2,
        fields: ['LastActivityDate', 'NumberOfActivities']
      },
      {
        label: '公海池管理',
        columns: 2,
        fields: ['IsInPublicPool', 'PoolEntryDate', 'ClaimedDate', 'OwnerId']
      },
      {
        label: '转化信息',
        columns: 2,
        fields: ['ConvertedDate', 'ConvertedAccountId', 'ConvertedContactId', 'ConvertedOpportunityId']
      },
      {
        label: 'AI 智能分析',
        columns: 1,
        fields: ['AISummary', 'AIRecommendedAction', 'EmailSignatureData']
      },
      {
        label: '其他信息',
        columns: 1,
        fields: ['Description']
      }
    ]
  }
};

export default Lead;
