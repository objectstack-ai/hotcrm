import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Form = ObjectSchema.create({
  name: 'form',
  label: '表单',
  pluralLabel: '表单',
  icon: 'file-text',
  description: '营销表单构建器，支持拖放式设计和自动线索创建',

  fields: {
    name: Field.text({
      label: '表单名称',
      required: true,
      maxLength: 255
    }),
    form_code: Field.text({
      label: '表单代码',
      description: '用于嵌入和API调用的唯一标识符',
      unique: true,
      maxLength: 80
    }),
    description: Field.textarea({
      label: '描述',
      maxLength: 1000
    }),
    form_type: Field.select({
      label: '表单类型',
      required: true,
      defaultValue: 'Lead Capture',
      options: [
        {
          "label": "📝 线索收集",
          "value": "Lead Capture"
        },
        {
          "label": "📅 活动注册",
          "value": "Event Registration"
        },
        {
          "label": "🎁 资源下载",
          "value": "Resource Download"
        },
        {
          "label": "📞 联系我们",
          "value": "Contact Us"
        },
        {
          "label": "💬 反馈调查",
          "value": "Feedback Survey"
        },
        {
          "label": "🎯 需求评估",
          "value": "Needs Assessment"
        },
        {
          "label": "📺 网络研讨会",
          "value": "Webinar Registration"
        }
      ]
    }),
    campaign_id: Field.lookup('campaign', {
      label: '关联营销活动',
      description: '通过此表单收集的线索会关联到此活动'
    }),
    fields_json: Field.textarea({
      label: '字段配置 JSON',
      description: '表单字段定义（类型、标签、验证规则等）',
      required: true,
      maxLength: 65535
    }),
    layout_json: Field.textarea({
      label: '布局配置 JSON',
      description: '字段布局和样式配置',
      maxLength: 32000
    }),
    validation_rules_json: Field.textarea({
      label: '验证规则 JSON',
      description: '自定义字段验证规则',
      maxLength: 32000
    }),
    submit_button_text: Field.text({
      label: '提交按钮文本',
      defaultValue: '提交',
      maxLength: 50
    }),
    submit_success_message: Field.textarea({
      label: '提交成功消息',
      description: '表单提交成功后显示的消息',
      maxLength: 1000
    }),
    redirect_url: Field.url({
      label: '提交后重定向URL',
      description: '表单提交成功后跳转的页面（可选）'
    }),
    create_lead_on_submit: Field.boolean({
      label: '自动创建线索',
      description: '表单提交时自动创建线索记录',
      defaultValue: true
    }),
    lead_source: Field.text({
      label: '线索来源',
      description: '自动创建线索时设置的来源字段值',
      maxLength: 100
    }),
    auto_assign_leads: Field.boolean({
      label: '自动分配线索',
      description: '根据分配规则自动分配新线索',
      defaultValue: false
    }),
    default_owner_id: Field.lookup('users', {
      label: '默认负责人',
      description: '新线索的默认负责人（如果不自动分配）'
    }),
    send_confirmation_email: Field.boolean({
      label: '发送确认邮件',
      description: '向提交者发送确认邮件',
      defaultValue: false
    }),
    confirmation_email_template_id: Field.lookup('EmailTemplate', {
      label: '确认邮件模板',
      description: '使用的确认邮件模板'
    }),
    notify_owner_on_submit: Field.boolean({
      label: '通知负责人',
      description: '表单提交时通知线索负责人',
      defaultValue: true
    }),
    notification_email_list: Field.text({
      label: '通知邮箱列表',
      description: '逗号分隔的邮箱地址，收到表单提交通知',
      maxLength: 500
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
    owner_id: Field.lookup('users', {
      label: '负责人',
      required: true
    }),
    embed_code: Field.textarea({
      label: '嵌入代码',
      description: '用于嵌入网站的HTML/JavaScript代码',
      readonly: true,
      maxLength: 2000
    }),
    allowed_domains: Field.text({
      label: '允许的域名',
      description: '可以嵌入此表单的域名列表（逗号分隔）',
      maxLength: 500
    }),
    total_submissions: Field.number({
      label: '总提交次数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    total_views: Field.number({
      label: '总浏览次数',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    conversion_rate: Field.percent({
      label: '转化率',
      description: '自动计算：提交次数 / 浏览次数',
      readonly: true
    }),
    average_completion_time: Field.number({
      label: '平均完成时间(秒)',
      description: '用户完成表单的平均时长',
      readonly: true,
      precision: 0
    }),
    abandonment_rate: Field.percent({
      label: '放弃率',
      description: '开始填写但未提交的比例',
      readonly: true
    }),
    last_submission_date: Field.datetime({
      label: '最后提交时间',
      readonly: true
    }),
    enable_captcha: Field.boolean({
      label: '启用验证码',
      description: '防止垃圾提交',
      defaultValue: true
    }),
    enable_honeypot: Field.boolean({
      label: '启用蜜罐字段',
      description: '隐藏字段防止机器人提交',
      defaultValue: true
    }),
    spam_submissions_blocked: Field.number({
      label: '拦截的垃圾提交',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    enable_progressive_profiling: Field.boolean({
      label: '启用渐进式表单',
      description: '对已知联系人隐藏已有信息的字段',
      defaultValue: false
    }),
    max_fields_to_show: Field.number({
      label: '最多显示字段数',
      description: '渐进式表单每次最多显示的新字段数',
      precision: 0
    }),
    most_abandoned_field: Field.text({
      label: '最常放弃字段',
      description: '用户最常在此字段处放弃表单',
      readonly: true,
      maxLength: 100
    }),
    field_completion_rates_json: Field.textarea({
      label: '字段完成率 JSON',
      description: '每个字段的完成率统计数据',
      readonly: true,
      maxLength: 10000
    }),
    ai_form_optimization: Field.textarea({
      label: 'AI 表单优化建议',
      description: 'AI 分析的表单改进建议（字段顺序、标签文本等）',
      readonly: true,
      maxLength: 2000
    }),
    ai_field_suggestions: Field.textarea({
      label: 'AI 字段建议',
      description: 'AI 推荐添加或删除的字段',
      readonly: true,
      maxLength: 2000
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowAttachments: false
  },
});