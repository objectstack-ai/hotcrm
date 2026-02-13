import { ObjectSchema, Field } from '@objectstack/spec/data';

export const KPI = ObjectSchema.create({
  name: 'kpi',
  label: 'KPI',
  pluralLabel: 'KPIs',
  icon: 'target',
  description: 'Key Performance Indicator definitions with targets and thresholds',

  fields: {
    name: Field.text({
      label: 'KPI Name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'Description',
    }),
    metric_type: Field.select({
      label: 'Metric Type',
      options: [
        { label: 'Count', value: 'count' },
        { label: 'Sum', value: 'sum' },
        { label: 'Average', value: 'average' },
        { label: 'Min', value: 'min' },
        { label: 'Max', value: 'max' },
        { label: 'Custom', value: 'custom' }
      ]
    }),
    target_value: Field.number({
      label: 'Target Value',
      precision: 2
    }),
    current_value: Field.number({
      label: 'Current Value',
      precision: 2
    }),
    period: Field.select({
      label: 'Period',
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
    threshold_warning: Field.number({
      label: 'Warning Threshold',
      description: 'Value below which a warning is triggered',
      precision: 2
    }),
    threshold_critical: Field.number({
      label: 'Critical Threshold',
      description: 'Value below which a critical alert is triggered',
      precision: 2
    }),
    source_object: Field.text({
      label: 'Source Object',
      maxLength: 100
    }),
    source_field: Field.text({
      label: 'Source Field',
      maxLength: 100
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});

export default KPI;
