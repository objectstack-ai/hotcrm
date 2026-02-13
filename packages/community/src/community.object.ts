import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Community = ObjectSchema.create({
  name: 'community',
  label: 'Community',
  fields: {
    name: Field.text({ label: 'Community Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description' }),
    domain: Field.text({ label: 'Domain', maxLength: 255 }),
    theme: Field.select({
      label: 'Theme',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Dark', value: 'dark' },
        { label: 'Branded', value: 'branded' }
      ],
      defaultValue: 'default'
    }),
    features_enabled: Field.textarea({ label: 'Features Enabled (JSON)' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Maintenance', value: 'maintenance' }
      ],
      defaultValue: 'active'
    }),
    branding: Field.textarea({ label: 'Branding (JSON)' }),
    default_language: Field.text({ label: 'Default Language', defaultValue: 'en' }),
    max_members: Field.number({ label: 'Max Members', min: 0 }),
    owner_id: Field.lookup('users', { label: 'Owner' })
  }
});
