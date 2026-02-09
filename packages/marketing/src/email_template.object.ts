import { ObjectSchema, Field } from '@objectstack/spec/data';

export const EmailTemplate = ObjectSchema.create({
  name: 'email_template',
  label: 'Email Template',
  pluralLabel: 'Email Templates',
  icon: 'mail',
  description: '营销邮件模板库，支持个性化令牌和动态内容块',

  fields: {
    name: Field.text({
      label: 'Template Name',
      description: '邮件模板的唯一名称',
      required: true,
      maxLength: 255
    }),
    template_code: Field.text({
      label: 'Template Code',
      description: '用于API调用的唯一模板标识符',
      unique: true,
      maxLength: 80
    }),
    description: Field.textarea({
      label: 'Description',
      description: '模板用途和场景说明',
      maxLength: 1000
    }),
    template_type: Field.select({
      label: 'Template Type',
      required: true,
      defaultValue: 'Marketing',
      options: [
        {
          "label": "📢 Marketing Email",
          "value": "Marketing"
        },
        {
          "label": "📧 Transactional Email",
          "value": "Transactional"
        },
        {
          "label": "🔔 Notification Email",
          "value": "Notification"
        },
        {
          "label": "👋 Welcome Series",
          "value": "Welcome"
        },
        {
          "label": "🛒 Cart Abandonment",
          "value": "Cart Abandonment"
        },
        {
          "label": "🎁 Post Purchase",
          "value": "Post Purchase"
        },
        {
          "label": "🔄 Re-engagement",
          "value": "Re-engagement"
        }
      ]
    }),
    category: Field.select({
      label: 'Category',
      options: [
        {
          "label": "Product Launch",
          "value": "Product Launch"
        },
        {
          "label": "Event Invitation",
          "value": "Event Invitation"
        },
        {
          "label": "Newsletter",
          "value": "Newsletter"
        },
        {
          "label": "Promotion",
          "value": "Promotion"
        },
        {
          "label": "Customer Care",
          "value": "Customer Care"
        },
        {
          "label": "Educational",
          "value": "Educational"
        }
      ]
    }),
    subject: Field.text({
      label: 'Email Subject',
      description: '支持个性化令牌，如 {{FirstName}}',
      required: true,
      maxLength: 255
    }),
    preheader_text: Field.text({
      label: 'Preview Text',
      description: '邮件客户端显示的预览文本',
      maxLength: 150
    }),
    html_body: Field.textarea({
      label: 'HTML Content',
      description: '邮件的 HTML 内容，支持令牌和动态内容块',
      required: true,
      maxLength: 65535
    }),
    plain_text_body: Field.textarea({
      label: 'Plain Text Content',
      description: '纯文本版本，用于不支持HTML的邮件客户端',
      maxLength: 32000
    }),
    personalization_tokens: Field.textarea({
      label: 'Personalization Tokens',
      description: '模板中使用的所有令牌列表（自动提取）',
      readonly: true,
      maxLength: 2000
    }),
    dynamic_content_blocks: Field.number({
      label: 'Dynamic Content Block Count',
      description: '基于条件显示的动态内容块数量',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    design_system: Field.select({
      label: 'Design System',
      defaultValue: 'Custom',
      options: [
        {
          "label": "Custom HTML",
          "value": "Custom"
        },
        {
          "label": "Visual Builder",
          "value": "Visual Builder"
        },
        {
          "label": "Preset Template",
          "value": "Preset"
        }
      ]
    }),
    design_json: Field.textarea({
      label: 'Design Configuration JSON',
      description: '可视化编辑器的设计配置（JSON格式）',
      maxLength: 65535
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
      description: '只有启用的模板才能用于发送',
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
      description: '关联的测试变体模板'
    }),
    a_b_test_winner_metric: Field.select({
      label: 'A/B Test Winning Metric',
      options: [
        {
          "label": "Open Rate",
          "value": "OpenRate"
        },
        {
          "label": "Click Rate",
          "value": "ClickRate"
        },
        {
          "label": "Conversion Rate",
          "value": "ConversionRate"
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
      description: '自动计算：总打开次数 / 总发送次数',
      readonly: true
    }),
    average_click_rate: Field.percent({
      label: 'Average Click Rate',
      description: '自动计算：总点击次数 / 总打开次数',
      readonly: true
    }),
    last_used_date: Field.datetime({
      label: 'Last Used Date',
      readonly: true
    }),
    spam_score: Field.number({
      label: 'Spam Score',
      description: '0-10分，分数越低越好',
      readonly: true,
      precision: 1
    }),
    has_unsubscribe_link: Field.boolean({
      label: 'Has Unsubscribe Link',
      description: '自动检测内容中是否包含退订链接',
      defaultValue: false,
      readonly: true
    }),
    ai_generated_subject_lines: Field.textarea({
      label: 'AI Generated Subject Lines',
      description: 'AI 推荐的替代主题行选项',
      readonly: true,
      maxLength: 2000
    }),
    ai_optimization_suggestions: Field.textarea({
      label: 'AI Optimization Suggestions',
      description: 'AI 分析的改进建议（内容、设计、发送时间等）',
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