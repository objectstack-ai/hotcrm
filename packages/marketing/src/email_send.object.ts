import { ObjectSchema, Field } from '@objectstack/spec/data';

export const EmailSend = ObjectSchema.create({
  name: 'email_send',
  label: 'Email Send',
  pluralLabel: 'Email Sends',
  icon: 'mail',
  description: 'Track individual email sends with delivery, open, click, and bounce tracking.',

  fields: {
    subject: Field.text({
      label: 'Subject',
      required: true,
      searchable: true
    }),
    recipient_email: Field.email({
      label: 'Recipient Email',
      required: true
    }),
    recipient_name: Field.text({ label: 'Recipient Name' }),
    email_template: Field.lookup('email_template', { label: 'Email Template' }),
    campaign: Field.lookup('campaign', { label: 'Campaign' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Opened', value: 'opened' },
        { label: 'Clicked', value: 'clicked' },
        { label: 'Bounced', value: 'bounced' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
        { label: 'Failed', value: 'failed' }
      ],
      defaultValue: 'pending'
    }),
    sent_date: Field.datetime({ label: 'Sent Date' }),
    delivered_date: Field.datetime({ label: 'Delivered Date' }),
    opened_date: Field.datetime({ label: 'Opened Date' }),
    clicked_date: Field.datetime({ label: 'Clicked Date' }),
    bounce_type: Field.select({
      label: 'Bounce Type',
      options: [
        { label: 'Hard Bounce', value: 'hard_bounce' },
        { label: 'Soft Bounce', value: 'soft_bounce' }
      ]
    }),
    bounce_reason: Field.text({ label: 'Bounce Reason' }),
    open_count: Field.number({ label: 'Open Count' }),
    click_count: Field.number({ label: 'Click Count' }),
    unsubscribe_date: Field.datetime({ label: 'Unsubscribe Date' }),
    tracking_id: Field.text({ label: 'Tracking ID' })
  },

  enable: {
    searchable: true,
    apiEnabled: true,
    trackHistory: true,
  },
});
