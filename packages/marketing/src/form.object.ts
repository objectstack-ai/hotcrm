import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Form = ObjectSchema.create({
  name: 'form',
  label: 'Form',
  pluralLabel: 'Forms',
  icon: 'file-text',
  description: 'Marketing form builder with drag-and-drop design and automatic lead creation',

  fields: {
    name: Field.text({
      label: 'Form Name',
      required: true,
      maxLength: 255
    }),
    form_code: Field.text({
      label: 'Form Code',
      description: 'Unique identifier for embedding and API calls',
      unique: true,
      maxLength: 80
    }),
    description: Field.textarea({
      label: 'Description',
      maxLength: 1000
    }),
    form_type: Field.select({
      label: 'Form Type',
      required: true,
      defaultValue: 'Lead Capture',
      options: [
        {
          "label": "📝 Lead Capture",
          "value": "Lead Capture"
        },
        {
          "label": "📅 Event Registration",
          "value": "Event Registration"
        },
        {
          "label": "🎁 Resource Download",
          "value": "Resource Download"
        },
        {
          "label": "📞 Contact Us",
          "value": "Contact Us"
        },
        {
          "label": "💬 Feedback Survey",
          "value": "Feedback Survey"
        },
        {
          "label": "🎯 Needs Assessment",
          "value": "Needs Assessment"
        },
        {
          "label": "📺 Webinar Registration",
          "value": "Webinar Registration"
        }
      ]
    }),
    campaign_id: Field.lookup('campaign', {
      label: 'Associated Campaign',
      description: 'Leads collected through this form will be associated with this campaign'
    }),
    fields_json: Field.textarea({
      label: 'Fields Configuration JSON',
      description: 'Form field definitions (type, label, validation rules, etc.)',
      required: true,
      maxLength: 65535
    }),
    layout_json: Field.textarea({
      label: 'Layout Configuration JSON',
      description: 'Field layout and style configuration',
      maxLength: 32000
    }),
    validation_rules_json: Field.textarea({
      label: 'Validation Rules JSON',
      description: 'Custom field validation rules',
      maxLength: 32000
    }),
    submit_button_text: Field.text({
      label: 'Submit Button Text',
      defaultValue: 'Submit',
      maxLength: 50
    }),
    submit_success_message: Field.textarea({
      label: 'Success Message',
      description: 'Message displayed after successful form submission',
      maxLength: 1000
    }),
    redirect_url: Field.url({
      label: 'Redirect URL',
      description: 'Page to redirect to after successful form submission (optional)'
    }),
    create_lead_on_submit: Field.boolean({
      label: 'Auto Create Lead',
      description: 'Automatically create a lead record on form submission',
      defaultValue: true
    }),
    lead_source: Field.text({
      label: 'Lead Source',
      description: 'Lead source value set when auto-creating leads',
      maxLength: 100
    }),
    auto_assign_leads: Field.boolean({
      label: 'Auto Assign Leads',
      description: 'Automatically assign new leads based on assignment rules',
      defaultValue: false
    }),
    default_owner_id: Field.lookup('users', {
      label: 'Default Owner',
      description: 'Default owner for new leads (if not auto-assigned)'
    }),
    send_confirmation_email: Field.boolean({
      label: 'Send Confirmation Email',
      description: 'Send confirmation email to submitter',
      defaultValue: false
    }),
    confirmation_email_template_id: Field.lookup('email_template', {
      label: 'Confirmation Email Template',
      description: 'Confirmation email template to use'
    }),
    notify_owner_on_submit: Field.boolean({
      label: 'Notify Owner on Submit',
      description: 'Notify lead owner on form submission',
      defaultValue: true
    }),
    notification_email_list: Field.text({
      label: 'Notification Email List',
      description: 'Comma-separated email addresses to receive form submission notifications',
      maxLength: 500
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      defaultValue: 'Draft',
      options: [
        {
          "label": "📝 Draft",
          "value": "Draft"
        },
        {
          "label": "✅ Published",
          "value": "Published"
        },
        {
          "label": "📦 Archived",
          "value": "Archived"
        }
      ]
    }),
    is_active: Field.boolean({
      label: 'Is Active',
      defaultValue: true
    }),
    published_date: Field.datetime({
      label: 'Published Date',
      readonly: true
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true
    }),
    embed_code: Field.textarea({
      label: 'Embed Code',
      description: 'HTML/JavaScript code for embedding on websites',
      readonly: true,
      maxLength: 2000
    }),
    allowed_domains: Field.text({
      label: 'Allowed Domains',
      description: 'List of domains allowed to embed this form (comma-separated)',
      maxLength: 500
    }),
    total_submissions: Field.number({
      label: 'Total Submissions',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    total_views: Field.number({
      label: 'Total Views',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    conversion_rate: Field.percent({
      label: 'Conversion Rate',
      description: 'Auto-calculated: submissions / views',
      readonly: true
    }),
    average_completion_time: Field.number({
      label: 'Average Completion Time (sec)',
      description: 'Average time for users to complete the form',
      readonly: true,
      precision: 0
    }),
    abandonment_rate: Field.percent({
      label: 'Abandonment Rate',
      description: 'Percentage of users who started but did not submit',
      readonly: true
    }),
    last_submission_date: Field.datetime({
      label: 'Last Submission Date',
      readonly: true
    }),
    enable_captcha: Field.boolean({
      label: 'Enable Captcha',
      description: 'Prevent spam submissions',
      defaultValue: true
    }),
    enable_honeypot: Field.boolean({
      label: 'Enable Honeypot Field',
      description: 'Hidden field to prevent bot submissions',
      defaultValue: true
    }),
    spam_submissions_blocked: Field.number({
      label: 'Spam Submissions Blocked',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    enable_progressive_profiling: Field.boolean({
      label: 'Enable Progressive Profiling',
      description: 'Hide fields with existing data for known contacts',
      defaultValue: false
    }),
    max_fields_to_show: Field.number({
      label: 'Max Fields to Show',
      description: 'Maximum number of new fields shown per progressive form visit',
      precision: 0
    }),
    most_abandoned_field: Field.text({
      label: 'Most Abandoned Field',
      description: 'Field where users most frequently abandon the form',
      readonly: true,
      maxLength: 100
    }),
    field_completion_rates_json: Field.textarea({
      label: 'Field Completion Rates JSON',
      description: 'Completion rate statistics for each field',
      readonly: true,
      maxLength: 10000
    }),
    ai_form_optimization: Field.textarea({
      label: 'AI Form Optimization Suggestions',
      description: 'AI-analyzed form optimization suggestions (field order, label text, etc.)',
      readonly: true,
      maxLength: 2000
    }),
    ai_field_suggestions: Field.textarea({
      label: 'AI Field Suggestions',
      description: 'AI-recommended fields to add or remove',
      readonly: true,
      maxLength: 2000
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
});