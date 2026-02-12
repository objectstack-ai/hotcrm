import { ObjectSchema, Field } from '@objectstack/spec/data';

export const AbTestVariant = ObjectSchema.create({
  name: 'ab_test_variant',
  label: 'A/B Test Variant',
  pluralLabel: 'A/B Test Variants',
  icon: 'vial',
  description: 'Individual variants within an A/B test',

  fields: {
    ab_test_id: Field.masterDetail('ab_test', { label: 'A/B Test', required: true }),
    name: Field.text({ label: 'Variant Name', required: true, maxLength: 100 }),
    variant_label: Field.text({ label: 'Label', maxLength: 50, description: 'Short label (e.g., A, B, C)' }),
    traffic_percentage: Field.percent({ label: 'Traffic Split', required: true, description: 'Percentage of traffic for this variant' }),
    content: Field.textarea({ label: 'Variant Content', maxLength: 8000, description: 'Content specific to this variant' }),
    subject_line: Field.text({ label: 'Subject Line', maxLength: 500, description: 'Email subject for email tests' }),
    email_template_id: Field.lookup('email_template', { label: 'Email Template' }),
    landing_page_id: Field.lookup('landing_page', { label: 'Landing Page' }),
    impressions: Field.number({ label: 'Impressions', readonly: true, precision: 0, defaultValue: 0 }),
    opens: Field.number({ label: 'Opens', readonly: true, precision: 0, defaultValue: 0 }),
    clicks: Field.number({ label: 'Clicks', readonly: true, precision: 0, defaultValue: 0 }),
    conversions: Field.number({ label: 'Conversions', readonly: true, precision: 0, defaultValue: 0 }),
    open_rate: Field.percent({ label: 'Open Rate', readonly: true }),
    click_rate: Field.percent({ label: 'Click Rate', readonly: true }),
    conversion_rate: Field.percent({ label: 'Conversion Rate', readonly: true }),
    revenue_generated: Field.currency({ label: 'Revenue Generated', readonly: true }),
    is_winner: Field.boolean({ label: 'Winner', readonly: true, defaultValue: false }),
    is_control: Field.boolean({ label: 'Control Group', defaultValue: false })
  },

  enable: { searchable: true, trackHistory: true, feeds: false, files: false },
});
