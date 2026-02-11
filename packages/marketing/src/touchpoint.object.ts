import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Touchpoint = ObjectSchema.create({
  name: 'touchpoint',
  label: 'Marketing Touchpoint',
  pluralLabel: 'Marketing Touchpoints',
  icon: 'hand_pointer',
  description: 'Track marketing touchpoints across channels with attribution modeling and revenue tracking.',

  fields: {
    touchpoint_type: Field.select({
      label: 'Touchpoint Type',
      options: [
        { label: 'Email Open', value: 'email_open' },
        { label: 'Email Click', value: 'email_click' },
        { label: 'Form Submission', value: 'form_submission' },
        { label: 'Page Visit', value: 'page_visit' },
        { label: 'Event Attendance', value: 'event_attendance' },
        { label: 'Social Interaction', value: 'social_interaction' },
        { label: 'Ad Click', value: 'ad_click' },
        { label: 'Webinar', value: 'webinar' },
        { label: 'Content Download', value: 'content_download' }
      ]
    }),
    channel: Field.select({
      label: 'Channel',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Social', value: 'social' },
        { label: 'Web', value: 'web' },
        { label: 'Paid Ads', value: 'paid_ads' },
        { label: 'Events', value: 'events' },
        { label: 'Referral', value: 'referral' },
        { label: 'Organic', value: 'organic' }
      ]
    }),
    campaign: Field.lookup('campaign', { label: 'Campaign' }),
    touchpoint_date: Field.datetime({
      label: 'Touchpoint Date',
      required: true
    }),
    attribution_model: Field.select({
      label: 'Attribution Model',
      options: [
        { label: 'First Touch', value: 'first_touch' },
        { label: 'Last Touch', value: 'last_touch' },
        { label: 'Linear', value: 'linear' },
        { label: 'Time Decay', value: 'time_decay' },
        { label: 'U-Shaped', value: 'u_shaped' },
        { label: 'W-Shaped', value: 'w_shaped' }
      ]
    }),
    attribution_weight: Field.percent({ label: 'Attribution Weight' }),
    revenue_attributed: Field.currency({ label: 'Revenue Attributed', scale: 2 }),
    contact_name: Field.text({ label: 'Contact Name' }),
    lead_source: Field.text({ label: 'Lead Source' }),
    utm_source: Field.text({ label: 'UTM Source' }),
    utm_medium: Field.text({ label: 'UTM Medium' }),
    utm_campaign: Field.text({ label: 'UTM Campaign' }),
    utm_content: Field.text({ label: 'UTM Content' }),
    is_conversion: Field.boolean({ label: 'Is Conversion', defaultValue: false }),
    notes: Field.textarea({ label: 'Notes' })
  },

  enable: {
    searchable: true,
    apiEnabled: true,
    trackHistory: true,
  },
});
