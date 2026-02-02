import { ObjectSchema, Field } from '@objectstack/spec/data';

export const AssignmentRule = ObjectSchema.create({
  name: 'assignment_rule',
  label: 'Assignment Rule',
  pluralLabel: 'Assignment Rules',
  icon: 'flow',
  description: 'Rules to automatically assign records to users or queues.',
  
  fields: {
    name: Field.text({ label: 'Rule Name', required: true }),
    object_name: Field.select({ 
      label: 'Object', 
      options: [
        { label: 'lead', value: 'lead' },
        { label: 'case', value: 'case' }
      ],
      required: true 
    }),
    active: Field.checkbox({ label: 'Active', defaultValue: true }),
    sort_order: Field.number({ label: 'Sort Order', defaultValue: 1 }),
    criteria_field: Field.text({ label: 'Criteria Field', required: true, description: 'Field API Name to evaluate' }),
    criteria_operator: Field.select({ 
      label: 'Operator', 
      options: [
        { label: '=', value: '=' },
        { label: '!=', value: '!=' },
        { label: '>', value: '>' },
        { label: '<', value: '<' },
        { label: 'contains', value: 'contains' }
      ], 
      required: true 
    }),
    criteria_value: Field.text({ label: 'Value', required: true }),
    assign_to: Field.lookup('users', { label: 'Assign To User' }),
    assign_to_queue: Field.lookup('queue', { label: 'Assign To Queue' })
  },
  
  enable: {
    searchEnabled: true,
    trackHistory: true,
    apiEnabled: true,
  },
});
