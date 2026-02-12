import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Territory = ObjectSchema.create({
  name: 'territory',
  label: 'Territory',
  pluralLabel: 'Territories',
  icon: 'map-marked-alt',
  description: 'Sales territory definitions for geographic and account-based territory management',

  fields: {
    name: Field.text({ label: 'Territory Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 }),
    territory_type: Field.select({
      label: 'Territory Type', required: true,
      options: [
        { label: 'Geographic', value: 'geographic' },
        { label: 'Named Account', value: 'named_account' },
        { label: 'Industry', value: 'industry' },
        { label: 'Product Line', value: 'product_line' },
        { label: 'Hybrid', value: 'hybrid' }
      ]
    }),
    parent_territory_id: Field.lookup('territory', { label: 'Parent Territory', description: 'Hierarchical parent territory' }),
    owner_id: Field.lookup('users', { label: 'Territory Owner', required: true }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Planning', value: 'planning' }
      ],
      defaultValue: 'active'
    }),
    region: Field.text({ label: 'Region', maxLength: 100 }),
    country: Field.text({ label: 'Country', maxLength: 100 }),
    state_province: Field.text({ label: 'State/Province', maxLength: 100 }),
    quota: Field.currency({ label: 'Territory Quota', description: 'Revenue quota for this territory' }),
    account_count: Field.number({ label: 'Account Count', readonly: true, precision: 0, defaultValue: 0 }),
    opportunity_count: Field.number({ label: 'Opportunity Count', readonly: true, precision: 0, defaultValue: 0 }),
    total_pipeline: Field.currency({ label: 'Total Pipeline', readonly: true }),
    total_closed_won: Field.currency({ label: 'Total Closed Won', readonly: true }),
    assigned_users: Field.text({ label: 'Assigned Users', maxLength: 1000, description: 'Comma-separated user IDs assigned to this territory' })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: false },
});
