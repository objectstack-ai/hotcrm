import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Metric = ObjectSchema.create({
  name: 'metric',
  label: 'Metric',
  fields: {
    name: Field.text({ label: 'Metric Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 }),
    formula: Field.textarea({ label: 'Formula', required: true, maxLength: 5000 }),
    source_object: Field.text({ label: 'Source Object', required: true, maxLength: 100 }),
    aggregation_type: Field.select({
      label: 'Aggregation Type',
      required: true,
      options: [
        { label: 'Sum', value: 'sum' },
        { label: 'Average', value: 'avg' },
        { label: 'Count', value: 'count' },
        { label: 'Min', value: 'min' },
        { label: 'Max', value: 'max' },
        { label: 'Median', value: 'median' }
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
    filters: Field.textarea({ label: 'Filters (JSON)', maxLength: 5000 }),
    is_calculated: Field.boolean({ label: 'Calculated Metric', defaultValue: false }),
    unit: Field.text({ label: 'Unit', maxLength: 50 }),
    owner_id: Field.lookup({ label: 'Owner', reference_to: 'users' })
  }
});
