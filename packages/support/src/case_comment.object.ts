import { ObjectSchema, Field } from '@objectstack/spec/data';

export const CaseComment = ObjectSchema.create({
  name: 'case_comment',
  label: 'Case Comment',
  pluralLabel: 'Case Comments',
  icon: 'comment',
  description: 'Comments, responses, and interaction history for cases',

  fields: {
    case_id: Field.lookup('case', {
      label: 'Case',
      required: true
    }),
    parent_comment_id: Field.lookup('CaseComment', {
      label: 'Parent Comment',
      description: 'Parent comment for threaded discussions'
    }),
    comment_type: Field.select({
      label: 'Comment Type',
      required: true,
      defaultValue: 'Internal',
      options: [
        {
          "label": "👤 Customer Response",
          "value": "Customer"
        },
        {
          "label": "👨‍💼 Agent Response",
          "value": "Agent"
        },
        {
          "label": "🔒 Internal Note",
          "value": "Internal"
        },
        {
          "label": "📧 Email",
          "value": "Email"
        },
        {
          "label": "💬 Chat",
          "value": "Chat"
        },
        {
          "label": "📞 Phone",
          "value": "Phone"
        },
        {
          "label": "🤖 System",
          "value": "System"
        },
        {
          "label": "🎯 Other",
          "value": "Other"
        }
      ]
    }),
    body: Field.textarea({
      label: 'Comment',
      description: 'Comment text',
      required: true,
      maxLength: 32000
    }),
    plain_text_body: Field.textarea({
      label: 'Plain Text',
      description: 'Plain text version for search',
      readonly: true,
      maxLength: 32000
    }),
    is_public: Field.boolean({
      label: 'Visible to Customer',
      description: 'Whether this comment is visible in customer portal',
      defaultValue: false
    }),
    is_internal: Field.boolean({
      label: 'Internal Only',
      description: 'Internal note not visible to customer',
      defaultValue: false
    }),
    created_by_id: Field.lookup('users', {
      label: 'Created By',
      readonly: true
    }),
    contact_id: Field.lookup('contact', {
      label: 'Contact',
      description: 'Customer contact who created this comment'
    }),
    from_email: Field.email({
      label: 'From Email',
      description: 'Email address of sender (for email comments)'
    }),
    to_email: Field.text({
      label: 'To Email',
      description: 'Email recipients',
      maxLength: 500
    }),
    cc_email: Field.text({
      label: 'CC Email',
      description: 'CC recipients',
      maxLength: 500
    }),
    email_subject: Field.text({
      label: 'Email Subject',
      maxLength: 255
    }),
    email_message_id: Field.text({
      label: 'Email Message ID',
      description: 'Unique email message identifier',
      readonly: true,
      maxLength: 255
    }),
    in_reply_to_id: Field.text({
      label: 'In Reply To',
      description: 'Email thread tracking',
      readonly: true,
      maxLength: 255
    }),
    is_first_response: Field.boolean({
      label: 'Is First Response',
      description: 'First agent response to case',
      defaultValue: false,
      readonly: true
    }),
    response_time_minutes: Field.number({
      label: 'Response Time (Minutes)',
      description: 'Minutes since last customer comment',
      readonly: true,
      precision: 0
    }),
    ai_generated_suggestion: Field.textarea({
      label: 'AI Suggested Response',
      description: 'AI-generated response suggestion',
      readonly: true,
      maxLength: 5000
    }),
    ai_sentiment: Field.select({
      label: 'AI Sentiment',
      readonly: true,
      options: [
        {
          "label": "😊 Positive",
          "value": "Positive"
        },
        {
          "label": "😐 Neutral",
          "value": "Neutral"
        },
        {
          "label": "😟 Negative",
          "value": "Negative"
        },
        {
          "label": "😡 Angry",
          "value": "Angry"
        }
      ]
    }),
    ai_confidence_score: Field.number({
      label: 'AI Confidence',
      description: 'AI confidence in sentiment analysis',
      readonly: true,
      min: 0,
      max: 100,
      precision: 2
    }),
    ai_keywords: Field.text({
      label: 'AI Keywords',
      description: 'Extracted keywords',
      readonly: true,
      maxLength: 500
    }),
    is_solution: Field.boolean({
      label: 'Marked as Solution',
      description: 'This comment contains the solution',
      defaultValue: false
    }),
    is_edited: Field.boolean({
      label: 'Edited',
      defaultValue: false,
      readonly: true
    }),
    edited_date: Field.datetime({
      label: 'Last Edited',
      readonly: true
    }),
    edited_by_id: Field.lookup('users', {
      label: 'Edited By',
      readonly: true
    }),
    like_count: Field.number({
      label: 'Likes',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    is_helpful: Field.boolean({
      label: 'Marked Helpful',
      description: 'Customer marked this as helpful',
      defaultValue: false,
      readonly: true
    }),
    channel_source: Field.select({
      label: 'Channel',
      options: [
        {
          "label": "📧 Email",
          "value": "Email"
        },
        {
          "label": "🌐 Portal",
          "value": "Portal"
        },
        {
          "label": "📞 Phone",
          "value": "Phone"
        },
        {
          "label": "💬 Chat",
          "value": "Chat"
        },
        {
          "label": "💬 WeChat",
          "value": "WeChat"
        },
        {
          "label": "💬 WhatsApp",
          "value": "WhatsApp"
        },
        {
          "label": "📱 SMS",
          "value": "SMS"
        },
        {
          "label": "🐦 Twitter",
          "value": "Twitter"
        },
        {
          "label": "📘 Facebook",
          "value": "Facebook"
        },
        {
          "label": "🤖 Bot",
          "value": "Bot"
        },
        {
          "label": "🎯 Other",
          "value": "Other"
        }
      ]
    }),
    channel_message_id: Field.text({
      label: 'Channel Message ID',
      description: 'External message ID from source channel',
      readonly: true,
      maxLength: 255
    }),
    has_attachment: Field.boolean({
      label: 'Has Attachment',
      defaultValue: false,
      readonly: true
    }),
    attachment_count: Field.number({
      label: 'Attachments',
      defaultValue: 0,
      readonly: true,
      precision: 0
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    files: true
  },
});