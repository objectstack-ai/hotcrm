import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Application = ObjectSchema.create({
  name: 'application',
  label: '求职申请',
  pluralLabel: '求职申请',
  icon: 'file-alt',
  description: '候选人职位申请记录管理',

  fields: {
    application_number: Field.text({
      label: '申请编号',
      unique: true,
      maxLength: 40
    }),
    candidate_id: Field.lookup('candidate', {
      label: '候选人',
      required: true
    }),
    recruitment_id: Field.lookup('recruitment', {
      label: '招聘需求',
      required: true
    }),
    applied_date: Field.date({
      label: '申请日期',
      required: true,
      defaultValue: '$today'
    }),
    status: Field.select({
      label: '状态',
      defaultValue: 'Submitted',
      options: [
        {
          "label": "已提交",
          "value": "Submitted"
        },
        {
          "label": "筛选中",
          "value": "Screening"
        },
        {
          "label": "待面试",
          "value": "Interview Scheduled"
        },
        {
          "label": "面试中",
          "value": "Interviewing"
        },
        {
          "label": "通过初选",
          "value": "Shortlisted"
        },
        {
          "label": "已录用",
          "value": "Offer Extended"
        },
        {
          "label": "已拒绝",
          "value": "Rejected"
        },
        {
          "label": "已撤回",
          "value": "Withdrawn"
        }
      ]
    }),
    stage: Field.select({
      label: '当前阶段',
      options: [
        {
          "label": "简历筛选",
          "value": "Resume Review"
        },
        {
          "label": "电话面试",
          "value": "Phone Screen"
        },
        {
          "label": "初试",
          "value": "First Interview"
        },
        {
          "label": "复试",
          "value": "Second Interview"
        },
        {
          "label": "终试",
          "value": "Final Interview"
        },
        {
          "label": "Offer沟通",
          "value": "Offer Discussion"
        },
        {
          "label": "背景调查",
          "value": "Background Check"
        }
      ]
    }),
    source: Field.select({
      label: '来源渠道',
      options: [
        {
          "label": "招聘网站",
          "value": "Job Board"
        },
        {
          "label": "内推",
          "value": "Employee Referral"
        },
        {
          "label": "猎头",
          "value": "Headhunter"
        },
        {
          "label": "社交媒体",
          "value": "Social Media"
        },
        {
          "label": "校园招聘",
          "value": "Campus"
        },
        {
          "label": "主动投递",
          "value": "Direct Application"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    referrer_id: Field.lookup('employee', {
      label: '内推人',
      description: '如果是内推，记录推荐人'
    }),
    rating: /* TODO: Unknown type 'rating' */ null,
    resume_url: Field.url({ label: '简历链接' }),
    cover_letter: Field.textarea({
      label: '求职信',
    }),
    rejection_reason: Field.textarea({
      label: '拒绝原因',
      description: '如果被拒绝，记录原因',
    }),
    notes: Field.textarea({
      label: '备注',
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