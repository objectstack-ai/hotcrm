
const LandingPage = {
  name: 'landing_page',
  label: '着陆页',
  labelPlural: '着陆页',
  icon: 'layout',
  description: '营销着陆页构建器，支持拖放式设计和A/B测试',
  enable: {
    searchable: true,
    trackHistory: true,
    files: true
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: '着陆页名称',
      required: true,
      maxLength: 255,
      searchable: true
    },
    title: {
      type: 'text',
      label: '页面标题',
      required: true,
      maxLength: 255,
      description: '浏览器标题栏显示的标题'
    },
    slug: {
      type: 'text',
      label: 'URL slug',
      unique: true,
      maxLength: 100,
      description: '页面URL路径，如：/landing/product-launch'
    },
    description: {
      type: 'textarea',
      label: '描述',
      maxLength: 1000
    },
    
    // Page Type & Campaign
    page_type: {
      type: 'select',
      label: '页面类型',
      required: true,
      defaultValue: 'Lead Generation',
      options: [
        { label: '📝 线索收集', value: 'Lead Generation' },
        { label: '🎯 活动注册', value: 'Event Registration' },
        { label: '📥 资源下载', value: 'Resource Download' },
        { label: '🛒 产品展示', value: 'Product Showcase' },
        { label: '📺 网络研讨会', value: 'Webinar' },
        { label: '🎁 优惠促销', value: 'Promotion' }
      ]
    },
    campaign_id: {
      type: 'lookup',
      label: '关联营销活动',
      reference: 'Campaign',
      description: '此着陆页所属的营销活动'
    },
    
    // Content & Design
    html_content: {
      type: 'textarea',
      label: 'HTML 内容',
      maxLength: 65535,
      description: '页面的完整 HTML 内容'
    },
    design_json: {
      type: 'textarea',
      label: '设计配置 JSON',
      maxLength: 65535,
      description: '可视化编辑器的设计配置（组件、样式等）'
    },
    custom_css: {
      type: 'textarea',
      label: '自定义 CSS',
      maxLength: 32000,
      description: '自定义样式代码'
    },
    custom_javascript: {
      type: 'textarea',
      label: '自定义 JavaScript',
      maxLength: 32000,
      description: '自定义脚本代码（追踪、互动等）'
    },
    
    // SEO & Meta
    meta_title: {
      type: 'text',
      label: 'SEO 标题',
      maxLength: 70,
      description: '搜索引擎结果显示的标题'
    },
    meta_description: {
      type: 'textarea',
      label: 'SEO 描述',
      maxLength: 160,
      description: '搜索引擎结果显示的描述'
    },
    meta_keywords: {
      type: 'text',
      label: 'SEO 关键词',
      maxLength: 255,
      description: '逗号分隔的关键词'
    },
    og_image: {
      type: 'url',
      label: 'Open Graph 图片',
      description: '社交媒体分享时显示的图片URL'
    },
    
    // Form Integration
    form_id: {
      type: 'lookup',
      label: '内嵌表单',
      reference: 'Form',
      description: '页面中集成的表单'
    },
    thank_you_message: {
      type: 'textarea',
      label: '感谢消息',
      maxLength: 2000,
      description: '表单提交后显示的消息'
    },
    redirect_url: {
      type: 'url',
      label: '提交后重定向URL',
      description: '表单提交后跳转的页面（可选）'
    },
    
    // status & Publishing
    status: {
      type: 'select',
      label: '状态',
      required: true,
      defaultValue: 'Draft',
      options: [
        { label: '📝 草稿', value: 'Draft' },
        { label: '✅ 已发布', value: 'Published' },
        { label: '📦 已归档', value: 'Archived' }
      ]
    },
    is_active: {
      type: 'checkbox',
      label: '是否启用',
      defaultValue: true
    },
    published_date: {
      type: 'datetime',
      label: '发布时间',
      readonly: true
    },
    expiry_date: {
      type: 'datetime',
      label: '过期时间',
      description: '页面自动下线时间（可选）'
    },
    owner_id: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    
    // A/B Testing
    is_a_b_test: {
      type: 'checkbox',
      label: '启用 A/B 测试',
      defaultValue: false
    },
    a_b_test_variant_id: {
      type: 'lookup',
      label: 'A/B 测试变体',
      reference: 'LandingPage',
      description: '关联的测试变体页面'
    },
    traffic_split_percent: {
      type: 'percent',
      label: '流量分配比例',
      description: 'A/B测试时此版本的流量占比'
    },
    
    // Analytics & Performance
    total_views: {
      type: 'number',
      label: '总访问量',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    unique_visitors: {
      type: 'number',
      label: '独立访客数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    total_submissions: {
      type: 'number',
      label: '表单提交次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    conversion_rate: {
      type: 'percent',
      label: '转化率',
      readonly: true,
      description: '自动计算：提交次数 / 独立访客数'
    },
    average_time_on_page: {
      type: 'number',
      label: '平均停留时间(秒)',
      precision: 0,
      readonly: true
    },
    bounce_rate: {
      type: 'percent',
      label: '跳出率',
      readonly: true,
      description: '访问后立即离开的访客比例'
    },
    
    // Traffic Sources
    source_utm_campaign: {
      type: 'text',
      label: 'UTM Campaign',
      maxLength: 100,
      description: '跟踪参数：utm_campaign'
    },
    source_utm_medium: {
      type: 'text',
      label: 'UTM Medium',
      maxLength: 100,
      description: '跟踪参数：utm_medium'
    },
    source_utm_source: {
      type: 'text',
      label: 'UTM Source',
      maxLength: 100,
      description: '跟踪参数：utm_source'
    },
    
    // Mobile Optimization
    is_mobile_optimized: {
      type: 'checkbox',
      label: '移动端优化',
      defaultValue: true,
      description: '是否针对移动设备优化'
    },
    mobile_conversion_rate: {
      type: 'percent',
      label: '移动端转化率',
      readonly: true
    },
    desktop_conversion_rate: {
      type: 'percent',
      label: '桌面端转化率',
      readonly: true
    },
    
    // Loading Performance
    page_load_time: {
      type: 'number',
      label: '页面加载时间(ms)',
      precision: 0,
      readonly: true,
      description: '平均加载时间（毫秒）'
    },
    page_size_kb: {
      type: 'number',
      label: '页面大小(KB)',
      precision: 2,
      readonly: true
    },
    
    // AI Enhancement
    a_i_design_suggestions: {
      type: 'textarea',
      label: 'AI 设计建议',
      readonly: true,
      maxLength: 2000,
      description: 'AI 分析的设计和布局优化建议'
    },
    a_i_copywriting_suggestions: {
      type: 'textarea',
      label: 'AI 文案建议',
      readonly: true,
      maxLength: 2000,
      description: 'AI 生成的标题、CTA等文案优化建议'
    }
  },
  relationships: [
    {
      name: 'Campaign',
      type: 'belongsTo',
      object: 'Campaign',
      foreignKey: 'campaign_id',
      label: '营销活动'
    },
    {
      name: 'Form',
      type: 'belongsTo',
      object: 'Form',
      foreignKey: 'form_id',
      label: '表单'
    },
    {
      name: 'Owner',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'owner_id',
      label: '负责人'
    },
    {
      name: 'ABTestVariant',
      type: 'belongsTo',
      object: 'LandingPage',
      foreignKey: 'a_b_test_variant_id',
      label: 'A/B测试变体'
    }
  ],
  listViews: [
    {
      name: 'AllPages',
      label: '所有着陆页',
      filters: [],
      columns: ['name', 'page_type', 'status', 'total_views', 'conversion_rate', 'published_date'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActivePages',
      label: '启用的着陆页',
      filters: [['is_active', '=', true], ['status', '=', 'Published']],
      columns: ['name', 'page_type', 'total_views', 'unique_visitors', 'conversion_rate', 'campaign_id'],
      sort: [['total_views', 'desc']]
    },
    {
      name: 'MyPages',
      label: '我的着陆页',
      filters: [['owner_id', '=', '$CurrentUser.Id']],
      columns: ['name', 'status', 'total_views', 'conversion_rate', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'HighConversion',
      label: '高转化页面',
      filters: [['conversion_rate', '>', 10], ['total_views', '>', 100]],
      columns: ['name', 'page_type', 'conversion_rate', 'total_submissions', 'total_views'],
      sort: [['conversion_rate', 'desc']]
    },
    {
      name: 'ABTests',
      label: 'A/B 测试',
      filters: [['is_a_b_test', '=', true]],
      columns: ['name', 'a_b_test_variant_id', 'traffic_split_percent', 'conversion_rate', 'total_views'],
      sort: [['CreatedDate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireSlugForPublished',
      errorMessage: '发布的着陆页必须设置 URL slug',
      formula: 'AND(status = "Published", ISBLANK(slug))'
    },
    {
      name: 'RequireContentOrDesign',
      errorMessage: '着陆页必须有 HTML 内容或设计配置',
      formula: 'AND(ISBLANK(html_content), ISBLANK(design_json))'
    },
    {
      name: 'ExpiryDateAfterPublished',
      errorMessage: '过期时间必须晚于发布时间',
      formula: 'AND(NOT(ISBLANK(published_date)), NOT(ISBLANK(expiry_date)), expiry_date < published_date)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '页面信息',
        columns: 2,
        fields: ['name', 'title', 'slug', 'page_type', 'status', 'is_active', 'owner_id', 'campaign_id']
      },
      {
        label: '内容与设计',
        columns: 1,
        fields: ['html_content', 'custom_css', 'custom_javascript']
      },
      {
        label: 'SEO 优化',
        columns: 2,
        fields: ['meta_title', 'meta_description', 'meta_keywords', 'og_image']
      },
      {
        label: '表单集成',
        columns: 2,
        fields: ['form_id', 'thank_you_message', 'redirect_url']
      },
      {
        label: '发布设置',
        columns: 2,
        fields: ['published_date', 'expiry_date']
      },
      {
        label: 'A/B 测试',
        columns: 2,
        fields: ['is_a_b_test', 'a_b_test_variant_id', 'traffic_split_percent']
      },
      {
        label: '访问统计',
        columns: 3,
        fields: ['total_views', 'unique_visitors', 'total_submissions', 'conversion_rate', 'average_time_on_page', 'bounce_rate']
      },
      {
        label: '流量来源',
        columns: 3,
        fields: ['source_utm_campaign', 'source_utm_medium', 'source_utm_source']
      },
      {
        label: '移动端优化',
        columns: 2,
        fields: ['is_mobile_optimized', 'mobile_conversion_rate', 'desktop_conversion_rate']
      },
      {
        label: '性能指标',
        columns: 2,
        fields: ['page_load_time', 'page_size_kb']
      },
      {
        label: 'AI 优化助手',
        columns: 1,
        fields: ['a_i_design_suggestions', 'a_i_copywriting_suggestions']
      },
      {
        label: '描述',
        columns: 1,
        fields: ['description']
      }
    ]
  }
};

export default LandingPage;
