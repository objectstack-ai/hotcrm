import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Note = ObjectSchema.create({
  name: 'note',
  label: 'Note',
  pluralLabel: 'Notes',
  icon: 'sticky-note',
  description: 'Quick notes with markdown support, @mentions, and full-text search',

  fields: {
    title: Field.text({
      label: 'Note title',
      required: true,
      maxLength: 255
    }),
    body: Field.textarea({
      label: 'Note body',
      description: 'Rich text with Markdown support',
      required: true,
      maxLength: 32000
    }),
    parent_id: Field.text({
      label: 'Parent Record ID',
      description: 'ID of the parent record (polymorphic)',
      required: true,
      maxLength: 18
    }),
    parent_type: Field.select({
      label: 'Parent Type',
      required: true,
      options: [
        {
          "label": "🏢 Account",
          "value": "Account"
        },
        {
          "label": "👤 Contact",
          "value": "Contact"
        },
        {
          "label": "💼 Opportunity",
          "value": "Opportunity"
        },
        {
          "label": "🎯 Lead",
          "value": "Lead"
        },
        {
          "label": "🎫 Case",
          "value": "Case"
        },
        {
          "label": "📄 Contract",
          "value": "Contract"
        },
        {
          "label": "💰 Quote",
          "value": "Quote"
        },
        {
          "label": "📋 Task",
          "value": "Task"
        },
        {
          "label": "📅 Activity",
          "value": "Activity"
        },
        {
          "label": "📢 Campaign",
          "value": "Campaign"
        },
        {
          "label": "📦 Product",
          "value": "Product"
        },
        {
          "label": "📑 Order",
          "value": "Order"
        }
      ]
    }),
    is_private: Field.boolean({
      label: 'Private Note',
      description: 'When true, only the owner can see this note',
      defaultValue: false
    }),
    is_pinned: Field.boolean({
      label: 'Pinned',
      description: 'Pin important notes to the top',
      defaultValue: false
    }),
    tags: Field.text({
      label: 'tags',
      description: 'Comma-separated tags for categorization and search',
      maxLength: 500
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true,
      defaultValue: '$currentUser'
    }),
    mentioned_user_ids: Field.text({
      label: 'Mentioned Users',
      description: 'Comma-separated User IDs extracted from @mentions in the body',
      readonly: true,
      maxLength: 1000
    }),
    has_mentions: Field.boolean({
      label: 'Has @Mentions',
      defaultValue: false,
      readonly: true
    }),
    is_markdown: Field.boolean({
      label: 'Markdown Enabled',
      description: 'Enable Markdown formatting for this note',
      defaultValue: true
    }),
    rendered_body: Field.textarea({
      label: 'Rendered body',
      description: 'HTML-rendered version of the markdown body',
      readonly: true,
      maxLength: 32000
    }),
    word_count: Field.number({
      label: 'Word Count',
      description: 'Approximate word count',
      readonly: true,
      precision: 0
    }),
    last_edited_date: Field.datetime({
      label: 'Last Edited',
      readonly: true
    }),
    last_edited_by_id: Field.lookup('users', {
      label: 'Last Edited By',
      readonly: true
    }),
    searchable_text: Field.textarea({
      label: 'Searchable Text',
      description: 'Combined title + body for full-text search indexing',
      readonly: true,
      maxLength: 32000
    }),
    ai_summary: Field.textarea({
      label: 'AI Summary',
      description: 'AI-generated summary of the note',
      readonly: true,
      maxLength: 1000
    }),
    ai_extracted_keywords: Field.text({
      label: 'AI Extracted Keywords',
      description: 'AI-extracted keywords from the note content',
      readonly: true,
      maxLength: 500
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
        }
      ]
    })
  },

  enable: {
    searchable: true,
    trackHistory: false,
    feeds: false,
    files: true
  },
});