import type { ObjectSchema } from '@objectstack/spec/data';

const Account: ObjectSchema = {
  name: 'Account',
  label: '客户',
  labelPlural: '客户',
  icon: 'building',
  description: '企业客户和组织管理',
  features: {
    searchable: true,
    trackFieldHistory: true,
    enableActivities: true,
    enableNotes: true,
    enableAttachments: true
  },
  fields: [
    {
      name: 'Name',
      type: 'text',
      label: '客户名称',
      required: true,
      searchable: true,
      unique: true,
      length: 255
    },
    {
      name: 'AccountNumber',
      type: 'text',
      label: '客户编号',
      unique: true,
      length: 40
    },
    {
      name: 'Type',
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
    {
      name: 'Industry',
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
    {
      name: 'AnnualRevenue',
      type: 'currency',
      label: '年营收',
      precision: 2
    },
    {
      name: 'NumberOfEmployees',
      type: 'number',
      label: '员工人数'
    },
    {
      name: 'Rating',
      type: 'select',
      label: '客户评级',
      options: [
        { label: '热门 🔥', value: 'Hot' },
        { label: '温暖 ⭐', value: 'Warm' },
        { label: '冷淡 ❄️', value: 'Cold' }
      ]
    },
    {
      name: 'Phone',
      type: 'phone',
      label: '电话'
    },
    {
      name: 'Fax',
      type: 'phone',
      label: '传真'
    },
    {
      name: 'Website',
      type: 'url',
      label: '网站'
    },
    {
      name: 'Email',
      type: 'email',
      label: '邮箱'
    },
    {
      name: 'BillingStreet',
      type: 'textarea',
      label: '账单地址（街道）',
      rows: 2
    },
    {
      name: 'BillingCity',
      type: 'text',
      label: '账单地址（城市）',
      length: 40
    },
    {
      name: 'BillingState',
      type: 'text',
      label: '账单地址（省份）',
      length: 40
    },
    {
      name: 'BillingPostalCode',
      type: 'text',
      label: '账单地址（邮编）',
      length: 20
    },
    {
      name: 'BillingCountry',
      type: 'text',
      label: '账单地址（国家）',
      length: 40
    },
    {
      name: 'ShippingStreet',
      type: 'textarea',
      label: '送货地址（街道）',
      rows: 2
    },
    {
      name: 'ShippingCity',
      type: 'text',
      label: '送货地址（城市）',
      length: 40
    },
    {
      name: 'ShippingState',
      type: 'text',
      label: '送货地址（省份）',
      length: 40
    },
    {
      name: 'ShippingPostalCode',
      type: 'text',
      label: '送货地址（邮编）',
      length: 20
    },
    {
      name: 'ShippingCountry',
      type: 'text',
      label: '送货地址（国家）',
      length: 40
    },
    {
      name: 'CustomerStatus',
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
    {
      name: 'Description',
      type: 'textarea',
      label: '描述',
      rows: 5
    },
    {
      name: 'OwnerId',
      type: 'lookup',
      label: '负责人',
      referenceTo: 'User',
      required: true,
      defaultValue: '$currentUser'
    },
    {
      name: 'ParentId',
      type: 'lookup',
      label: '上级客户',
      referenceTo: 'Account'
    }
  ],
  relationships: [
    {
      name: 'Contacts',
      type: 'hasMany',
      object: 'Contact',
      foreignKey: 'AccountId',
      label: '联系人'
    },
    {
      name: 'Opportunities',
      type: 'hasMany',
      object: 'Opportunity',
      foreignKey: 'AccountId',
      label: '商机'
    },
    {
      name: 'Contracts',
      type: 'hasMany',
      object: 'Contract',
      foreignKey: 'AccountId',
      label: '合同'
    },
    {
      name: 'ChildAccounts',
      type: 'hasMany',
      object: 'Account',
      foreignKey: 'ParentId',
      label: '下级客户'
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有客户',
      filters: [],
      columns: ['Name', 'Type', 'Industry', 'AnnualRevenue', 'Rating', 'OwnerId']
    },
    {
      name: 'MyAccounts',
      label: '我的客户',
      filters: [['OwnerId', '=', '$currentUser']],
      columns: ['Name', 'Type', 'Industry', 'CustomerStatus', 'Rating']
    }
  ],
  validationRules: [
    {
      name: 'RequireIndustryForHighRevenue',
      errorMessage: '年营收超过1000万的客户必须选择行业',
      formula: 'AND(AnnualRevenue > 10000000, ISBLANK(Industry))'
    }
  ]
};

export default Account;
