import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Offer = ObjectSchema.create({
  name: 'offer',
  label: 'Offer',
  pluralLabel: 'Offers',
  icon: 'file-contract',
  description: '录用通知和Offer管理',

  fields: {
    offer_number: Field.text({
      label: 'Offer编号',
      unique: true,
      maxLength: 40
    }),
    candidate_id: Field.lookup('candidate', {
      label: '候选人',
      required: true
    }),
    application_id: Field.lookup('application', {
      label: '申请',
      required: true
    }),
    recruitment_id: Field.lookup('recruitment', {
      label: '招聘需求',
      required: true
    }),
    position_id: Field.lookup('position', {
      label: '职位',
      required: true
    }),
    department_id: Field.lookup('department', {
      label: '部门',
      required: true
    }),
    hiring_manager_id: Field.lookup('employee', {
      label: '招聘负责人',
      required: true
    }),
    offer_date: Field.date({
      label: 'Offer日期',
      required: true,
      defaultValue: '$today'
    }),
    expiry_date: Field.date({
      label: '截止日期',
      description: 'Offer有效期截止日期'
    }),
    start_date: Field.date({
      label: '期望入职日期',
      required: true
    }),
    base_salary: Field.currency({
      label: '基本工资',
      required: true,
      precision: 2
    }),
    bonus: Field.currency({
      label: '奖金',
      precision: 2
    }),
    equity: Field.text({
      label: '股权/期权',
      description: '股权或期权描述',
      maxLength: 255
    }),
    benefits: Field.textarea({
      label: '福利待遇',
      description: '医疗保险、带薪休假等福利',
      rows: 4
    }),
    employment_type: Field.select({
      label: '雇佣类型',
      defaultValue: 'Full-time',
      options: [
        {
          "label": "全职",
          "value": "Full-time"
        },
        {
          "label": "兼职",
          "value": "Part-time"
        },
        {
          "label": "合同",
          "value": "Contract"
        },
        {
          "label": "实习",
          "value": "Intern"
        }
      ]
    }),
    probation_period: Field.select({
      label: '试用期',
      options: [
        {
          "label": "无试用期",
          "value": "None"
        },
        {
          "label": "1个月",
          "value": "1 Month"
        },
        {
          "label": "2个月",
          "value": "2 Months"
        },
        {
          "label": "3个月",
          "value": "3 Months"
        },
        {
          "label": "6个月",
          "value": "6 Months"
        }
      ]
    }),
    status: Field.select({
      label: '状态',
      defaultValue: 'Draft',
      options: [
        {
          "label": "草稿",
          "value": "Draft"
        },
        {
          "label": "审批中",
          "value": "Pending Approval"
        },
        {
          "label": "已发送",
          "value": "Extended"
        },
        {
          "label": "已接受",
          "value": "Accepted"
        },
        {
          "label": "已拒绝",
          "value": "Rejected"
        },
        {
          "label": "已撤回",
          "value": "Withdrawn"
        },
        {
          "label": "已过期",
          "value": "Expired"
        }
      ]
    }),
    response_date: Field.date({ label: '候选人回复日期' }),
    rejection_reason: Field.textarea({
      label: '拒绝原因',
      description: '如果候选人拒绝，记录原因',
      rows: 3
    }),
    offer_letter_url: Field.url({ label: 'Offer Letter链接' }),
    notes: Field.textarea({
      label: '备注',
      rows: 4
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: true,
    allowFeeds: true,
    allowAttachments: true
  },
});