import { ObjectSchema, Field } from '@objectstack/spec/data';

export const LandingPage = ObjectSchema.create({
  name: 'landing_page',
  label: 'Landing Page',
  pluralLabel: 'Landing Pages',
  icon: 'layout',
  description: '营销着陆页构建器，支持拖放式设计和A/B测试',

  fields: {
    name: Field.text({
      label: 'Landing Page Name',
      required: true,
      maxLength: 255
    }),
    title: Field.text({
      label: 'Page Title',
      description: '浏览器标题栏显示的标题',
      required: true,
      maxLength: 255
    }),
    slug: Field.text({
      label: 'URL slug',
      description: '页面URL路径，如：/landing/product-launch',
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
      description: '此着陆页所属的营销活动'
    }),
    html_content: Field.textarea({
      label: 'HTML Content',
      description: '页面的完整 HTML 内容',
      maxLength: 65535
    }),
    design_json: Field.textarea({
      label: 'Design Configuration JSON',
      description: '可视化编辑器的设计配置（组件、样式等）',
      maxLength: 65535
    }),
    custom_css: Field.textarea({
      label: 'Custom CSS',
      description: '自定义样式代码',
      maxLength: 32000
    }),
    custom_javascript: Field.textarea({
      label: 'Custom JavaScript',
      description: '自定义脚本代码（追踪、互动等）',
      maxLength: 32000
    }),
    meta_title: Field.text({
      label: 'SEO Title',
      description: '搜索引擎结果显示的标题',
      maxLength: 70
    }),
    meta_description: Field.textarea({
      label: 'SEO Description',
      description: '搜索引擎结果显示的描述',
      maxLength: 160
    }),
    meta_keywords: Field.text({
      label: 'SEO Keywords',
      description: '逗号分隔的关键词',
      maxLength: 255
    }),
    og_image: Field.url({
      label: 'Open Graph Image',
      description: '社交媒体分享时显示的图片URL'
    }),
    form_id: Field.lookup('form', {
      label: 'Embedded Form',
      description: '页面中集成的表单'
    }),
    thank_you_message: Field.textarea({
      label: 'Thank You Message',
      description: '表单提交后显示的消息',
      maxLength: 2000
    }),
    redirect_url: Field.url({
      label: 'Redirect URL',
      description: '表单提交后跳转的页面（可选）'
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
      description: '页面自动下线时间（可选）'
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
      description: '关联的测试变体页面'
    }),
    traffic_split_percent: Field.percent({
      label: 'Traffic Split Percent',
      description: 'A/B测试时此版本的流量占比'
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
      description: '自动计算：提交次数 / 独立访客数',
      readonly: true
    }),
    average_time_on_page: Field.number({
      label: 'Average Time on Page (sec)',
      readonly: true,
      precision: 0
    }),
    bounce_rate: Field.percent({
      label: 'Bounce Rate',
      description: '访问后立即离开的访客比例',
      readonly: true
    }),
    source_utm_campaign: Field.text({
      label: 'UTM Campaign',
      description: '跟踪参数：utm_campaign',
      maxLength: 100
    }),
    source_utm_medium: Field.text({
      label: 'UTM Medium',
      description: '跟踪参数：utm_medium',
      maxLength: 100
    }),
    source_utm_source: Field.text({
      label: 'UTM Source',
      description: '跟踪参数：utm_source',
      maxLength: 100
    }),
    is_mobile_optimized: Field.boolean({
      label: 'Mobile Optimized',
      description: '是否针对移动设备优化',
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
      description: '平均加载时间（毫秒）',
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
      description: 'AI 分析的设计和布局优化建议',
      readonly: true,
      maxLength: 2000
    }),
    ai_copywriting_suggestions: Field.textarea({
      label: 'AI Copywriting Suggestions',
      description: 'AI 生成的标题、CTA等文案优化建议',
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