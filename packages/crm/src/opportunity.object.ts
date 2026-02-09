import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Opportunity = ObjectSchema.create({
  name: 'opportunity',
  label: 'Opportunity',
  pluralLabel: 'Opportunities',
  icon: 'briefcase',
  description: '销售商机和管道管理',

  fields: {
    name: Field.text({
      label: 'Opportunity Name',
      required: true,
      maxLength: 120
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      required: true
    }),
    contact_id: Field.lookup('contact', { label: 'Primary Contact' }),
    amount: Field.currency({
      label: 'Amount',
      precision: 2
    }),
    close_date: Field.date({
      label: 'Expected Close Date',
      required: true
    }),
    stage: Field.select({
      label: 'Stage',
      required: true,
      options: [
        {
          "label": "🔍 Prospecting",
          "value": "Prospecting",
          "probability": 10
        },
        {
          "label": "📞 Qualification",
          "value": "Qualification",
          "probability": 20
        },
        {
          "label": "💡 Needs Analysis",
          "value": "Needs Analysis",
          "probability": 40
        },
        {
          "label": "📊 Proposal",
          "value": "Proposal",
          "probability": 60
        },
        {
          "label": "💰 Negotiation",
          "value": "Negotiation",
          "probability": 80
        },
        {
          "label": "✅ Closed Won",
          "value": "Closed Won",
          "probability": 100,
          "isWon": true
        },
        {
          "label": "❌ Closed Lost",
          "value": "Closed Lost",
          "probability": 0,
          "isLost": true
        }
      ]
    }),
    probability: Field.percent({
      label: 'Win Probability',
      description: '赢单概率百分比'
    }),
    next_step: Field.text({
      label: 'Next Step',
      description: '明确的下一步行动计划',
      maxLength: 255
    }),
    lead_source: Field.select({
      label: 'Lead Source',
      options: [
        {
          "label": "Web",
          "value": "Web"
        },
        {
          "label": "Phone Inquiry",
          "value": "Phone Inquiry"
        },
        {
          "label": "Partner Referral",
          "value": "Partner Referral"
        },
        {
          "label": "Trade Show",
          "value": "Trade Show"
        },
        {
          "label": "Social Media",
          "value": "Social Media"
        },
        {
          "label": "Advertisement",
          "value": "Advertisement"
        },
        {
          "label": "Customer Referral",
          "value": "Customer Referral"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    forecast_category: Field.select({
      label: 'Forecast Category',
      defaultValue: 'Pipeline',
      options: [
        {
          "label": "Pipeline",
          "value": "Pipeline"
        },
        {
          "label": "Best Case",
          "value": "Best Case"
        },
        {
          "label": "Commit",
          "value": "Commit"
        },
        {
          "label": "Omitted",
          "value": "Omitted"
        },
        {
          "label": "Closed",
          "value": "Closed"
        }
      ]
    }),
    type: Field.select({
      label: 'Opportunity Type',
      options: [
        {
          "label": "New Business",
          "value": "New Business"
        },
        {
          "label": "Existing Business - Upgrade",
          "value": "Existing Business - Upgrade"
        },
        {
          "label": "Existing Business - Renewal",
          "value": "Existing Business - Renewal"
        },
        {
          "label": "Existing Business - Replacement",
          "value": "Existing Business - Replacement"
        }
      ]
    }),
    expected_revenue: Field.currency({
      label: 'Expected Revenue',
      description: '基于金额和赢单概率计算',
      readonly: true,
      precision: 2
    }),
    days_open: Field.number({
      label: 'Days Open',
      readonly: true,
      precision: 0
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true,
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
});