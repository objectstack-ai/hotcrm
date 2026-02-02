import { ObjectSchema, Field } from '@objectstack/spec/data';

export const SocialMediaCase = ObjectSchema.create({
  name: 'social_media_case',
  label: 'Social Media Case',
  pluralLabel: 'Social Media Cases',
  icon: 'share-alt',
  description: 'Social media integration for case creation from social channels',

  fields: {
    name: Field.text({
      label: 'Configuration name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 2000
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    }),
    platform: Field.select({
      label: 'Social platform',
      required: true,
      options: [
        {
          "label": "💬 WeChat",
          "value": "WeChat"
        },
        {
          "label": "📱 WhatsApp",
          "value": "WhatsApp"
        },
        {
          "label": "🐦 Twitter/X",
          "value": "Twitter"
        },
        {
          "label": "👍 Facebook",
          "value": "Facebook"
        },
        {
          "label": "📷 Instagram",
          "value": "Instagram"
        },
        {
          "label": "💼 LinkedIn",
          "value": "LinkedIn"
        },
        {
          "label": "📺 YouTube",
          "value": "YouTube"
        },
        {
          "label": "🎵 TikTok",
          "value": "TikTok"
        }
      ]
    }),
    account_handle: Field.text({
      label: 'Account Handle',
      description: 'Social media account username/handle to monitor',
      required: true,
      maxLength: 255
    }),
    account_id: Field.text({
      label: 'Account ID',
      description: 'platform-specific account identifier',
      maxLength: 255
    }),
    access_token: Field.text({
      label: 'Access Token',
      description: 'OAuth access token (encrypted)',
      maxLength: 1000
    }),
    refresh_token: Field.text({
      label: 'Refresh Token',
      description: 'OAuth refresh token (encrypted)',
      maxLength: 1000
    }),
    token_expiry_date: Field.datetime({
      label: 'Token Expiry',
      readonly: true
    }),
    monitor_mentions: Field.boolean({
      label: 'Monitor Mentions',
      description: 'Create cases from @mentions',
      defaultValue: true
    }),
    monitor_direct_messages: Field.boolean({
      label: 'Monitor Direct Messages',
      description: 'Create cases from DMs',
      defaultValue: true
    }),
    monitor_comments: Field.boolean({
      label: 'Monitor Comments',
      description: 'Create cases from post comments',
      defaultValue: true
    }),
    monitor_hashtags: Field.text({
      label: 'Monitor Hashtags',
      description: 'Comma-separated hashtags to monitor',
      maxLength: 500
    }),
    monitor_keywords: Field.textarea({
      label: 'Monitor Keywords',
      description: 'Keywords to trigger case creation (one per line)',
      maxLength: 2000
    }),
    default_queue_id: Field.lookup('Queue', {
      label: 'Default Queue',
      required: true
    }),
    default_owner_id: Field.lookup('users', { label: 'Default Owner' }),
    default_priority: Field.select({
      label: 'Default Priority',
      defaultValue: 'Medium',
      options: [
        {
          "label": "Critical",
          "value": "Critical"
        },
        {
          "label": "High",
          "value": "High"
        },
        {
          "label": "Medium",
          "value": "Medium"
        },
        {
          "label": "Low",
          "value": "Low"
        }
      ]
    }),
    default_case_type: Field.select({
      label: 'Default Case Type',
      defaultValue: 'Question',
      options: [
        {
          "label": "Problem",
          "value": "Problem"
        },
        {
          "label": "Question",
          "value": "Question"
        },
        {
          "label": "Incident",
          "value": "Incident"
        },
        {
          "label": "Feature Request",
          "value": "Feature Request"
        },
        {
          "label": "Complaint",
          "value": "Complaint"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    auto_match_contact: Field.boolean({
      label: 'Auto Match Contact',
      description: 'Match social profile to existing contact',
      defaultValue: true
    }),
    create_contact_if_not_found: Field.boolean({
      label: 'Create Contact If Not Found',
      defaultValue: true
    }),
    default_account_id: Field.lookup('account', {
      label: 'Default Account',
      description: 'Account for new contacts'
    }),
    send_auto_response: Field.boolean({
      label: 'Send Auto Response',
      description: 'Send automatic acknowledgment message',
      defaultValue: true
    }),
    auto_response_message: Field.textarea({
      label: 'Auto Response Message',
      description: 'Message to send when case is created',
      maxLength: 500
    }),
    response_delay_seconds: Field.number({
      label: 'Response Delay (Seconds)',
      description: 'Delay before sending auto-response',
      defaultValue: 5,
      min: 0,
      max: 300,
      precision: 0
    }),
    use_ai_sentiment_analysis: Field.boolean({
      label: 'Use AI Sentiment Analysis',
      description: 'Analyze sentiment of social posts',
      defaultValue: true
    }),
    use_ai_for_priority: Field.boolean({
      label: 'Use AI for Priority',
      description: 'AI determines case priority based on content',
      defaultValue: true
    }),
    use_ai_for_urgency: Field.boolean({
      label: 'Use AI for Urgency',
      description: 'Detect urgent situations (e.g., angry customers)',
      defaultValue: true
    }),
    minimum_followers: Field.number({
      label: 'Minimum Followers',
      description: 'Minimum follower count to create case (0 = all)',
      min: 0,
      precision: 0
    }),
    exclude_verified_users: Field.boolean({
      label: 'Exclude Verified Users',
      description: 'Do not create cases from verified accounts',
      defaultValue: false
    }),
    blocked_users: Field.textarea({
      label: 'Blocked Users',
      description: 'Usernames to ignore (one per line)',
      maxLength: 2000
    }),
    polling_interval: Field.number({
      label: 'Polling Interval (Minutes)',
      description: 'How often to check for new mentions/messages',
      defaultValue: 5,
      min: 1,
      max: 60,
      precision: 0
    }),
    last_polled_date: Field.datetime({
      label: 'Last Polled',
      readonly: true
    }),
    total_posts_processed: Field.number({
      label: 'Posts Processed',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    cases_created: Field.number({
      label: 'Cases Created',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    responses_sent: Field.number({
      label: 'Responses Sent',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    error_count: Field.number({
      label: 'Error Count',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    last_error_date: Field.datetime({
      label: 'Last Error',
      readonly: true
    }),
    last_error_message: Field.text({
      label: 'Last Error Message',
      readonly: true,
      maxLength: 500
    }),
    average_sentiment: Field.number({
      label: 'Average Sentiment Score',
      description: 'Average sentiment score (-1 to 1)',
      readonly: true,
      precision: 2
    }),
    average_response_time: Field.number({
      label: 'Avg Response Time (Minutes)',
      readonly: true,
      precision: 2
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true
  },
});