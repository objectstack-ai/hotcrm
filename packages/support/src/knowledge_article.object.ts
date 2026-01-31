
const KnowledgeArticle = {
  name: 'knowledge_article',
  label: 'Knowledge Article',
  labelPlural: 'Knowledge Articles',
  icon: 'book',
  description: 'Knowledge base articles for customer self-service and agent assistance',
  enable: {
    searchable: true,
    trackHistory: true,
    files: true
  },
  fields: {
    // Basic Information
    article_number: {
      type: 'autonumber',
      label: 'Article Number',
      format: 'KB-{YYYY}-{0000}',
      readonly: true,
      searchable: true
    },
    title: {
      type: 'text',
      label: 'title',
      required: true,
      maxLength: 255,
      searchable: true
    },
    summary: {
      type: 'textarea',
      label: 'summary',
      required: true,
      maxLength: 500,
      searchable: true,
      description: 'Brief summary shown in search results'
    },
    content: {
      type: 'textarea',
      label: 'content',
      required: true,
      searchable: true,
      maxLength: 32000,
      description: 'Full article content with formatting'
    },
    // Categorization
    category: {
      type: 'select',
      label: 'category',
      required: true,
      options: [
        { label: '🛠️ Technical', value: 'Technical' },
        { label: '📦 Product', value: 'Product' },
        { label: '💳 Billing', value: 'Billing' },
        { label: '🎓 How-To', value: 'HowTo' },
        { label: '❓ FAQ', value: 'FAQ' },
        { label: '🐛 Troubleshooting', value: 'Troubleshooting' },
        { label: '📋 Best Practices', value: 'BestPractices' },
        { label: '🆕 Release Notes', value: 'ReleaseNotes' },
        { label: '📚 Other', value: 'Other' }
      ]
    },
    subcategory: {
      type: 'text',
      label: 'subcategory',
      maxLength: 100
    },
    keywords: {
      type: 'text',
      label: 'keywords',
      maxLength: 500,
      searchable: true,
      description: 'Comma-separated keywords for search'
    },
    tags: {
      type: 'multiselect',
      label: 'tags',
      options: [
        { label: 'Getting Started', value: 'GettingStarted' },
        { label: 'Advanced', value: 'Advanced' },
        { label: 'Popular', value: 'Popular' },
        { label: 'Video', value: 'Video' },
        { label: 'Step-by-Step', value: 'StepByStep' },
        { label: 'Featured', value: 'Featured' }
      ]
    },
    // Related Records
    related_product_ids: {
      type: 'text',
      label: 'Related Products',
      maxLength: 500,
      description: 'Comma-separated product IDs'
    },
    related_case_types: {
      type: 'multiselect',
      label: 'Related Case Types',
      options: [
        { label: 'Problem', value: 'Problem' },
        { label: 'Question', value: 'Question' },
        { label: 'Incident', value: 'Incident' },
        { label: 'Feature Request', value: 'Feature Request' },
        { label: 'Training', value: 'Training' },
        { label: 'Maintenance', value: 'Maintenance' }
      ]
    },
    // Publishing
    status: {
      type: 'select',
      label: 'status',
      required: true,
      defaultValue: 'Draft',
      options: [
        { label: '📝 Draft', value: 'Draft' },
        { label: '👀 In Review', value: 'InReview' },
        { label: '✅ Published', value: 'Published' },
        { label: '🔄 Needs Update', value: 'NeedsUpdate' },
        { label: '📦 Archived', value: 'Archived' }
      ]
    },
    publish_date: {
      type: 'datetime',
      label: 'Publish Date',
      readonly: true
    },
    published_by_id: {
      type: 'lookup',
      label: 'Published By',
      reference: 'User',
      readonly: true
    },
    last_review_date: {
      type: 'date',
      label: 'Last Review Date'
    },
    next_review_date: {
      type: 'date',
      label: 'Next Review Date',
      description: 'Date when article should be reviewed'
    },
    // Ownership
    owner_id: {
      type: 'lookup',
      label: 'Owner',
      reference: 'User',
      required: true
    },
    author_id: {
      type: 'lookup',
      label: 'Author',
      reference: 'User',
      required: true
    },
    // Visibility
    is_internal: {
      type: 'checkbox',
      label: 'Internal Only',
      defaultValue: false,
      description: 'Visible only to support agents'
    },
    is_public: {
      type: 'checkbox',
      label: 'Public',
      defaultValue: true,
      description: 'Visible in customer portal'
    },
    requires_authentication: {
      type: 'checkbox',
      label: 'Requires Login',
      defaultValue: false,
      description: 'Customer must be logged in to view'
    },
    visible_to_customer_tiers: {
      type: 'multiselect',
      label: 'Visible to Customer Tiers',
      options: [
        { label: 'Free', value: 'Free' },
        { label: 'Basic', value: 'Basic' },
        { label: 'Professional', value: 'Professional' },
        { label: 'Enterprise', value: 'Enterprise' },
        { label: 'Premium', value: 'Premium' }
      ]
    },
    // Localization
    language: {
      type: 'select',
      label: 'language',
      required: true,
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: '简体中文', value: 'zh-CN' },
        { label: '繁體中文', value: 'zh-TW' },
        { label: 'Español', value: 'es' },
        { label: 'Français', value: 'fr' },
        { label: 'Deutsch', value: 'de' },
        { label: '日本語', value: 'ja' },
        { label: '한국어', value: 'ko' }
      ]
    },
    translation_of_id: {
      type: 'lookup',
      label: 'Translation Of',
      reference: 'KnowledgeArticle',
      description: 'Original article if this is a translation'
    },
    // Attachments & Media
    video_u_r_l: {
      type: 'url',
      label: 'Video URL',
      description: 'YouTube/Vimeo URL for tutorial video'
    },
    thumbnail_u_r_l: {
      type: 'url',
      label: 'Thumbnail URL',
      description: 'Article thumbnail image'
    },
    // Analytics
    view_count: {
      type: 'number',
      label: 'View Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    unique_views: {
      type: 'number',
      label: 'Unique Views',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    helpful_count: {
      type: 'number',
      label: 'Helpful Votes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    not_helpful_count: {
      type: 'number',
      label: 'Not Helpful Votes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    helpful_rating: {
      type: 'number',
      label: 'Helpful Rating (%)',
      precision: 2,
      readonly: true,
      description: 'Percentage of helpful votes'
    },
    average_time_on_page: {
      type: 'number',
      label: 'Avg Time on Page (Seconds)',
      precision: 0,
      readonly: true
    },
    linked_from_cases: {
      type: 'number',
      label: 'Linked from Cases',
      precision: 0,
      readonly: true,
      description: 'Number of cases linking to this article'
    },
    search_rank: {
      type: 'number',
      label: 'Search Rank',
      precision: 2,
      readonly: true,
      description: 'Search relevance score'
    },
    // SEO
    meta_description: {
      type: 'text',
      label: 'Meta Description',
      maxLength: 160,
      description: 'SEO meta description'
    },
    u_r_l_slug: {
      type: 'text',
      label: 'URL Slug',
      maxLength: 255,
      readonly: true,
      description: 'URL-friendly article identifier'
    },
    // AI-Driven Features
    a_i_category: {
      type: 'select',
      label: 'AI Suggested category',
      readonly: true,
      options: [
        { label: 'Technical', value: 'Technical' },
        { label: 'Product', value: 'Product' },
        { label: 'Billing', value: 'Billing' },
        { label: 'How-To', value: 'HowTo' },
        { label: 'FAQ', value: 'FAQ' },
        { label: 'Troubleshooting', value: 'Troubleshooting' },
        { label: 'Best Practices', value: 'BestPractices' },
        { label: 'Release Notes', value: 'ReleaseNotes' },
        { label: 'Other', value: 'Other' }
      ],
      description: 'AI-suggested category based on content analysis'
    },
    a_i_tags: {
      type: 'text',
      label: 'AI Suggested tags',
      maxLength: 500,
      readonly: true,
      description: 'Comma-separated AI-generated tags'
    },
    a_i_summary: {
      type: 'textarea',
      label: 'AI Generated summary',
      maxLength: 500,
      readonly: true,
      description: 'AI-generated article summary'
    },
    a_i_keywords: {
      type: 'text',
      label: 'AI Extracted keywords',
      maxLength: 500,
      readonly: true,
      searchable: true,
      description: 'keywords extracted by AI'
    },
    related_article_ids: {
      type: 'text',
      label: 'Related Articles',
      maxLength: 1000,
      readonly: true,
      description: 'Comma-separated IDs of AI-suggested related articles'
    },
    // Workflow & Versioning
    scheduled_publish_date: {
      type: 'datetime',
      label: 'Scheduled Publish Date',
      description: 'When to auto-publish this article'
    },
    archived_date: {
      type: 'datetime',
      label: 'Archived Date',
      readonly: true
    },
    archived_by_user_id: {
      type: 'lookup',
      label: 'Archived By',
      reference: 'User',
      readonly: true
    },
    archived_reason: {
      type: 'textarea',
      label: 'Archive Reason',
      maxLength: 1000,
      readonly: true
    },
    version_number: {
      type: 'text',
      label: 'Version',
      maxLength: 50,
      readonly: true,
      defaultValue: '1.0',
      description: 'Article version number'
    },
    previous_version_id: {
      type: 'lookup',
      label: 'Previous Version',
      reference: 'KnowledgeArticle',
      readonly: true,
      description: 'Previous version of this article'
    },
    // Quality & Performance Metrics
    quality_score: {
      type: 'number',
      label: 'Quality Score',
      precision: 0,
      min: 0,
      max: 100,
      readonly: true,
      description: 'Overall article quality score (0-100)'
    },
    popularity_score: {
      type: 'number',
      label: 'Popularity Score',
      precision: 0,
      min: 0,
      max: 100,
      readonly: true,
      description: 'Article popularity score based on views and engagement'
    },
    helpfulness_rating: {
      type: 'number',
      label: 'Helpfulness %',
      precision: 0,
      min: 0,
      max: 100,
      readonly: true,
      description: 'Percentage of users who found this helpful'
    },
    case_resolution_count: {
      type: 'number',
      label: 'Cases Resolved',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Number of cases resolved using this article'
    },
    last_used_in_case_date: {
      type: 'datetime',
      label: 'Last Used in Case',
      readonly: true,
      description: 'When this article was last used in case resolution'
    },
    view_count_last6_months: {
      type: 'number',
      label: 'Views (Last 6 Months)',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'View count in the last 6 months'
    },
    // content Features
    has_attachments: {
      type: 'checkbox',
      label: 'Has Attachments',
      readonly: true,
      defaultValue: false
    },
    attachment_count: {
      type: 'number',
      label: 'Attachment Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    estimated_read_time: {
      type: 'number',
      label: 'Est. Read Time (Minutes)',
      precision: 0,
      readonly: true,
      description: 'Estimated time to read article'
    }
  },
  relationships: [
    {
      name: 'CaseArticles',
      type: 'hasMany',
      object: 'CaseArticle',
      foreignKey: 'article_id',
      label: 'Related Cases'
    },
    {
      name: 'Translations',
      type: 'hasMany',
      object: 'KnowledgeArticle',
      foreignKey: 'translation_of_id',
      label: 'Translations'
    },
    {
      name: 'Feedback',
      type: 'hasMany',
      object: 'ArticleFeedback',
      foreignKey: 'article_id',
      label: 'Customer Feedback'
    }
  ],
  validationRules: [
    {
      name: 'PublishDateRequired',
      errorMessage: 'Publish date is required for published articles',
      formula: 'AND(status = "Published", ISBLANK(publish_date))'
    },
    {
      name: 'NextReviewRequired',
      errorMessage: 'Next review date is required for published articles',
      formula: 'AND(status = "Published", ISBLANK(next_review_date))'
    },
    {
      name: 'CannotPublishInternal',
      errorMessage: 'Internal articles cannot be public',
      formula: 'AND(is_internal = true, is_public = true)'
    }
  ],
  listViews: [
    {
      name: 'AllArticles',
      label: 'All Articles',
      filters: [],
      columns: ['article_number', 'title', 'category', 'status', 'language', 'view_count', 'helpful_rating'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'Published',
      label: 'Published',
      filters: [
        ['status', '=', 'Published']
      ],
      columns: ['article_number', 'title', 'category', 'view_count', 'helpful_rating', 'linked_from_cases'],
      sort: [['view_count', 'desc']]
    },
    {
      name: 'Draft',
      label: 'Draft',
      filters: [
        ['status', '=', 'Draft']
      ],
      columns: ['article_number', 'title', 'category', 'owner_id', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'NeedsReview',
      label: 'Needs Review',
      filters: [
        ['next_review_date', 'past_due', null],
        ['status', '=', 'Published']
      ],
      columns: ['article_number', 'title', 'category', 'last_review_date', 'next_review_date', 'owner_id'],
      sort: [['next_review_date', 'asc']]
    },
    {
      name: 'MostViewed',
      label: 'Most Viewed',
      filters: [
        ['status', '=', 'Published']
      ],
      columns: ['article_number', 'title', 'category', 'view_count', 'unique_views', 'helpful_rating'],
      sort: [['view_count', 'desc']]
    },
    {
      name: 'MostHelpful',
      label: 'Most Helpful',
      filters: [
        ['status', '=', 'Published'],
        ['helpful_count', '>', 10]
      ],
      columns: ['article_number', 'title', 'category', 'helpful_rating', 'helpful_count', 'not_helpful_count'],
      sort: [['helpful_rating', 'desc']]
    },
    {
      name: 'LowRated',
      label: 'Low Rated',
      filters: [
        ['status', '=', 'Published'],
        ['helpful_rating', '<', 50],
        ['helpful_count', '>', 5]
      ],
      columns: ['article_number', 'title', 'category', 'helpful_rating', 'not_helpful_count', 'owner_id'],
      sort: [['helpful_rating', 'asc']]
    },
    {
      name: 'ByCategory',
      label: 'By category',
      filters: [],
      columns: ['category', 'title', 'status', 'view_count', 'helpful_rating'],
      sort: [['category', 'asc'], ['title', 'asc']]
    },
    {
      name: 'ScheduledPublish',
      label: 'Scheduled to Publish',
      filters: [
        ['status', '=', 'Draft'],
        ['scheduled_publish_date', '!=', null]
      ],
      columns: ['article_number', 'title', 'scheduled_publish_date', 'owner_id'],
      sort: [['scheduled_publish_date', 'asc']]
    },
    {
      name: 'TopQuality',
      label: 'Top Quality',
      filters: [
        ['status', '=', 'Published'],
        ['quality_score', '>=', 80]
      ],
      columns: ['article_number', 'title', 'quality_score', 'popularity_score', 'view_count'],
      sort: [['quality_score', 'desc']]
    },
    {
      name: 'MostUsedInCases',
      label: 'Most Used in Cases',
      filters: [
        ['status', '=', 'Published'],
        ['case_resolution_count', '>', 0]
      ],
      columns: ['article_number', 'title', 'case_resolution_count', 'last_used_in_case_date', 'helpful_rating'],
      sort: [['case_resolution_count', 'desc']]
    },
    {
      name: 'Archived',
      label: 'Archived',
      filters: [
        ['status', '=', 'Archived']
      ],
      columns: ['article_number', 'title', 'archived_date', 'archived_reason', 'archived_by_user_id'],
      sort: [['archived_date', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Article Information',
        columns: 2,
        fields: ['article_number', 'title', 'summary', 'status']
      },
      {
        label: 'content',
        columns: 1,
        fields: ['content']
      },
      {
        label: 'Categorization',
        columns: 2,
        fields: ['category', 'subcategory', 'keywords', 'tags']
      },
      {
        label: 'Related',
        columns: 2,
        fields: ['related_product_ids', 'related_case_types']
      },
      {
        label: 'Ownership',
        columns: 2,
        fields: ['owner_id', 'author_id']
      },
      {
        label: 'Publishing',
        columns: 2,
        fields: ['publish_date', 'published_by_id', 'last_review_date', 'next_review_date']
      },
      {
        label: 'Visibility',
        columns: 2,
        fields: ['is_internal', 'is_public', 'requires_authentication', 'visible_to_customer_tiers']
      },
      {
        label: 'Localization',
        columns: 2,
        fields: ['language', 'translation_of_id']
      },
      {
        label: 'Media',
        columns: 2,
        fields: ['video_u_r_l', 'thumbnail_u_r_l']
      },
      {
        label: 'Analytics',
        columns: 3,
        fields: ['view_count', 'unique_views', 'helpful_count', 'not_helpful_count', 'helpful_rating', 'average_time_on_page', 'linked_from_cases', 'search_rank']
      },
      {
        label: 'Performance Metrics',
        columns: 3,
        fields: ['quality_score', 'popularity_score', 'case_resolution_count', 'last_used_in_case_date', 'view_count_last6_months']
      },
      {
        label: 'AI Enhancement',
        columns: 2,
        fields: ['a_i_category', 'a_i_tags', 'a_i_summary', 'a_i_keywords', 'related_article_ids']
      },
      {
        label: 'Workflow & Versioning',
        columns: 2,
        fields: ['scheduled_publish_date', 'version_number', 'previous_version_id', 'archived_date', 'archived_by_user_id', 'archived_reason']
      },
      {
        label: 'content Details',
        columns: 3,
        fields: ['has_attachments', 'attachment_count', 'estimated_read_time']
      },
      {
        label: 'SEO',
        columns: 2,
        fields: ['meta_description', 'u_r_l_slug']
      }
    ]
  }
};

export default KnowledgeArticle;
