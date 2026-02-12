import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Macro = ObjectSchema.create({
  name: 'macro',
  label: 'Macro',
  pluralLabel: 'Macros',
  icon: 'bolt',
  description: 'Agent productivity macros for common case operations',

  fields: {
    name: Field.text({ label: 'Macro Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 }),
    category: Field.select({
      label: 'Category',
      options: [
        { label: 'Case Update', value: 'case_update' },
        { label: 'Email Response', value: 'email_response' },
        { label: 'Escalation', value: 'escalation' },
        { label: 'Knowledge', value: 'knowledge' },
        { label: 'Status Change', value: 'status_change' },
        { label: 'Custom', value: 'custom' }
      ]
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Draft', value: 'draft' }
      ],
      defaultValue: 'active'
    }),
    actions: Field.textarea({ label: 'Actions', required: true, maxLength: 8000, description: 'JSON array of actions to execute' }),
    applicable_objects: Field.text({ label: 'Applicable Objects', maxLength: 500, description: 'Comma-separated object names where macro can be used', defaultValue: 'case' }),
    shortcut_key: Field.text({ label: 'Keyboard Shortcut', maxLength: 20 }),
    execution_count: Field.number({ label: 'Times Used', readonly: true, precision: 0, defaultValue: 0 }),
    last_used_date: Field.datetime({ label: 'Last Used', readonly: true }),
    avg_time_saved_seconds: Field.number({ label: 'Avg Time Saved (sec)', readonly: true, precision: 0 }),
    is_global: Field.boolean({ label: 'Global Macro', defaultValue: false, description: 'Available to all agents' }),
    owner_id: Field.lookup('users', { label: 'Owner', required: true }),
    sort_order: Field.number({ label: 'Sort Order', precision: 0, defaultValue: 100 })
  },

  enable: { searchable: true, trackHistory: true, feeds: false, files: false },
});
