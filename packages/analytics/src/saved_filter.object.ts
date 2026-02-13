import { ObjectSchema, Field } from '@objectstack/spec/data';

export const SavedFilter = ObjectSchema.create({
  name: 'saved_filter',
  label: 'Saved Filter',
  pluralLabel: 'Saved Filters',
  icon: 'filter',
  description: 'Reusable filter presets for reports and views',

  fields: {
    name: Field.text({
      label: 'Filter Name',
      required: true,
      maxLength: 255
    }),
    object_name: Field.text({
      label: 'Object Name',
      required: true,
      maxLength: 100
    }),
    filter_conditions: Field.textarea({
      label: 'Filter Conditions',
      description: 'JSON array of filter condition definitions'
    }),
    is_global: Field.boolean({
      label: 'Global',
      defaultValue: false
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true
  },
});

export default SavedFilter;
