import { ObjectSchema, Field } from '@objectstack/spec/data';

export const LandingPage = ObjectSchema.create({
  name: 'landing_page',
  label: '着陆页',
  pluralLabel: '着陆页',
  icon: 'layout',
  description: '营销着陆页构建器，支持拖放式设计和A/B测试',

  fields: {
    name: Field.text({
      label: '着陆页名称',
      required: true,
      maxLength: 255
    }),
    title: Field.text({
      label: '页面标题',
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
      label: '描述',
      maxLength: 1000
    }),
    page_type: Field.select({
      label: '页面类型',
      required: true,
      defaultValue: 'Lead Generation',
      options: [
        {
          "label": "📝 线索收集",
          "value": "Lead Generation"
        },
        {
          "label": "🎯 活动注册",
          "value": "Event Registration"
        },
        {
          "label": "📥 资源下载",
          "value": "Resource Download"
        },
        {
          "label": "🛒 产品展示",
          "value": "Product Showcase"
        },
        {
          "label": "📺 网络研讨会",
          "value": "Webinar"
        },
        {
          "label": "🎁 优惠促销",
          "value": "Promotion"
        }
      ]
    }),
    campaign_id: Field.lookup('campaign', {
      label: '关联营销活动',
      description: '此着陆页所属的营销活动'
    }),
    html_content: Field.textarea({
      label: 'HTML 内容',
      description: '页面的完整 HTML 内容',
      maxLength: 65535
    }),
    design_json: Field.textarea({
      label: '设计配置 JSON',
      description: '可视化编辑器的设计配置（组件、样式等）',
      maxLength: 65535
    }),
    custom_css: Field.textarea({
      label: '自定义 CSS',
      description: '自定义样式代码',
      maxLength: 32000
    }),
    custom_javascript: Field.textarea({
      label: '自定义 JavaScript',
      description: '自定义脚本代码（追踪、互动等）',
      maxLength: 32000
    }),
    meta_title: Field.text({
      label: 'SEO 标题',
      description: '搜索引擎结果显示的标题',
      maxLength: 70
    }),
    meta_description: Field.textarea({
      label: 'SEO 描述',
      description: '搜索引擎结果显示的描述',
      maxLength: 160
    }),
    meta_keywords: Field.text({
      label: 'SEO 关键词',
      description: '逗号分隔的关键词',
      maxLength: 255
    }),
    og_image: Field.url({
      label: 'Open Graph 图片',
      description: '社交媒体分享时显示的图片URL'
    }),
    form_id: Field.lookup('form', {
      label: '内嵌表单',
      description: '页面中集成的表单'
    }),
    thank_you_message: Field.textarea({
      label: '感谢消息',
      description: '表单提交后显示的消息',
      maxLength: 2000
    }),
    redirect_url: Field.url({
      label: '提交后重定向URL',
      description: '表单提交后跳转的页面（可选）'
    }),
    status: Field.select({
      label: '状态',
      required: true,
      defaultValue: 'Draft',
      options: [
        {
          "label": "📝 草稿",
          "value": "Draft"
        },
        {
          "label": "✅ 已发布",
          "value": "Published"
        },
        {
          "label": "📦 已归档",
          "value": "Archived"
        }
      ]
    }),
    is_active: Field.boolean({
      label: '是否启用',
      defaultValue: true
    }),
    published_date: Field.datetime({
      label: '发布时间',
      readonly: true
    }),
    expiry_date: Field.datetime({
      label: '过期时间',
      description: '页面自动下线时间（可选）'
    }),
    owner_id: Field.lookup('users', {
      label: '负责人',
      required: true
    }),
    is_a_b_test: Field.boolean({
      label: '启用 A/B 测试',
      defaultValue: false
    }),
    a_b_test_variant_id: Field.lookup('landing_page', {
      label: 'A/B 测试变体',
      description: '关联的测试变体页面'
    }),
    traffic_split_percent: Field.percent({
      label: '流量分配比例',
      description: 'A/B测试时此版本的流量占比'
    }),
    total_views: Field.number({
      label: '总访问量',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    unique_visitors: Field.number({
      label: '独立访客数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    total_submissions: Field.number({
      label: '表单提交次数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    conversion_rate: Field.percent({
      label: '转化率',
      description: '自动计算：提交次数 / 独立访客数',
      readonly: true
    }),
    average_time_on_page: Field.number({
      label: '平均停留时间(秒)',
      readonly: true,
      precision: 0
    }),
    bounce_rate: Field.percent({
      label: '跳出率',
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
      label: '移动端优化',
      description: '是否针对移动设备优化',
      defaultValue: true
    }),
    mobile_conversion_rate: Field.percent({
      label: '移动端转化率',
      readonly: true
    }),
    desktop_conversion_rate: Field.percent({
      label: '桌面端转化率',
      readonly: true
    }),
    page_load_time: Field.number({
      label: '页面加载时间(ms)',
      description: '平均加载时间（毫秒）',
      readonly: true,
      precision: 0
    }),
    page_size_kb: Field.number({
      label: '页面大小(KB)',
      readonly: true,
      precision: 2
    }),
    ai_design_suggestions: Field.textarea({
      label: 'AI 设计建议',
      description: 'AI 分析的设计和布局优化建议',
      readonly: true,
      maxLength: 2000
    }),
    ai_copywriting_suggestions: Field.textarea({
      label: 'AI 文案建议',
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