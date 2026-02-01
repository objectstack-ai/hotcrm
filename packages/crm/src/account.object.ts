
const Account = {
  name: 'account',
  label: '客户',
  labelPlural: '客户',
  icon: 'building',
  description: '企业客户和组织管理',
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
      label: '客户名称',
      required: true,
      searchable: true,
      unique: true,
      maxLength: 255
    },
    account_number: {
      type: 'text',
      label: '客户编号',
      unique: true,
      maxLength: 40
    },
    type: {
      type: 'select',
      label: '客户类型',
      options: [
        { label: '潜在客户', value: 'Prospect' },
        { label: '现有客户', value: 'Customer' },
        { label: '合作伙伴', value: 'Partner' },
        { label: '竞争对手', value: 'Competitor' },
        { label: '其他', value: 'Other' }
      ]
    },
    industry: {
      type: 'select',
      label: '行业',
      searchable: true,
      options: [
        { label: '科技/互联网', value: 'Technology' },
        { label: '金融服务', value: 'Finance' },
        { label: '制造业', value: 'Manufacturing' },
        { label: '零售', value: 'Retail' },
        { label: '医疗健康', value: 'Healthcare' },
        { label: '教育', value: 'Education' },
        { label: '房地产', value: 'RealEstate' },
        { label: '能源', value: 'Energy' },
        { label: '咨询服务', value: 'Consulting' },
        { label: '其他', value: 'Other' }
      ]
    },
    annual_revenue: {
      type: 'currency',
      label: '年营收',
      precision: 2
    },
    number_of_employees: {
      type: 'number',
      label: '员工人数'
    },
    rating: {
      type: 'select',
      label: '客户评级',
      options: [
        { label: '热门 🔥', value: 'Hot' },
        { label: '温暖 ⭐', value: 'Warm' },
        { label: '冷淡 ❄️', value: 'Cold' }
      ]
    },
    phone: {
      type: 'phone',
      label: '电话'
    },
    fax: {
      type: 'phone',
      label: '传真'
    },
    website: {
      type: 'url',
      label: '网站'
    },
    email: {
      type: 'email',
      label: '邮箱'
    },
    billing_street: {
      type: 'textarea',
      label: '账单地址（街道）',
      rows: 2
    },
    billing_city: {
      type: 'text',
      label: '账单地址（城市）',
      maxLength: 40
    },
    billing_state: {
      type: 'text',
      label: '账单地址（省份）',
      maxLength: 40
    },
    billing_postal_code: {
      type: 'text',
      label: '账单地址（邮编）',
      maxLength: 20
    },
    billing_country: {
      type: 'text',
      label: '账单地址（国家）',
      maxLength: 40
    },
    shipping_street: {
      type: 'textarea',
      label: '送货地址（街道）',
      rows: 2
    },
    shipping_city: {
      type: 'text',
      label: '送货地址（城市）',
      maxLength: 40
    },
    shipping_state: {
      type: 'text',
      label: '送货地址（省份）',
      maxLength: 40
    },
    shipping_postal_code: {
      type: 'text',
      label: '送货地址（邮编）',
      maxLength: 20
    },
    shipping_country: {
      type: 'text',
      label: '送货地址（国家）',
      maxLength: 40
    },
    customer_status: {
      type: 'select',
      label: '客户状态',
      defaultValue: 'Prospect',
      options: [
        { label: '潜在客户', value: 'Prospect' },
        { label: '活跃客户', value: 'Active Customer' },
        { label: '流失客户', value: 'Churned' },
        { label: '暂停合作', value: 'On Hold' }
      ]
    },
    description: {
      type: 'textarea',
      label: '描述',
      rows: 5
    },
    sla_tier: {
      type: 'select',
      label: 'SLA等级',
      options: [
        { label: '白金', value: 'Platinum' },
        { label: '黄金', value: 'Gold' },
        { label: '白银', value: 'Silver' },
        { label: '标准', value: 'Standard' }
      ],
      description: '服务等级协议层级'
    },
    health_score: {
      type: 'number',
      label: '健康度评分',
      precision: 0,
      min: 0,
      max: 100,
      description: '客户健康度评分 (0-100)'
    },
    next_renewal_date: {
      type: 'date',
      label: '下次续约日期'
    },
    contract_value: {
      type: 'currency',
      label: '合同总价值',
      precision: 2,
      readonly: true,
      description: '所有有效合同的总价值'
    },
    owner_id: {
      type: 'lookup',
      label: '负责人',
      reference: 'users',
      required: true,
      defaultValue: '$currentUser'
    },
    parent_id: {
      type: 'lookup',
      label: '上级客户',
      reference: 'account'
    }
  },
  relationships: [
    {
      name: 'Contacts',
      type: 'hasMany',
      object: 'Contact',
      foreignKey: 'account_id',
      label: '联系人'
    },
    {
      name: 'Opportunities',
      type: 'hasMany',
      object: 'Opportunity',
      foreignKey: 'account_id',
      label: '商机'
    },
    {
      name: 'Contracts',
      type: 'hasMany',
      object: 'Contract',
      foreignKey: 'account_id',
      label: '合同'
    },
    {
      name: 'ChildAccounts',
      type: 'hasMany',
      object: 'Account',
      foreignKey: 'parent_id',
      label: '下级客户'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有客户',
      filters: [],
      columns: ['name', 'type', 'industry', 'annual_revenue', 'rating', 'customer_status', 'owner_id']
    },
    {
      name: 'MyAccounts',
      label: '我的客户',
      filters: [['owner_id', '=', '$currentUser']],
      columns: ['name', 'type', 'industry', 'customer_status', 'rating', 'health_score']
    },
    {
      name: 'ActiveCustomers',
      label: '活跃客户',
      filters: [['customer_status', '=', 'Active Customer']],
      columns: ['name', 'industry', 'contract_value', 'sla_tier', 'health_score', 'next_renewal_date', 'owner_id'],
      sort: [['contract_value', 'desc']]
    },
    {
      name: 'AtRisk',
      label: '风险客户',
      filters: [
        ['customer_status', '=', 'Active Customer'],
        ['health_score', '<', 50]
      ],
      columns: ['name', 'industry', 'health_score', 'next_renewal_date', 'sla_tier', 'owner_id'],
      sort: [['health_score', 'asc']]
    },
    {
      name: 'HighValue',
      label: '高价值客户',
      filters: [
        ['customer_status', '=', 'Active Customer'],
        ['contract_value', '>', 100000]
      ],
      columns: ['name', 'industry', 'contract_value', 'annual_revenue', 'sla_tier', 'health_score', 'owner_id'],
      sort: [['contract_value', 'desc']]
    },
    {
      name: 'RenewalsSoon',
      label: '即将续约',
      filters: [
        ['next_renewal_date', 'next_90_days'],
        ['customer_status', '=', 'Active Customer']
      ],
      columns: ['name', 'industry', 'next_renewal_date', 'contract_value', 'health_score', 'owner_id'],
      sort: [['next_renewal_date', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireIndustryForHighRevenue',
      errorMessage: '年营收超过1000万的客户必须选择行业',
      formula: 'AND(annual_revenue > 10000000, ISBLANK(industry))'
    },
    {
      name: 'RequireSLAForActiveCustomers',
      errorMessage: '活跃客户必须设置SLA等级',
      formula: 'AND(customer_status = "Active Customer", ISBLANK(sla_tier))'
    },
    {
      name: 'HealthScoreRange',
      errorMessage: '健康度评分必须在0-100之间',
      formula: 'OR(health_score < 0, health_score > 100)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['name', 'account_number', 'type', 'industry', 'owner_id', 'parent_id']
      },
      {
        label: '客户状态',
        columns: 2,
        fields: ['customer_status', 'rating', 'sla_tier', 'health_score']
      },
      {
        label: '公司信息',
        columns: 2,
        fields: ['number_of_employees', 'annual_revenue', 'website', 'phone', 'email']
      },
      {
        label: '合同信息',
        columns: 2,
        fields: ['contract_value', 'next_renewal_date']
      },
      {
        label: '账单地址',
        columns: 2,
        fields: ['billing_street', 'billing_city', 'billing_state', 'billing_postal_code', 'billing_country']
      },
      {
        label: '送货地址',
        columns: 2,
        fields: ['shipping_street', 'shipping_city', 'shipping_state', 'shipping_postal_code', 'shipping_country']
      },
      {
        label: '其他信息',
        columns: 1,
        fields: ['description']
      }
    ]
  }
};

export default Account;
