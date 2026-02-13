import { ObjectSchema, Field } from '@objectstack/spec/data';

export const WebhookSubscription = ObjectSchema.create({
  name: 'webhook_subscription',
  label: 'Webhook Subscription',
  pluralLabel: 'Webhook Subscriptions',
  icon: 'webhook',
  description: 'Outbound webhook subscriptions for event notifications',

  fields: {
    name: Field.text({
      label: 'Subscription Name',
      required: true,
      maxLength: 255
    }),
    event_type: Field.text({
      label: 'Event Type',
      required: true,
      maxLength: 255
    }),
    target_url: Field.url({
      label: 'Target URL',
      required: true
    }),
    secret: Field.text({
      label: 'Secret',
      maxLength: 500
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Failed', value: 'failed' }
      ]
    }),
    retry_policy: Field.select({
      label: 'Retry Policy',
      defaultValue: 'exponential',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Linear', value: 'linear' },
        { label: 'Exponential', value: 'exponential' }
      ]
    }),
    max_retries: Field.number({
      label: 'Max Retries',
      defaultValue: 3
    }),
    filters: Field.textarea({
      label: 'Filters',
      description: 'JSON filter criteria for event matching'
    }),
    last_triggered: Field.datetime({ label: 'Last Triggered' }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: false,
    files: false
  },
});
