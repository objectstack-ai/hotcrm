export default {
  name: 'assignment_rule',
  label: 'Assignment Rule',
  icon: 'flow',
  description: 'Rules to automatically assign records to users or queues.',
  fields: {
    name: { type: 'text', label: 'Rule Name', required: true },
    object_name: { 
      type: 'select', 
      label: 'Object', 
      options: ['lead', 'case'],
      required: true 
    },
    active: { type: 'boolean', label: 'Active', defaultValue: true },
    sort_order: { type: 'number', label: 'Sort Order', defaultValue: 1 },
    criteria_field: { type: 'text', label: 'Criteria Field', required: true, description: 'Field API Name to evaluate' },
    criteria_operator: { 
      type: 'select', 
      label: 'Operator', 
      options: ['=', '!=', '>', '<', 'contains'], 
      required: true 
    },
    criteria_value: { type: 'text', label: 'Value', required: true },
    assign_to: { type: 'lookup', reference_to: 'users', label: 'Assign To User' },
    assign_to_queue: { type: 'lookup', reference_to: 'queue', label: 'Assign To Queue' }
  }
}
