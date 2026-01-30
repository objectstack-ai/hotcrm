import type { ServiceObject } from '@objectstack/spec/data';

const KnowledgeArticle = {
  name: 'knowledge_article',
  label: 'Knowledge Article',
  labelPlural: 'Knowledge Articles',
  icon: 'book',
  description: 'Knowledge base articles for customer self-service and agent assistance',
  capabilities: {
    searchable: true,
    trackHistory: true,
    files: true
  },
  fields: {
    // Basic Information
    ArticleNumber: {
      type: 'autoNumber',
      label: 'Article Number',
      format: 'KB-{YYYY}-{0000}',
      readonly: true,
      searchable: true
    },
    Title: {
      type: 'text',
      label: 'Title',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Summary: {
      type: 'textarea',
      label: 'Summary',
      required: true,
      maxLength: 500,
      searchable: true,
      description: 'Brief summary shown in search results'
    },
    Content: {
      type: 'textarea',
      label: 'Content',
      required: true,
      searchable: true,
      maxLength: 32000,
      description: 'Full article content with formatting'
    },
    // Categorization
    Category: {
      type: 'select',
      label: 'Category',
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
    Subcategory: {
      type: 'text',
      label: 'Subcategory',
      maxLength: 100
    },
    Keywords: {
      type: 'text',
      label: 'Keywords',
      maxLength: 500,
      searchable: true,
      description: 'Comma-separated keywords for search'
    },
    Tags: {
      type: 'multiselect',
      label: 'Tags',
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
    RelatedProductIds: {
      type: 'text',
      label: 'Related Products',
      maxLength: 500,
      description: 'Comma-separated product IDs'
    },
    RelatedCaseTypes: {
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
    Status: {
      type: 'select',
      label: 'Status',
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
    PublishDate: {
      type: 'datetime',
      label: 'Publish Date',
      readonly: true
    },
    PublishedById: {
      type: 'lookup',
      label: 'Published By',
      reference: 'User',
      readonly: true
    },
    LastReviewDate: {
      type: 'date',
      label: 'Last Review Date'
    },
    NextReviewDate: {
      type: 'date',
      label: 'Next Review Date',
      description: 'Date when article should be reviewed'
    },
    // Ownership
    OwnerId: {
      type: 'lookup',
      label: 'Owner',
      reference: 'User',
      required: true
    },
    AuthorId: {
      type: 'lookup',
      label: 'Author',
      reference: 'User',
      required: true
    },
    // Visibility
    IsInternal: {
      type: 'checkbox',
      label: 'Internal Only',
      defaultValue: false,
      description: 'Visible only to support agents'
    },
    IsPublic: {
      type: 'checkbox',
      label: 'Public',
      defaultValue: true,
      description: 'Visible in customer portal'
    },
    RequiresAuthentication: {
      type: 'checkbox',
      label: 'Requires Login',
      defaultValue: false,
      description: 'Customer must be logged in to view'
    },
    VisibleToCustomerTiers: {
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
    Language: {
      type: 'select',
      label: 'Language',
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
    TranslationOfId: {
      type: 'lookup',
      label: 'Translation Of',
      reference: 'KnowledgeArticle',
      description: 'Original article if this is a translation'
    },
    // Attachments & Media
    VideoURL: {
      type: 'url',
      label: 'Video URL',
      description: 'YouTube/Vimeo URL for tutorial video'
    },
    ThumbnailURL: {
      type: 'url',
      label: 'Thumbnail URL',
      description: 'Article thumbnail image'
    },
    // Analytics
    ViewCount: {
      type: 'number',
      label: 'View Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    UniqueViews: {
      type: 'number',
      label: 'Unique Views',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    HelpfulCount: {
      type: 'number',
      label: 'Helpful Votes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    NotHelpfulCount: {
      type: 'number',
      label: 'Not Helpful Votes',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    HelpfulRating: {
      type: 'number',
      label: 'Helpful Rating (%)',
      precision: 2,
      readonly: true,
      description: 'Percentage of helpful votes'
    },
    AverageTimeOnPage: {
      type: 'number',
      label: 'Avg Time on Page (Seconds)',
      precision: 0,
      readonly: true
    },
    LinkedFromCases: {
      type: 'number',
      label: 'Linked from Cases',
      precision: 0,
      readonly: true,
      description: 'Number of cases linking to this article'
    },
    SearchRank: {
      type: 'number',
      label: 'Search Rank',
      precision: 2,
      readonly: true,
      description: 'Search relevance score'
    },
    // SEO
    MetaDescription: {
      type: 'text',
      label: 'Meta Description',
      maxLength: 160,
      description: 'SEO meta description'
    },
    URLSlug: {
      type: 'text',
      label: 'URL Slug',
      maxLength: 255,
      readonly: true,
      description: 'URL-friendly article identifier'
    }
  },
  relationships: [
    {
      name: 'CaseArticles',
      type: 'hasMany',
      object: 'CaseArticle',
      foreignKey: 'ArticleId',
      label: 'Related Cases'
    },
    {
      name: 'Translations',
      type: 'hasMany',
      object: 'KnowledgeArticle',
      foreignKey: 'TranslationOfId',
      label: 'Translations'
    },
    {
      name: 'Feedback',
      type: 'hasMany',
      object: 'ArticleFeedback',
      foreignKey: 'ArticleId',
      label: 'Customer Feedback'
    }
  ],
  validationRules: [
    {
      name: 'PublishDateRequired',
      errorMessage: 'Publish date is required for published articles',
      formula: 'AND(Status = "Published", ISBLANK(PublishDate))'
    },
    {
      name: 'NextReviewRequired',
      errorMessage: 'Next review date is required for published articles',
      formula: 'AND(Status = "Published", ISBLANK(NextReviewDate))'
    },
    {
      name: 'CannotPublishInternal',
      errorMessage: 'Internal articles cannot be public',
      formula: 'AND(IsInternal = true, IsPublic = true)'
    }
  ],
  listViews: [
    {
      name: 'AllArticles',
      label: 'All Articles',
      filters: [],
      columns: ['ArticleNumber', 'Title', 'Category', 'Status', 'Language', 'ViewCount', 'HelpfulRating'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'Published',
      label: 'Published',
      filters: [
        ['Status', '=', 'Published']
      ],
      columns: ['ArticleNumber', 'Title', 'Category', 'ViewCount', 'HelpfulRating', 'LinkedFromCases'],
      sort: [['ViewCount', 'desc']]
    },
    {
      name: 'Draft',
      label: 'Draft',
      filters: [
        ['Status', '=', 'Draft']
      ],
      columns: ['ArticleNumber', 'Title', 'Category', 'OwnerId', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'NeedsReview',
      label: 'Needs Review',
      filters: [
        ['NextReviewDate', 'past_due', null],
        ['Status', '=', 'Published']
      ],
      columns: ['ArticleNumber', 'Title', 'Category', 'LastReviewDate', 'NextReviewDate', 'OwnerId'],
      sort: [['NextReviewDate', 'asc']]
    },
    {
      name: 'MostViewed',
      label: 'Most Viewed',
      filters: [
        ['Status', '=', 'Published']
      ],
      columns: ['ArticleNumber', 'Title', 'Category', 'ViewCount', 'UniqueViews', 'HelpfulRating'],
      sort: [['ViewCount', 'desc']]
    },
    {
      name: 'MostHelpful',
      label: 'Most Helpful',
      filters: [
        ['Status', '=', 'Published'],
        ['HelpfulCount', '>', 10]
      ],
      columns: ['ArticleNumber', 'Title', 'Category', 'HelpfulRating', 'HelpfulCount', 'NotHelpfulCount'],
      sort: [['HelpfulRating', 'desc']]
    },
    {
      name: 'LowRated',
      label: 'Low Rated',
      filters: [
        ['Status', '=', 'Published'],
        ['HelpfulRating', '<', 50],
        ['HelpfulCount', '>', 5]
      ],
      columns: ['ArticleNumber', 'Title', 'Category', 'HelpfulRating', 'NotHelpfulCount', 'OwnerId'],
      sort: [['HelpfulRating', 'asc']]
    },
    {
      name: 'ByCategory',
      label: 'By Category',
      filters: [],
      columns: ['Category', 'Title', 'Status', 'ViewCount', 'HelpfulRating'],
      sort: [['Category', 'asc'], ['Title', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Article Information',
        columns: 2,
        fields: ['ArticleNumber', 'Title', 'Summary', 'Status']
      },
      {
        label: 'Content',
        columns: 1,
        fields: ['Content']
      },
      {
        label: 'Categorization',
        columns: 2,
        fields: ['Category', 'Subcategory', 'Keywords', 'Tags']
      },
      {
        label: 'Related',
        columns: 2,
        fields: ['RelatedProductIds', 'RelatedCaseTypes']
      },
      {
        label: 'Ownership',
        columns: 2,
        fields: ['OwnerId', 'AuthorId']
      },
      {
        label: 'Publishing',
        columns: 2,
        fields: ['PublishDate', 'PublishedById', 'LastReviewDate', 'NextReviewDate']
      },
      {
        label: 'Visibility',
        columns: 2,
        fields: ['IsInternal', 'IsPublic', 'RequiresAuthentication', 'VisibleToCustomerTiers']
      },
      {
        label: 'Localization',
        columns: 2,
        fields: ['Language', 'TranslationOfId']
      },
      {
        label: 'Media',
        columns: 2,
        fields: ['VideoURL', 'ThumbnailURL']
      },
      {
        label: 'Analytics',
        columns: 3,
        fields: ['ViewCount', 'UniqueViews', 'HelpfulCount', 'NotHelpfulCount', 'HelpfulRating', 'AverageTimeOnPage', 'LinkedFromCases', 'SearchRank']
      },
      {
        label: 'SEO',
        columns: 2,
        fields: ['MetaDescription', 'URLSlug']
      }
    ]
  }
};

export default KnowledgeArticle;
