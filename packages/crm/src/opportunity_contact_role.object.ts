import { ObjectSchema, Field } from '@objectstack/spec/data';

export const OpportunityContactRole = ObjectSchema.create({
  name: 'opportunity_contact_role',
  label: 'Opportunity Contact Role',
  pluralLabel: 'Opportunity Contact Roles',
  icon: 'user-tag',
  description: 'Contact roles and influence on opportunities',

  fields: {
    opportunity_id: Field.masterDetail('opportunity', {
      label: 'Opportunity',
      required: true,
      description: 'Parent opportunity'
    }),
    contact_id: Field.lookup('contact', {
      label: 'Contact',
      required: true,
      description: 'Associated contact'
    }),
    role: Field.select({
      label: 'Role',
      required: true,
      options: [
        { label: 'Decision Maker', value: 'decision_maker' },
        { label: 'Economic Buyer', value: 'economic_buyer' },
        { label: 'Technical Evaluator', value: 'technical_evaluator' },
        { label: 'Champion', value: 'champion' },
        { label: 'Influencer', value: 'influencer' },
        { label: 'End User', value: 'end_user' },
        { label: 'Executive Sponsor', value: 'executive_sponsor' },
        { label: 'Other', value: 'other' }
      ],
      description: 'Role the contact plays in the deal'
    }),
    is_primary: Field.boolean({
      label: 'Primary Contact',
      defaultValue: false,
      description: 'Whether this is the primary contact for the opportunity'
    }),
    influence_level: Field.select({
      label: 'Influence Level',
      options: [
        { label: '🔴 High', value: 'high' },
        { label: '🟡 Medium', value: 'medium' },
        { label: '🟢 Low', value: 'low' }
      ],
      description: 'Level of influence on the purchasing decision'
    }),
    engagement_score: Field.number({
      label: 'Engagement Score',
      precision: 0,
      description: 'Calculated engagement score (0-100)',
      readonly: true
    }),
    last_activity_date: Field.date({
      label: 'Last Activity',
      readonly: true,
      description: 'Date of last interaction with this contact on this deal'
    }),
    notes: Field.textarea({
      label: 'Notes',
      maxLength: 2000,
      description: 'Additional notes about contact involvement'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: false,
    files: false
  },
});
