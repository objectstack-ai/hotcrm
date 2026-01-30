import type { ServiceObject } from '@objectstack/spec/data';

const WebToCase = {
  name: 'web_to_case',
  label: 'Web-to-Case Form',
  labelPlural: 'Web-to-Case Forms',
  icon: 'globe',
  description: 'Web form configuration for customer case submission',
  capabilities: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Form Name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000
    },
    IsActive: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // Form Configuration
    FormURL: {
      type: 'url',
      label: 'Form URL',
      readonly: true,
      description: 'Generated URL for this web form'
    },
    FormKey: {
      type: 'text',
      label: 'Form Key',
      maxLength: 100,
      readonly: true,
      description: 'Unique key for form submission API'
    },
    // Routing
    DefaultQueueId: {
      type: 'lookup',
      label: 'Default Queue',
      reference: 'Queue',
      required: true
    },
    DefaultOwnerId: {
      type: 'lookup',
      label: 'Default Owner',
      reference: 'User'
    },
    DefaultPriority: {
      type: 'select',
      label: 'Default Priority',
      defaultValue: 'Medium',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    DefaultCaseType: {
      type: 'select',
      label: 'Default Case Type',
      defaultValue: 'Question',
      options: [
        { label: 'Problem', value: 'Problem' },
        { label: 'Question', value: 'Question' },
        { label: 'Incident', value: 'Incident' },
        { label: 'Feature Request', value: 'Feature Request' },
        { label: 'Training', value: 'Training' },
        { label: 'Maintenance', value: 'Maintenance' },
        { label: 'Other', value: 'Other' }
      ]
    },
    // Form Fields
    RequireContactInfo: {
      type: 'checkbox',
      label: 'Require Contact Information',
      defaultValue: true
    },
    RequireEmail: {
      type: 'checkbox',
      label: 'Require Email',
      defaultValue: true
    },
    RequirePhone: {
      type: 'checkbox',
      label: 'Require Phone',
      defaultValue: false
    },
    RequireCompany: {
      type: 'checkbox',
      label: 'Require Company',
      defaultValue: false
    },
    AllowPrioritySelection: {
      type: 'checkbox',
      label: 'Allow Priority Selection',
      defaultValue: false
    },
    AllowTypeSelection: {
      type: 'checkbox',
      label: 'Allow Type Selection',
      defaultValue: true
    },
    CustomFields: {
      type: 'textarea',
      label: 'Custom Fields (JSON)',
      maxLength: 5000,
      description: 'JSON configuration for additional form fields'
    },
    // Attachments
    AllowAttachments: {
      type: 'checkbox',
      label: 'Allow Attachments',
      defaultValue: true
    },
    MaxAttachmentSize: {
      type: 'number',
      label: 'Max Attachment Size (MB)',
      precision: 0,
      min: 1,
      max: 50,
      defaultValue: 10
    },
    MaxAttachments: {
      type: 'number',
      label: 'Max Attachments',
      precision: 0,
      min: 1,
      max: 10,
      defaultValue: 5
    },
    AllowedFileTypes: {
      type: 'text',
      label: 'Allowed File Types',
      maxLength: 500,
      description: 'Comma-separated extensions (e.g., pdf,doc,jpg,png)'
    },
    // Auto Response
    SendAutoResponse: {
      type: 'checkbox',
      label: 'Send Auto Response',
      defaultValue: true
    },
    AutoResponseTemplateId: {
      type: 'lookup',
      label: 'Auto Response Template',
      reference: 'EmailTemplate'
    },
    // Success Page
    SuccessMessage: {
      type: 'textarea',
      label: 'Success Message',
      maxLength: 1000,
      defaultValue: 'Thank you! Your case has been submitted successfully. We will get back to you soon.'
    },
    RedirectURL: {
      type: 'url',
      label: 'Redirect URL',
      description: 'URL to redirect after successful submission'
    },
    // Security
    RequireCaptcha: {
      type: 'checkbox',
      label: 'Require CAPTCHA',
      defaultValue: true,
      description: 'Require CAPTCHA verification to prevent spam'
    },
    AllowAnonymous: {
      type: 'checkbox',
      label: 'Allow Anonymous Submissions',
      defaultValue: true
    },
    RequireAccountMatch: {
      type: 'checkbox',
      label: 'Require Account Match',
      defaultValue: false,
      description: 'Require submitter email to match existing account'
    },
    AllowedDomains: {
      type: 'textarea',
      label: 'Allowed Domains',
      maxLength: 1000,
      description: 'Allowed email domains (one per line, leave empty for all)'
    },
    BlockedDomains: {
      type: 'textarea',
      label: 'Blocked Domains',
      maxLength: 1000,
      description: 'Blocked email domains (one per line)'
    },
    RateLimitPerHour: {
      type: 'number',
      label: 'Rate Limit Per Hour',
      precision: 0,
      min: 1,
      defaultValue: 10,
      description: 'Maximum submissions per email per hour'
    },
    // Branding
    FormTitle: {
      type: 'text',
      label: 'Form Title',
      maxLength: 255,
      defaultValue: 'Submit a Support Request'
    },
    FormSubtitle: {
      type: 'text',
      label: 'Form Subtitle',
      maxLength: 500
    },
    LogoURL: {
      type: 'url',
      label: 'Logo URL',
      description: 'URL to company logo for form header'
    },
    CustomCSS: {
      type: 'textarea',
      label: 'Custom CSS',
      maxLength: 5000,
      description: 'Custom CSS for form styling'
    },
    // Contact Creation
    AutoCreateContact: {
      type: 'checkbox',
      label: 'Auto Create Contact',
      defaultValue: true,
      description: 'Automatically create contact if not found'
    },
    DefaultAccountId: {
      type: 'lookup',
      label: 'Default Account',
      reference: 'Account',
      description: 'Default account for new contacts'
    },
    // AI Processing
    UseAIForCategorization: {
      type: 'checkbox',
      label: 'Use AI for Categorization',
      defaultValue: false
    },
    UseAIForPriority: {
      type: 'checkbox',
      label: 'Use AI for Priority',
      defaultValue: false
    },
    UseAISentimentAnalysis: {
      type: 'checkbox',
      label: 'Use AI Sentiment Analysis',
      defaultValue: false
    },
    // Statistics
    TotalSubmissions: {
      type: 'number',
      label: 'Total Submissions',
      precision: 0,
      readonly: true
    },
    SubmissionsToday: {
      type: 'number',
      label: 'Submissions Today',
      precision: 0,
      readonly: true
    },
    SubmissionsThisMonth: {
      type: 'number',
      label: 'Submissions This Month',
      precision: 0,
      readonly: true
    },
    SpamBlocked: {
      type: 'number',
      label: 'Spam Blocked',
      precision: 0,
      readonly: true
    },
    LastSubmissionDate: {
      type: 'datetime',
      label: 'Last Submission',
      readonly: true
    },
    AverageRating: {
      type: 'number',
      label: 'Average Form Rating',
      precision: 2,
      readonly: true,
      description: 'Average user rating of form experience (1-5)'
    }
  },
  validationRules: [
    {
      name: 'AutoResponseTemplateRequired',
      errorMessage: 'Auto response template is required when auto response is enabled',
      formula: 'AND(SendAutoResponse = true, ISBLANK(AutoResponseTemplateId))'
    },
    {
      name: 'AllowedFileTypesRequired',
      errorMessage: 'Allowed file types must be specified when attachments are enabled',
      formula: 'AND(AllowAttachments = true, ISBLANK(AllowedFileTypes))'
    }
  ],
  listViews: [
    {
      name: 'AllForms',
      label: 'All Web Forms',
      filters: [],
      columns: ['Name', 'FormTitle', 'DefaultQueueId', 'IsActive', 'TotalSubmissions', 'SubmissionsToday'],
      sort: [['Name', 'asc']]
    },
    {
      name: 'ActiveForms',
      label: 'Active Forms',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'DefaultQueueId', 'TotalSubmissions', 'SubmissionsToday', 'AverageRating'],
      sort: [['TotalSubmissions', 'desc']]
    },
    {
      name: 'HighTraffic',
      label: 'High Traffic',
      filters: [
        ['SubmissionsToday', '>', 10],
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'SubmissionsToday', 'SubmissionsThisMonth', 'SpamBlocked', 'AverageRating'],
      sort: [['SubmissionsToday', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Form Information',
        columns: 2,
        fields: ['Name', 'Description', 'IsActive', 'FormURL', 'FormKey']
      },
      {
        label: 'Default Case Settings',
        columns: 2,
        fields: ['DefaultQueueId', 'DefaultOwnerId', 'DefaultPriority', 'DefaultCaseType']
      },
      {
        label: 'Form Fields',
        columns: 2,
        fields: ['RequireContactInfo', 'RequireEmail', 'RequirePhone', 'RequireCompany', 'AllowPrioritySelection', 'AllowTypeSelection', 'CustomFields']
      },
      {
        label: 'Attachments',
        columns: 2,
        fields: ['AllowAttachments', 'MaxAttachmentSize', 'MaxAttachments', 'AllowedFileTypes']
      },
      {
        label: 'Auto Response',
        columns: 2,
        fields: ['SendAutoResponse', 'AutoResponseTemplateId']
      },
      {
        label: 'Success Configuration',
        columns: 1,
        fields: ['SuccessMessage', 'RedirectURL']
      },
      {
        label: 'Security Settings',
        columns: 2,
        fields: ['RequireCaptcha', 'AllowAnonymous', 'RequireAccountMatch', 'RateLimitPerHour', 'AllowedDomains', 'BlockedDomains']
      },
      {
        label: 'Branding',
        columns: 1,
        fields: ['FormTitle', 'FormSubtitle', 'LogoURL', 'CustomCSS']
      },
      {
        label: 'Contact Creation',
        columns: 2,
        fields: ['AutoCreateContact', 'DefaultAccountId']
      },
      {
        label: 'AI Processing',
        columns: 3,
        fields: ['UseAIForCategorization', 'UseAIForPriority', 'UseAISentimentAnalysis']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['TotalSubmissions', 'SubmissionsToday', 'SubmissionsThisMonth', 'SpamBlocked', 'LastSubmissionDate', 'AverageRating']
      }
    ]
  }
};

export default WebToCase;
