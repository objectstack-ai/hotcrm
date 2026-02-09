import { ObjectSchema, Field } from '@objectstack/spec/data';

export const MarketingList = ObjectSchema.create({
  name: 'marketing_list',
  label: 'Marketing List',
  pluralLabel: 'Marketing Lists',
  icon: 'users',
  description: 'Marketing list and segmentation management with dynamic queries and static members',

  fields: {
    name: Field.text({
      label: 'List Name',
      required: true,
      maxLength: 255
    }),
    list_code: Field.text({
      label: 'List Code',
      description: 'Unique identifier for API calls',
      unique: true,
      maxLength: 80
    }),
    description: Field.textarea({
      label: 'Description',
      description: 'Purpose and target audience description for the list',
      maxLength: 2000
    }),
    list_type: Field.select({
      label: 'List Type',
      description: 'Static = manually added, Dynamic = auto-updated, Hybrid = both combined',
      required: true,
      defaultValue: 'Static',
      options: [
        {
          "label": "📌 Static List",
          "value": "Static"
        },
        {
          "label": "🔄 Dynamic List",
          "value": "Dynamic"
        },
        {
          "label": "🔗 Hybrid List",
          "value": "Hybrid"
        }
      ]
    }),
    member_type: Field.select({
      label: 'Member Type',
      required: true,
      defaultValue: 'Lead',
      options: [
        {
          "label": "📝 Lead",
          "value": "Lead"
        },
        {
          "label": "👤 Contact",
          "value": "Contact"
        },
        {
          "label": "🏢 Account",
          "value": "Account"
        },
        {
          "label": "🔀 Mixed",
          "value": "Mixed"
        }
      ]
    }),
    filter_criteria_json: Field.textarea({
      label: 'Filter Criteria JSON',
      description: 'Query criteria for dynamic lists (ObjectQL format)',
      maxLength: 65535
    }),
    refresh_frequency: Field.select({
      label: 'Refresh Frequency',
      description: 'Member refresh frequency for dynamic lists',
      options: [
        {
          "label": "Real-time",
          "value": "Real-time"
        },
        {
          "label": "Hourly",
          "value": "Hourly"
        },
        {
          "label": "Daily",
          "value": "Daily"
        },
        {
          "label": "Weekly",
          "value": "Weekly"
        },
        {
          "label": "Manual",
          "value": "Manual"
        }
      ]
    }),
    last_refreshed_date: Field.datetime({
      label: 'Last Refreshed Date',
      readonly: true
    }),
    campaign_id: Field.lookup('campaign', {
      label: 'Associated Campaign',
      description: 'Primary campaign associated with this list'
    }),
    segment_category: Field.select({
      label: 'Segment Category',
      options: [
        {
          "label": "🎯 Industry",
          "value": "Industry"
        },
        {
          "label": "📍 Geographic",
          "value": "Geographic"
        },
        {
          "label": "💼 Company Size",
          "value": "Company Size"
        },
        {
          "label": "🔥 Engagement Level",
          "value": "Engagement Level"
        },
        {
          "label": "📊 Lead Score",
          "value": "Lead Score"
        },
        {
          "label": "🎓 Buyer Journey",
          "value": "Buyer Journey"
        },
        {
          "label": "🏷️ Product Interest",
          "value": "Product Interest"
        },
        {
          "label": "🎨 Custom",
          "value": "Custom"
        }
      ]
    }),
    target_audience: Field.textarea({
      label: 'Target Audience Description',
      description: 'Target audience characteristics for this list',
      maxLength: 2000
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      defaultValue: 'Active',
      options: [
        {
          "label": "✅ Active",
          "value": "Active"
        },
        {
          "label": "⏸️ Paused",
          "value": "Paused"
        },
        {
          "label": "📦 Archived",
          "value": "Archived"
        }
      ]
    }),
    is_active: Field.boolean({
      label: 'Is Active',
      defaultValue: true
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true
    }),
    total_members: Field.number({
      label: 'Total Members',
      description: 'Total number of members in the list',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    active_members: Field.number({
      label: 'Active Members',
      description: 'Number of members who have not unsubscribed and have deliverable emails',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    unsubscribed_members: Field.number({
      label: 'Unsubscribed Members',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    bounced_members: Field.number({
      label: 'Bounced Members',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    average_engagement_score: Field.number({
      label: 'Average Engagement Score',
      description: 'Average engagement score of list members',
      readonly: true,
      precision: 2
    }),
    average_lead_score: Field.number({
      label: 'Average Lead Score',
      description: 'Average lead score of leads in the list',
      readonly: true,
      precision: 2
    }),
    total_campaigns_sent: Field.number({
      label: 'Campaigns Sent',
      description: 'Number of campaigns sent using this list',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    deliverability_rate: Field.percent({
      label: 'Deliverability Rate',
      description: 'Percentage of emails successfully delivered',
      readonly: true
    }),
    average_open_rate: Field.percent({
      label: 'Average Open Rate',
      description: 'Average open rate of past campaigns for this list',
      readonly: true
    }),
    average_click_rate: Field.percent({
      label: 'Average Click Rate',
      description: 'Average click rate of past campaigns for this list',
      readonly: true
    }),
    suppress_duplicates: Field.boolean({
      label: 'Suppress Duplicates',
      description: 'Automatically remove duplicate members',
      defaultValue: true
    }),
    suppress_unsubscribed: Field.boolean({
      label: 'Suppress Unsubscribed',
      description: 'Automatically exclude unsubscribed contacts',
      defaultValue: true
    }),
    suppress_bounced: Field.boolean({
      label: 'Suppress Bounced',
      description: 'Automatically exclude hard-bounced email addresses',
      defaultValue: true
    }),
    include_opted_out_contacts: Field.boolean({
      label: 'Include Opted Out Contacts',
      description: 'Whether to include contacts who opted out of marketing',
      defaultValue: false
    }),
    consent_required: Field.boolean({
      label: 'Marketing Consent Required',
      description: 'GDPR compliance: only include contacts who explicitly consented to marketing',
      defaultValue: true
    }),
    data_retention_days: Field.number({
      label: 'Data Retention Days',
      description: 'Member data retention period (days)',
      precision: 0
    }),
    last_compliance_check: Field.datetime({
      label: 'Last Compliance Check',
      description: 'Last GDPR/privacy compliance check date',
      readonly: true
    }),
    last_import_date: Field.datetime({
      label: 'Last Import Date',
      readonly: true
    }),
    last_import_count: Field.number({
      label: 'Last Import Count',
      readonly: true,
      precision: 0
    }),
    source_system: Field.text({
      label: 'Source System',
      description: 'Source system or channel for members',
      maxLength: 100
    }),
    ai_suggested_segments: Field.textarea({
      label: 'AI Suggested Segments',
      description: 'AI-suggested additional segmentation dimensions',
      readonly: true,
      maxLength: 2000
    }),
    ai_engagement_prediction: Field.textarea({
      label: 'AI Engagement Prediction',
      description: 'AI-predicted engagement trends for the list',
      readonly: true,
      maxLength: 2000
    }),
    ai_suggested_content: Field.textarea({
      label: 'AI Content Suggestions',
      description: 'AI-recommended content topics for this list',
      readonly: true,
      maxLength: 2000
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
});