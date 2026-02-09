import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Form = ObjectSchema.create({
  name: 'form',
  label: 'Form',
  pluralLabel: 'Forms',
  icon: 'file-text',
  description: '营销表单构建器，支持拖放式设计和自动线索创建',

  fields: {
    name: Field.text({
      label: 'Form Name',
      required: true,
      maxLength: 255
    }),
    form_code: Field.text({
      label: 'Form Code',
      description: '用于嵌入和API调用的唯一标识符',
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
      description: '表单字段定义（类型、标签、验证规则等）',
      required: true,
      maxLength: 65535
    }),
    layout_json: Field.textarea({
      label: 'Layout Configuration JSON',
      description: '字段布局和样式配置',
      maxLength: 32000
    }),
    validation_rules_json: Field.textarea({
      label: 'Validation Rules JSON',
      description: '自定义字段验证规则',
      maxLength: 32000
    }),
    submit_button_text: Field.text({
      label: 'Submit Button Text',
      defaultValue: 'Submit',
      maxLength: 50
    }),
    submit_success_message: Field.textarea({
      label: 'Success Message',
      description: '表单提交成功后显示的消息',
      maxLength: 1000
    }),
    redirect_url: Field.url({
      label: 'Redirect URL',
      description: 'Page to redirect to after successful form submission (optional)'
    }),
    create_lead_on_submit: Field.boolean({
      label: 'Auto Create Lead',
      description: '表单提交时自动创建线索记录',
      defaultValue: true
    }),
    lead_source: Field.text({
      label: 'Lead Source',
      description: '自动创建线索时设置的来源字段值',
      maxLength: 100
    }),
    auto_assign_leads: Field.boolean({
      label: 'Auto Assign Leads',
      description: '根据分配规则自动分配新线索',
      defaultValue: false
    }),
    default_owner_id: Field.lookup('users', {
      label: 'Default Owner',
      description: '新线索的默认负责人（如果不自动分配）'
    }),
    send_confirmation_email: Field.boolean({
      label: 'Send Confirmation Email',
      description: '向提交者发送确认邮件',
      defaultValue: false
    }),
    confirmation_email_template_id: Field.lookup('email_template', {
      label: 'Confirmation Email Template',
      description: '使用的确认邮件模板'
    }),
    notify_owner_on_submit: Field.boolean({
      label: 'Notify Owner on Submit',
      description: '表单提交时通知线索负责人',
      defaultValue: true
    }),
    notification_email_list: Field.text({
      label: 'Notification Email List',
      description: '逗号分隔的邮箱地址，收到表单提交通知',
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
      description: '用于嵌入网站的HTML/JavaScript代码',
      readonly: true,
      maxLength: 2000
    }),
    allowed_domains: Field.text({
      label: 'Allowed Domains',
      description: '可以嵌入此表单的域名列表（逗号分隔）',
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
      description: '自动计算：提交次数 / 浏览次数',
      readonly: true
    }),
    average_completion_time: Field.number({
      label: 'Average Completion Time (sec)',
      description: '用户完成表单的平均时长',
      readonly: true,
      precision: 0
    }),
    abandonment_rate: Field.percent({
      label: 'Abandonment Rate',
      description: '开始填写但未提交的比例',
      readonly: true
    }),
    last_submission_date: Field.datetime({
      label: 'Last Submission Date',
      readonly: true
    }),
    enable_captcha: Field.boolean({
      label: 'Enable Captcha',
      description: '防止垃圾提交',
      defaultValue: true
    }),
    enable_honeypot: Field.boolean({
      label: 'Enable Honeypot Field',
      description: '隐藏字段防止机器人提交',
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
      description: '对已知联系人隐藏已有信息的字段',
      defaultValue: false
    }),
    max_fields_to_show: Field.number({
      label: 'Max Fields to Show',
      description: '渐进式表单每次最多显示的新字段数',
      precision: 0
    }),
    most_abandoned_field: Field.text({
      label: 'Most Abandoned Field',
      description: '用户最常在此字段处放弃表单',
      readonly: true,
      maxLength: 100
    }),
    field_completion_rates_json: Field.textarea({
      label: 'Field Completion Rates JSON',
      description: '每个字段的完成率统计数据',
      readonly: true,
      maxLength: 10000
    }),
    ai_form_optimization: Field.textarea({
      label: 'AI Form Optimization Suggestions',
      description: 'AI 分析的表单改进建议（字段顺序、标签文本等）',
      readonly: true,
      maxLength: 2000
    }),
    ai_field_suggestions: Field.textarea({
      label: 'AI Field Suggestions',
      description: 'AI 推荐添加或删除的字段',
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