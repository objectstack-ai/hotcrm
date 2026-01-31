
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
    Name: {
      type: 'text',
      label: 'Configuration Name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000
    },
    IsActive: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // Platform Configuration
    Platform: {
      type: 'select',
      label: 'Social Platform',
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
    AccountHandle: {
      type: 'text',
      label: 'Account Handle',
      required: true,
      maxLength: 255,
      description: 'Social media account username/handle to monitor'
    },
    AccountId: {
      type: 'text',
      label: 'Account ID',
      maxLength: 255,
      description: 'Platform-specific account identifier'
    },
    // Authentication
    AccessToken: {
      type: 'text',
      label: 'Access Token',
      maxLength: 1000,
      description: 'OAuth access token (encrypted)'
    },
    RefreshToken: {
      type: 'text',
      label: 'Refresh Token',
      maxLength: 1000,
      description: 'OAuth refresh token (encrypted)'
    },
    TokenExpiryDate: {
      type: 'datetime',
      label: 'Token Expiry',
      readonly: true
    },
    // Monitoring Configuration
    MonitorMentions: {
      type: 'checkbox',
      label: 'Monitor Mentions',
      defaultValue: true,
      description: 'Create cases from @mentions'
    },
    MonitorDirectMessages: {
      type: 'checkbox',
      label: 'Monitor Direct Messages',
      defaultValue: true,
      description: 'Create cases from DMs'
    },
    MonitorComments: {
      type: 'checkbox',
      label: 'Monitor Comments',
      defaultValue: true,
      description: 'Create cases from post comments'
    },
    MonitorHashtags: {
      type: 'text',
      label: 'Monitor Hashtags',
      maxLength: 500,
      description: 'Comma-separated hashtags to monitor'
    },
    MonitorKeywords: {
      type: 'textarea',
      label: 'Monitor Keywords',
      maxLength: 2000,
      description: 'Keywords to trigger case creation (one per line)'
    },
    // Routing
    DefaultQueueId: {
      type: 'lookup',
      label: 'Default Queue',
      reference: 'Queue',
      required: true
    },
    DefaultOwnerId: {
      type: 'lookup',
      label: 'Default Owner',
      reference: 'User'
    },
    DefaultPriority: {
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
    DefaultCaseType: {
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
    AutoMatchContact: {
      type: 'checkbox',
      label: 'Auto Match Contact',
      defaultValue: true,
      description: 'Match social profile to existing contact'
    },
    CreateContactIfNotFound: {
      type: 'checkbox',
      label: 'Create Contact If Not Found',
      defaultValue: true
    },
    DefaultAccountId: {
      type: 'lookup',
      label: 'Default Account',
      reference: 'Account',
      description: 'Account for new contacts'
    },
    // Response Configuration
    SendAutoResponse: {
      type: 'checkbox',
      label: 'Send Auto Response',
      defaultValue: true,
      description: 'Send automatic acknowledgment message'
    },
    AutoResponseMessage: {
      type: 'textarea',
      label: 'Auto Response Message',
      maxLength: 500,
      description: 'Message to send when case is created'
    },
    ResponseDelaySeconds: {
      type: 'number',
      label: 'Response Delay (Seconds)',
      precision: 0,
      min: 0,
      max: 300,
      defaultValue: 5,
      description: 'Delay before sending auto-response'
    },
    // AI Processing
    UseAISentimentAnalysis: {
      type: 'checkbox',
      label: 'Use AI Sentiment Analysis',
      defaultValue: true,
      description: 'Analyze sentiment of social posts'
    },
    UseAIForPriority: {
      type: 'checkbox',
      label: 'Use AI for Priority',
      defaultValue: true,
      description: 'AI determines case priority based on content'
    },
    UseAIForUrgency: {
      type: 'checkbox',
      label: 'Use AI for Urgency',
      defaultValue: true,
      description: 'Detect urgent situations (e.g., angry customers)'
    },
    // Filtering
    MinimumFollowers: {
      type: 'number',
      label: 'Minimum Followers',
      precision: 0,
      min: 0,
      description: 'Minimum follower count to create case (0 = all)'
    },
    ExcludeVerifiedUsers: {
      type: 'checkbox',
      label: 'Exclude Verified Users',
      defaultValue: false,
      description: 'Do not create cases from verified accounts'
    },
    BlockedUsers: {
      type: 'textarea',
      label: 'Blocked Users',
      maxLength: 2000,
      description: 'Usernames to ignore (one per line)'
    },
    // Polling
    PollingInterval: {
      type: 'number',
      label: 'Polling Interval (Minutes)',
      precision: 0,
      min: 1,
      max: 60,
      defaultValue: 5,
      description: 'How often to check for new mentions/messages'
    },
    LastPolledDate: {
      type: 'datetime',
      label: 'Last Polled',
      readonly: true
    },
    // Statistics
    TotalPostsProcessed: {
      type: 'number',
      label: 'Posts Processed',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    CasesCreated: {
      type: 'number',
      label: 'Cases Created',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    ResponsesSent: {
      type: 'number',
      label: 'Responses Sent',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    ErrorCount: {
      type: 'number',
      label: 'Error Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    LastErrorDate: {
      type: 'datetime',
      label: 'Last Error',
      readonly: true
    },
    LastErrorMessage: {
      type: 'text',
      label: 'Last Error Message',
      maxLength: 500,
      readonly: true
    },
    // Engagement Metrics
    AverageSentiment: {
      type: 'number',
      label: 'Average Sentiment Score',
      precision: 2,
      readonly: true,
      description: 'Average sentiment score (-1 to 1)'
    },
    AverageResponseTime: {
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
      formula: 'AND(SendAutoResponse = true, ISBLANK(AutoResponseMessage))'
    },
    {
      name: 'MonitoringRequired',
      errorMessage: 'At least one monitoring option must be enabled',
      formula: 'AND(MonitorMentions = false, MonitorDirectMessages = false, MonitorComments = false)'
    }
  ],
  listViews: [
    {
      name: 'AllConfigurations',
      label: 'All Configurations',
      filters: [],
      columns: ['Name', 'Platform', 'AccountHandle', 'IsActive', 'CasesCreated', 'ResponsesSent'],
      sort: [['Platform', 'asc'], ['Name', 'asc']]
    },
    {
      name: 'ActiveConfigurations',
      label: 'Active',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Platform', 'AccountHandle', 'DefaultQueueId', 'LastPolledDate', 'CasesCreated', 'AverageSentiment'],
      sort: [['Platform', 'asc']]
    },
    {
      name: 'ByPlatform',
      label: 'By Platform',
      filters: [],
      columns: ['Platform', 'Name', 'CasesCreated', 'AverageSentiment', 'AverageResponseTime'],
      sort: [['Platform', 'asc'], ['CasesCreated', 'desc']]
    },
    {
      name: 'WithErrors',
      label: 'With Errors',
      filters: [
        ['ErrorCount', '>', 0]
      ],
      columns: ['Name', 'Platform', 'ErrorCount', 'LastErrorDate', 'LastErrorMessage'],
      sort: [['LastErrorDate', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Configuration Information',
        columns: 2,
        fields: ['Name', 'Description', 'Platform', 'IsActive']
      },
      {
        label: 'Account Details',
        columns: 2,
        fields: ['AccountHandle', 'AccountId']
      },
      {
        label: 'Authentication',
        columns: 2,
        fields: ['AccessToken', 'RefreshToken', 'TokenExpiryDate']
      },
      {
        label: 'Monitoring Settings',
        columns: 2,
        fields: ['MonitorMentions', 'MonitorDirectMessages', 'MonitorComments', 'MonitorHashtags', 'MonitorKeywords']
      },
      {
        label: 'Default Case Settings',
        columns: 2,
        fields: ['DefaultQueueId', 'DefaultOwnerId', 'DefaultPriority', 'DefaultCaseType']
      },
      {
        label: 'Contact Matching',
        columns: 2,
        fields: ['AutoMatchContact', 'CreateContactIfNotFound', 'DefaultAccountId']
      },
      {
        label: 'Response Configuration',
        columns: 1,
        fields: ['SendAutoResponse', 'AutoResponseMessage', 'ResponseDelaySeconds']
      },
      {
        label: 'AI Processing',
        columns: 3,
        fields: ['UseAISentimentAnalysis', 'UseAIForPriority', 'UseAIForUrgency']
      },
      {
        label: 'Filtering',
        columns: 2,
        fields: ['MinimumFollowers', 'ExcludeVerifiedUsers', 'BlockedUsers']
      },
      {
        label: 'Polling',
        columns: 2,
        fields: ['PollingInterval', 'LastPolledDate']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['TotalPostsProcessed', 'CasesCreated', 'ResponsesSent', 'ErrorCount', 'LastErrorDate', 'LastErrorMessage']
      },
      {
        label: 'Engagement Metrics',
        columns: 2,
        fields: ['AverageSentiment', 'AverageResponseTime']
      }
    ]
  }
};

export default SocialMediaCase;
