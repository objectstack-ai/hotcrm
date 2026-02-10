import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Contract = ObjectSchema.create({
  name: 'contract',
  label: 'Contract',
  pluralLabel: 'Contracts',
  icon: 'file-text',
  description: 'Contract Management',

  fields: {
    contract_number: Field.autonumber({
      label: 'Contract Number',
      format: 'CT-{YYYY}{MM}{DD}-{0000}'
    }),
    account: Field.lookup('account', {
      label: 'Account',
      required: true
    }),
    opportunity: Field.lookup('opportunity', { label: 'Opportunity' }),
    status: Field.select({
      label: 'Status',
      required: true,
      defaultValue: 'draft',
      options: [
        {
          "label": "📝 Draft",
          "value": "draft"
        },
        {
          "label": "🔍 In Approval",
          "value": "in_approval"
        },
        {
          "label": "✅ Activated",
          "value": "activated"
        },
        {
          "label": "⏸️ On Hold",
          "value": "on_hold"
        },
        {
          "label": "✔️ Completed",
          "value": "completed"
        },
        {
          "label": "❌ Terminated",
          "value": "terminated"
        }
      ]
    }),
    start_date: Field.date({
      label: 'Start Date',
      required: true
    }),
    end_date: Field.date({ label: 'End Date' }),
    contract_term: Field.number({ label: 'Contract Term (Months)' }),
    contract_value: Field.currency({
      label: 'Contract Value',
      required: true,
      precision: 2
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true
  },
});