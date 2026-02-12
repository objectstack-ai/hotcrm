import { ObjectSchema, Field } from '@objectstack/spec/data';

export const AbTest = ObjectSchema.create({
  name: 'ab_test',
  label: 'A/B Test',
  pluralLabel: 'A/B Tests',
  icon: 'flask',
  description: 'A/B and multivariate testing for campaigns, emails, and landing pages',

  fields: {
    name: Field.text({ label: 'Test Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 }),
    test_type: Field.select({
      label: 'Test Type', required: true,
      options: [
        { label: 'Email Subject', value: 'email_subject' },
        { label: 'Email Content', value: 'email_content' },
        { label: 'Landing Page', value: 'landing_page' },
        { label: 'Send Time', value: 'send_time' },
        { label: 'CTA Button', value: 'cta_button' },
        { label: 'Form Layout', value: 'form_layout' }
      ]
    }),
    status: Field.select({
      label: 'Status', required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Running', value: 'running' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' }
      ],
      defaultValue: 'draft'
    }),
    campaign_id: Field.lookup('campaign', { label: 'Campaign' }),
    start_date: Field.datetime({ label: 'Start Date', required: true }),
    end_date: Field.datetime({ label: 'End Date' }),
    sample_size: Field.number({ label: 'Sample Size', precision: 0, description: 'Total contacts in test' }),
    confidence_level: Field.percent({ label: 'Confidence Level', defaultValue: 95, description: 'Statistical confidence threshold' }),
    winning_criteria: Field.select({
      label: 'Winning Criteria',
      options: [
        { label: 'Open Rate', value: 'open_rate' },
        { label: 'Click Rate', value: 'click_rate' },
        { label: 'Conversion Rate', value: 'conversion_rate' },
        { label: 'Revenue', value: 'revenue' }
      ],
      defaultValue: 'click_rate'
    }),
    winner_variant_id: Field.text({ label: 'Winner Variant', readonly: true, maxLength: 18 }),
    is_statistically_significant: Field.boolean({ label: 'Statistically Significant', readonly: true, defaultValue: false }),
    auto_select_winner: Field.boolean({ label: 'Auto-Select Winner', defaultValue: true }),
    total_participants: Field.number({ label: 'Total Participants', readonly: true, precision: 0, defaultValue: 0 }),
    owner_id: Field.lookup('users', { label: 'Owner', required: true })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: false },
});
