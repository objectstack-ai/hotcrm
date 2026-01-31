import type { ObjectSchema } from '@objectstack/spec/data';

const ForumTopic: ObjectSchema = {
  name: 'forum_topic',
  label: 'Forum Topic',
  labelPlural: 'Forum Topics',
  icon: 'comments',
  description: 'Community forum discussion topics',
  enable: {
    searchEnabled: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    Title: {
      type: 'text',
      label: 'Topic Title',
      required: true,
      maxLength: 255,
      searchEnabled: true
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      required: true,
      maxLength: 5000,
      searchEnabled: true
    },
    // Categorization
    Category: {
      type: 'select',
      label: 'Category',
      required: true,
      options: [
        { label: '💬 General Discussion', value: 'General' },
        { label: '❓ Questions & Answers', value: 'QA' },
        { label: '🛠️ Technical Support', value: 'Technical' },
        { label: '📦 Product Feedback', value: 'Feedback' },
        { label: '💡 Feature Requests', value: 'FeatureRequest' },
        { label: '📢 Announcements', value: 'Announcements' },
        { label: '🎓 Tips & Tricks', value: 'Tips' },
        { label: '🐛 Bug Reports', value: 'BugReports' }
      ]
    },
    Tags: {
      type: 'text',
      label: 'Tags',
      maxLength: 500,
      searchEnabled: true,
      description: 'Comma-separated tags'
    },
    // Author
    AuthorId: {
      type: 'lookup',
      label: 'Author',
      reference: 'PortalUser',
      required: true
    },
    AuthorType: {
      type: 'select',
      label: 'Author Type',
      required: true,
      defaultValue: 'Customer',
      options: [
        { label: '👤 Customer', value: 'Customer' },
        { label: '🛡️ Support Agent', value: 'Agent' },
        { label: '👑 Administrator', value: 'Admin' },
        { label: '⭐ Community Expert', value: 'Expert' }
      ]
    },
    // Status
    Status: {
      type: 'select',
      label: 'Status',
      required: true,
      defaultValue: 'Open',
      options: [
        { label: '🆕 Open', value: 'Open' },
        { label: '✅ Answered', value: 'Answered' },
        { label: '🔒 Closed', value: 'Closed' },
        { label: '📌 Pinned', value: 'Pinned' },
        { label: '🔒 Locked', value: 'Locked' },
        { label: '🗑️ Deleted', value: 'Deleted' }
      ]
    },
    IsPinned: {
      type: 'checkbox',
      label: 'Pinned',
      defaultValue: false,
      description: 'Pin to top of category'
    },
    IsLocked: {
      type: 'checkbox',
      label: 'Locked',
      defaultValue: false,
      description: 'Prevent new replies'
    },
    IsFeatured: {
      type: 'checkbox',
      label: 'Featured',
      defaultValue: false,
      description: 'Feature on homepage'
    },
    // Answer
    HasAcceptedAnswer: {
      type: 'checkbox',
      label: 'Has Accepted Answer',
      readonly: true,
      defaultValue: false
    },
    AcceptedAnswerPostId: {
      type: 'lookup',
      label: 'Accepted Answer',
      reference: 'ForumPost',
      readonly: true
    },
    AcceptedDate: {
      type: 'datetime',
      label: 'Accepted Date',
      readonly: true
    },
    // Related
    RelatedCaseId: {
      type: 'lookup',
      label: 'Related Case',
      reference: 'Case',
      description: 'Case that originated this topic'
    },
    RelatedArticleId: {
      type: 'lookup',
      label: 'Related Article',
      reference: 'KnowledgeArticle',
      description: 'Knowledge article related to this topic'
    },
    // Moderation
    RequiresModeration: {
      type: 'checkbox',
      label: 'Requires Moderation',
      defaultValue: false
    },
    ModeratedById: {
      type: 'lookup',
      label: 'Moderated By',
      reference: 'User',
      readonly: true
    },
    ModerationDate: {
      type: 'datetime',
      label: 'Moderation Date',
      readonly: true
    },
    ModerationNotes: {
      type: 'textarea',
      label: 'Moderation Notes',
      maxLength: 2000,
      readonly: true
    },
    // Statistics
    ViewCount: {
      type: 'number',
      label: 'Views',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    PostCount: {
      type: 'number',
      label: 'Replies',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    LikeCount: {
      type: 'number',
      label: 'Likes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    FollowerCount: {
      type: 'number',
      label: 'Followers',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    // Activity
    LastPostDate: {
      type: 'datetime',
      label: 'Last Post',
      readonly: true
    },
    LastPostById: {
      type: 'lookup',
      label: 'Last Post By',
      reference: 'PortalUser',
      readonly: true
    },
    ClosedDate: {
      type: 'datetime',
      label: 'Closed Date',
      readonly: true
    },
    ClosedById: {
      type: 'lookup',
      label: 'Closed By',
      reference: 'User',
      readonly: true
    },
    // SEO
    URLSlug: {
      type: 'text',
      label: 'URL Slug',
      maxLength: 255,
      readonly: true
    }
  },
  relationships: [
    {
      name: 'Posts',
      type: 'hasMany',
      object: 'ForumPost',
      foreignKey: 'TopicId',
      label: 'Posts'
    }
  ],
  validationRules: [
    {
      name: 'LockedTopicsReadOnly',
      errorMessage: 'Locked topics cannot be modified',
      formula: 'AND(PRIORVALUE(IsLocked) = true, NOT(ISNEW()))'
    }
  ],
  listViews: [
    {
      name: 'AllTopics',
      label: 'All Topics',
      filters: [],
      columns: ['Title', 'Category', 'AuthorId', 'Status', 'PostCount', 'ViewCount', 'LastPostDate'],
      sort: [['LastPostDate', 'desc']]
    },
    {
      name: 'OpenTopics',
      label: 'Open Topics',
      filters: [
        ['Status', '=', 'Open']
      ],
      columns: ['Title', 'Category', 'AuthorId', 'PostCount', 'ViewCount', 'LastPostDate'],
      sort: [['LastPostDate', 'desc']]
    },
    {
      name: 'Unanswered',
      label: 'Unanswered',
      filters: [
        ['Status', '=', 'Open'],
        ['HasAcceptedAnswer', '=', false],
        ['Category', '=', 'QA']
      ],
      columns: ['Title', 'AuthorId', 'CreatedDate', 'ViewCount', 'PostCount'],
      sort: [['CreatedDate', 'asc']]
    },
    {
      name: 'Featured',
      label: 'Featured',
      filters: [
        ['IsFeatured', '=', true]
      ],
      columns: ['Title', 'Category', 'ViewCount', 'LikeCount', 'PostCount'],
      sort: [['ViewCount', 'desc']]
    },
    {
      name: 'Trending',
      label: 'Trending',
      filters: [
        ['CreatedDate', 'last_n_days', 7]
      ],
      columns: ['Title', 'Category', 'ViewCount', 'LikeCount', 'PostCount', 'CreatedDate'],
      sort: [['ViewCount', 'desc']]
    },
    {
      name: 'NeedingModeration',
      label: 'Needing Moderation',
      filters: [
        ['RequiresModeration', '=', true],
        ['ModeratedById', '=', null]
      ],
      columns: ['Title', 'Category', 'AuthorId', 'CreatedDate'],
      sort: [['CreatedDate', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Topic Information',
        columns: 1,
        fields: ['Title', 'Description']
      },
      {
        label: 'Categorization',
        columns: 2,
        fields: ['Category', 'Tags']
      },
      {
        label: 'Author',
        columns: 2,
        fields: ['AuthorId', 'AuthorType']
      },
      {
        label: 'Status',
        columns: 3,
        fields: ['Status', 'IsPinned', 'IsLocked', 'IsFeatured']
      },
      {
        label: 'Answer',
        columns: 3,
        fields: ['HasAcceptedAnswer', 'AcceptedAnswerPostId', 'AcceptedDate']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['RelatedCaseId', 'RelatedArticleId']
      },
      {
        label: 'Moderation',
        columns: 2,
        fields: ['RequiresModeration', 'ModeratedById', 'ModerationDate', 'ModerationNotes']
      },
      {
        label: 'Statistics',
        columns: 4,
        fields: ['ViewCount', 'PostCount', 'LikeCount', 'FollowerCount']
      },
      {
        label: 'Activity',
        columns: 2,
        fields: ['LastPostDate', 'LastPostById', 'ClosedDate', 'ClosedById']
      }
    ]
  }
};

export default ForumTopic;
