import type { ObjectSchema } from '@objectstack/spec/data';

const Contact: ObjectSchema = {
  name: 'Contact',
  label: '联系人',
  labelPlural: '联系人',
  icon: 'user',
  description: '个人联系人管理',
  features: {
    searchable: true,
    trackFieldHistory: true,
    enableActivities: true,
    enableNotes: true
  },
  fields: [
    {
      name: 'FirstName',
      type: 'text',
      label: '名',
      length: 40
    },
    {
      name: 'LastName',
      type: 'text',
      label: '姓',
      required: true,
      searchable: true,
      length: 80
    },
    {
      name: 'Salutation',
      type: 'select',
      label: '称谓',
      options: [
        { label: '先生', value: 'Mr.' },
        { label: '女士', value: 'Ms.' },
        { label: '博士', value: 'Dr.' },
        { label: '教授', value: 'Prof.' }
      ]
    },
    {
      name: 'AccountId',
      type: 'masterDetail',
      label: '所属客户',
      referenceTo: 'Account',
      required: true,
      cascadeDelete: true
    },
    {
      name: 'Title',
      type: 'text',
      label: '职位',
      length: 128
    },
    {
      name: 'Department',
      type: 'text',
      label: '部门',
      length: 80
    },
    {
      name: 'Level',
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
    {
      name: 'Email',
      type: 'email',
      label: '邮箱',
      unique: true
    },
    {
      name: 'Phone',
      type: 'phone',
      label: '电话'
    },
    {
      name: 'MobilePhone',
      type: 'phone',
      label: '手机'
    },
    {
      name: 'Fax',
      type: 'phone',
      label: '传真'
    }
  ],
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
