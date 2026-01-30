import type { ServiceObject } from '@objectstack/spec/data';

const ForumPost = {
  name: 'forum_post',
  label: 'Forum Post',
  labelPlural: 'Forum Posts',
  icon: 'comment',
  description: 'Forum post replies and comments',
  capabilities: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Relationship
    TopicId: {
      type: 'lookup',
      label: 'Topic',
      reference: 'ForumTopic',
      required: true
    },
    ParentPostId: {
      type: 'lookup',
      label: 'Parent Post',
      reference: 'ForumPost',
      description: 'Reply to another post'
    },
    // Content
    Content: {
      type: 'textarea',
      label: 'Content',
      required: true,
      maxLength: 10000,
      searchable: true
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
    IsAnswer: {
      type: 'checkbox',
      label: 'Marked as Answer',
      readonly: true,
      defaultValue: false,
      description: 'This post is the accepted answer'
    },
    IsDeleted: {
      type: 'checkbox',
      label: 'Deleted',
      defaultValue: false
    },
    DeletedDate: {
      type: 'datetime',
      label: 'Deleted Date',
      readonly: true
    },
    DeletedById: {
      type: 'lookup',
      label: 'Deleted By',
      reference: 'User',
      readonly: true
    },
    // Moderation
    RequiresModeration: {
      type: 'checkbox',
      label: 'Requires Moderation',
      defaultValue: false
    },
    IsApproved: {
      type: 'checkbox',
      label: 'Approved',
      defaultValue: true
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
    // Engagement
    LikeCount: {
      type: 'number',
      label: 'Likes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    ReplyCount: {
      type: 'number',
      label: 'Replies',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    IsHelpful: {
      type: 'checkbox',
      label: 'Marked Helpful',
      defaultValue: false,
      description: 'Community marked as helpful'
    },
    HelpfulCount: {
      type: 'number',
      label: 'Helpful Votes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    // Edit History
    IsEdited: {
      type: 'checkbox',
      label: 'Edited',
      readonly: true,
      defaultValue: false
    },
    LastEditDate: {
      type: 'datetime',
      label: 'Last Edit Date',
      readonly: true
    },
    LastEditById: {
      type: 'lookup',
      label: 'Last Edit By',
      reference: 'PortalUser',
      readonly: true
    },
    EditCount: {
      type: 'number',
      label: 'Edit Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    // Flagging
    IsFlagged: {
      type: 'checkbox',
      label: 'Flagged',
      readonly: true,
      defaultValue: false,
      description: 'Community flagged for review'
    },
    FlagCount: {
      type: 'number',
      label: 'Flag Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    FlagReason: {
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
      foreignKey: 'ParentPostId',
      label: 'Replies'
    }
  ],
  validationRules: [
    {
      name: 'DeletedPostsReadOnly',
      errorMessage: 'Deleted posts cannot be modified',
      formula: 'AND(PRIORVALUE(IsDeleted) = true, NOT(ISNEW()))'
    }
  ],
  listViews: [
    {
      name: 'AllPosts',
      label: 'All Posts',
      filters: [],
      columns: ['TopicId', 'AuthorId', 'Content', 'LikeCount', 'ReplyCount', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'RecentPosts',
      label: 'Recent Posts',
      filters: [
        ['CreatedDate', 'last_n_days', 7],
        ['IsDeleted', '=', false]
      ],
      columns: ['TopicId', 'AuthorId', 'Content', 'LikeCount', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'AcceptedAnswers',
      label: 'Accepted Answers',
      filters: [
        ['IsAnswer', '=', true]
      ],
      columns: ['TopicId', 'AuthorId', 'Content', 'LikeCount', 'HelpfulCount', 'CreatedDate'],
      sort: [['HelpfulCount', 'desc']]
    },
    {
      name: 'MostHelpful',
      label: 'Most Helpful',
      filters: [
        ['HelpfulCount', '>', 5],
        ['IsDeleted', '=', false]
      ],
      columns: ['TopicId', 'AuthorId', 'Content', 'HelpfulCount', 'LikeCount'],
      sort: [['HelpfulCount', 'desc']]
    },
    {
      name: 'NeedingModeration',
      label: 'Needing Moderation',
      filters: [
        ['RequiresModeration', '=', true],
        ['IsApproved', '=', false]
      ],
      columns: ['TopicId', 'AuthorId', 'Content', 'CreatedDate'],
      sort: [['CreatedDate', 'asc']]
    },
    {
      name: 'Flagged',
      label: 'Flagged for Review',
      filters: [
        ['IsFlagged', '=', true],
        ['ModeratedById', '=', null]
      ],
      columns: ['TopicId', 'AuthorId', 'Content', 'FlagCount', 'FlagReason', 'CreatedDate'],
      sort: [['FlagCount', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Post Information',
        columns: 2,
        fields: ['TopicId', 'ParentPostId']
      },
      {
        label: 'Content',
        columns: 1,
        fields: ['Content']
      },
      {
        label: 'Author',
        columns: 2,
        fields: ['AuthorId', 'AuthorType']
      },
      {
        label: 'Status',
        columns: 3,
        fields: ['IsAnswer', 'IsDeleted', 'DeletedDate', 'DeletedById']
      },
      {
        label: 'Moderation',
        columns: 2,
        fields: ['RequiresModeration', 'IsApproved', 'ModeratedById', 'ModerationDate', 'ModerationNotes']
      },
      {
        label: 'Engagement',
        columns: 4,
        fields: ['LikeCount', 'ReplyCount', 'IsHelpful', 'HelpfulCount']
      },
      {
        label: 'Edit History',
        columns: 4,
        fields: ['IsEdited', 'LastEditDate', 'LastEditById', 'EditCount']
      },
      {
        label: 'Flagging',
        columns: 3,
        fields: ['IsFlagged', 'FlagCount', 'FlagReason']
      }
    ]
  }
};

export default ForumPost;
