import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Forecast = ObjectSchema.create({
  name: 'forecast',
  label: 'Forecast',
  pluralLabel: 'Forecasts',
  icon: 'chart-line',
  description: 'Sales forecast aggregations by period, owner, and category',

  fields: {
    forecast_period: Field.select({
      label: 'Forecast Period',
      required: true,
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Annually', value: 'annually' }
      ]
    }),
    period_start: Field.date({
      label: 'Period Start',
      required: true,
      description: 'Start date of the forecast period'
    }),
    period_end: Field.date({
      label: 'Period End',
      required: true,
      description: 'End date of the forecast period'
    }),
    owner_id: Field.lookup('users', {
      label: 'Forecast Owner',
      required: true,
      description: 'User or team this forecast belongs to'
    }),
    forecast_category: Field.select({
      label: 'Forecast Category',
      required: true,
      options: [
        { label: 'Pipeline', value: 'pipeline' },
        { label: 'Best Case', value: 'best_case' },
        { label: 'Commit', value: 'commit' },
        { label: 'Closed', value: 'closed' },
        { label: 'Omitted', value: 'omitted' }
      ]
    }),
    amount: Field.currency({
      label: 'Forecast Amount',
      required: true,
      description: 'Total forecasted revenue amount'
    }),
    quota: Field.currency({
      label: 'Quota',
      description: 'Sales quota for this period'
    }),
    quota_attainment: Field.percent({
      label: 'Quota Attainment',
      readonly: true,
      description: 'Percentage of quota achieved'
    }),
    pipeline_amount: Field.currency({
      label: 'Pipeline Amount',
      readonly: true,
      description: 'Total pipeline value for this period'
    }),
    closed_amount: Field.currency({
      label: 'Closed Amount',
      readonly: true,
      description: 'Total closed-won amount for this period'
    }),
    gap_to_quota: Field.currency({
      label: 'Gap to Quota',
      readonly: true,
      description: 'Remaining amount to reach quota'
    }),
    ai_predicted_amount: Field.currency({
      label: 'AI Predicted Amount',
      readonly: true,
      description: 'AI-predicted forecast based on pipeline analysis'
    }),
    ai_confidence: Field.percent({
      label: 'AI Confidence',
      readonly: true,
      description: 'Confidence level of AI prediction'
    }),
    manager_adjustment: Field.currency({
      label: 'Manager Adjustment',
      description: 'Manual adjustment by sales manager'
    }),
    adjusted_amount: Field.currency({
      label: 'Adjusted Amount',
      readonly: true,
      description: 'Final amount after manager adjustments'
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Approved', value: 'approved' },
        { label: 'Locked', value: 'locked' }
      ],
      defaultValue: 'draft'
    }),
    last_calculated_at: Field.datetime({
      label: 'Last Calculated',
      readonly: true
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: false
  },
});
