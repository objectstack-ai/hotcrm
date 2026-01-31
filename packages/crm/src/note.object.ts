
const Note = {
  name: 'note',
  label: 'Note',
  labelPlural: 'Notes',
  icon: 'sticky-note',
  description: 'Quick notes with markdown support, @mentions, and full-text search',
  enable: {
    searchable: true,
    trackHistory: false,
    feeds: false,
    files: true
  },
  fields: {
    // Basic Information
    title: {
      type: 'text',
      label: 'Note title',
      required: true,
      searchable: true,
      maxLength: 255
    },
    body: {
      type: 'textarea',
      label: 'Note body',
      required: true,
      searchable: true,
      maxLength: 32000,
      description: 'Rich text with Markdown support'
    },
    
    // Polymorphic Parent Relationship
    parent_id: {
      type: 'text',
      label: 'Parent Record ID',
      required: true,
      maxLength: 18,
      description: 'ID of the parent record (polymorphic)'
    },
    parent_type: {
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
    is_private: {
      type: 'checkbox',
      label: 'Private Note',
      defaultValue: false,
      description: 'When true, only the owner can see this note'
    },
    is_pinned: {
      type: 'checkbox',
      label: 'Pinned',
      defaultValue: false,
      description: 'Pin important notes to the top'
    },
    tags: {
      type: 'text',
      label: 'tags',
      maxLength: 500,
      description: 'Comma-separated tags for categorization and search'
    },
    
    // Ownership
    owner_id: {
      type: 'lookup',
      label: 'Owner',
      reference: 'User',
      required: true,
      defaultValue: '$currentUser'
    },
    
    // Mentions & Collaboration
    mentioned_user_ids: {
      type: 'text',
      label: 'Mentioned Users',
      maxLength: 1000,
      readonly: true,
      description: 'Comma-separated User IDs extracted from @mentions in the body'
    },
    has_mentions: {
      type: 'checkbox',
      label: 'Has @Mentions',
      defaultValue: false,
      readonly: true
    },
    
    // Markdown & Formatting
    is_markdown: {
      type: 'checkbox',
      label: 'Markdown Enabled',
      defaultValue: true,
      description: 'Enable Markdown formatting for this note'
    },
    rendered_body: {
      type: 'textarea',
      label: 'Rendered body',
      readonly: true,
      maxLength: 32000,
      description: 'HTML-rendered version of the markdown body'
    },
    
    // Metadata
    word_count: {
      type: 'number',
      label: 'Word Count',
      precision: 0,
      readonly: true,
      description: 'Approximate word count'
    },
    last_edited_date: {
      type: 'datetime',
      label: 'Last Edited',
      readonly: true
    },
    last_edited_by_id: {
      type: 'lookup',
      label: 'Last Edited By',
      reference: 'User',
      readonly: true
    },
    
    // Search & Indexing
    searchable_text: {
      type: 'textarea',
      label: 'Searchable Text',
      readonly: true,
      maxLength: 32000,
      description: 'Combined title + body for full-text search indexing'
    },
    
    // AI Enhancement
    a_i_summary: {
      type: 'textarea',
      label: 'AI Summary',
      readonly: true,
      maxLength: 1000,
      description: 'AI-generated summary of the note'
    },
    a_i_extracted_keywords: {
      type: 'text',
      label: 'AI Extracted Keywords',
      readonly: true,
      maxLength: 500,
      description: 'AI-extracted keywords from the note content'
    },
    a_i_sentiment: {
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
      foreignKey: 'parent_id',
      label: 'Attachments'
    }
  ],
  listViews: [
    {
      name: 'AllNotes',
      label: 'All Notes',
      filters: [],
      columns: ['title', 'parent_type', 'parent_id', 'owner_id', 'is_pinned', 'tags', 'last_edited_date'],
      sort: [['is_pinned', 'desc'], ['last_edited_date', 'desc']]
    },
    {
      name: 'MyNotes',
      label: 'My Notes',
      filters: [['owner_id', '=', '$currentUser']],
      columns: ['title', 'parent_type', 'parent_id', 'is_pinned', 'tags', 'last_edited_date'],
      sort: [['is_pinned', 'desc'], ['last_edited_date', 'desc']]
    },
    {
      name: 'PinnedNotes',
      label: 'Pinned Notes',
      filters: [['is_pinned', '=', true]],
      columns: ['title', 'parent_type', 'parent_id', 'owner_id', 'tags', 'last_edited_date'],
      sort: [['last_edited_date', 'desc']]
    },
    {
      name: 'PrivateNotes',
      label: 'Private Notes',
      filters: [
        ['is_private', '=', true],
        ['owner_id', '=', '$currentUser']
      ],
      columns: ['title', 'parent_type', 'parent_id', 'tags', 'last_edited_date'],
      sort: [['last_edited_date', 'desc']]
    },
    {
      name: 'RecentNotes',
      label: 'Recent Notes',
      filters: [['last_edited_date', 'last_n_days', 7]],
      columns: ['title', 'parent_type', 'parent_id', 'owner_id', 'tags', 'last_edited_date'],
      sort: [['last_edited_date', 'desc']]
    },
    {
      name: 'NotesWithMentions',
      label: 'Notes Mentioning Me',
      filters: [['mentioned_user_ids', 'contains', '$currentUser']],
      columns: ['title', 'parent_type', 'parent_id', 'owner_id', 'last_edited_date'],
      sort: [['last_edited_date', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireParentId',
      errorMessage: 'Notes must be attached to a parent record',
      formula: 'ISBLANK(parent_id)'
    },
    {
      name: 'RequireParentType',
      errorMessage: 'Parent Type is required',
      formula: 'ISBLANK(parent_type)'
    },
    {
      name: 'TitleMaxLength',
      errorMessage: 'title cannot exceed 255 characters',
      formula: 'LEN(title) > 255'
    },
    {
      name: 'BodyMaxLength',
      errorMessage: 'Note body cannot exceed 32,000 characters',
      formula: 'LEN(body) > 32000'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Note Information',
        columns: 2,
        fields: ['title', 'parent_type', 'parent_id', 'owner_id']
      },
      {
        label: 'Settings',
        columns: 2,
        fields: ['is_private', 'is_pinned', 'is_markdown', 'tags']
      },
      {
        label: 'Mentions & Collaboration',
        columns: 2,
        fields: ['has_mentions', 'mentioned_user_ids']
      },
      {
        label: 'Metadata',
        columns: 2,
        fields: ['word_count', 'last_edited_date', 'last_edited_by_id']
      },
      {
        label: 'AI Insights',
        columns: 2,
        fields: ['a_i_summary', 'a_i_extracted_keywords', 'a_i_sentiment']
      },
      {
        label: 'Note Content',
        columns: 1,
        fields: ['body']
      }
    ]
  }
};

export default Note;
