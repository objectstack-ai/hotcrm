import { ObjectSchema, Field } from '@objectstack/spec/data';

export const AnalyticsDashboard = ObjectSchema.create({
  name: 'analytics_dashboard',
  label: 'Analytics Dashboard',
  fields: {
    name: Field.text({ label: 'Dashboard Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 }),
    widgets: Field.textarea({ label: 'Widgets (JSON)', maxLength: 20000 }),
    layout_config: Field.textarea({ label: 'Layout Config (JSON)', maxLength: 10000 }),
    refresh_interval: Field.number({ label: 'Refresh Interval (sec)', defaultValue: 300, min: 0 }),
    owner_id: Field.lookup('users', { label: 'Owner' }),
    shared_with: Field.textarea({ label: 'Shared With (JSON)', maxLength: 5000 }),
    is_default: Field.boolean({ label: 'Default Dashboard', defaultValue: false }),
    folder: Field.text({ label: 'Folder', maxLength: 255 }),
    theme: Field.select({
      label: 'Theme',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Auto', value: 'auto' }
      ],
      defaultValue: 'light'
    })
  }
});
