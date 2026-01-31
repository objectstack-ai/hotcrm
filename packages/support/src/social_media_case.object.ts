
const SocialMediaCase = {
  name: 'social_media_case',
  label: 'Social Media Case',
  labelPlural: 'Social Media Cases',
  icon: 'share-alt',
  description: 'Social media integration for case creation from social channels',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: 'Configuration name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000
    },
    is_active: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // platform Configuration
    platform: {
      type: 'select',
      label: 'Social platform',
      required: true,
      options: [
        { label: '💬 WeChat', value: 'WeChat' },
        { label: '📱 WhatsApp', value: 'WhatsApp' },
        { label: '🐦 Twitter/X', value: 'Twitter' },
        { label: '👍 Facebook', value: 'Facebook' },
        { label: '📷 Instagram', value: 'Instagram' },
        { label: '💼 LinkedIn', value: 'LinkedIn' },
        { label: '📺 YouTube', value: 'YouTube' },
        { label: '🎵 TikTok', value: 'TikTok' }
      ]
    },
    account_handle: {
      type: 'text',
      label: 'Account Handle',
      required: true,
      maxLength: 255,
      description: 'Social media account username/handle to monitor'
    },
    account_id: {
      type: 'text',
      label: 'Account ID',
      maxLength: 255,
      description: 'platform-specific account identifier'
    },
    // Authentication
    access_token: {
      type: 'text',
      label: 'Access Token',
      maxLength: 1000,
      description: 'OAuth access token (encrypted)'
    },
    refresh_token: {
      type: 'text',
      label: 'Refresh Token',
      maxLength: 1000,
      description: 'OAuth refresh token (encrypted)'
    },
    token_expiry_date: {
      type: 'datetime',
      label: 'Token Expiry',
      readonly: true
    },
    // Monitoring Configuration
    monitor_mentions: {
      type: 'checkbox',
      label: 'Monitor Mentions',
      defaultValue: true,
      description: 'Create cases from @mentions'
    },
    monitor_direct_messages: {
      type: 'checkbox',
      label: 'Monitor Direct Messages',
      defaultValue: true,
      description: 'Create cases from DMs'
    },
    monitor_comments: {
      type: 'checkbox',
      label: 'Monitor Comments',
      defaultValue: true,
      description: 'Create cases from post comments'
    },
    monitor_hashtags: {
      type: 'text',
      label: 'Monitor Hashtags',
      maxLength: 500,
      description: 'Comma-separated hashtags to monitor'
    },
    monitor_keywords: {
      type: 'textarea',
      label: 'Monitor Keywords',
      maxLength: 2000,
      description: 'Keywords to trigger case creation (one per line)'
    },
    // Routing
    default_queue_id: {
      type: 'lookup',
      label: 'Default Queue',
      reference: 'Queue',
      required: true
    },
    default_owner_id: {
      type: 'lookup',
      label: 'Default Owner',
      reference: 'User'
    },
    default_priority: {
      type: 'select',
      label: 'Default Priority',
      defaultValue: 'Medium',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    default_case_type: {
      type: 'select',
      label: 'Default Case Type',
      defaultValue: 'Question',
      options: [
        { label: 'Problem', value: 'Problem' },
        { label: 'Question', value: 'Question' },
        { label: 'Incident', value: 'Incident' },
        { label: 'Feature Request', value: 'Feature Request' },
        { label: 'Complaint', value: 'Complaint' },
        { label: 'Other', value: 'Other' }
      ]
    },
    // Contact Matching
    auto_match_contact: {
      type: 'checkbox',
      label: 'Auto Match Contact',
      defaultValue: true,
      description: 'Match social profile to existing contact'
    },
    create_contact_if_not_found: {
      type: 'checkbox',
      label: 'Create Contact If Not Found',
      defaultValue: true
    },
    default_account_id: {
      type: 'lookup',
      label: 'Default Account',
      reference: 'Account',
      description: 'Account for new contacts'
    },
    // Response Configuration
    send_auto_response: {
      type: 'checkbox',
      label: 'Send Auto Response',
      defaultValue: true,
      description: 'Send automatic acknowledgment message'
    },
    auto_response_message: {
      type: 'textarea',
      label: 'Auto Response Message',
      maxLength: 500,
      description: 'Message to send when case is created'
    },
    response_delay_seconds: {
      type: 'number',
      label: 'Response Delay (Seconds)',
      precision: 0,
      min: 0,
      max: 300,
      defaultValue: 5,
      description: 'Delay before sending auto-response'
    },
    // AI Processing
    use_a_i_sentiment_analysis: {
      type: 'checkbox',
      label: 'Use AI Sentiment Analysis',
      defaultValue: true,
      description: 'Analyze sentiment of social posts'
    },
    use_a_i_for_priority: {
      type: 'checkbox',
      label: 'Use AI for Priority',
      defaultValue: true,
      description: 'AI determines case priority based on content'
    },
    use_a_i_for_urgency: {
      type: 'checkbox',
      label: 'Use AI for Urgency',
      defaultValue: true,
      description: 'Detect urgent situations (e.g., angry customers)'
    },
    // Filtering
    minimum_followers: {
      type: 'number',
      label: 'Minimum Followers',
      precision: 0,
      min: 0,
      description: 'Minimum follower count to create case (0 = all)'
    },
    exclude_verified_users: {
      type: 'checkbox',
      label: 'Exclude Verified Users',
      defaultValue: false,
      description: 'Do not create cases from verified accounts'
    },
    blocked_users: {
      type: 'textarea',
      label: 'Blocked Users',
      maxLength: 2000,
      description: 'Usernames to ignore (one per line)'
    },
    // Polling
    polling_interval: {
      type: 'number',
      label: 'Polling Interval (Minutes)',
      precision: 0,
      min: 1,
      max: 60,
      defaultValue: 5,
      description: 'How often to check for new mentions/messages'
    },
    last_polled_date: {
      type: 'datetime',
      label: 'Last Polled',
      readonly: true
    },
    // Statistics
    total_posts_processed: {
      type: 'number',
      label: 'Posts Processed',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    cases_created: {
      type: 'number',
      label: 'Cases Created',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    responses_sent: {
      type: 'number',
      label: 'Responses Sent',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    error_count: {
      type: 'number',
      label: 'Error Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    last_error_date: {
      type: 'datetime',
      label: 'Last Error',
      readonly: true
    },
    last_error_message: {
      type: 'text',
      label: 'Last Error Message',
      maxLength: 500,
      readonly: true
    },
    // Engagement Metrics
    average_sentiment: {
      type: 'number',
      label: 'Average Sentiment Score',
      precision: 2,
      readonly: true,
      description: 'Average sentiment score (-1 to 1)'
    },
    average_response_time: {
      type: 'number',
      label: 'Avg Response Time (Minutes)',
      precision: 2,
      readonly: true
    }
  },
  validationRules: [
    {
      name: 'AutoResponseRequired',
      errorMessage: 'Auto response message is required when auto response is enabled',
      formula: 'AND(send_auto_response = true, ISBLANK(auto_response_message))'
    },
    {
      name: 'MonitoringRequired',
      errorMessage: 'At least one monitoring option must be enabled',
      formula: 'AND(monitor_mentions = false, monitor_direct_messages = false, monitor_comments = false)'
    }
  ],
  listViews: [
    {
      name: 'AllConfigurations',
      label: 'All Configurations',
      filters: [],
      columns: ['name', 'platform', 'account_handle', 'is_active', 'cases_created', 'responses_sent'],
      sort: [['platform', 'asc'], ['name', 'asc']]
    },
    {
      name: 'ActiveConfigurations',
      label: 'Active',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['platform', 'account_handle', 'default_queue_id', 'last_polled_date', 'cases_created', 'average_sentiment'],
      sort: [['platform', 'asc']]
    },
    {
      name: 'ByPlatform',
      label: 'By platform',
      filters: [],
      columns: ['platform', 'name', 'cases_created', 'average_sentiment', 'average_response_time'],
      sort: [['platform', 'asc'], ['cases_created', 'desc']]
    },
    {
      name: 'WithErrors',
      label: 'With Errors',
      filters: [
        ['error_count', '>', 0]
      ],
      columns: ['name', 'platform', 'error_count', 'last_error_date', 'last_error_message'],
      sort: [['last_error_date', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Configuration Information',
        columns: 2,
        fields: ['name', 'description', 'platform', 'is_active']
      },
      {
        label: 'Account Details',
        columns: 2,
        fields: ['account_handle', 'account_id']
      },
      {
        label: 'Authentication',
        columns: 2,
        fields: ['access_token', 'refresh_token', 'token_expiry_date']
      },
      {
        label: 'Monitoring Settings',
        columns: 2,
        fields: ['monitor_mentions', 'monitor_direct_messages', 'monitor_comments', 'monitor_hashtags', 'monitor_keywords']
      },
      {
        label: 'Default Case Settings',
        columns: 2,
        fields: ['default_queue_id', 'default_owner_id', 'default_priority', 'default_case_type']
      },
      {
        label: 'Contact Matching',
        columns: 2,
        fields: ['auto_match_contact', 'create_contact_if_not_found', 'default_account_id']
      },
      {
        label: 'Response Configuration',
        columns: 1,
        fields: ['send_auto_response', 'auto_response_message', 'response_delay_seconds']
      },
      {
        label: 'AI Processing',
        columns: 3,
        fields: ['use_a_i_sentiment_analysis', 'use_a_i_for_priority', 'use_a_i_for_urgency']
      },
      {
        label: 'Filtering',
        columns: 2,
        fields: ['minimum_followers', 'exclude_verified_users', 'blocked_users']
      },
      {
        label: 'Polling',
        columns: 2,
        fields: ['polling_interval', 'last_polled_date']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['total_posts_processed', 'cases_created', 'responses_sent', 'error_count', 'last_error_date', 'last_error_message']
      },
      {
        label: 'Engagement Metrics',
        columns: 2,
        fields: ['average_sentiment', 'average_response_time']
      }
    ]
  }
};

export default SocialMediaCase;
