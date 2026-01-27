import type { ServiceObject } from '@objectstack/spec/data';

const Contact = {
  name: 'Contact',
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
    }
  ]
};

export default Contact;
