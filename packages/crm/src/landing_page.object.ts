import type { ObjectSchema } from '@objectstack/spec/data';

const LandingPage: ObjectSchema = {
  name: 'landing_page',
  label: '着陆页',
  labelPlural: '着陆页',
  icon: 'layout',
  description: '营销着陆页构建器，支持拖放式设计和A/B测试',
  enable: {
    searchEnabled: true,
    trackHistory: true,
    filesEnabled: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: '着陆页名称',
      required: true,
      maxLength: 255,
      searchEnabled: true
    },
    Title: {
      type: 'text',
      label: '页面标题',
      required: true,
      maxLength: 255,
      description: '浏览器标题栏显示的标题'
    },
    Slug: {
      type: 'text',
      label: 'URL Slug',
      unique: true,
      maxLength: 100,
      description: '页面URL路径，如：/landing/product-launch'
    },
    Description: {
      type: 'textarea',
      label: '描述',
      maxLength: 1000
    },
    
    // Page Type & Campaign
    PageType: {
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
    CampaignId: {
      type: 'lookup',
      label: '关联营销活动',
      reference: 'Campaign',
      description: '此着陆页所属的营销活动'
    },
    
    // Content & Design
    HtmlContent: {
      type: 'textarea',
      label: 'HTML 内容',
      maxLength: 65535,
      description: '页面的完整 HTML 内容'
    },
    DesignJson: {
      type: 'textarea',
      label: '设计配置 JSON',
      maxLength: 65535,
      description: '可视化编辑器的设计配置（组件、样式等）'
    },
    CustomCss: {
      type: 'textarea',
      label: '自定义 CSS',
      maxLength: 32000,
      description: '自定义样式代码'
    },
    CustomJavascript: {
      type: 'textarea',
      label: '自定义 JavaScript',
      maxLength: 32000,
      description: '自定义脚本代码（追踪、互动等）'
    },
    
    // SEO & Meta
    MetaTitle: {
      type: 'text',
      label: 'SEO 标题',
      maxLength: 70,
      description: '搜索引擎结果显示的标题'
    },
    MetaDescription: {
      type: 'textarea',
      label: 'SEO 描述',
      maxLength: 160,
      description: '搜索引擎结果显示的描述'
    },
    MetaKeywords: {
      type: 'text',
      label: 'SEO 关键词',
      maxLength: 255,
      description: '逗号分隔的关键词'
    },
    OgImage: {
      type: 'url',
      label: 'Open Graph 图片',
      description: '社交媒体分享时显示的图片URL'
    },
    
    // Form Integration
    FormId: {
      type: 'lookup',
      label: '内嵌表单',
      reference: 'Form',
      description: '页面中集成的表单'
    },
    ThankYouMessage: {
      type: 'textarea',
      label: '感谢消息',
      maxLength: 2000,
      description: '表单提交后显示的消息'
    },
    RedirectUrl: {
      type: 'url',
      label: '提交后重定向URL',
      description: '表单提交后跳转的页面（可选）'
    },
    
    // Status & Publishing
    Status: {
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
    IsActive: {
      type: 'checkbox',
      label: '是否启用',
      defaultValue: true
    },
    PublishedDate: {
      type: 'datetime',
      label: '发布时间',
      readonly: true
    },
    ExpiryDate: {
      type: 'datetime',
      label: '过期时间',
      description: '页面自动下线时间（可选）'
    },
    OwnerId: {
      type: 'lookup',
      label: '负责人',
      reference: 'User',
      required: true
    },
    
    // A/B Testing
    IsABTest: {
      type: 'checkbox',
      label: '启用 A/B 测试',
      defaultValue: false
    },
    ABTestVariantId: {
      type: 'lookup',
      label: 'A/B 测试变体',
      reference: 'LandingPage',
      description: '关联的测试变体页面'
    },
    TrafficSplitPercent: {
      type: 'percent',
      label: '流量分配比例',
      description: 'A/B测试时此版本的流量占比'
    },
    
    // Analytics & Performance
    TotalViews: {
      type: 'number',
      label: '总访问量',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    UniqueVisitors: {
      type: 'number',
      label: '独立访客数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    TotalSubmissions: {
      type: 'number',
      label: '表单提交次数',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    ConversionRate: {
      type: 'percent',
      label: '转化率',
      readonly: true,
      description: '自动计算：提交次数 / 独立访客数'
    },
    AverageTimeOnPage: {
      type: 'number',
      label: '平均停留时间(秒)',
      precision: 0,
      readonly: true
    },
    BounceRate: {
      type: 'percent',
      label: '跳出率',
      readonly: true,
      description: '访问后立即离开的访客比例'
    },
    
    // Traffic Sources
    SourceUtmCampaign: {
      type: 'text',
      label: 'UTM Campaign',
      maxLength: 100,
      description: '跟踪参数：utm_campaign'
    },
    SourceUtmMedium: {
      type: 'text',
      label: 'UTM Medium',
      maxLength: 100,
      description: '跟踪参数：utm_medium'
    },
    SourceUtmSource: {
      type: 'text',
      label: 'UTM Source',
      maxLength: 100,
      description: '跟踪参数：utm_source'
    },
    
    // Mobile Optimization
    IsMobileOptimized: {
      type: 'checkbox',
      label: '移动端优化',
      defaultValue: true,
      description: '是否针对移动设备优化'
    },
    MobileConversionRate: {
      type: 'percent',
      label: '移动端转化率',
      readonly: true
    },
    DesktopConversionRate: {
      type: 'percent',
      label: '桌面端转化率',
      readonly: true
    },
    
    // Loading Performance
    PageLoadTime: {
      type: 'number',
      label: '页面加载时间(ms)',
      precision: 0,
      readonly: true,
      description: '平均加载时间（毫秒）'
    },
    PageSizeKb: {
      type: 'number',
      label: '页面大小(KB)',
      precision: 2,
      readonly: true
    },
    
    // AI Enhancement
    AIDesignSuggestions: {
      type: 'textarea',
      label: 'AI 设计建议',
      readonly: true,
      maxLength: 2000,
      description: 'AI 分析的设计和布局优化建议'
    },
    AICopywritingSuggestions: {
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
      foreignKey: 'CampaignId',
      label: '营销活动'
    },
    {
      name: 'Form',
      type: 'belongsTo',
      object: 'Form',
      foreignKey: 'FormId',
      label: '表单'
    },
    {
      name: 'Owner',
      type: 'belongsTo',
      object: 'User',
      foreignKey: 'OwnerId',
      label: '负责人'
    },
    {
      name: 'ABTestVariant',
      type: 'belongsTo',
      object: 'LandingPage',
      foreignKey: 'ABTestVariantId',
      label: 'A/B测试变体'
    }
  ],
  listViews: [
    {
      name: 'AllPages',
      label: '所有着陆页',
      filters: [],
      columns: ['Name', 'PageType', 'Status', 'TotalViews', 'ConversionRate', 'PublishedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActivePages',
      label: '启用的着陆页',
      filters: [['IsActive', '=', true], ['Status', '=', 'Published']],
      columns: ['Name', 'PageType', 'TotalViews', 'UniqueVisitors', 'ConversionRate', 'CampaignId'],
      sort: [['TotalViews', 'desc']]
    },
    {
      name: 'MyPages',
      label: '我的着陆页',
      filters: [['OwnerId', '=', '$CurrentUser.Id']],
      columns: ['Name', 'Status', 'TotalViews', 'ConversionRate', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'HighConversion',
      label: '高转化页面',
      filters: [['ConversionRate', '>', 10], ['TotalViews', '>', 100]],
      columns: ['Name', 'PageType', 'ConversionRate', 'TotalSubmissions', 'TotalViews'],
      sort: [['ConversionRate', 'desc']]
    },
    {
      name: 'ABTests',
      label: 'A/B 测试',
      filters: [['IsABTest', '=', true]],
      columns: ['Name', 'ABTestVariantId', 'TrafficSplitPercent', 'ConversionRate', 'TotalViews'],
      sort: [['CreatedDate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireSlugForPublished',
      errorMessage: '发布的着陆页必须设置 URL Slug',
      formula: 'AND(Status = "Published", ISBLANK(Slug))'
    },
    {
      name: 'RequireContentOrDesign',
      errorMessage: '着陆页必须有 HTML 内容或设计配置',
      formula: 'AND(ISBLANK(HtmlContent), ISBLANK(DesignJson))'
    },
    {
      name: 'ExpiryDateAfterPublished',
      errorMessage: '过期时间必须晚于发布时间',
      formula: 'AND(NOT(ISBLANK(PublishedDate)), NOT(ISBLANK(ExpiryDate)), ExpiryDate < PublishedDate)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '页面信息',
        columns: 2,
        fields: ['Name', 'Title', 'Slug', 'PageType', 'Status', 'IsActive', 'OwnerId', 'CampaignId']
      },
      {
        label: '内容与设计',
        columns: 1,
        fields: ['HtmlContent', 'CustomCss', 'CustomJavascript']
      },
      {
        label: 'SEO 优化',
        columns: 2,
        fields: ['MetaTitle', 'MetaDescription', 'MetaKeywords', 'OgImage']
      },
      {
        label: '表单集成',
        columns: 2,
        fields: ['FormId', 'ThankYouMessage', 'RedirectUrl']
      },
      {
        label: '发布设置',
        columns: 2,
        fields: ['PublishedDate', 'ExpiryDate']
      },
      {
        label: 'A/B 测试',
        columns: 2,
        fields: ['IsABTest', 'ABTestVariantId', 'TrafficSplitPercent']
      },
      {
        label: '访问统计',
        columns: 3,
        fields: ['TotalViews', 'UniqueVisitors', 'TotalSubmissions', 'ConversionRate', 'AverageTimeOnPage', 'BounceRate']
      },
      {
        label: '流量来源',
        columns: 3,
        fields: ['SourceUtmCampaign', 'SourceUtmMedium', 'SourceUtmSource']
      },
      {
        label: '移动端优化',
        columns: 2,
        fields: ['IsMobileOptimized', 'MobileConversionRate', 'DesktopConversionRate']
      },
      {
        label: '性能指标',
        columns: 2,
        fields: ['PageLoadTime', 'PageSizeKb']
      },
      {
        label: 'AI 优化助手',
        columns: 1,
        fields: ['AIDesignSuggestions', 'AICopywritingSuggestions']
      },
      {
        label: '描述',
        columns: 1,
        fields: ['Description']
      }
    ]
  }
};

export default LandingPage;
