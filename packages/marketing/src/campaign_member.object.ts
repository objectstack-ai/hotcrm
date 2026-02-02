import { ObjectSchema, Field } from '@objectstack/spec/data';

export const CampaignMember = ObjectSchema.create({
  name: 'campaign_member',
  label: 'Campaign Member',
  pluralLabel: 'Campaign Members',
  icon: 'users',
  description: 'Many-to-many relationship tracking between Campaigns and Leads/Contacts',

  fields: {
    campaign: Field.lookup('campaign', {
      label: 'Campaign',
      description: 'The marketing campaign this member belongs to',
      required: true
    }),
    lead: Field.lookup('lead', {
      label: 'Lead',
      description: 'Related lead (mutually exclusive with contact)'
    }),
    contact: Field.lookup('contact', {
      label: 'Contact',
      description: 'Related contact (mutually exclusive with lead)'
    }),
    status: Field.select({
      label: 'Member status',
      required: true,
      defaultValue: 'Sent',
      options: [
        {
          "label": "📤 Sent",
          "value": "Sent"
        },
        {
          "label": "👁️ Opened",
          "value": "Opened"
        },
        {
          "label": "🖱️ Clicked",
          "value": "Clicked"
        },
        {
          "label": "✅ Responded",
          "value": "Responded"
        },
        {
          "label": "🚫 Unsubscribed",
          "value": "Unsubscribed"
        }
      ]
    }),
    first_responded_date: Field.datetime({
      label: 'First Responded Date',
      description: 'Timestamp when member first responded to campaign',
      readonly: true
    }),
    member_source: Field.select({
      label: 'Member Source',
      defaultValue: 'Manual',
      options: [
        {
          "label": "✍️ Manual",
          "value": "Manual"
        },
        {
          "label": "📥 Import",
          "value": "Import"
        },
        {
          "label": "🔌 API",
          "value": "API"
        },
        {
          "label": "🤖 Automation",
          "value": "Automation"
        }
      ]
    }),
    notes: Field.textarea({
      label: 'notes',
      description: 'Additional notes about this campaign member',
      maxLength: 2000
    }),
    email_bounced_reason: Field.text({
      label: 'Email Bounced Reason',
      readonly: true,
      maxLength: 255
    }),
    email_bounced_date: Field.datetime({
      label: 'Email Bounced Date',
      readonly: true
    }),
    has_responded: Field.boolean({
      label: 'Has Responded',
      description: 'Auto-set to true when status is Responded',
      defaultValue: false,
      readonly: true
    }),
    first_opened_date: Field.datetime({
      label: 'First Opened Date',
      readonly: true
    }),
    first_clicked_date: Field.datetime({
      label: 'First Clicked Date',
      readonly: true
    }),
    number_of_opens: Field.number({
      label: 'Number of Opens',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    number_of_clicks: Field.number({
      label: 'Number of Clicks',
      defaultValue: 0,
      readonly: true,
      precision: 0
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
});