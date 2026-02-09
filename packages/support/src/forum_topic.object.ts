import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ForumTopic = ObjectSchema.create({
  name: 'forum_topic',
  label: 'Forum Topic',
  pluralLabel: 'Forum Topics',
  icon: 'comments',
  description: 'Community forum discussion topics',

  fields: {
    title: Field.text({
      label: 'Topic title',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      required: true,
      maxLength: 5000
    }),
    category: Field.select({
      label: 'category',
      required: true,
      options: [
        {
          "label": "💬 General Discussion",
          "value": "General"
        },
        {
          "label": "❓ Questions & Answers",
          "value": "QA"
        },
        {
          "label": "🛠️ Technical Support",
          "value": "Technical"
        },
        {
          "label": "📦 Product Feedback",
          "value": "Feedback"
        },
        {
          "label": "💡 Feature Requests",
          "value": "FeatureRequest"
        },
        {
          "label": "📢 Announcements",
          "value": "Announcements"
        },
        {
          "label": "🎓 Tips & Tricks",
          "value": "Tips"
        },
        {
          "label": "🐛 Bug Reports",
          "value": "BugReports"
        }
      ]
    }),
    tags: Field.text({
      label: 'tags',
      description: 'Comma-separated tags',
      maxLength: 500
    }),
    author_id: Field.lookup('portal_user', {
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
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'Open',
      options: [
        {
          "label": "🆕 Open",
          "value": "Open"
        },
        {
          "label": "✅ Answered",
          "value": "Answered"
        },
        {
          "label": "🔒 Closed",
          "value": "Closed"
        },
        {
          "label": "📌 Pinned",
          "value": "Pinned"
        },
        {
          "label": "🔒 Locked",
          "value": "Locked"
        },
        {
          "label": "🗑️ Deleted",
          "value": "Deleted"
        }
      ]
    }),
    is_pinned: Field.boolean({
      label: 'Pinned',
      description: 'Pin to top of category',
      defaultValue: false
    }),
    is_locked: Field.boolean({
      label: 'Locked',
      description: 'Prevent new replies',
      defaultValue: false
    }),
    is_featured: Field.boolean({
      label: 'Featured',
      description: 'Feature on homepage',
      defaultValue: false
    }),
    has_accepted_answer: Field.boolean({
      label: 'Has Accepted Answer',
      defaultValue: false,
      readonly: true
    }),
    accepted_answer_post_id: Field.lookup('forum_post', {
      label: 'Accepted Answer',
      readonly: true
    }),
    accepted_date: Field.datetime({
      label: 'Accepted Date',
      readonly: true
    }),
    related_case_id: Field.lookup('case', {
      label: 'Related Case',
      description: 'Case that originated this topic'
    }),
    related_article_id: Field.lookup('knowledge_article', {
      label: 'Related Article',
      description: 'Knowledge article related to this topic'
    }),
    requires_moderation: Field.boolean({
      label: 'Requires Moderation',
      defaultValue: false
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
    view_count: Field.number({
      label: 'Views',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    post_count: Field.number({
      label: 'Replies',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    like_count: Field.number({
      label: 'Likes',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    follower_count: Field.number({
      label: 'Followers',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    last_post_date: Field.datetime({
      label: 'Last Post',
      readonly: true
    }),
    last_post_by_id: Field.lookup('portal_user', {
      label: 'Last Post By',
      readonly: true
    }),
    closed_date: Field.datetime({
      label: 'Closed Date',
      readonly: true
    }),
    closed_by_id: Field.lookup('users', {
      label: 'Closed By',
      readonly: true
    }),
    url_slug: Field.text({
      label: 'URL Slug',
      readonly: true,
      maxLength: 255
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});