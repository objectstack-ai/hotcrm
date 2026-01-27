import type { ObjectSchema } from '@objectstack/spec/data';

const Contract: ObjectSchema = {
  name: 'Contract',
  label: '合同',
  labelPlural: '合同',
  icon: 'file-text',
  description: '合同管理',
  features: {
    searchable: true,
    trackFieldHistory: true,
    enableNotes: true,
    enableAttachments: true
  },
  fields: [
    {
      name: 'ContractNumber',
      type: 'autoNumber',
      label: '合同编号',
      format: 'CT-{YYYY}{MM}{DD}-{0000}'
    },
    {
      name: 'AccountId',
      type: 'lookup',
      label: '客户',
      referenceTo: 'Account',
      required: true
    },
    {
      name: 'OpportunityId',
      type: 'lookup',
      label: '关联商机',
      referenceTo: 'Opportunity'
    },
    {
      name: 'Status',
      type: 'select',
      label: '状态',
      required: true,
      defaultValue: 'Draft',
      options: [
        { label: '📝 草稿', value: 'Draft' },
        { label: '🔍 审核中', value: 'In Approval' },
        { label: '✅ 已激活', value: 'Activated' },
        { label: '⏸️ 暂停', value: 'On Hold' },
        { label: '✔️ 已完成', value: 'Completed' },
        { label: '❌ 已终止', value: 'Terminated' }
      ]
    },
    {
      name: 'StartDate',
      type: 'date',
      label: '开始日期',
      required: true
    },
    {
      name: 'EndDate',
      type: 'date',
      label: '结束日期'
    },
    {
      name: 'ContractTerm',
      type: 'number',
      label: '合同期限（月）'
    },
    {
      name: 'ContractValue',
      type: 'currency',
      label: '合同金额',
      precision: 2,
      required: true
    }
  ],
  listViews: [
    {
      name: 'All',
      label: '所有合同',
      columns: ['ContractNumber', 'AccountId', 'Status', 'StartDate', 'EndDate', 'ContractValue']
    }
  ]
};

export default Contract;
