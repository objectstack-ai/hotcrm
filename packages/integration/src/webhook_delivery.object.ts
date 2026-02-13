import { ObjectSchema, Field } from '@objectstack/spec/data';

export const WebhookDelivery = ObjectSchema.create({
  name: 'webhook_delivery',
  label: 'Webhook Delivery',
  pluralLabel: 'Webhook Deliveries',
  icon: 'send',
  description: 'Individual webhook delivery attempts and their results',

  fields: {
    subscription_id: Field.lookup('webhook_subscription', {
      label: 'Subscription',
      required: true
    }),
    event_payload: Field.textarea({
      label: 'Event Payload',
      description: 'JSON payload sent to the webhook endpoint'
    }),
    response_status: Field.number({ label: 'Response Status' }),
    response_body: Field.textarea({ label: 'Response Body' }),
    attempt_number: Field.number({ label: 'Attempt Number' }),
    delivered_at: Field.datetime({ label: 'Delivered At' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
        { label: 'Pending', value: 'pending' },
        { label: 'Retrying', value: 'retrying' }
      ]
    })
  },

  enable: {
    searchable: false,
    trackHistory: false,
    activities: false,
    feeds: false,
    files: false
  },
});
