import { ObjectSchema, Field } from '@objectstack/spec/data';

export const KPI = ObjectSchema.create({
  name: 'kpi',
  label: 'KPI',
  fields: {
    name: Field.text({ label: 'KPI Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 }),
    metric_type: Field.select({
      label: 'Metric Type',
      required: true,
      options: [
        { label: 'Currency', value: 'currency' },
        { label: 'Number', value: 'number' },
        { label: 'Percentage', value: 'percentage' },
        { label: 'Duration', value: 'duration' }
      ]
    }),
    target_value: Field.number({ label: 'Target Value', required: true }),
    current_value: Field.number({ label: 'Current Value', defaultValue: 0 }),
    period: Field.select({
      label: 'Period',
      required: true,
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Yearly', value: 'yearly' }
      ]
    }),
    trend: Field.select({
      label: 'Trend',
      options: [
        { label: 'Up', value: 'up' },
        { label: 'Down', value: 'down' },
        { label: 'Flat', value: 'flat' }
      ]
    }),
    threshold_warning: Field.number({ label: 'Warning Threshold' }),
    threshold_critical: Field.number({ label: 'Critical Threshold' }),
    source_object: Field.text({ label: 'Source Object', maxLength: 100 }),
    source_field: Field.text({ label: 'Source Field', maxLength: 100 }),
    owner_id: Field.lookup({ label: 'Owner', reference_to: 'users' })
  }
});
