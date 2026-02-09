import { ObjectSchema, Field } from '@objectstack/spec/data';

export const LandingPage = ObjectSchema.create({
  name: 'landing_page',
  label: 'Landing Page',
  pluralLabel: 'Landing Pages',
  icon: 'layout',
  description: 'Marketing landing page builder with drag-and-drop design and A/B testing',

  fields: {
    name: Field.text({
      label: 'Landing Page Name',
      required: true,
      maxLength: 255
    }),
    title: Field.text({
      label: 'Page Title',
      description: 'Title displayed in the browser title bar',
      required: true,
      maxLength: 255
    }),
    slug: Field.text({
      label: 'URL slug',
      description: 'Page URL path, e.g. /landing/product-launch',
      unique: true,
      maxLength: 100
    }),
    description: Field.textarea({
      label: 'Description',
      maxLength: 1000
    }),
    page_type: Field.select({
      label: 'Page Type',
      required: true,
      defaultValue: 'Lead Generation',
      options: [
        {
          "label": "📝 Lead Generation",
          "value": "Lead Generation"
        },
        {
          "label": "🎯 Event Registration",
          "value": "Event Registration"
        },
        {
          "label": "📥 Resource Download",
          "value": "Resource Download"
        },
        {
          "label": "🛒 Product Showcase",
          "value": "Product Showcase"
        },
        {
          "label": "📺 Webinar",
          "value": "Webinar"
        },
        {
          "label": "🎁 Promotion",
          "value": "Promotion"
        }
      ]
    }),
    campaign_id: Field.lookup('campaign', {
      label: 'Associated Campaign',
      description: 'Campaign this landing page belongs to'
    }),
    html_content: Field.textarea({
      label: 'HTML Content',
      description: 'Full HTML content of the page',
      maxLength: 65535
    }),
    design_json: Field.textarea({
      label: 'Design Configuration JSON',
      description: 'Design configuration for the visual editor (components, styles, etc.)',
      maxLength: 65535
    }),
    custom_css: Field.textarea({
      label: 'Custom CSS',
      description: 'Custom style code',
      maxLength: 32000
    }),
    custom_javascript: Field.textarea({
      label: 'Custom JavaScript',
      description: 'Custom script code (tracking, interaction, etc.)',
      maxLength: 32000
    }),
    meta_title: Field.text({
      label: 'SEO Title',
      description: 'Title displayed in search engine results',
      maxLength: 70
    }),
    meta_description: Field.textarea({
      label: 'SEO Description',
      description: 'Description displayed in search engine results',
      maxLength: 160
    }),
    meta_keywords: Field.text({
      label: 'SEO Keywords',
      description: 'Comma-separated keywords',
      maxLength: 255
    }),
    og_image: Field.url({
      label: 'Open Graph Image',
      description: 'Image URL displayed when shared on social media'
    }),
    form_id: Field.lookup('form', {
      label: 'Embedded Form',
      description: 'Form embedded in the page'
    }),
    thank_you_message: Field.textarea({
      label: 'Thank You Message',
      description: 'Message displayed after form submission',
      maxLength: 2000
    }),
    redirect_url: Field.url({
      label: 'Redirect URL',
      description: 'Page to redirect to after form submission (optional)'
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
    expiry_date: Field.datetime({
      label: 'Expiry Date',
      description: 'Automatic page expiry time (optional)'
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true
    }),
    is_a_b_test: Field.boolean({
      label: 'Enable A/B Test',
      defaultValue: false
    }),
    a_b_test_variant_id: Field.lookup('landing_page', {
      label: 'A/B Test Variant',
      description: 'Associated A/B test variant page'
    }),
    traffic_split_percent: Field.percent({
      label: 'Traffic Split Percent',
      description: 'Traffic split percentage for this version during A/B testing'
    }),
    total_views: Field.number({
      label: 'Total Views',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    unique_visitors: Field.number({
      label: 'Unique Visitors',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    total_submissions: Field.number({
      label: 'Total Submissions',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    conversion_rate: Field.percent({
      label: 'Conversion Rate',
      description: 'Auto-calculated: submissions / unique visitors',
      readonly: true
    }),
    average_time_on_page: Field.number({
      label: 'Average Time on Page (sec)',
      readonly: true,
      precision: 0
    }),
    bounce_rate: Field.percent({
      label: 'Bounce Rate',
      description: 'Percentage of visitors who leave immediately after landing',
      readonly: true
    }),
    source_utm_campaign: Field.text({
      label: 'UTM Campaign',
      description: 'Tracking parameter: utm_campaign',
      maxLength: 100
    }),
    source_utm_medium: Field.text({
      label: 'UTM Medium',
      description: 'Tracking parameter: utm_medium',
      maxLength: 100
    }),
    source_utm_source: Field.text({
      label: 'UTM Source',
      description: 'Tracking parameter: utm_source',
      maxLength: 100
    }),
    is_mobile_optimized: Field.boolean({
      label: 'Mobile Optimized',
      description: 'Whether the page is optimized for mobile devices',
      defaultValue: true
    }),
    mobile_conversion_rate: Field.percent({
      label: 'Mobile Conversion Rate',
      readonly: true
    }),
    desktop_conversion_rate: Field.percent({
      label: 'Desktop Conversion Rate',
      readonly: true
    }),
    page_load_time: Field.number({
      label: 'Page Load Time (ms)',
      description: 'Average load time (milliseconds)',
      readonly: true,
      precision: 0
    }),
    page_size_kb: Field.number({
      label: 'Page Size (KB)',
      readonly: true,
      precision: 2
    }),
    ai_design_suggestions: Field.textarea({
      label: 'AI Design Suggestions',
      description: 'AI-analyzed design and layout optimization suggestions',
      readonly: true,
      maxLength: 2000
    }),
    ai_copywriting_suggestions: Field.textarea({
      label: 'AI Copywriting Suggestions',
      description: 'AI-generated copywriting suggestions for headlines, CTAs, etc.',
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