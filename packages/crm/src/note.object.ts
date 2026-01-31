import type { ObjectSchema } from '@objectstack/spec/data';

const Note: ObjectSchema = {
  name: 'note',
  label: 'Note',
  labelPlural: 'Notes',
  icon: 'sticky-note',
  description: 'Quick notes with markdown support, @mentions, and full-text search',
  enable: {
    searchEnabled: true,
    trackHistory: false,
    feedsEnabled: false,
    filesEnabled: true
  },
  fields: {
    // Basic Information
    Title: {
      type: 'text',
      label: 'Note Title',
      required: true,
      searchEnabled: true,
      maxLength: 255
    },
    Body: {
      type: 'textarea',
      label: 'Note Body',
      required: true,
      searchEnabled: true,
      maxLength: 32000,
      description: 'Rich text with Markdown support'
    },
    
    // Polymorphic Parent Relationship
    ParentId: {
      type: 'text',
      label: 'Parent Record ID',
      required: true,
      maxLength: 18,
      description: 'ID of the parent record (polymorphic)'
    },
    ParentType: {
      type: 'select',
      label: 'Parent Type',
      required: true,
      options: [
        { label: '🏢 Account', value: 'Account' },
        { label: '👤 Contact', value: 'Contact' },
        { label: '💼 Opportunity', value: 'Opportunity' },
        { label: '🎯 Lead', value: 'Lead' },
        { label: '🎫 Case', value: 'Case' },
        { label: '📄 Contract', value: 'Contract' },
        { label: '💰 Quote', value: 'Quote' },
        { label: '📋 Task', value: 'Task' },
        { label: '📅 Activity', value: 'Activity' },
        { label: '📢 Campaign', value: 'Campaign' },
        { label: '📦 Product', value: 'Product' },
        { label: '📑 Order', value: 'Order' }
      ]
    },
    
    // Privacy & Organization
    IsPrivate: {
      type: 'checkbox',
      label: 'Private Note',
      defaultValue: false,
      description: 'When true, only the owner can see this note'
    },
    IsPinned: {
      type: 'checkbox',
      label: 'Pinned',
      defaultValue: false,
      description: 'Pin important notes to the top'
    },
    Tags: {
      type: 'text',
      label: 'Tags',
      maxLength: 500,
      description: 'Comma-separated tags for categorization and search'
    },
    
    // Ownership
    OwnerId: {
      type: 'lookup',
      label: 'Owner',
      reference: 'User',
      required: true,
      defaultValue: '$currentUser'
    },
    
    // Mentions & Collaboration
    MentionedUserIds: {
      type: 'text',
      label: 'Mentioned Users',
      maxLength: 1000,
      readonly: true,
      description: 'Comma-separated User IDs extracted from @mentions in the body'
    },
    HasMentions: {
      type: 'checkbox',
      label: 'Has @Mentions',
      defaultValue: false,
      readonly: true
    },
    
    // Markdown & Formatting
    IsMarkdown: {
      type: 'checkbox',
      label: 'Markdown Enabled',
      defaultValue: true,
      description: 'Enable Markdown formatting for this note'
    },
    RenderedBody: {
      type: 'textarea',
      label: 'Rendered Body',
      readonly: true,
      maxLength: 32000,
      description: 'HTML-rendered version of the markdown body'
    },
    
    // Metadata
    WordCount: {
      type: 'number',
      label: 'Word Count',
      precision: 0,
      readonly: true,
      description: 'Approximate word count'
    },
    LastEditedDate: {
      type: 'datetime',
      label: 'Last Edited',
      readonly: true
    },
    LastEditedById: {
      type: 'lookup',
      label: 'Last Edited By',
      reference: 'User',
      readonly: true
    },
    
    // Search & Indexing
    SearchableText: {
      type: 'textarea',
      label: 'Searchable Text',
      readonly: true,
      maxLength: 32000,
      description: 'Combined Title + Body for full-text search indexing'
    },
    
    // AI Enhancement
    AISummary: {
      type: 'textarea',
      label: 'AI Summary',
      readonly: true,
      maxLength: 1000,
      description: 'AI-generated summary of the note'
    },
    AIExtractedKeywords: {
      type: 'text',
      label: 'AI Extracted Keywords',
      readonly: true,
      maxLength: 500,
      description: 'AI-extracted keywords from the note content'
    },
    AISentiment: {
      type: 'select',
      label: 'AI Sentiment',
      readonly: true,
      options: [
        { label: '😊 Positive', value: 'Positive' },
        { label: '😐 Neutral', value: 'Neutral' },
        { label: '😟 Negative', value: 'Negative' }
      ]
    }
  },
  relationships: [
    {
      name: 'Attachments',
      type: 'hasMany',
      object: 'Attachment',
      foreignKey: 'ParentId',
      label: 'Attachments'
    }
  ],
  listViews: [
    {
      name: 'AllNotes',
      label: 'All Notes',
      filters: [],
      columns: ['Title', 'ParentType', 'ParentId', 'OwnerId', 'IsPinned', 'Tags', 'LastEditedDate'],
      sort: [['IsPinned', 'desc'], ['LastEditedDate', 'desc']]
    },
    {
      name: 'MyNotes',
      label: 'My Notes',
      filters: [['OwnerId', '=', '$currentUser']],
      columns: ['Title', 'ParentType', 'ParentId', 'IsPinned', 'Tags', 'LastEditedDate'],
      sort: [['IsPinned', 'desc'], ['LastEditedDate', 'desc']]
    },
    {
      name: 'PinnedNotes',
      label: 'Pinned Notes',
      filters: [['IsPinned', '=', true]],
      columns: ['Title', 'ParentType', 'ParentId', 'OwnerId', 'Tags', 'LastEditedDate'],
      sort: [['LastEditedDate', 'desc']]
    },
    {
      name: 'PrivateNotes',
      label: 'Private Notes',
      filters: [
        ['IsPrivate', '=', true],
        ['OwnerId', '=', '$currentUser']
      ],
      columns: ['Title', 'ParentType', 'ParentId', 'Tags', 'LastEditedDate'],
      sort: [['LastEditedDate', 'desc']]
    },
    {
      name: 'RecentNotes',
      label: 'Recent Notes',
      filters: [['LastEditedDate', 'last_n_days', 7]],
      columns: ['Title', 'ParentType', 'ParentId', 'OwnerId', 'Tags', 'LastEditedDate'],
      sort: [['LastEditedDate', 'desc']]
    },
    {
      name: 'NotesWithMentions',
      label: 'Notes Mentioning Me',
      filters: [['MentionedUserIds', 'contains', '$currentUser']],
      columns: ['Title', 'ParentType', 'ParentId', 'OwnerId', 'LastEditedDate'],
      sort: [['LastEditedDate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireParentId',
      errorMessage: 'Notes must be attached to a parent record',
      formula: 'ISBLANK(ParentId)'
    },
    {
      name: 'RequireParentType',
      errorMessage: 'Parent Type is required',
      formula: 'ISBLANK(ParentType)'
    },
    {
      name: 'TitleMaxLength',
      errorMessage: 'Title cannot exceed 255 characters',
      formula: 'LEN(Title) > 255'
    },
    {
      name: 'BodyMaxLength',
      errorMessage: 'Note body cannot exceed 32,000 characters',
      formula: 'LEN(Body) > 32000'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Note Information',
        columns: 2,
        fields: ['Title', 'ParentType', 'ParentId', 'OwnerId']
      },
      {
        label: 'Settings',
        columns: 2,
        fields: ['IsPrivate', 'IsPinned', 'IsMarkdown', 'Tags']
      },
      {
        label: 'Mentions & Collaboration',
        columns: 2,
        fields: ['HasMentions', 'MentionedUserIds']
      },
      {
        label: 'Metadata',
        columns: 2,
        fields: ['WordCount', 'LastEditedDate', 'LastEditedById']
      },
      {
        label: 'AI Insights',
        columns: 2,
        fields: ['AISummary', 'AIExtractedKeywords', 'AISentiment']
      },
      {
        label: 'Note Content',
        columns: 1,
        fields: ['Body']
      }
    ]
  }
};

export default Note;
