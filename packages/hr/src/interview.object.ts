import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Interview = ObjectSchema.create({
  name: 'interview',
  label: '面试',
  pluralLabel: '面试',
  icon: 'comments',
  description: '面试安排和记录管理',

  fields: {
    title: Field.text({
      label: '面试标题',
      required: true,
      maxLength: 255
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
    interview_type: Field.select({
      label: '面试类型',
      defaultValue: 'First Round',
      options: [
        {
          "label": "电话面试",
          "value": "Phone Screen"
        },
        {
          "label": "视频面试",
          "value": "Video Interview"
        },
        {
          "label": "初试",
          "value": "First Round"
        },
        {
          "label": "复试",
          "value": "Second Round"
        },
        {
          "label": "终试",
          "value": "Final Round"
        },
        {
          "label": "技术面试",
          "value": "Technical"
        },
        {
          "label": "HR面试",
          "value": "HR"
        }
      ]
    }),
    scheduled_date: Field.datetime({
      label: '面试时间',
      required: true
    }),
    duration: Field.number({
      label: '时长（分钟）',
      defaultValue: 60
    }),
    location: Field.text({
      label: '面试地点',
      description: '线下地点或线上会议链接',
      maxLength: 255
    }),
    interviewer_id: Field.lookup('employee', {
      label: '主面试官',
      required: true
    }),
    panel_members: Field.text({
      label: '面试官小组',
      description: '多位面试官用逗号分隔',
      maxLength: 500
    }),
    status: Field.select({
      label: '状态',
      defaultValue: 'Scheduled',
      options: [
        {
          "label": "已安排",
          "value": "Scheduled"
        },
        {
          "label": "已确认",
          "value": "Confirmed"
        },
        {
          "label": "进行中",
          "value": "In Progress"
        },
        {
          "label": "已完成",
          "value": "Completed"
        },
        {
          "label": "已取消",
          "value": "Cancelled"
        },
        {
          "label": "候选人未到",
          "value": "No Show"
        },
        {
          "label": "需重新安排",
          "value": "Rescheduled"
        }
      ]
    }),
    result: Field.select({
      label: '面试结果',
      options: [
        {
          "label": "强烈推荐",
          "value": "Strong Hire"
        },
        {
          "label": "推荐",
          "value": "Hire"
        },
        {
          "label": "待定",
          "value": "Maybe"
        },
        {
          "label": "不推荐",
          "value": "No Hire"
        },
        {
          "label": "强烈不推荐",
          "value": "Strong No Hire"
        }
      ]
    }),
    overall_rating: /* TODO: Unknown type 'rating' */ null,
    technical_rating: /* TODO: Unknown type 'rating' */ null,
    communication_rating: /* TODO: Unknown type 'rating' */ null,
    cultural_fit_rating: /* TODO: Unknown type 'rating' */ null,
    feedback: Field.textarea({
      label: '面试反馈',
      description: '详细的面试评价和建议',
    }),
    strengths: Field.textarea({
      label: '优势',
    }),
    weaknesses: Field.textarea({
      label: '不足',
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