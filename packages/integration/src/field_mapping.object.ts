import { ObjectSchema, Field } from '@objectstack/spec/data';

export const FieldMapping = ObjectSchema.create({
  name: 'field_mapping',
  label: 'Field Mapping',
  pluralLabel: 'Field Mappings',
  icon: 'shuffle',
  description: 'Reusable field mapping templates between source and target objects',

  fields: {
    name: Field.text({
      label: 'Mapping Name',
      required: true,
      maxLength: 255
    }),
    source_object: Field.text({
      label: 'Source Object',
      required: true,
      maxLength: 255
    }),
    target_object: Field.text({
      label: 'Target Object',
      required: true,
      maxLength: 255
    }),
    mappings: Field.textarea({
      label: 'Mappings',
      required: true,
      description: 'JSON field-to-field mapping configuration'
    }),
    transform_rules: Field.textarea({
      label: 'Transform Rules',
      description: 'JSON transformation rules applied during mapping'
    }),
    default_values: Field.textarea({
      label: 'Default Values',
      description: 'JSON default values for unmapped target fields'
    }),
    is_template: Field.boolean({
      label: 'Is Template',
      defaultValue: false
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: false,
    files: false
  },
});
