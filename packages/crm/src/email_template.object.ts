import { ObjectSchema, Field } from '@objectstack/spec/data';

export const EmailTemplate = ObjectSchema.create({
  name: 'email_template',
  label: '邮件模板',
  pluralLabel: '邮件模板',
  icon: 'mail',
  description: '营销邮件模板库，支持个性化令牌和动态内容块',

  fields: {
    name: Field.text({
      label: '模板名称',
      description: '邮件模板的唯一名称',
      required: true,
      maxLength: 255
    }),
    template_code: Field.text({
      label: '模板代码',
      description: '用于API调用的唯一模板标识符',
      unique: true,
      maxLength: 80
    }),
    description: Field.textarea({
      label: '描述',
      description: '模板用途和场景说明',
      maxLength: 1000
    }),
    template_type: Field.select({
      label: '模板类型',
      required: true,
      defaultValue: 'Marketing',
      options: [
        {
          "label": "📢 营销邮件",
          "value": "Marketing"
        },
        {
          "label": "📧 交易邮件",
          "value": "Transactional"
        },
        {
          "label": "🔔 通知邮件",
          "value": "Notification"
        },
        {
          "label": "👋 欢迎系列",
          "value": "Welcome"
        },
        {
          "label": "🛒 购物车提醒",
          "value": "Cart Abandonment"
        },
        {
          "label": "🎁 售后跟进",
          "value": "Post Purchase"
        },
        {
          "label": "🔄 重新参与",
          "value": "Re-engagement"
        }
      ]
    }),
    category: Field.select({
      label: '分类',
      options: [
        {
          "label": "产品发布",
          "value": "Product Launch"
        },
        {
          "label": "活动邀请",
          "value": "Event Invitation"
        },
        {
          "label": "新闻资讯",
          "value": "Newsletter"
        },
        {
          "label": "促销优惠",
          "value": "Promotion"
        },
        {
          "label": "客户关怀",
          "value": "Customer Care"
        },
        {
          "label": "教育培训",
          "value": "Educational"
        }
      ]
    }),
    subject: Field.text({
      label: '邮件主题',
      description: '支持个性化令牌，如 {{FirstName}}',
      required: true,
      maxLength: 255
    }),
    preheader_text: Field.text({
      label: '预览文本',
      description: '邮件客户端显示的预览文本',
      maxLength: 150
    }),
    html_body: Field.textarea({
      label: 'HTML 内容',
      description: '邮件的 HTML 内容，支持令牌和动态内容块',
      required: true,
      maxLength: 65535
    }),
    plain_text_body: Field.textarea({
      label: '纯文本内容',
      description: '纯文本版本，用于不支持HTML的邮件客户端',
      maxLength: 32000
    }),
    personalization_tokens: Field.textarea({
      label: '个性化令牌',
      description: '模板中使用的所有令牌列表（自动提取）',
      readonly: true,
      maxLength: 2000
    }),
    dynamic_content_blocks: Field.number({
      label: '动态内容块数量',
      description: '基于条件显示的动态内容块数量',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    design_system: Field.select({
      label: '设计系统',
      defaultValue: 'Custom',
      options: [
        {
          "label": "自定义 HTML",
          "value": "Custom"
        },
        {
          "label": "可视化编辑器",
          "value": "Visual Builder"
        },
        {
          "label": "预设模板",
          "value": "Preset"
        }
      ]
    }),
    design_json: Field.textarea({
      label: '设计配置 JSON',
      description: '可视化编辑器的设计配置（JSON格式）',
      maxLength: 65535
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
    is_active: Field.checkbox({
      label: '是否启用',
      description: '只有启用的模板才能用于发送',
      defaultValue: true
    }),
    owner_id: Field.lookup('users', {
      label: '负责人',
      required: true
    }),
    is_a_b_test: Field.checkbox({
      label: '启用 A/B 测试',
      defaultValue: false
    }),
    a_b_test_variant_id: Field.lookup('EmailTemplate', {
      label: 'A/B 测试变体',
      description: '关联的测试变体模板'
    }),
    a_b_test_winner_metric: Field.select({
      label: 'A/B 测试胜出指标',
      options: [
        {
          "label": "打开率",
          "value": "OpenRate"
        },
        {
          "label": "点击率",
          "value": "ClickRate"
        },
        {
          "label": "转化率",
          "value": "ConversionRate"
        }
      ]
    }),
    total_sent: Field.number({
      label: '总发送次数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    total_opened: Field.number({
      label: '总打开次数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    total_clicked: Field.number({
      label: '总点击次数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    average_open_rate: Field.percent({
      label: '平均打开率',
      description: '自动计算：总打开次数 / 总发送次数',
      readonly: true
    }),
    average_click_rate: Field.percent({
      label: '平均点击率',
      description: '自动计算：总点击次数 / 总打开次数',
      readonly: true
    }),
    last_used_date: Field.datetime({
      label: '最后使用时间',
      readonly: true
    }),
    spam_score: Field.number({
      label: '垃圾邮件评分',
      description: '0-10分，分数越低越好',
      readonly: true,
      precision: 1
    }),
    has_unsubscribe_link: Field.checkbox({
      label: '包含退订链接',
      description: '自动检测内容中是否包含退订链接',
      defaultValue: false,
      readonly: true
    }),
    ai_generated_subject_lines: Field.textarea({
      label: 'AI 生成主题行',
      description: 'AI 推荐的替代主题行选项',
      readonly: true,
      maxLength: 2000
    }),
    ai_optimization_suggestions: Field.textarea({
      label: 'AI 优化建议',
      description: 'AI 分析的改进建议（内容、设计、发送时间等）',
      readonly: true,
      maxLength: 2000
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowAttachments: true
  },
});