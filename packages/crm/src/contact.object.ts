
const Contact = {
  name: 'contact',
  label: '联系人',
  labelPlural: '联系人',
  icon: 'user',
  description: '个人联系人管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true
  },
  fields: {
    first_name: {
      type: 'text',
      label: '名',
      maxLength: 40
    },
    last_name: {
      type: 'text',
      label: '姓',
      required: true,
      searchable: true,
      maxLength: 80
    },
    salutation: {
      type: 'select',
      label: '称谓',
      options: [
        { label: '先生', value: 'Mr.' },
        { label: '女士', value: 'Ms.' },
        { label: '博士', value: 'Dr.' },
        { label: '教授', value: 'Prof.' }
      ]
    },
    account_id: {
      type: 'master_detail',
      label: '所属客户',
      reference: 'Account',
      required: true,
      cascadeDelete: true
    },
    title: {
      type: 'text',
      label: '职位',
      maxLength: 128
    },
    department: {
      type: 'text',
      label: '部门',
      maxLength: 80
    },
    level: {
      type: 'select',
      label: '职级',
      options: [
        { label: 'C级高管', value: 'C-level' },
        { label: 'VP级', value: 'VP' },
        { label: '总监', value: 'Director' },
        { label: '经理', value: 'Manager' },
        { label: '专员', value: 'Individual Contributor' }
      ]
    },
    email: {
      type: 'email',
      label: '邮箱',
      unique: true
    },
    phone: {
      type: 'phone',
      label: '电话'
    },
    mobile_phone: {
      type: 'phone',
      label: '手机'
    },
    fax: {
      type: 'phone',
      label: '传真'
    },
    is_decision_maker: {
      type: 'checkbox',
      label: '决策者',
      defaultValue: false,
      description: '是否为主要决策者'
    },
    influence_level: {
      type: 'select',
      label: '影响力',
      options: [
        { label: '高 - 最终决策者', value: 'High' },
        { label: '中 - 关键影响者', value: 'Medium' },
        { label: '低 - 普通参与者', value: 'Low' }
      ]
    },
    relationship_strength: {
      type: 'select',
      label: '关系强度',
      options: [
        { label: '强 - 战略伙伴', value: 'Strong' },
        { label: '中 - 良好关系', value: 'Medium' },
        { label: '弱 - 初步接触', value: 'Weak' },
        { label: '未知', value: 'Unknown' }
      ],
      defaultValue: 'Unknown'
    },
    preferred_contact: {
      type: 'select',
      label: '首选联系方式',
      options: [
        { label: '邮箱', value: 'email' },
        { label: '电话', value: 'phone' },
        { label: '手机', value: 'Mobile' },
        { label: '微信', value: 'WeChat' }
      ]
    },
    last_contact_date: {
      type: 'date',
      label: '最后联系日期',
      readonly: true
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 4
    }
  },
  relationships: [
    {
      name: 'Opportunities',
      type: 'hasMany',
      object: 'Opportunity',
      foreignKey: 'contact_id',
      label: '商机'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有联系人',
      columns: ['first_name', 'last_name', 'account_id', 'title', 'email', 'phone']
    },
    {
      name: 'DecisionMakers',
      label: '决策者',
      filters: [['is_decision_maker', '=', true]],
      columns: ['first_name', 'last_name', 'account_id', 'title', 'level', 'influence_level', 'relationship_strength'],
      sort: [['last_name', 'asc']]
    },
    {
      name: 'KeyInfluencers',
      label: '关键影响者',
      filters: [['influence_level', 'in', ['High', 'Medium']]],
      columns: ['first_name', 'last_name', 'account_id', 'title', 'influence_level', 'relationship_strength', 'last_contact_date'],
      sort: [['influence_level', 'asc']]
    },
    {
      name: 'StrongRelationships',
      label: '强关系联系人',
      filters: [['relationship_strength', '=', 'Strong']],
      columns: ['first_name', 'last_name', 'account_id', 'title', 'email', 'phone', 'last_contact_date']
    }
  ],
  validationRules: [
    {
      name: 'RequireEmailOrPhone',
      errorMessage: '必须至少填写邮箱或电话之一',
      formula: 'AND(ISBLANK(email), ISBLANK(phone), ISBLANK(mobile_phone))'
    },
    {
      name: 'DecisionMakerRequiresInfluence',
      errorMessage: '决策者的影响力必须设置为"高"',
      formula: 'AND(is_decision_maker = true, influence_level != "High")'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['salutation', 'first_name', 'last_name', 'account_id', 'title', 'department']
      },
      {
        label: '联系方式',
        columns: 2,
        fields: ['email', 'phone', 'mobile_phone', 'fax', 'preferred_contact']
      },
      {
        label: '职业信息',
        columns: 2,
        fields: ['level', 'is_decision_maker', 'influence_level', 'relationship_strength']
      },
      {
        label: '互动信息',
        columns: 2,
        fields: ['last_contact_date']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default Contact;
