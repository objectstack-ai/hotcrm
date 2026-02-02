import { ObjectSchema, Field } from '@objectstack/spec/data';

export const WebToCase = ObjectSchema.create({
  name: 'web_to_case',
  label: 'Web-to-Case Form',
  pluralLabel: 'Web-to-Case Forms',
  icon: 'globe',
  description: 'Web form configuration for customer case submission',

  fields: {
    name: Field.text({
      label: 'Form name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 2000
    }),
    is_active: Field.checkbox({
      label: 'Active',
      defaultValue: true
    }),
    form_url: Field.url({
      label: 'Form URL',
      description: 'Generated URL for this web form',
      readonly: true
    }),
    form_key: Field.text({
      label: 'Form Key',
      description: 'Unique key for form submission API',
      readonly: true,
      maxLength: 100
    }),
    default_queue_id: Field.lookup('Queue', {
      label: 'Default Queue',
      required: true
    }),
    default_owner_id: Field.lookup('users', { label: 'Default Owner' }),
    default_priority: Field.select({
      label: 'Default Priority',
      defaultValue: 'Medium',
      options: [
        {
          "label": "Critical",
          "value": "Critical"
        },
        {
          "label": "High",
          "value": "High"
        },
        {
          "label": "Medium",
          "value": "Medium"
        },
        {
          "label": "Low",
          "value": "Low"
        }
      ]
    }),
    default_case_type: Field.select({
      label: 'Default Case Type',
      defaultValue: 'Question',
      options: [
        {
          "label": "Problem",
          "value": "Problem"
        },
        {
          "label": "Question",
          "value": "Question"
        },
        {
          "label": "Incident",
          "value": "Incident"
        },
        {
          "label": "Feature Request",
          "value": "Feature Request"
        },
        {
          "label": "Training",
          "value": "Training"
        },
        {
          "label": "Maintenance",
          "value": "Maintenance"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    require_contact_info: Field.checkbox({
      label: 'Require Contact Information',
      defaultValue: true
    }),
    require_email: Field.checkbox({
      label: 'Require Email',
      defaultValue: true
    }),
    require_phone: Field.checkbox({
      label: 'Require Phone',
      defaultValue: false
    }),
    require_company: Field.checkbox({
      label: 'Require Company',
      defaultValue: false
    }),
    allow_priority_selection: Field.checkbox({
      label: 'Allow Priority Selection',
      defaultValue: false
    }),
    allow_type_selection: Field.checkbox({
      label: 'Allow Type Selection',
      defaultValue: true
    }),
    custom_fields: Field.textarea({
      label: 'Custom Fields (JSON)',
      description: 'JSON configuration for additional form fields',
      maxLength: 5000
    }),
    allow_attachments: Field.checkbox({
      label: 'Allow Attachments',
      defaultValue: true
    }),
    max_attachment_size: Field.number({
      label: 'Max Attachment Size (MB)',
      defaultValue: 10,
      min: 1,
      max: 50,
      precision: 0
    }),
    max_attachments: Field.number({
      label: 'Max Attachments',
      defaultValue: 5,
      min: 1,
      max: 10,
      precision: 0
    }),
    allowed_file_types: Field.text({
      label: 'Allowed File Types',
      description: 'Comma-separated extensions (e.g., pdf,doc,jpg,png)',
      maxLength: 500
    }),
    send_auto_response: Field.checkbox({
      label: 'Send Auto Response',
      defaultValue: true
    }),
    auto_response_template_id: Field.lookup('EmailTemplate', { label: 'Auto Response Template' }),
    success_message: Field.textarea({
      label: 'Success Message',
      defaultValue: 'Thank you! Your case has been submitted successfully. We will get back to you soon.',
      maxLength: 1000
    }),
    redirect_url: Field.url({
      label: 'Redirect URL',
      description: 'URL to redirect after successful submission'
    }),
    require_captcha: Field.checkbox({
      label: 'Require CAPTCHA',
      description: 'Require CAPTCHA verification to prevent spam',
      defaultValue: true
    }),
    allow_anonymous: Field.checkbox({
      label: 'Allow Anonymous Submissions',
      defaultValue: true
    }),
    require_account_match: Field.checkbox({
      label: 'Require Account Match',
      description: 'Require submitter email to match existing account',
      defaultValue: false
    }),
    allowed_domains: Field.textarea({
      label: 'Allowed Domains',
      description: 'Allowed email domains (one per line, leave empty for all)',
      maxLength: 1000
    }),
    blocked_domains: Field.textarea({
      label: 'Blocked Domains',
      description: 'Blocked email domains (one per line)',
      maxLength: 1000
    }),
    rate_limit_per_hour: Field.number({
      label: 'Rate Limit Per Hour',
      description: 'Maximum submissions per email per hour',
      defaultValue: 10,
      min: 1,
      precision: 0
    }),
    form_title: Field.text({
      label: 'Form Title',
      defaultValue: 'Submit a Support Request',
      maxLength: 255
    }),
    form_subtitle: Field.text({
      label: 'Form Subtitle',
      maxLength: 500
    }),
    logo_url: Field.url({
      label: 'Logo URL',
      description: 'URL to company logo for form header'
    }),
    custom_css: Field.textarea({
      label: 'Custom CSS',
      description: 'Custom CSS for form styling',
      maxLength: 5000
    }),
    auto_create_contact: Field.checkbox({
      label: 'Auto Create Contact',
      description: 'Automatically create contact if not found',
      defaultValue: true
    }),
    default_account_id: Field.lookup('account', {
      label: 'Default Account',
      description: 'Default account for new contacts'
    }),
    use_ai_for_categorization: Field.checkbox({
      label: 'Use AI for Categorization',
      defaultValue: false
    }),
    use_ai_for_priority: Field.checkbox({
      label: 'Use AI for Priority',
      defaultValue: false
    }),
    use_ai_sentiment_analysis: Field.checkbox({
      label: 'Use AI Sentiment Analysis',
      defaultValue: false
    }),
    total_submissions: Field.number({
      label: 'Total Submissions',
      readonly: true,
      precision: 0
    }),
    submissions_today: Field.number({
      label: 'Submissions Today',
      readonly: true,
      precision: 0
    }),
    submissions_this_month: Field.number({
      label: 'Submissions This Month',
      readonly: true,
      precision: 0
    }),
    spam_blocked: Field.number({
      label: 'Spam Blocked',
      readonly: true,
      precision: 0
    }),
    last_submission_date: Field.datetime({
      label: 'Last Submission',
      readonly: true
    }),
    average_rating: Field.number({
      label: 'Average Form Rating',
      description: 'Average user rating of form experience (1-5)',
      readonly: true,
      precision: 2
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true
  },
});