import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Certification = ObjectSchema.create({
  name: 'certification',
  label: '认证',
  pluralLabel: '认证',
  icon: 'certificate',
  description: '员工专业认证和资质管理',

  fields: {
    title: Field.text({
      label: '认证名称',
      required: true,
      maxLength: 255
    }),
    employee_id: Field.lookup('employee', {
      label: '员工',
      required: true
    }),
    certification_type: Field.select({
      label: '认证类型',
      options: [
        {
          "label": "专业认证",
          "value": "Professional"
        },
        {
          "label": "技术认证",
          "value": "Technical"
        },
        {
          "label": "语言认证",
          "value": "Language"
        },
        {
          "label": "管理认证",
          "value": "Management"
        },
        {
          "label": "安全认证",
          "value": "Safety"
        },
        {
          "label": "合规认证",
          "value": "Compliance"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    issuing_organization: Field.text({
      label: '发证机构',
      required: true,
      maxLength: 255
    }),
    certification_number: Field.text({
      label: '证书编号',
      maxLength: 100
    }),
    issue_date: Field.date({
      label: '颁发日期',
      required: true
    }),
    expiry_date: Field.date({
      label: '到期日期',
      description: '如果证书有效期限制'
    }),
    is_active: Field.boolean({
      label: '是否有效',
      description: '证书当前是否有效',
      defaultValue: true
    }),
    renewal_required: Field.boolean({
      label: '需要续期',
      defaultValue: false
    }),
    next_renewal_date: Field.date({ label: '下次续期日期' }),
    training_id: Field.lookup('training', {
      label: '关联培训',
      description: '如果通过培训获得'
    }),
    score: Field.number({
      label: '考试成绩',
      description: '如适用，记录考试分数',
      precision: 2
    }),
    certificate_url: Field.url({ label: '证书链接/扫描件' }),
    verification_url: Field.url({
      label: '验证链接',
      description: '在线验证证书的链接'
    }),
    cost: Field.currency({
      label: '认证费用',
      precision: 2
    }),
    status: Field.select({
      label: '状态',
      defaultValue: 'Active',
      options: [
        {
          "label": "有效",
          "value": "Active"
        },
        {
          "label": "即将到期",
          "value": "Expiring Soon"
        },
        {
          "label": "已过期",
          "value": "Expired"
        },
        {
          "label": "已撤销",
          "value": "Revoked"
        }
      ]
    }),
    description: Field.textarea({
      label: '认证描述',
      description: '认证的内容和价值',
    }),
    notes: Field.textarea({
      label: '备注',
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: false,
    allowFeeds: true,
    allowAttachments: true
  },
});