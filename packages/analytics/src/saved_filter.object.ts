import { ObjectSchema, Field } from '@objectstack/spec/data';

export const SavedFilter = ObjectSchema.create({
  name: 'saved_filter',
  label: 'Saved Filter',
  fields: {
    name: Field.text({ label: 'Filter Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 1000 }),
    object_name: Field.text({ label: 'Object Name', required: true, maxLength: 100 }),
    filter_conditions: Field.textarea({ label: 'Filter Conditions (JSON)', required: true, maxLength: 10000 }),
    is_global: Field.boolean({ label: 'Global Filter', defaultValue: false }),
    created_by: Field.lookup({ label: 'Created By', reference_to: 'users' }),
    usage_count: Field.number({ label: 'Usage Count', defaultValue: 0, min: 0 })
  }
});
