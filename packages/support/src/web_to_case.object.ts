
const WebToCase = {
  name: 'web_to_case',
  label: 'Web-to-Case Form',
  labelPlural: 'Web-to-Case Forms',
  icon: 'globe',
  description: 'Web form configuration for customer case submission',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: 'Form name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000
    },
    is_active: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // Form Configuration
    form_url: {
      type: 'url',
      label: 'Form URL',
      readonly: true,
      description: 'Generated URL for this web form'
    },
    form_key: {
      type: 'text',
      label: 'Form Key',
      maxLength: 100,
      readonly: true,
      description: 'Unique key for form submission API'
    },
    // Routing
    default_queue_id: {
      type: 'lookup',
      label: 'Default Queue',
      reference: 'Queue',
      required: true
    },
    default_owner_id: {
      type: 'lookup',
      label: 'Default Owner',
      reference: 'users'
    },
    default_priority: {
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
    default_case_type: {
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
    require_contact_info: {
      type: 'checkbox',
      label: 'Require Contact Information',
      defaultValue: true
    },
    require_email: {
      type: 'checkbox',
      label: 'Require Email',
      defaultValue: true
    },
    require_phone: {
      type: 'checkbox',
      label: 'Require Phone',
      defaultValue: false
    },
    require_company: {
      type: 'checkbox',
      label: 'Require Company',
      defaultValue: false
    },
    allow_priority_selection: {
      type: 'checkbox',
      label: 'Allow Priority Selection',
      defaultValue: false
    },
    allow_type_selection: {
      type: 'checkbox',
      label: 'Allow Type Selection',
      defaultValue: true
    },
    custom_fields: {
      type: 'textarea',
      label: 'Custom Fields (JSON)',
      maxLength: 5000,
      description: 'JSON configuration for additional form fields'
    },
    // Attachments
    allow_attachments: {
      type: 'checkbox',
      label: 'Allow Attachments',
      defaultValue: true
    },
    max_attachment_size: {
      type: 'number',
      label: 'Max Attachment Size (MB)',
      precision: 0,
      min: 1,
      max: 50,
      defaultValue: 10
    },
    max_attachments: {
      type: 'number',
      label: 'Max Attachments',
      precision: 0,
      min: 1,
      max: 10,
      defaultValue: 5
    },
    allowed_file_types: {
      type: 'text',
      label: 'Allowed File Types',
      maxLength: 500,
      description: 'Comma-separated extensions (e.g., pdf,doc,jpg,png)'
    },
    // Auto Response
    send_auto_response: {
      type: 'checkbox',
      label: 'Send Auto Response',
      defaultValue: true
    },
    auto_response_template_id: {
      type: 'lookup',
      label: 'Auto Response Template',
      reference: 'EmailTemplate'
    },
    // Success Page
    success_message: {
      type: 'textarea',
      label: 'Success Message',
      maxLength: 1000,
      defaultValue: 'Thank you! Your case has been submitted successfully. We will get back to you soon.'
    },
    redirect_url: {
      type: 'url',
      label: 'Redirect URL',
      description: 'URL to redirect after successful submission'
    },
    // Security
    require_captcha: {
      type: 'checkbox',
      label: 'Require CAPTCHA',
      defaultValue: true,
      description: 'Require CAPTCHA verification to prevent spam'
    },
    allow_anonymous: {
      type: 'checkbox',
      label: 'Allow Anonymous Submissions',
      defaultValue: true
    },
    require_account_match: {
      type: 'checkbox',
      label: 'Require Account Match',
      defaultValue: false,
      description: 'Require submitter email to match existing account'
    },
    allowed_domains: {
      type: 'textarea',
      label: 'Allowed Domains',
      maxLength: 1000,
      description: 'Allowed email domains (one per line, leave empty for all)'
    },
    blocked_domains: {
      type: 'textarea',
      label: 'Blocked Domains',
      maxLength: 1000,
      description: 'Blocked email domains (one per line)'
    },
    rate_limit_per_hour: {
      type: 'number',
      label: 'Rate Limit Per Hour',
      precision: 0,
      min: 1,
      defaultValue: 10,
      description: 'Maximum submissions per email per hour'
    },
    // Branding
    form_title: {
      type: 'text',
      label: 'Form Title',
      maxLength: 255,
      defaultValue: 'Submit a Support Request'
    },
    form_subtitle: {
      type: 'text',
      label: 'Form Subtitle',
      maxLength: 500
    },
    logo_url: {
      type: 'url',
      label: 'Logo URL',
      description: 'URL to company logo for form header'
    },
    custom_css: {
      type: 'textarea',
      label: 'Custom CSS',
      maxLength: 5000,
      description: 'Custom CSS for form styling'
    },
    // Contact Creation
    auto_create_contact: {
      type: 'checkbox',
      label: 'Auto Create Contact',
      defaultValue: true,
      description: 'Automatically create contact if not found'
    },
    default_account_id: {
      type: 'lookup',
      label: 'Default Account',
      reference: 'account',
      description: 'Default account for new contacts'
    },
    // AI Processing
    use_ai_for_categorization: {
      type: 'checkbox',
      label: 'Use AI for Categorization',
      defaultValue: false
    },
    use_ai_for_priority: {
      type: 'checkbox',
      label: 'Use AI for Priority',
      defaultValue: false
    },
    use_ai_sentiment_analysis: {
      type: 'checkbox',
      label: 'Use AI Sentiment Analysis',
      defaultValue: false
    },
    // Statistics
    total_submissions: {
      type: 'number',
      label: 'Total Submissions',
      precision: 0,
      readonly: true
    },
    submissions_today: {
      type: 'number',
      label: 'Submissions Today',
      precision: 0,
      readonly: true
    },
    submissions_this_month: {
      type: 'number',
      label: 'Submissions This Month',
      precision: 0,
      readonly: true
    },
    spam_blocked: {
      type: 'number',
      label: 'Spam Blocked',
      precision: 0,
      readonly: true
    },
    last_submission_date: {
      type: 'datetime',
      label: 'Last Submission',
      readonly: true
    },
    average_rating: {
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
      formula: 'AND(send_auto_response = true, ISBLANK(auto_response_template_id))'
    },
    {
      name: 'AllowedFileTypesRequired',
      errorMessage: 'Allowed file types must be specified when attachments are enabled',
      formula: 'AND(allow_attachments = true, ISBLANK(allowed_file_types))'
    }
  ],
  listViews: [
    {
      name: 'AllForms',
      label: 'All Web Forms',
      filters: [],
      columns: ['name', 'form_title', 'default_queue_id', 'is_active', 'total_submissions', 'submissions_today'],
      sort: [['name', 'asc']]
    },
    {
      name: 'ActiveForms',
      label: 'Active Forms',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['name', 'default_queue_id', 'total_submissions', 'submissions_today', 'average_rating'],
      sort: [['total_submissions', 'desc']]
    },
    {
      name: 'HighTraffic',
      label: 'High Traffic',
      filters: [
        ['submissions_today', '>', 10],
        ['is_active', '=', true]
      ],
      columns: ['name', 'submissions_today', 'submissions_this_month', 'spam_blocked', 'average_rating'],
      sort: [['submissions_today', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Form Information',
        columns: 2,
        fields: ['name', 'description', 'is_active', 'form_url', 'form_key']
      },
      {
        label: 'Default Case Settings',
        columns: 2,
        fields: ['default_queue_id', 'default_owner_id', 'default_priority', 'default_case_type']
      },
      {
        label: 'Form Fields',
        columns: 2,
        fields: ['require_contact_info', 'require_email', 'require_phone', 'require_company', 'allow_priority_selection', 'allow_type_selection', 'custom_fields']
      },
      {
        label: 'Attachments',
        columns: 2,
        fields: ['allow_attachments', 'max_attachment_size', 'max_attachments', 'allowed_file_types']
      },
      {
        label: 'Auto Response',
        columns: 2,
        fields: ['send_auto_response', 'auto_response_template_id']
      },
      {
        label: 'Success Configuration',
        columns: 1,
        fields: ['success_message', 'redirect_url']
      },
      {
        label: 'Security Settings',
        columns: 2,
        fields: ['require_captcha', 'allow_anonymous', 'require_account_match', 'rate_limit_per_hour', 'allowed_domains', 'blocked_domains']
      },
      {
        label: 'Branding',
        columns: 1,
        fields: ['form_title', 'form_subtitle', 'logo_url', 'custom_css']
      },
      {
        label: 'Contact Creation',
        columns: 2,
        fields: ['auto_create_contact', 'default_account_id']
      },
      {
        label: 'AI Processing',
        columns: 3,
        fields: ['use_ai_for_categorization', 'use_ai_for_priority', 'use_ai_sentiment_analysis']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['total_submissions', 'submissions_today', 'submissions_this_month', 'spam_blocked', 'last_submission_date', 'average_rating']
      }
    ]
  }
};

export default WebToCase;
