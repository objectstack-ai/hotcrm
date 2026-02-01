
const ForumTopic = {
  name: 'forum_topic',
  label: 'Forum Topic',
  labelPlural: 'Forum Topics',
  icon: 'comments',
  description: 'Community forum discussion topics',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    title: {
      type: 'text',
      label: 'Topic title',
      required: true,
      maxLength: 255,
      searchable: true
    },
    description: {
      type: 'textarea',
      label: 'description',
      required: true,
      maxLength: 5000,
      searchable: true
    },
    // Categorization
    category: {
      type: 'select',
      label: 'category',
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
    tags: {
      type: 'text',
      label: 'tags',
      maxLength: 500,
      searchable: true,
      description: 'Comma-separated tags'
    },
    // Author
    author_id: {
      type: 'lookup',
      label: 'Author',
      reference: 'PortalUser',
      required: true
    },
    author_type: {
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
    // status
    status: {
      type: 'select',
      label: 'status',
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
    is_pinned: {
      type: 'checkbox',
      label: 'Pinned',
      defaultValue: false,
      description: 'Pin to top of category'
    },
    is_locked: {
      type: 'checkbox',
      label: 'Locked',
      defaultValue: false,
      description: 'Prevent new replies'
    },
    is_featured: {
      type: 'checkbox',
      label: 'Featured',
      defaultValue: false,
      description: 'Feature on homepage'
    },
    // Answer
    has_accepted_answer: {
      type: 'checkbox',
      label: 'Has Accepted Answer',
      readonly: true,
      defaultValue: false
    },
    accepted_answer_post_id: {
      type: 'lookup',
      label: 'Accepted Answer',
      reference: 'ForumPost',
      readonly: true
    },
    accepted_date: {
      type: 'datetime',
      label: 'Accepted Date',
      readonly: true
    },
    // Related
    related_case_id: {
      type: 'lookup',
      label: 'Related Case',
      reference: 'case',
      description: 'Case that originated this topic'
    },
    related_article_id: {
      type: 'lookup',
      label: 'Related Article',
      reference: 'KnowledgeArticle',
      description: 'Knowledge article related to this topic'
    },
    // Moderation
    requires_moderation: {
      type: 'checkbox',
      label: 'Requires Moderation',
      defaultValue: false
    },
    moderated_by_id: {
      type: 'lookup',
      label: 'Moderated By',
      reference: 'User',
      readonly: true
    },
    moderation_date: {
      type: 'datetime',
      label: 'Moderation Date',
      readonly: true
    },
    moderation_notes: {
      type: 'textarea',
      label: 'Moderation Notes',
      maxLength: 2000,
      readonly: true
    },
    // Statistics
    view_count: {
      type: 'number',
      label: 'Views',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    post_count: {
      type: 'number',
      label: 'Replies',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    like_count: {
      type: 'number',
      label: 'Likes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    follower_count: {
      type: 'number',
      label: 'Followers',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    // Activity
    last_post_date: {
      type: 'datetime',
      label: 'Last Post',
      readonly: true
    },
    last_post_by_id: {
      type: 'lookup',
      label: 'Last Post By',
      reference: 'PortalUser',
      readonly: true
    },
    closed_date: {
      type: 'datetime',
      label: 'Closed Date',
      readonly: true
    },
    closed_by_id: {
      type: 'lookup',
      label: 'Closed By',
      reference: 'User',
      readonly: true
    },
    // SEO
    url_slug: {
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
      foreignKey: 'topic_id',
      label: 'Posts'
    }
  ],
  validationRules: [
    {
      name: 'LockedTopicsReadOnly',
      errorMessage: 'Locked topics cannot be modified',
      formula: 'AND(PRIORVALUE(is_locked) = true, NOT(ISNEW()))'
    }
  ],
  listViews: [
    {
      name: 'AllTopics',
      label: 'All Topics',
      filters: [],
      columns: ['title', 'category', 'author_id', 'status', 'post_count', 'view_count', 'last_post_date'],
      sort: [['last_post_date', 'desc']]
    },
    {
      name: 'OpenTopics',
      label: 'Open Topics',
      filters: [
        ['status', '=', 'Open']
      ],
      columns: ['title', 'category', 'author_id', 'post_count', 'view_count', 'last_post_date'],
      sort: [['last_post_date', 'desc']]
    },
    {
      name: 'Unanswered',
      label: 'Unanswered',
      filters: [
        ['status', '=', 'Open'],
        ['has_accepted_answer', '=', false],
        ['category', '=', 'QA']
      ],
      columns: ['title', 'author_id', 'CreatedDate', 'view_count', 'post_count'],
      sort: [['CreatedDate', 'asc']]
    },
    {
      name: 'Featured',
      label: 'Featured',
      filters: [
        ['is_featured', '=', true]
      ],
      columns: ['title', 'category', 'view_count', 'like_count', 'post_count'],
      sort: [['view_count', 'desc']]
    },
    {
      name: 'Trending',
      label: 'Trending',
      filters: [
        ['CreatedDate', 'last_n_days', 7]
      ],
      columns: ['title', 'category', 'view_count', 'like_count', 'post_count', 'CreatedDate'],
      sort: [['view_count', 'desc']]
    },
    {
      name: 'NeedingModeration',
      label: 'Needing Moderation',
      filters: [
        ['requires_moderation', '=', true],
        ['moderated_by_id', '=', null]
      ],
      columns: ['title', 'category', 'author_id', 'CreatedDate'],
      sort: [['CreatedDate', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Topic Information',
        columns: 1,
        fields: ['title', 'description']
      },
      {
        label: 'Categorization',
        columns: 2,
        fields: ['category', 'tags']
      },
      {
        label: 'Author',
        columns: 2,
        fields: ['author_id', 'author_type']
      },
      {
        label: 'status',
        columns: 3,
        fields: ['status', 'is_pinned', 'is_locked', 'is_featured']
      },
      {
        label: 'Answer',
        columns: 3,
        fields: ['has_accepted_answer', 'accepted_answer_post_id', 'accepted_date']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['related_case_id', 'related_article_id']
      },
      {
        label: 'Moderation',
        columns: 2,
        fields: ['requires_moderation', 'moderated_by_id', 'moderation_date', 'moderation_notes']
      },
      {
        label: 'Statistics',
        columns: 4,
        fields: ['view_count', 'post_count', 'like_count', 'follower_count']
      },
      {
        label: 'Activity',
        columns: 2,
        fields: ['last_post_date', 'last_post_by_id', 'closed_date', 'closed_by_id']
      }
    ]
  }
};

export default ForumTopic;
