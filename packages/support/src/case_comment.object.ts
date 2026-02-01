
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
    case_id: {
      type: 'lookup',
      label: 'Case',
      reference: 'case',
      required: true
    },
    parent_comment_id: {
      type: 'lookup',
      label: 'Parent Comment',
      reference: 'CaseComment',
      description: 'Parent comment for threaded discussions'
    },
    // Comment Information
    comment_type: {
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
    body: {
      type: 'textarea',
      label: 'Comment',
      required: true,
      maxLength: 32000,
      searchable: true,
      description: 'Comment text'
    },
    plain_text_body: {
      type: 'textarea',
      label: 'Plain Text',
      maxLength: 32000,
      readonly: true,
      searchable: true,
      description: 'Plain text version for search'
    },
    // Visibility
    is_public: {
      type: 'checkbox',
      label: 'Visible to Customer',
      defaultValue: false,
      description: 'Whether this comment is visible in customer portal'
    },
    is_internal: {
      type: 'checkbox',
      label: 'Internal Only',
      defaultValue: false,
      description: 'Internal note not visible to customer'
    },
    // User Information
    created_by_id: {
      type: 'lookup',
      label: 'Created By',
      reference: 'User',
      readonly: true
    },
    contact_id: {
      type: 'lookup',
      label: 'Contact',
      reference: 'Contact',
      description: 'Customer contact who created this comment'
    },
    // Email Integration
    from_email: {
      type: 'email',
      label: 'From Email',
      description: 'Email address of sender (for email comments)'
    },
    to_email: {
      type: 'text',
      label: 'To Email',
      maxLength: 500,
      description: 'Email recipients'
    },
    cc_email: {
      type: 'text',
      label: 'CC Email',
      maxLength: 500,
      description: 'CC recipients'
    },
    email_subject: {
      type: 'text',
      label: 'Email Subject',
      maxLength: 255,
      searchable: true
    },
    email_message_id: {
      type: 'text',
      label: 'Email Message ID',
      maxLength: 255,
      readonly: true,
      description: 'Unique email message identifier'
    },
    in_reply_to_id: {
      type: 'text',
      label: 'In Reply To',
      maxLength: 255,
      readonly: true,
      description: 'Email thread tracking'
    },
    // SLA & Response Tracking
    is_first_response: {
      type: 'checkbox',
      label: 'Is First Response',
      readonly: true,
      defaultValue: false,
      description: 'First agent response to case'
    },
    response_time_minutes: {
      type: 'number',
      label: 'Response Time (Minutes)',
      precision: 0,
      readonly: true,
      description: 'Minutes since last customer comment'
    },
    // AI Features
    ai_generated_suggestion: {
      type: 'textarea',
      label: 'AI Suggested Response',
      maxLength: 5000,
      readonly: true,
      description: 'AI-generated response suggestion'
    },
    ai_sentiment: {
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
    ai_confidence_score: {
      type: 'number',
      label: 'AI Confidence',
      precision: 2,
      min: 0,
      max: 100,
      readonly: true,
      description: 'AI confidence in sentiment analysis'
    },
    ai_keywords: {
      type: 'text',
      label: 'AI Keywords',
      maxLength: 500,
      readonly: true,
      description: 'Extracted keywords'
    },
    // Metadata
    is_solution: {
      type: 'checkbox',
      label: 'Marked as Solution',
      defaultValue: false,
      description: 'This comment contains the solution'
    },
    is_edited: {
      type: 'checkbox',
      label: 'Edited',
      readonly: true,
      defaultValue: false
    },
    edited_date: {
      type: 'datetime',
      label: 'Last Edited',
      readonly: true
    },
    edited_by_id: {
      type: 'lookup',
      label: 'Edited By',
      reference: 'User',
      readonly: true
    },
    // Engagement
    like_count: {
      type: 'number',
      label: 'Likes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    is_helpful: {
      type: 'checkbox',
      label: 'Marked Helpful',
      readonly: true,
      defaultValue: false,
      description: 'Customer marked this as helpful'
    },
    // Integration
    channel_source: {
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
    channel_message_id: {
      type: 'text',
      label: 'Channel Message ID',
      maxLength: 255,
      readonly: true,
      description: 'External message ID from source channel'
    },
    // Attachment Info
    has_attachment: {
      type: 'checkbox',
      label: 'Has Attachment',
      readonly: true,
      defaultValue: false
    },
    attachment_count: {
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
      foreignKey: 'parent_comment_id',
      label: 'Replies'
    }
  ],
  validationRules: [
    {
      name: 'PublicNotInternal',
      errorMessage: 'Comment cannot be both public and internal',
      formula: 'AND(is_public = true, is_internal = true)'
    },
    {
      name: 'CustomerCommentPublic',
      errorMessage: 'Customer comments must be public',
      formula: 'AND(comment_type = "Customer", is_public = false)'
    },
    {
      name: 'InternalNotPublic',
      errorMessage: 'Internal notes cannot be visible to customer',
      formula: 'AND(comment_type = "Internal", is_public = true)'
    }
  ],
  listViews: [
    {
      name: 'AllComments',
      label: 'All Comments',
      filters: [],
      columns: ['case_id', 'comment_type', 'created_by_id', 'body', 'is_public', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'PublicComments',
      label: 'Public Comments',
      filters: [
        ['is_public', '=', true]
      ],
      columns: ['case_id', 'comment_type', 'created_by_id', 'body', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'InternalNotes',
      label: 'Internal Notes',
      filters: [
        ['is_internal', '=', true]
      ],
      columns: ['case_id', 'created_by_id', 'body', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'CustomerResponses',
      label: 'Customer Responses',
      filters: [
        ['comment_type', '=', 'Customer']
      ],
      columns: ['case_id', 'contact_id', 'body', 'ai_sentiment', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'Solutions',
      label: 'Solutions',
      filters: [
        ['is_solution', '=', true]
      ],
      columns: ['case_id', 'comment_type', 'created_by_id', 'body', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'EmailComments',
      label: 'Email Thread',
      filters: [
        ['comment_type', '=', 'Email']
      ],
      columns: ['case_id', 'from_email', 'email_subject', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Comment Information',
        columns: 2,
        fields: ['case_id', 'comment_type', 'channel_source', 'parent_comment_id']
      },
      {
        label: 'Visibility',
        columns: 2,
        fields: ['is_public', 'is_internal', 'is_solution']
      },
      {
        label: 'Content',
        columns: 1,
        fields: ['body']
      },
      {
        label: 'Email Details',
        columns: 2,
        fields: ['from_email', 'to_email', 'cc_email', 'email_subject', 'email_message_id', 'in_reply_to_id']
      },
      {
        label: 'User Information',
        columns: 2,
        fields: ['created_by_id', 'contact_id']
      },
      {
        label: 'Response Tracking',
        columns: 2,
        fields: ['is_first_response', 'response_time_minutes']
      },
      {
        label: 'AI Analysis',
        columns: 2,
        fields: ['ai_sentiment', 'ai_confidence_score', 'ai_keywords', 'ai_generated_suggestion']
      },
      {
        label: 'Engagement',
        columns: 2,
        fields: ['like_count', 'is_helpful', 'has_attachment', 'attachment_count']
      },
      {
        label: 'Edit History',
        columns: 2,
        fields: ['is_edited', 'edited_date', 'edited_by_id']
      }
    ]
  }
};

export default CaseComment;
