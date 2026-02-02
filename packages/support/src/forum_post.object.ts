import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ForumPost = ObjectSchema.create({
  name: 'forum_post',
  label: 'Forum Post',
  pluralLabel: 'Forum Posts',
  icon: 'comment',
  description: 'Forum post replies and comments',

  fields: {
    topic_id: Field.lookup('ForumTopic', {
      label: 'Topic',
      required: true
    }),
    parent_post_id: Field.lookup('ForumPost', {
      label: 'Parent Post',
      description: 'Reply to another post'
    }),
    content: Field.textarea({
      label: 'content',
      required: true,
      maxLength: 10000
    }),
    author_id: Field.lookup('PortalUser', {
      label: 'Author',
      required: true
    }),
    author_type: Field.select({
      label: 'Author Type',
      required: true,
      defaultValue: 'Customer',
      options: [
        {
          "label": "👤 Customer",
          "value": "Customer"
        },
        {
          "label": "🛡️ Support Agent",
          "value": "Agent"
        },
        {
          "label": "👑 Administrator",
          "value": "Admin"
        },
        {
          "label": "⭐ Community Expert",
          "value": "Expert"
        }
      ]
    }),
    is_answer: Field.boolean({
      label: 'Marked as Answer',
      description: 'This post is the accepted answer',
      defaultValue: false,
      readonly: true
    }),
    is_deleted: Field.boolean({
      label: 'Deleted',
      defaultValue: false
    }),
    deleted_date: Field.datetime({
      label: 'Deleted Date',
      readonly: true
    }),
    deleted_by_id: Field.lookup('users', {
      label: 'Deleted By',
      readonly: true
    }),
    requires_moderation: Field.boolean({
      label: 'Requires Moderation',
      defaultValue: false
    }),
    is_approved: Field.boolean({
      label: 'Approved',
      defaultValue: true
    }),
    moderated_by_id: Field.lookup('users', {
      label: 'Moderated By',
      readonly: true
    }),
    moderation_date: Field.datetime({
      label: 'Moderation Date',
      readonly: true
    }),
    moderation_notes: Field.textarea({
      label: 'Moderation Notes',
      readonly: true,
      maxLength: 2000
    }),
    like_count: Field.number({
      label: 'Likes',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    reply_count: Field.number({
      label: 'Replies',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    is_helpful: Field.boolean({
      label: 'Marked Helpful',
      description: 'Community marked as helpful',
      defaultValue: false
    }),
    helpful_count: Field.number({
      label: 'Helpful Votes',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    is_edited: Field.boolean({
      label: 'Edited',
      defaultValue: false,
      readonly: true
    }),
    last_edit_date: Field.datetime({
      label: 'Last Edit Date',
      readonly: true
    }),
    last_edit_by_id: Field.lookup('PortalUser', {
      label: 'Last Edit By',
      readonly: true
    }),
    edit_count: Field.number({
      label: 'Edit Count',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    is_flagged: Field.boolean({
      label: 'Flagged',
      description: 'Community flagged for review',
      defaultValue: false,
      readonly: true
    }),
    flag_count: Field.number({
      label: 'Flag Count',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    flag_reason: Field.text({
      label: 'Flag Reason',
      readonly: true,
      maxLength: 500
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});