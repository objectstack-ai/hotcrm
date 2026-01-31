
const CaseComment = {
  name: 'case_comment',
  label: 'Case Comment',
  labelPlural: 'Case Comments',
  icon: 'comment',
  description: 'Comments, responses, and interaction history for cases',
  enable: {
    searchable: true,
    trackHistory: true,
    files: true
  },
  fields: {
    // Relationships
    CaseId: {
      type: 'lookup',
      label: 'Case',
      reference: 'Case',
      required: true
    },
    ParentCommentId: {
      type: 'lookup',
      label: 'Parent Comment',
      reference: 'CaseComment',
      description: 'Parent comment for threaded discussions'
    },
    // Comment Information
    CommentType: {
      type: 'select',
      label: 'Comment Type',
      required: true,
      defaultValue: 'Internal',
      options: [
        { label: '👤 Customer Response', value: 'Customer' },
        { label: '👨‍💼 Agent Response', value: 'Agent' },
        { label: '🔒 Internal Note', value: 'Internal' },
        { label: '📧 Email', value: 'Email' },
        { label: '💬 Chat', value: 'Chat' },
        { label: '📞 Phone', value: 'Phone' },
        { label: '🤖 System', value: 'System' },
        { label: '🎯 Other', value: 'Other' }
      ]
    },
    Body: {
      type: 'textarea',
      label: 'Comment',
      required: true,
      maxLength: 32000,
      searchable: true,
      description: 'Comment text'
    },
    PlainTextBody: {
      type: 'textarea',
      label: 'Plain Text',
      maxLength: 32000,
      readonly: true,
      searchable: true,
      description: 'Plain text version for search'
    },
    // Visibility
    IsPublic: {
      type: 'checkbox',
      label: 'Visible to Customer',
      defaultValue: false,
      description: 'Whether this comment is visible in customer portal'
    },
    IsInternal: {
      type: 'checkbox',
      label: 'Internal Only',
      defaultValue: false,
      description: 'Internal note not visible to customer'
    },
    // User Information
    CreatedById: {
      type: 'lookup',
      label: 'Created By',
      reference: 'User',
      readonly: true
    },
    ContactId: {
      type: 'lookup',
      label: 'Contact',
      reference: 'Contact',
      description: 'Customer contact who created this comment'
    },
    // Email Integration
    FromEmail: {
      type: 'email',
      label: 'From Email',
      description: 'Email address of sender (for email comments)'
    },
    ToEmail: {
      type: 'text',
      label: 'To Email',
      maxLength: 500,
      description: 'Email recipients'
    },
    CcEmail: {
      type: 'text',
      label: 'CC Email',
      maxLength: 500,
      description: 'CC recipients'
    },
    EmailSubject: {
      type: 'text',
      label: 'Email Subject',
      maxLength: 255,
      searchable: true
    },
    EmailMessageId: {
      type: 'text',
      label: 'Email Message ID',
      maxLength: 255,
      readonly: true,
      description: 'Unique email message identifier'
    },
    InReplyToId: {
      type: 'text',
      label: 'In Reply To',
      maxLength: 255,
      readonly: true,
      description: 'Email thread tracking'
    },
    // SLA & Response Tracking
    IsFirstResponse: {
      type: 'checkbox',
      label: 'Is First Response',
      readonly: true,
      defaultValue: false,
      description: 'First agent response to case'
    },
    ResponseTimeMinutes: {
      type: 'number',
      label: 'Response Time (Minutes)',
      precision: 0,
      readonly: true,
      description: 'Minutes since last customer comment'
    },
    // AI Features
    AIGeneratedSuggestion: {
      type: 'textarea',
      label: 'AI Suggested Response',
      maxLength: 5000,
      readonly: true,
      description: 'AI-generated response suggestion'
    },
    AISentiment: {
      type: 'select',
      label: 'AI Sentiment',
      readonly: true,
      options: [
        { label: '😊 Positive', value: 'Positive' },
        { label: '😐 Neutral', value: 'Neutral' },
        { label: '😟 Negative', value: 'Negative' },
        { label: '😡 Angry', value: 'Angry' }
      ]
    },
    AIConfidenceScore: {
      type: 'number',
      label: 'AI Confidence',
      precision: 2,
      min: 0,
      max: 100,
      readonly: true,
      description: 'AI confidence in sentiment analysis'
    },
    AIKeywords: {
      type: 'text',
      label: 'AI Keywords',
      maxLength: 500,
      readonly: true,
      description: 'Extracted keywords'
    },
    // Metadata
    IsSolution: {
      type: 'checkbox',
      label: 'Marked as Solution',
      defaultValue: false,
      description: 'This comment contains the solution'
    },
    IsEdited: {
      type: 'checkbox',
      label: 'Edited',
      readonly: true,
      defaultValue: false
    },
    EditedDate: {
      type: 'datetime',
      label: 'Last Edited',
      readonly: true
    },
    EditedById: {
      type: 'lookup',
      label: 'Edited By',
      reference: 'User',
      readonly: true
    },
    // Engagement
    LikeCount: {
      type: 'number',
      label: 'Likes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    IsHelpful: {
      type: 'checkbox',
      label: 'Marked Helpful',
      readonly: true,
      defaultValue: false,
      description: 'Customer marked this as helpful'
    },
    // Integration
    ChannelSource: {
      type: 'select',
      label: 'Channel',
      options: [
        { label: '📧 Email', value: 'Email' },
        { label: '🌐 Portal', value: 'Portal' },
        { label: '📞 Phone', value: 'Phone' },
        { label: '💬 Chat', value: 'Chat' },
        { label: '💬 WeChat', value: 'WeChat' },
        { label: '💬 WhatsApp', value: 'WhatsApp' },
        { label: '📱 SMS', value: 'SMS' },
        { label: '🐦 Twitter', value: 'Twitter' },
        { label: '📘 Facebook', value: 'Facebook' },
        { label: '🤖 Bot', value: 'Bot' },
        { label: '🎯 Other', value: 'Other' }
      ]
    },
    ChannelMessageId: {
      type: 'text',
      label: 'Channel Message ID',
      maxLength: 255,
      readonly: true,
      description: 'External message ID from source channel'
    },
    // Attachment Info
    HasAttachment: {
      type: 'checkbox',
      label: 'Has Attachment',
      readonly: true,
      defaultValue: false
    },
    AttachmentCount: {
      type: 'number',
      label: 'Attachments',
      precision: 0,
      readonly: true,
      defaultValue: 0
    }
  },
  relationships: [
    {
      name: 'ChildComments',
      type: 'hasMany',
      object: 'CaseComment',
      foreignKey: 'ParentCommentId',
      label: 'Replies'
    }
  ],
  validationRules: [
    {
      name: 'PublicNotInternal',
      errorMessage: 'Comment cannot be both public and internal',
      formula: 'AND(IsPublic = true, IsInternal = true)'
    },
    {
      name: 'CustomerCommentPublic',
      errorMessage: 'Customer comments must be public',
      formula: 'AND(CommentType = "Customer", IsPublic = false)'
    },
    {
      name: 'InternalNotPublic',
      errorMessage: 'Internal notes cannot be visible to customer',
      formula: 'AND(CommentType = "Internal", IsPublic = true)'
    }
  ],
  listViews: [
    {
      name: 'AllComments',
      label: 'All Comments',
      filters: [],
      columns: ['CaseId', 'CommentType', 'CreatedById', 'Body', 'IsPublic', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'PublicComments',
      label: 'Public Comments',
      filters: [
        ['IsPublic', '=', true]
      ],
      columns: ['CaseId', 'CommentType', 'CreatedById', 'Body', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'InternalNotes',
      label: 'Internal Notes',
      filters: [
        ['IsInternal', '=', true]
      ],
      columns: ['CaseId', 'CreatedById', 'Body', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'CustomerResponses',
      label: 'Customer Responses',
      filters: [
        ['CommentType', '=', 'Customer']
      ],
      columns: ['CaseId', 'ContactId', 'Body', 'AISentiment', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'Solutions',
      label: 'Solutions',
      filters: [
        ['IsSolution', '=', true]
      ],
      columns: ['CaseId', 'CommentType', 'CreatedById', 'Body', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'EmailComments',
      label: 'Email Thread',
      filters: [
        ['CommentType', '=', 'Email']
      ],
      columns: ['CaseId', 'FromEmail', 'EmailSubject', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Comment Information',
        columns: 2,
        fields: ['CaseId', 'CommentType', 'ChannelSource', 'ParentCommentId']
      },
      {
        label: 'Visibility',
        columns: 2,
        fields: ['IsPublic', 'IsInternal', 'IsSolution']
      },
      {
        label: 'Content',
        columns: 1,
        fields: ['Body']
      },
      {
        label: 'Email Details',
        columns: 2,
        fields: ['FromEmail', 'ToEmail', 'CcEmail', 'EmailSubject', 'EmailMessageId', 'InReplyToId']
      },
      {
        label: 'User Information',
        columns: 2,
        fields: ['CreatedById', 'ContactId']
      },
      {
        label: 'Response Tracking',
        columns: 2,
        fields: ['IsFirstResponse', 'ResponseTimeMinutes']
      },
      {
        label: 'AI Analysis',
        columns: 2,
        fields: ['AISentiment', 'AIConfidenceScore', 'AIKeywords', 'AIGeneratedSuggestion']
      },
      {
        label: 'Engagement',
        columns: 2,
        fields: ['LikeCount', 'IsHelpful', 'HasAttachment', 'AttachmentCount']
      },
      {
        label: 'Edit History',
        columns: 2,
        fields: ['IsEdited', 'EditedDate', 'EditedById']
      }
    ]
  }
};

export default CaseComment;
