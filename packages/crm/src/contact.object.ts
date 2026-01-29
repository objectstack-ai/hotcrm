import type { ServiceObject } from '@objectstack/spec/data';

const Contact = {
  name: 'contact',
  label: '联系人',
  labelPlural: '联系人',
  icon: 'user',
  description: '个人联系人管理',
  capabilities: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true
  },
  fields: {
    FirstName: {
      type: 'text',
      label: '名',
      maxLength: 40
    },
    LastName: {
      type: 'text',
      label: '姓',
      required: true,
      searchable: true,
      maxLength: 80
    },
    Salutation: {
      type: 'select',
      label: '称谓',
      options: [
        { label: '先生', value: 'Mr.' },
        { label: '女士', value: 'Ms.' },
        { label: '博士', value: 'Dr.' },
        { label: '教授', value: 'Prof.' }
      ]
    },
    AccountId: {
      type: 'masterDetail',
      label: '所属客户',
      reference: 'Account',
      required: true,
      cascadeDelete: true
    },
    Title: {
      type: 'text',
      label: '职位',
      maxLength: 128
    },
    Department: {
      type: 'text',
      label: '部门',
      maxLength: 80
    },
    Level: {
      type: 'select',
      label: '职级',
      options: [
        { label: 'C级高管', value: 'C-Level' },
        { label: 'VP级', value: 'VP' },
        { label: '总监', value: 'Director' },
        { label: '经理', value: 'Manager' },
        { label: '专员', value: 'Individual Contributor' }
      ]
    },
    Email: {
      type: 'email',
      label: '邮箱',
      unique: true
    },
    Phone: {
      type: 'phone',
      label: '电话'
    },
    MobilePhone: {
      type: 'phone',
      label: '手机'
    },
    Fax: {
      type: 'phone',
      label: '传真'
    },
    IsDecisionMaker: {
      type: 'checkbox',
      label: '决策者',
      defaultValue: false,
      description: '是否为主要决策者'
    },
    InfluenceLevel: {
      type: 'select',
      label: '影响力',
      options: [
        { label: '高 - 最终决策者', value: 'High' },
        { label: '中 - 关键影响者', value: 'Medium' },
        { label: '低 - 普通参与者', value: 'Low' }
      ]
    },
    RelationshipStrength: {
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
    PreferredContact: {
      type: 'select',
      label: '首选联系方式',
      options: [
        { label: '邮箱', value: 'Email' },
        { label: '电话', value: 'Phone' },
        { label: '手机', value: 'Mobile' },
        { label: '微信', value: 'WeChat' }
      ]
    },
    LastContactDate: {
      type: 'date',
      label: '最后联系日期',
      readonly: true
    },
    Notes: {
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
      foreignKey: 'ContactId',
      label: '商机'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有联系人',
      columns: ['FirstName', 'LastName', 'AccountId', 'Title', 'Email', 'Phone']
    },
    {
      name: 'DecisionMakers',
      label: '决策者',
      filters: [['IsDecisionMaker', '=', true]],
      columns: ['FirstName', 'LastName', 'AccountId', 'Title', 'Level', 'InfluenceLevel', 'RelationshipStrength'],
      sort: [['LastName', 'asc']]
    },
    {
      name: 'KeyInfluencers',
      label: '关键影响者',
      filters: [['InfluenceLevel', 'in', ['High', 'Medium']]],
      columns: ['FirstName', 'LastName', 'AccountId', 'Title', 'InfluenceLevel', 'RelationshipStrength', 'LastContactDate'],
      sort: [['InfluenceLevel', 'asc']]
    },
    {
      name: 'StrongRelationships',
      label: '强关系联系人',
      filters: [['RelationshipStrength', '=', 'Strong']],
      columns: ['FirstName', 'LastName', 'AccountId', 'Title', 'Email', 'Phone', 'LastContactDate']
    }
  ],
  validationRules: [
    {
      name: 'RequireEmailOrPhone',
      errorMessage: '必须至少填写邮箱或电话之一',
      formula: 'AND(ISBLANK(Email), ISBLANK(Phone), ISBLANK(MobilePhone))'
    },
    {
      name: 'DecisionMakerRequiresInfluence',
      errorMessage: '决策者的影响力必须设置为"高"',
      formula: 'AND(IsDecisionMaker = true, InfluenceLevel != "High")'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['Salutation', 'FirstName', 'LastName', 'AccountId', 'Title', 'Department']
      },
      {
        label: '联系方式',
        columns: 2,
        fields: ['Email', 'Phone', 'MobilePhone', 'Fax', 'PreferredContact']
      },
      {
        label: '职业信息',
        columns: 2,
        fields: ['Level', 'IsDecisionMaker', 'InfluenceLevel', 'RelationshipStrength']
      },
      {
        label: '互动信息',
        columns: 2,
        fields: ['LastContactDate']
      },
      {
        label: '备注',
        columns: 1,
        fields: ['Notes']
      }
    ]
  }
};

export default Contact;
