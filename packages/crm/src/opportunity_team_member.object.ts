import { ObjectSchema, Field } from '@objectstack/spec/data';

export const OpportunityTeamMember = ObjectSchema.create({
  name: 'opportunity_team_member',
  label: 'Opportunity Team Member',
  pluralLabel: 'Opportunity Team Members',
  icon: 'users',
  description: 'Team members collaborating on an opportunity with defined roles and access',

  fields: {
    opportunity_id: Field.masterDetail('opportunity', { label: 'Opportunity', required: true }),
    user_id: Field.lookup('users', { label: 'Team Member', required: true }),
    team_role: Field.select({
      label: 'Team Role', required: true,
      options: [
        { label: 'Account Executive', value: 'account_executive' },
        { label: 'Sales Engineer', value: 'sales_engineer' },
        { label: 'Solution Architect', value: 'solution_architect' },
        { label: 'Executive Sponsor', value: 'executive_sponsor' },
        { label: 'Deal Support', value: 'deal_support' },
        { label: 'Partner', value: 'partner' },
        { label: 'Other', value: 'other' }
      ]
    }),
    access_level: Field.select({
      label: 'Access Level',
      options: [
        { label: 'Read Only', value: 'read_only' },
        { label: 'Read/Write', value: 'read_write' },
        { label: 'Full Access', value: 'full_access' }
      ],
      defaultValue: 'read_write'
    }),
    split_percentage: Field.percent({ label: 'Revenue Split %', description: 'Percentage of revenue credit' }),
    split_amount: Field.currency({ label: 'Split Amount', readonly: true }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true }),
    added_date: Field.date({ label: 'Date Added', readonly: true }),
    notes: Field.textarea({ label: 'Notes', maxLength: 1000 })
  },

  enable: { searchable: true, trackHistory: true, feeds: false, files: false },
});
