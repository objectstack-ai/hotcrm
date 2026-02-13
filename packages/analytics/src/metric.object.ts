import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Metric = ObjectSchema.create({
  name: 'metric',
  label: 'Metric',
  pluralLabel: 'Metrics',
  icon: 'calculator',
  description: 'Business metric calculations with formulas and aggregations',

  fields: {
    name: Field.text({
      label: 'Metric Name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'Description',
    }),
    formula: Field.textarea({
      label: 'Formula',
      description: 'Calculation formula expression'
    }),
    source_object: Field.text({
      label: 'Source Object',
      required: true,
      maxLength: 100
    }),
    aggregation_type: Field.select({
      label: 'Aggregation Type',
      options: [
        { label: 'Count', value: 'count' },
        { label: 'Sum', value: 'sum' },
        { label: 'Average', value: 'average' },
        { label: 'Min', value: 'min' },
        { label: 'Max', value: 'max' }
      ]
    }),
    time_grain: Field.select({
      label: 'Time Grain',
      options: [
        { label: 'Hourly', value: 'hourly' },
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Yearly', value: 'yearly' }
      ]
    }),
    filters: Field.textarea({
      label: 'Filters',
      description: 'JSON array of filter conditions'
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});

export default Metric;
