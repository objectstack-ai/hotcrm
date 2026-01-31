
const ForumPost = {
  name: 'forum_post',
  label: 'Forum Post',
  labelPlural: 'Forum Posts',
  icon: 'comment',
  description: 'Forum post replies and comments',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Relationship
    topic_id: {
      type: 'lookup',
      label: 'Topic',
      reference: 'ForumTopic',
      required: true
    },
    parent_post_id: {
      type: 'lookup',
      label: 'Parent Post',
      reference: 'ForumPost',
      description: 'Reply to another post'
    },
    // content
    content: {
      type: 'textarea',
      label: 'content',
      required: true,
      maxLength: 10000,
      searchable: true
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
    // Status
    is_answer: {
      type: 'checkbox',
      label: 'Marked as Answer',
      readonly: true,
      defaultValue: false,
      description: 'This post is the accepted answer'
    },
    is_deleted: {
      type: 'checkbox',
      label: 'Deleted',
      defaultValue: false
    },
    deleted_date: {
      type: 'datetime',
      label: 'Deleted Date',
      readonly: true
    },
    deleted_by_id: {
      type: 'lookup',
      label: 'Deleted By',
      reference: 'User',
      readonly: true
    },
    // Moderation
    requires_moderation: {
      type: 'checkbox',
      label: 'Requires Moderation',
      defaultValue: false
    },
    is_approved: {
      type: 'checkbox',
      label: 'Approved',
      defaultValue: true
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
    // Engagement
    like_count: {
      type: 'number',
      label: 'Likes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    reply_count: {
      type: 'number',
      label: 'Replies',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    is_helpful: {
      type: 'checkbox',
      label: 'Marked Helpful',
      defaultValue: false,
      description: 'Community marked as helpful'
    },
    helpful_count: {
      type: 'number',
      label: 'Helpful Votes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    // Edit History
    is_edited: {
      type: 'checkbox',
      label: 'Edited',
      readonly: true,
      defaultValue: false
    },
    last_edit_date: {
      type: 'datetime',
      label: 'Last Edit Date',
      readonly: true
    },
    last_edit_by_id: {
      type: 'lookup',
      label: 'Last Edit By',
      reference: 'PortalUser',
      readonly: true
    },
    edit_count: {
      type: 'number',
      label: 'Edit Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    // Flagging
    is_flagged: {
      type: 'checkbox',
      label: 'Flagged',
      readonly: true,
      defaultValue: false,
      description: 'Community flagged for review'
    },
    flag_count: {
      type: 'number',
      label: 'Flag Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    flag_reason: {
      type: 'text',
      label: 'Flag Reason',
      maxLength: 500,
      readonly: true
    }
  },
  relationships: [
    {
      name: 'Replies',
      type: 'hasMany',
      object: 'ForumPost',
      foreignKey: 'parent_post_id',
      label: 'Replies'
    }
  ],
  validationRules: [
    {
      name: 'DeletedPostsReadOnly',
      errorMessage: 'Deleted posts cannot be modified',
      formula: 'AND(PRIORVALUE(is_deleted) = true, NOT(ISNEW()))'
    }
  ],
  listViews: [
    {
      name: 'AllPosts',
      label: 'All Posts',
      filters: [],
      columns: ['topic_id', 'author_id', 'content', 'like_count', 'reply_count', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'RecentPosts',
      label: 'Recent Posts',
      filters: [
        ['CreatedDate', 'last_n_days', 7],
        ['is_deleted', '=', false]
      ],
      columns: ['topic_id', 'author_id', 'content', 'like_count', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'AcceptedAnswers',
      label: 'Accepted Answers',
      filters: [
        ['is_answer', '=', true]
      ],
      columns: ['topic_id', 'author_id', 'content', 'like_count', 'helpful_count', 'CreatedDate'],
      sort: [['helpful_count', 'desc']]
    },
    {
      name: 'MostHelpful',
      label: 'Most Helpful',
      filters: [
        ['helpful_count', '>', 5],
        ['is_deleted', '=', false]
      ],
      columns: ['topic_id', 'author_id', 'content', 'helpful_count', 'like_count'],
      sort: [['helpful_count', 'desc']]
    },
    {
      name: 'NeedingModeration',
      label: 'Needing Moderation',
      filters: [
        ['requires_moderation', '=', true],
        ['is_approved', '=', false]
      ],
      columns: ['topic_id', 'author_id', 'content', 'CreatedDate'],
      sort: [['CreatedDate', 'asc']]
    },
    {
      name: 'Flagged',
      label: 'Flagged for Review',
      filters: [
        ['is_flagged', '=', true],
        ['moderated_by_id', '=', null]
      ],
      columns: ['topic_id', 'author_id', 'content', 'flag_count', 'flag_reason', 'CreatedDate'],
      sort: [['flag_count', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Post Information',
        columns: 2,
        fields: ['topic_id', 'parent_post_id']
      },
      {
        label: 'content',
        columns: 1,
        fields: ['content']
      },
      {
        label: 'Author',
        columns: 2,
        fields: ['author_id', 'author_type']
      },
      {
        label: 'Status',
        columns: 3,
        fields: ['is_answer', 'is_deleted', 'deleted_date', 'deleted_by_id']
      },
      {
        label: 'Moderation',
        columns: 2,
        fields: ['requires_moderation', 'is_approved', 'moderated_by_id', 'moderation_date', 'moderation_notes']
      },
      {
        label: 'Engagement',
        columns: 4,
        fields: ['like_count', 'reply_count', 'is_helpful', 'helpful_count']
      },
      {
        label: 'Edit History',
        columns: 4,
        fields: ['is_edited', 'last_edit_date', 'last_edit_by_id', 'edit_count']
      },
      {
        label: 'Flagging',
        columns: 3,
        fields: ['is_flagged', 'flag_count', 'flag_reason']
      }
    ]
  }
};

export default ForumPost;
