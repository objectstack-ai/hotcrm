import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Opportunity = ObjectSchema.create({
  name: 'opportunity',
  label: 'Opportunity',
  pluralLabel: 'Opportunities',
  icon: 'briefcase',
  description: 'Sales opportunity and pipeline management',

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
          "value": "prospecting",
          "probability": 10
        },
        {
          "label": "📞 Qualification",
          "value": "qualification",
          "probability": 20
        },
        {
          "label": "💡 Needs Analysis",
          "value": "needs_analysis",
          "probability": 40
        },
        {
          "label": "📊 Proposal",
          "value": "proposal",
          "probability": 60
        },
        {
          "label": "💰 Negotiation",
          "value": "negotiation",
          "probability": 80
        },
        {
          "label": "✅ Closed Won",
          "value": "closed_won",
          "probability": 100,
          "isWon": true
        },
        {
          "label": "❌ Closed Lost",
          "value": "closed_lost",
          "probability": 0,
          "isLost": true
        }
      ]
    }),
    probability: Field.percent({
      label: 'Win Probability',
      description: 'Win probability percentage'
    }),
    next_step: Field.text({
      label: 'Next Step',
      description: 'Clear next action plan',
      maxLength: 255
    }),
    lead_source: Field.select({
      label: 'Lead Source',
      options: [
        {
          "label": "Web",
          "value": "web"
        },
        {
          "label": "Phone Inquiry",
          "value": "phone_inquiry"
        },
        {
          "label": "Partner Referral",
          "value": "partner_referral"
        },
        {
          "label": "Trade Show",
          "value": "trade_show"
        },
        {
          "label": "Social Media",
          "value": "social_media"
        },
        {
          "label": "Advertisement",
          "value": "advertisement"
        },
        {
          "label": "Customer Referral",
          "value": "customer_referral"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    forecast_category: Field.select({
      label: 'Forecast Category',
      defaultValue: 'pipeline',
      options: [
        {
          "label": "Pipeline",
          "value": "pipeline"
        },
        {
          "label": "Best Case",
          "value": "best_case"
        },
        {
          "label": "Commit",
          "value": "commit"
        },
        {
          "label": "Omitted",
          "value": "omitted"
        },
        {
          "label": "Closed",
          "value": "closed"
        }
      ]
    }),
    type: Field.select({
      label: 'Opportunity Type',
      options: [
        {
          "label": "New Business",
          "value": "new_business"
        },
        {
          "label": "Existing Business - Upgrade",
          "value": "existing_business_upgrade"
        },
        {
          "label": "Existing Business - Renewal",
          "value": "existing_business_renewal"
        },
        {
          "label": "Existing Business - Replacement",
          "value": "existing_business_replacement"
        }
      ]
    }),
    expected_revenue: Field.currency({
      label: 'Expected Revenue',
      description: 'Calculated from amount and win probability',
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