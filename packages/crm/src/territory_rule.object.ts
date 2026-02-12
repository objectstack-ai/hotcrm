import { ObjectSchema, Field } from '@objectstack/spec/data';

export const TerritoryRule = ObjectSchema.create({
  name: 'territory_rule',
  label: 'Territory Rule',
  pluralLabel: 'Territory Rules',
  icon: 'ruler-combined',
  description: 'Rules for automatic territory assignment based on account attributes',

  fields: {
    territory_id: Field.masterDetail('territory', { label: 'Territory', required: true }),
    name: Field.text({ label: 'Rule Name', required: true, maxLength: 255 }),
    rule_type: Field.select({
      label: 'Rule Type', required: true,
      options: [
        { label: 'Geographic', value: 'geographic' },
        { label: 'Industry', value: 'industry' },
        { label: 'Revenue Range', value: 'revenue_range' },
        { label: 'Employee Count', value: 'employee_count' },
        { label: 'Account Type', value: 'account_type' },
        { label: 'Custom Field', value: 'custom_field' }
      ]
    }),
    field_name: Field.text({ label: 'Field Name', maxLength: 100, description: 'Object field to evaluate' }),
    operator: Field.select({
      label: 'Operator',
      options: [
        { label: 'Equals', value: 'equals' },
        { label: 'Not Equals', value: 'not_equals' },
        { label: 'Contains', value: 'contains' },
        { label: 'Starts With', value: 'starts_with' },
        { label: 'Greater Than', value: 'greater_than' },
        { label: 'Less Than', value: 'less_than' },
        { label: 'In', value: 'in' },
        { label: 'Between', value: 'between' }
      ]
    }),
    value: Field.text({ label: 'Value', maxLength: 500, description: 'Value or comma-separated values to match' }),
    value_min: Field.number({ label: 'Min Value', precision: 2, description: 'Minimum value for range rules' }),
    value_max: Field.number({ label: 'Max Value', precision: 2, description: 'Maximum value for range rules' }),
    priority: Field.number({ label: 'Priority', precision: 0, defaultValue: 100, description: 'Lower number = higher priority' }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true }),
    match_count: Field.number({ label: 'Match Count', readonly: true, precision: 0, defaultValue: 0, description: 'Number of accounts matching this rule' })
  },

  enable: { searchable: true, trackHistory: true, feeds: false, files: false },
});
