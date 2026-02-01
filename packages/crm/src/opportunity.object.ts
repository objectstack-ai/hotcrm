
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
    name: {
      type: 'text',
      label: '商机名称',
      required: true,
      searchable: true,
      maxLength: 120
    },
    account_id: {
      type: 'lookup',
      label: '客户',
      reference: 'account',
      required: true
    },
    contact_id: {
      type: 'lookup',
      label: '主要联系人',
      reference: 'contact'
    },
    amount: {
      type: 'currency',
      label: '金额',
      precision: 2
    },
    close_date: {
      type: 'date',
      label: '预计成交日期',
      required: true
    },
    stage: {
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
    probability: {
      type: 'percent',
      label: '赢单概率',
      description: '赢单概率百分比'
    },
    next_step: {
      type: 'text',
      label: '下一步行动',
      maxLength: 255,
      description: '明确的下一步行动计划'
    },
    lead_source: {
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
    forecast_category: {
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
    type: {
      type: 'select',
      label: '商机类型',
      options: [
        { label: '新业务', value: 'New Business' },
        { label: '现有业务-升级', value: 'Existing Business - Upgrade' },
        { label: '现有业务-续约', value: 'Existing Business - Renewal' },
        { label: '现有业务-更换', value: 'Existing Business - Replacement' }
      ]
    },
    expected_revenue: {
      type: 'currency',
      label: '预期营收',
      precision: 2,
      formula: 'amount * probability / 100',
      readonly: true,
      description: '基于金额和赢单概率计算'
    },
    days_open: {
      type: 'number',
      label: '开放天数',
      precision: 0,
      formula: 'DATEDIFF(TODAY(), CreatedDate)',
      readonly: true
    },
    owner_id: {
      type: 'lookup',
      label: '负责人',
      reference: 'users',
      required: true,
      defaultValue: '$currentUser'
    }
  },
  relationships: [
    {
      name: 'Contracts',
      type: 'hasMany',
      object: 'Contract',
      foreignKey: 'opportunity_id',
      label: '合同'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有商机',
      columns: ['name', 'account_id', 'amount', 'close_date', 'stage', 'probability', 'owner_id']
    },
    {
      name: 'MyOpenOpportunities',
      label: '我的进行中商机',
      filters: [
        ['owner_id', '=', '$currentUser'],
        ['stage', 'not in', ['Closed Won', 'Closed Lost']]
      ],
      columns: ['name', 'account_id', 'amount', 'expected_revenue', 'close_date', 'stage', 'next_step'],
      sort: [['close_date', 'asc']]
    },
    {
      name: 'ClosingThisMonth',
      label: '本月预计成交',
      filters: [
        ['close_date', 'this_month'],
        ['stage', 'not in', ['Closed Won', 'Closed Lost']]
      ],
      columns: ['name', 'account_id', 'amount', 'probability', 'close_date', 'stage', 'owner_id'],
      sort: [['amount', 'desc']]
    },
    {
      name: 'HighValueDeals',
      label: '高价值商机',
      filters: [
        ['amount', '>', 100000],
        ['stage', 'not in', ['Closed Won', 'Closed Lost']]
      ],
      columns: ['name', 'account_id', 'amount', 'expected_revenue', 'stage', 'probability', 'owner_id'],
      sort: [['amount', 'desc']]
    },
    {
      name: 'StagnantOpportunities',
      label: '停滞商机',
      filters: [
        ['days_open', '>', 90],
        ['stage', 'not in', ['Closed Won', 'Closed Lost']]
      ],
      columns: ['name', 'account_id', 'amount', 'days_open', 'stage', 'next_step', 'owner_id'],
      sort: [['days_open', 'desc']]
    },
    {
      name: 'WonOpportunities',
      label: '已赢单',
      filters: [['stage', '=', 'Closed Won']],
      columns: ['name', 'account_id', 'amount', 'close_date', 'type', 'owner_id'],
      sort: [['close_date', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'CloseDateInFuture',
      errorMessage: '预计成交日期必须是未来日期（除非已成交）',
      formula: 'AND(close_date < TODAY(), stage != "Closed Won", stage != "Closed Lost")'
    },
    {
      name: 'AmountRequired',
      errorMessage: '商机金额不能为空',
      formula: 'AND(stage != "Prospecting", ISBLANK(amount))'
    },
    {
      name: 'NextStepRequired',
      errorMessage: '进行中的商机必须填写下一步行动',
      formula: 'AND(stage != "Closed Won", stage != "Closed Lost", ISBLANK(next_step))'
    },
    {
      name: 'ContactRequired',
      errorMessage: '商务谈判阶段必须指定主要联系人',
      formula: 'AND(stage = "Negotiation", ISBLANK(contact_id))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '商机信息',
        columns: 2,
        fields: ['name', 'account_id', 'contact_id', 'owner_id', 'type', 'lead_source']
      },
      {
        label: '销售阶段',
        columns: 2,
        fields: ['stage', 'probability', 'forecast_category', 'next_step']
      },
      {
        label: '金额与日期',
        columns: 2,
        fields: ['amount', 'expected_revenue', 'close_date', 'days_open']
      }
    ]
  }
};

export default Opportunity;
