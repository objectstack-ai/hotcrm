
const Contract = {
  name: 'contract',
  label: '合同',
  labelPlural: '合同',
  icon: 'file-text',
  description: '合同管理',
  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true
  },
  fields: {
    contract_number: {
      type: 'autonumber',
      label: '合同编号',
      format: 'CT-{YYYY}{MM}{DD}-{0000}'
    },
    account_id: {
      type: 'lookup',
      label: '客户',
      reference: 'Account',
      required: true
    },
    opportunity_id: {
      type: 'lookup',
      label: '关联商机',
      reference: 'Opportunity'
    },
    status: {
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
    start_date: {
      type: 'date',
      label: '开始日期',
      required: true
    },
    end_date: {
      type: 'date',
      label: '结束日期'
    },
    contract_term: {
      type: 'number',
      label: '合同期限（月）'
    },
    contract_value: {
      type: 'currency',
      label: '合同金额',
      precision: 2,
      required: true
    }
  },
  listViews: [
    {
      name: 'All',
      label: '所有合同',
      columns: ['contract_number', 'account_id', 'status', 'start_date', 'end_date', 'contract_value']
    }
  ]
};

export default Contract;
