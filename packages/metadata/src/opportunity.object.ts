import type { ObjectSchema } from '@objectstack/spec/data';

const Opportunity: ObjectSchema = {
  name: 'Opportunity',
  label: '商机',
  labelPlural: '商机',
  icon: 'briefcase',
  description: '销售商机和管道管理',
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
      label: '商机名称',
      required: true,
      searchable: true,
      length: 120
    },
    {
      name: 'AccountId',
      type: 'lookup',
      label: '客户',
      referenceTo: 'Account',
      required: true
    },
    {
      name: 'ContactId',
      type: 'lookup',
      label: '主要联系人',
      referenceTo: 'Contact'
    },
    {
      name: 'Amount',
      type: 'currency',
      label: '金额',
      precision: 2
    },
    {
      name: 'CloseDate',
      type: 'date',
      label: '预计成交日期',
      required: true
    },
    {
      name: 'Stage',
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
    {
      name: 'Probability',
      type: 'percent',
      label: '赢单概率'
    },
    {
      name: 'OwnerId',
      type: 'lookup',
      label: '负责人',
      referenceTo: 'User',
      required: true,
      defaultValue: '$currentUser'
    }
  ],
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
      columns: ['Name', 'AccountId', 'Amount', 'CloseDate', 'Stage', 'OwnerId']
    }
  ]
};

export default Opportunity;
