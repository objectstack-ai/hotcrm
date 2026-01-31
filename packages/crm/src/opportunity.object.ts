
const Opportunity = {
  name: 'opportunity',
  label: '商机',
  labelPlural: '商机',
  icon: 'briefcase',
  description: '销售商机和管道管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    Name: {
      type: 'text',
      label: '商机名称',
      required: true,
      searchable: true,
      maxLength: 120
    },
    AccountId: {
      type: 'lookup',
      label: '客户',
      reference: 'Account',
      required: true
    },
    ContactId: {
      type: 'lookup',
      label: '主要联系人',
      reference: 'Contact'
    },
    Amount: {
      type: 'currency',
      label: '金额',
      precision: 2
    },
    CloseDate: {
      type: 'date',
      label: '预计成交日期',
      required: true
    },
    Stage: {
      type: 'select',
      label: '阶段',
      required: true,
      options: [
        { label: '🔍 潜在客户', value: 'Prospecting', probability: 10 },
        { label: '📞 需求确认', value: 'Qualification', probability: 20 },
        { label: '💡 方案设计', value: 'Needs Analysis', probability: 40 },
        { label: '📊 方案展示', value: 'Proposal', probability: 60 },
        { label: '💰 商务谈判', value: 'Negotiation', probability: 80 },
        { label: '✅ 成交', value: 'Closed Won', probability: 100, isWon: true },
        { label: '❌ 失败', value: 'Closed Lost', probability: 0, isLost: true }
      ]
    },
    Probability: {
      type: 'percent',
      label: '赢单概率',
      description: '赢单概率百分比'
    },
    NextStep: {
      type: 'text',
      label: '下一步行动',
      maxLength: 255,
      description: '明确的下一步行动计划'
    },
    LeadSource: {
      type: 'select',
      label: '线索来源',
      options: [
        { label: 'Web 官网', value: 'Web' },
        { label: '电话咨询', value: 'Phone Inquiry' },
        { label: '合作伙伴推荐', value: 'Partner Referral' },
        { label: '展会', value: 'Trade Show' },
        { label: '社交媒体', value: 'Social Media' },
        { label: '广告', value: 'Advertisement' },
        { label: '老客户推荐', value: 'Customer Referral' },
        { label: '其他', value: 'Other' }
      ]
    },
    ForecastCategory: {
      type: 'select',
      label: '预测类别',
      defaultValue: 'Pipeline',
      options: [
        { label: '渠道', value: 'Pipeline' },
        { label: '最佳情况', value: 'Best Case' },
        { label: '承诺', value: 'Commit' },
        { label: '已忽略', value: 'Omitted' },
        { label: '已成交', value: 'Closed' }
      ]
    },
    Type: {
      type: 'select',
      label: '商机类型',
      options: [
        { label: '新业务', value: 'New Business' },
        { label: '现有业务-升级', value: 'Existing Business - Upgrade' },
        { label: '现有业务-续约', value: 'Existing Business - Renewal' },
        { label: '现有业务-更换', value: 'Existing Business - Replacement' }
      ]
    },
    ExpectedRevenue: {
      type: 'currency',
      label: '预期营收',
      precision: 2,
      formula: 'Amount * Probability / 100',
      readonly: true,
      description: '基于金额和赢单概率计算'
    },
    DaysOpen: {
      type: 'number',
      label: '开放天数',
      precision: 0,
      formula: 'DATEDIFF(TODAY(), CreatedDate)',
      readonly: true
    },
    OwnerId: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true,
      defaultValue: '$currentUser'
    }
  },
  relationships: [
    {
      name: 'Contracts',
      type: 'hasMany',
      object: 'Contract',
      foreignKey: 'OpportunityId',
      label: '合同'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有商机',
      columns: ['Name', 'AccountId', 'Amount', 'CloseDate', 'Stage', 'Probability', 'OwnerId']
    },
    {
      name: 'MyOpenOpportunities',
      label: '我的进行中商机',
      filters: [
        ['OwnerId', '=', '$currentUser'],
        ['Stage', 'not in', ['Closed Won', 'Closed Lost']]
      ],
      columns: ['Name', 'AccountId', 'Amount', 'ExpectedRevenue', 'CloseDate', 'Stage', 'NextStep'],
      sort: [['CloseDate', 'asc']]
    },
    {
      name: 'ClosingThisMonth',
      label: '本月预计成交',
      filters: [
        ['CloseDate', 'this_month'],
        ['Stage', 'not in', ['Closed Won', 'Closed Lost']]
      ],
      columns: ['Name', 'AccountId', 'Amount', 'Probability', 'CloseDate', 'Stage', 'OwnerId'],
      sort: [['Amount', 'desc']]
    },
    {
      name: 'HighValueDeals',
      label: '高价值商机',
      filters: [
        ['Amount', '>', 100000],
        ['Stage', 'not in', ['Closed Won', 'Closed Lost']]
      ],
      columns: ['Name', 'AccountId', 'Amount', 'ExpectedRevenue', 'Stage', 'Probability', 'OwnerId'],
      sort: [['Amount', 'desc']]
    },
    {
      name: 'StagnantOpportunities',
      label: '停滞商机',
      filters: [
        ['DaysOpen', '>', 90],
        ['Stage', 'not in', ['Closed Won', 'Closed Lost']]
      ],
      columns: ['Name', 'AccountId', 'Amount', 'DaysOpen', 'Stage', 'NextStep', 'OwnerId'],
      sort: [['DaysOpen', 'desc']]
    },
    {
      name: 'WonOpportunities',
      label: '已赢单',
      filters: [['Stage', '=', 'Closed Won']],
      columns: ['Name', 'AccountId', 'Amount', 'CloseDate', 'Type', 'OwnerId'],
      sort: [['CloseDate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'CloseDateInFuture',
      errorMessage: '预计成交日期必须是未来日期（除非已成交）',
      formula: 'AND(CloseDate < TODAY(), Stage != "Closed Won", Stage != "Closed Lost")'
    },
    {
      name: 'AmountRequired',
      errorMessage: '商机金额不能为空',
      formula: 'AND(Stage != "Prospecting", ISBLANK(Amount))'
    },
    {
      name: 'NextStepRequired',
      errorMessage: '进行中的商机必须填写下一步行动',
      formula: 'AND(Stage != "Closed Won", Stage != "Closed Lost", ISBLANK(NextStep))'
    },
    {
      name: 'ContactRequired',
      errorMessage: '商务谈判阶段必须指定主要联系人',
      formula: 'AND(Stage = "Negotiation", ISBLANK(ContactId))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '商机信息',
        columns: 2,
        fields: ['Name', 'AccountId', 'ContactId', 'OwnerId', 'Type', 'LeadSource']
      },
      {
        label: '销售阶段',
        columns: 2,
        fields: ['Stage', 'Probability', 'ForecastCategory', 'NextStep']
      },
      {
        label: '金额与日期',
        columns: 2,
        fields: ['Amount', 'ExpectedRevenue', 'CloseDate', 'DaysOpen']
      }
    ]
  }
};

export default Opportunity;
