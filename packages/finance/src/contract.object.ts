import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Contract = ObjectSchema.create({
  name: 'contract',
  label: '合同',
  pluralLabel: '合同',
  icon: 'file-text',
  description: '合同管理',

  fields: {
    contract_number: Field.autonumber({
      label: '合同编号',
      format: 'CT-{YYYY}{MM}{DD}-{0000}'
    }),
    account: Field.lookup('account', {
      label: '客户',
      required: true
    }),
    opportunity: Field.lookup('opportunity', { label: '关联商机' }),
    status: Field.select({
      label: '状态',
      required: true,
      defaultValue: 'Draft',
      options: [
        {
          "label": "📝 草稿",
          "value": "Draft"
        },
        {
          "label": "🔍 审核中",
          "value": "In Approval"
        },
        {
          "label": "✅ 已激活",
          "value": "Activated"
        },
        {
          "label": "⏸️ 暂停",
          "value": "On Hold"
        },
        {
          "label": "✔️ 已完成",
          "value": "Completed"
        },
        {
          "label": "❌ 已终止",
          "value": "Terminated"
        }
      ]
    }),
    start_date: Field.date({
      label: '开始日期',
      required: true
    }),
    end_date: Field.date({ label: '结束日期' }),
    contract_term: Field.number({ label: '合同期限（月）' }),
    contract_value: Field.currency({
      label: '合同金额',
      required: true,
      precision: 2
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowFeeds: true,
    allowAttachments: true
  },
});