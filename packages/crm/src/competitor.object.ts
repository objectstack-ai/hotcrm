import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Competitor = ObjectSchema.create({
  name: 'competitor',
  label: 'Competitor',
  pluralLabel: 'Competitors',
  icon: 'chess',
  description: 'Competitive intelligence tracking on opportunities',

  fields: {
    name: Field.text({ label: 'Competitor Name', required: true, maxLength: 255 }),
    opportunity_id: Field.lookup('opportunity', { label: 'Opportunity', description: 'Associated opportunity' }),
    website: Field.url({ label: 'Website' }),
    strengths: Field.textarea({ label: 'Strengths', maxLength: 4000 }),
    weaknesses: Field.textarea({ label: 'Weaknesses', maxLength: 4000 }),
    threat_level: Field.select({
      label: 'Threat Level',
      options: [
        { label: '🔴 High', value: 'high' },
        { label: '🟡 Medium', value: 'medium' },
        { label: '🟢 Low', value: 'low' },
        { label: '⚪ Unknown', value: 'unknown' }
      ],
      defaultValue: 'unknown'
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active Competitor', value: 'active' },
        { label: 'Won Against', value: 'won_against' },
        { label: 'Lost To', value: 'lost_to' },
        { label: 'No Longer Competing', value: 'inactive' }
      ],
      defaultValue: 'active'
    }),
    product_offered: Field.text({ label: 'Product Offered', maxLength: 255, description: 'Competitor product in this deal' }),
    price_range: Field.text({ label: 'Price Range', maxLength: 100, description: 'Estimated competitor pricing' }),
    win_loss_reason: Field.textarea({ label: 'Win/Loss Reason', maxLength: 2000 }),
    key_differentiators: Field.textarea({ label: 'Key Differentiators', maxLength: 4000, description: 'What sets us apart from this competitor' }),
    last_seen_date: Field.date({ label: 'Last Seen', description: 'Last time this competitor was encountered' }),
    encounter_count: Field.number({ label: 'Encounter Count', readonly: true, precision: 0, defaultValue: 0 }),
    win_rate: Field.percent({ label: 'Win Rate Against', readonly: true, description: 'Historical win rate against this competitor' })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: true },
});
