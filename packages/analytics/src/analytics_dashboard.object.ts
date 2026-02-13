import { ObjectSchema, Field } from '@objectstack/spec/data';

export const AnalyticsDashboard = ObjectSchema.create({
  name: 'analytics_dashboard',
  label: 'Analytics Dashboard',
  pluralLabel: 'Analytics Dashboards',
  icon: 'layout-dashboard',
  description: 'Dashboard layouts with configurable widgets',

  fields: {
    name: Field.text({
      label: 'Dashboard Name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'Description',
    }),
    widgets: Field.textarea({
      label: 'Widgets',
      description: 'JSON array of widget configurations'
    }),
    layout_config: Field.textarea({
      label: 'Layout Configuration',
      description: 'JSON layout grid configuration'
    }),
    refresh_interval: Field.number({
      label: 'Refresh Interval (seconds)',
      defaultValue: 300,
      min: 30
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      defaultValue: '$currentUser'
    }),
    is_public: Field.boolean({
      label: 'Public',
      defaultValue: false
    }),
    folder: Field.text({
      label: 'Folder',
      maxLength: 255
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});

export default AnalyticsDashboard;
