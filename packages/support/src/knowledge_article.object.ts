import { ObjectSchema, Field } from '@objectstack/spec/data';

export const KnowledgeArticle = ObjectSchema.create({
  name: 'knowledge_article',
  label: 'Knowledge Article',
  pluralLabel: 'Knowledge Articles',
  icon: 'book',
  description: 'Knowledge base articles for customer self-service and agent assistance',

  fields: {
    article_number: Field.autoNumber({
      label: 'Article Number',
      readonly: true,
      format: 'KB-{YYYY}-{0000}'
    }),
    title: Field.text({
      label: 'title',
      required: true,
      maxLength: 255
    }),
    summary: Field.textarea({
      label: 'summary',
      description: 'Brief summary shown in search results',
      required: true,
      maxLength: 500
    }),
    content: Field.textarea({
      label: 'content',
      description: 'Full article content with formatting',
      required: true,
      maxLength: 32000
    }),
    category: Field.select({
      label: 'category',
      required: true,
      options: [
        {
          "label": "🛠️ Technical",
          "value": "Technical"
        },
        {
          "label": "📦 Product",
          "value": "Product"
        },
        {
          "label": "💳 Billing",
          "value": "Billing"
        },
        {
          "label": "🎓 How-To",
          "value": "HowTo"
        },
        {
          "label": "❓ FAQ",
          "value": "FAQ"
        },
        {
          "label": "🐛 Troubleshooting",
          "value": "Troubleshooting"
        },
        {
          "label": "📋 Best Practices",
          "value": "BestPractices"
        },
        {
          "label": "🆕 Release Notes",
          "value": "ReleaseNotes"
        },
        {
          "label": "📚 Other",
          "value": "Other"
        }
      ]
    }),
    subcategory: Field.text({
      label: 'subcategory',
      maxLength: 100
    }),
    keywords: Field.text({
      label: 'keywords',
      description: 'Comma-separated keywords for search',
      maxLength: 500
    }),
    tags: /* TODO: Unknown type 'multiselect' */ null,
    related_product_ids: Field.text({
      label: 'Related Products',
      description: 'Comma-separated product IDs',
      maxLength: 500
    }),
    related_case_types: /* TODO: Unknown type 'multiselect' */ null,
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'Draft',
      options: [
        {
          "label": "📝 Draft",
          "value": "Draft"
        },
        {
          "label": "👀 In Review",
          "value": "InReview"
        },
        {
          "label": "✅ Published",
          "value": "Published"
        },
        {
          "label": "🔄 Needs Update",
          "value": "NeedsUpdate"
        },
        {
          "label": "📦 Archived",
          "value": "Archived"
        }
      ]
    }),
    publish_date: Field.datetime({
      label: 'Publish Date',
      readonly: true
    }),
    published_by_id: Field.lookup('users', {
      label: 'Published By',
      readonly: true
    }),
    last_review_date: Field.date({ label: 'Last Review Date' }),
    next_review_date: Field.date({
      label: 'Next Review Date',
      description: 'Date when article should be reviewed'
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true
    }),
    author_id: Field.lookup('users', {
      label: 'Author',
      required: true
    }),
    is_internal: Field.checkbox({
      label: 'Internal Only',
      description: 'Visible only to support agents',
      defaultValue: false
    }),
    is_public: Field.checkbox({
      label: 'Public',
      description: 'Visible in customer portal',
      defaultValue: true
    }),
    requires_authentication: Field.checkbox({
      label: 'Requires Login',
      description: 'Customer must be logged in to view',
      defaultValue: false
    }),
    visible_to_customer_tiers: /* TODO: Unknown type 'multiselect' */ null,
    language: Field.select({
      label: 'language',
      required: true,
      defaultValue: 'en',
      options: [
        {
          "label": "English",
          "value": "en"
        },
        {
          "label": "简体中文",
          "value": "zh-CN"
        },
        {
          "label": "繁體中文",
          "value": "zh-TW"
        },
        {
          "label": "Español",
          "value": "es"
        },
        {
          "label": "Français",
          "value": "fr"
        },
        {
          "label": "Deutsch",
          "value": "de"
        },
        {
          "label": "日本語",
          "value": "ja"
        },
        {
          "label": "한국어",
          "value": "ko"
        }
      ]
    }),
    translation_of_id: Field.lookup('KnowledgeArticle', {
      label: 'Translation Of',
      description: 'Original article if this is a translation'
    }),
    video_url: Field.url({
      label: 'Video URL',
      description: 'YouTube/Vimeo URL for tutorial video'
    }),
    thumbnail_url: Field.url({
      label: 'Thumbnail URL',
      description: 'Article thumbnail image'
    }),
    view_count: Field.number({
      label: 'View Count',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    unique_views: Field.number({
      label: 'Unique Views',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    helpful_count: Field.number({
      label: 'Helpful Votes',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    not_helpful_count: Field.number({
      label: 'Not Helpful Votes',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    helpful_rating: Field.number({
      label: 'Helpful Rating (%)',
      description: 'Percentage of helpful votes',
      readonly: true,
      precision: 2
    }),
    average_time_on_page: Field.number({
      label: 'Avg Time on Page (Seconds)',
      readonly: true,
      precision: 0
    }),
    linked_from_cases: Field.number({
      label: 'Linked from Cases',
      description: 'Number of cases linking to this article',
      readonly: true,
      precision: 0
    }),
    search_rank: Field.number({
      label: 'Search Rank',
      description: 'Search relevance score',
      readonly: true,
      precision: 2
    }),
    meta_description: Field.text({
      label: 'Meta Description',
      description: 'SEO meta description',
      maxLength: 160
    }),
    url_slug: Field.text({
      label: 'URL Slug',
      description: 'URL-friendly article identifier',
      readonly: true,
      maxLength: 255
    }),
    ai_category: Field.select({
      label: 'AI Suggested category',
      description: 'AI-suggested category based on content analysis',
      readonly: true,
      options: [
        {
          "label": "Technical",
          "value": "Technical"
        },
        {
          "label": "Product",
          "value": "Product"
        },
        {
          "label": "Billing",
          "value": "Billing"
        },
        {
          "label": "How-To",
          "value": "HowTo"
        },
        {
          "label": "FAQ",
          "value": "FAQ"
        },
        {
          "label": "Troubleshooting",
          "value": "Troubleshooting"
        },
        {
          "label": "Best Practices",
          "value": "BestPractices"
        },
        {
          "label": "Release Notes",
          "value": "ReleaseNotes"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    ai_tags: Field.text({
      label: 'AI Suggested tags',
      description: 'Comma-separated AI-generated tags',
      readonly: true,
      maxLength: 500
    }),
    ai_summary: Field.textarea({
      label: 'AI Generated summary',
      description: 'AI-generated article summary',
      readonly: true,
      maxLength: 500
    }),
    ai_keywords: Field.text({
      label: 'AI Extracted keywords',
      description: 'keywords extracted by AI',
      readonly: true,
      maxLength: 500
    }),
    related_article_ids: Field.text({
      label: 'Related Articles',
      description: 'Comma-separated IDs of AI-suggested related articles',
      readonly: true,
      maxLength: 1000
    }),
    scheduled_publish_date: Field.datetime({
      label: 'Scheduled Publish Date',
      description: 'When to auto-publish this article'
    }),
    archived_date: Field.datetime({
      label: 'Archived Date',
      readonly: true
    }),
    archived_by_user_id: Field.lookup('users', {
      label: 'Archived By',
      readonly: true
    }),
    archived_reason: Field.textarea({
      label: 'Archive Reason',
      readonly: true,
      maxLength: 1000
    }),
    version_number: Field.text({
      label: 'Version',
      description: 'Article version number',
      defaultValue: '1.0',
      readonly: true,
      maxLength: 50
    }),
    previous_version_id: Field.lookup('KnowledgeArticle', {
      label: 'Previous Version',
      description: 'Previous version of this article',
      readonly: true
    }),
    quality_score: Field.number({
      label: 'Quality Score',
      description: 'Overall article quality score (0-100)',
      readonly: true,
      min: 0,
      max: 100,
      precision: 0
    }),
    popularity_score: Field.number({
      label: 'Popularity Score',
      description: 'Article popularity score based on views and engagement',
      readonly: true,
      min: 0,
      max: 100,
      precision: 0
    }),
    helpfulness_rating: Field.number({
      label: 'Helpfulness %',
      description: 'Percentage of users who found this helpful',
      readonly: true,
      min: 0,
      max: 100,
      precision: 0
    }),
    case_resolution_count: Field.number({
      label: 'Cases Resolved',
      description: 'Number of cases resolved using this article',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    last_used_in_case_date: Field.datetime({
      label: 'Last Used in Case',
      description: 'When this article was last used in case resolution',
      readonly: true
    }),
    view_count_last6_months: Field.number({
      label: 'Views (Last 6 Months)',
      description: 'View count in the last 6 months',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    has_attachments: Field.checkbox({
      label: 'Has Attachments',
      defaultValue: false,
      readonly: true
    }),
    attachment_count: Field.number({
      label: 'Attachment Count',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    estimated_read_time: Field.number({
      label: 'Est. Read Time (Minutes)',
      description: 'Estimated time to read article',
      readonly: true,
      precision: 0
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowAttachments: true
  },
});