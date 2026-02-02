import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Training = ObjectSchema.create({
  name: 'training',
  label: '培训',
  pluralLabel: '培训',
  icon: 'graduation-cap',
  description: '员工培训和学习发展管理',

  fields: {
    title: Field.text({
      label: '培训名称',
      required: true,
      maxLength: 255
    }),
    training_code: Field.text({
      label: '培训编号',
      unique: true,
      maxLength: 40
    }),
    employee_id: Field.lookup('employee', {
      label: '参训员工',
      required: true
    }),
    training_type: Field.select({
      label: '培训类型',
      options: [
        {
          "label": "入职培训",
          "value": "Onboarding"
        },
        {
          "label": "技能培训",
          "value": "Skills Training"
        },
        {
          "label": "领导力培训",
          "value": "Leadership"
        },
        {
          "label": "合规培训",
          "value": "Compliance"
        },
        {
          "label": "产品培训",
          "value": "Product"
        },
        {
          "label": "销售培训",
          "value": "Sales"
        },
        {
          "label": "安全培训",
          "value": "Safety"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    category: Field.select({
      label: '培训分类',
      options: [
        {
          "label": "内部培训",
          "value": "Internal"
        },
        {
          "label": "外部培训",
          "value": "External"
        },
        {
          "label": "在线课程",
          "value": "Online"
        },
        {
          "label": "研讨会",
          "value": "Workshop"
        },
        {
          "label": "会议",
          "value": "Conference"
        },
        {
          "label": "认证课程",
          "value": "Certification"
        }
      ]
    }),
    provider: Field.text({
      label: '培训机构/讲师',
      maxLength: 255
    }),
    start_date: Field.datetime({
      label: '开始时间',
      required: true
    }),
    end_date: Field.datetime({
      label: '结束时间',
      required: true
    }),
    duration_hours: Field.number({
      label: '培训时长（小时）',
      precision: 1
    }),
    location: Field.text({
      label: '培训地点',
      description: '线下地点或线上会议链接',
      maxLength: 255
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
          "label": "未参加",
          "value": "No Show"
        }
      ]
    }),
    attendance_status: Field.select({
      label: '出勤状态',
      options: [
        {
          "label": "已参加",
          "value": "Attended"
        },
        {
          "label": "部分参加",
          "value": "Partial"
        },
        {
          "label": "未参加",
          "value": "Absent"
        }
      ]
    }),
    completion_percentage: Field.percent({ label: '完成进度' }),
    is_mandatory: Field.boolean({
      label: '是否必修',
      defaultValue: false
    }),
    cost: Field.currency({
      label: '培训费用',
      precision: 2
    }),
    exam_score: Field.number({
      label: '考试成绩',
      description: '如有考试，记录成绩',
      min: 0,
      max: 100,
      precision: 2
    }),
    passed: Field.boolean({
      label: '是否通过',
      defaultValue: false
    }),
    certificate_url: Field.url({ label: '证书链接' }),
    description: Field.textarea({
      label: '培训描述',
    }),
    learning_objectives: Field.textarea({
      label: '学习目标',
    }),
    feedback: Field.textarea({
      label: '培训反馈',
      description: '员工的培训体验和收获',
    }),
    notes: Field.textarea({
      label: '备注',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
  },
});