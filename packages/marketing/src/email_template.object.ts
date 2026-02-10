import { ObjectSchema, Field } from '@objectstack/spec/data';

export const EmailTemplate = ObjectSchema.create({
  name: 'email_template',
  label: 'Email Template',
  pluralLabel: 'Email Templates',
  icon: 'mail',
  description: 'Marketing email template library with personalization tokens and dynamic content blocks',

  fields: {
    name: Field.text({
      label: 'Template Name',
      description: 'Unique name for the email template',
      required: true,
      maxLength: 255
    }),
    template_code: Field.text({
      label: 'Template Code',
      description: 'Unique template identifier for API calls',
      unique: true,
      maxLength: 80
    }),
    description: Field.textarea({
      label: 'Description',
      description: 'Template purpose and usage description',
      maxLength: 1000
    }),
    template_type: Field.select({
      label: 'Template Type',
      required: true,
      defaultValue: 'marketing',
      options: [
        {
          "label": "📢 Marketing Email",
          "value": "marketing"
        },
        {
          "label": "📧 Transactional Email",
          "value": "transactional"
        },
        {
          "label": "🔔 Notification Email",
          "value": "notification"
        },
        {
          "label": "👋 Welcome Series",
          "value": "welcome"
        },
        {
          "label": "🛒 Cart Abandonment",
          "value": "cart_abandonment"
        },
        {
          "label": "🎁 Post Purchase",
          "value": "post_purchase"
        },
        {
          "label": "🔄 Re-engagement",
          "value": "re_engagement"
        }
      ]
    }),
    category: Field.select({
      label: 'Category',
      options: [
        {
          "label": "Product Launch",
          "value": "product_launch"
        },
        {
          "label": "Event Invitation",
          "value": "event_invitation"
        },
        {
          "label": "Newsletter",
          "value": "newsletter"
        },
        {
          "label": "Promotion",
          "value": "promotion"
        },
        {
          "label": "Customer Care",
          "value": "customer_care"
        },
        {
          "label": "Educational",
          "value": "educational"
        }
      ]
    }),
    subject: Field.text({
      label: 'Email Subject',
      description: 'Supports personalization tokens such as {{FirstName}}',
      required: true,
      maxLength: 255
    }),
    preheader_text: Field.text({
      label: 'Preview Text',
      description: 'Preview text displayed in email clients',
      maxLength: 150
    }),
    html_body: Field.textarea({
      label: 'HTML Content',
      description: 'HTML content of the email with support for tokens and dynamic content blocks',
      required: true,
      maxLength: 65535
    }),
    plain_text_body: Field.textarea({
      label: 'Plain Text Content',
      description: 'Plain text version for email clients that do not support HTML',
      maxLength: 32000
    }),
    personalization_tokens: Field.textarea({
      label: 'Personalization Tokens',
      description: 'List of all tokens used in the template (auto-extracted)',
      readonly: true,
      maxLength: 2000
    }),
    dynamic_content_blocks: Field.number({
      label: 'Dynamic Content Block Count',
      description: 'Number of dynamic content blocks displayed based on conditions',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    design_system: Field.select({
      label: 'Design System',
      defaultValue: 'custom',
      options: [
        {
          "label": "Custom HTML",
          "value": "custom"
        },
        {
          "label": "Visual Builder",
          "value": "visual_builder"
        },
        {
          "label": "Preset Template",
          "value": "preset"
        }
      ]
    }),
    design_json: Field.textarea({
      label: 'Design Configuration JSON',
      description: 'Design configuration for the visual editor (JSON format)',
      maxLength: 65535
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      defaultValue: 'draft',
      options: [
        {
          "label": "📝 Draft",
          "value": "draft"
        },
        {
          "label": "✅ Published",
          "value": "published"
        },
        {
          "label": "📦 Archived",
          "value": "archived"
        }
      ]
    }),
    is_active: Field.boolean({
      label: 'Is Active',
      description: 'Only active templates can be used for sending',
      defaultValue: true
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true
    }),
    is_a_b_test: Field.boolean({
      label: 'Enable A/B Test',
      defaultValue: false
    }),
    a_b_test_variant_id: Field.lookup('email_template', {
      label: 'A/B Test Variant',
      description: 'Associated A/B test variant template'
    }),
    a_b_test_winner_metric: Field.select({
      label: 'A/B Test Winning Metric',
      options: [
        {
          "label": "Open Rate",
          "value": "openrate"
        },
        {
          "label": "Click Rate",
          "value": "clickrate"
        },
        {
          "label": "Conversion Rate",
          "value": "conversionrate"
        }
      ]
    }),
    total_sent: Field.number({
      label: 'Total Sent',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    total_opened: Field.number({
      label: 'Total Opened',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    total_clicked: Field.number({
      label: 'Total Clicked',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    average_open_rate: Field.percent({
      label: 'Average Open Rate',
      description: 'Auto-calculated: total opens / total sends',
      readonly: true
    }),
    average_click_rate: Field.percent({
      label: 'Average Click Rate',
      description: 'Auto-calculated: total clicks / total opens',
      readonly: true
    }),
    last_used_date: Field.datetime({
      label: 'Last Used Date',
      readonly: true
    }),
    spam_score: Field.number({
      label: 'Spam Score',
      description: 'Score from 0-10, lower is better',
      readonly: true,
      precision: 1
    }),
    has_unsubscribe_link: Field.boolean({
      label: 'Has Unsubscribe Link',
      description: 'Auto-detects whether the content contains an unsubscribe link',
      defaultValue: false,
      readonly: true
    }),
    ai_generated_subject_lines: Field.textarea({
      label: 'AI Generated Subject Lines',
      description: 'AI-recommended alternative subject line options',
      readonly: true,
      maxLength: 2000
    }),
    ai_optimization_suggestions: Field.textarea({
      label: 'AI Optimization Suggestions',
      description: 'AI-analyzed improvement suggestions (content, design, send time, etc.)',
      readonly: true,
      maxLength: 2000
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    files: true
  },
});