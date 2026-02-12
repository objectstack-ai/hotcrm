import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ForecastItem = ObjectSchema.create({
  name: 'forecast_item',
  label: 'Forecast Item',
  pluralLabel: 'Forecast Items',
  icon: 'chart-bar',
  description: 'Individual opportunity contributions to a forecast',

  fields: {
    forecast_id: Field.masterDetail('forecast', {
      label: 'Forecast',
      required: true,
      description: 'Parent forecast record'
    }),
    opportunity_id: Field.lookup('opportunity', {
      label: 'Opportunity',
      required: true,
      description: 'Contributing opportunity'
    }),
    amount: Field.currency({
      label: 'Amount',
      required: true,
      description: 'Amount contributed to forecast'
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
    probability: Field.percent({
      label: 'Probability',
      description: 'Win probability from opportunity'
    }),
    weighted_amount: Field.currency({
      label: 'Weighted Amount',
      readonly: true,
      description: 'Amount weighted by probability'
    }),
    close_date: Field.date({
      label: 'Expected Close Date',
      description: 'Expected close date from opportunity'
    }),
    stage: Field.text({
      label: 'Opportunity Stage',
      readonly: true,
      maxLength: 100,
      description: 'Current stage of the opportunity'
    }),
    owner_override: Field.currency({
      label: 'Owner Override',
      description: 'Manual override amount by opportunity owner'
    }),
    manager_override: Field.currency({
      label: 'Manager Override',
      description: 'Manual override amount by manager'
    }),
    is_override: Field.boolean({
      label: 'Has Override',
      readonly: true,
      defaultValue: false,
      description: 'Whether this item has been manually overridden'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: false,
    files: false
  },
});
