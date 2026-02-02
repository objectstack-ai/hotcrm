import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Goal = ObjectSchema.create({
  name: 'goal',
  label: '目标',
  pluralLabel: '目标',
  icon: 'bullseye',
  description: 'OKR和个人目标管理',

  fields: {
    title: Field.text({
      label: '目标名称',
      required: true,
      maxLength: 255
    }),
    employee_id: Field.lookup('employee', {
      label: '负责员工',
      required: true
    }),
    manager_id: Field.lookup('employee', {
      label: '目标设定人',
      description: '通常是直属经理'
    }),
    goal_type: Field.select({
      label: '目标类型',
      defaultValue: 'Individual',
      options: [
        {
          "label": "个人目标",
          "value": "Individual"
        },
        {
          "label": "团队目标",
          "value": "Team"
        },
        {
          "label": "OKR",
          "value": "OKR"
        },
        {
          "label": "发展目标",
          "value": "Development"
        },
        {
          "label": "项目目标",
          "value": "Project"
        }
      ]
    }),
    category: Field.select({
      label: '目标类别',
      options: [
        {
          "label": "业绩",
          "value": "Performance"
        },
        {
          "label": "技能发展",
          "value": "Skill Development"
        },
        {
          "label": "领导力",
          "value": "Leadership"
        },
        {
          "label": "创新",
          "value": "Innovation"
        },
        {
          "label": "团队协作",
          "value": "Teamwork"
        },
        {
          "label": "客户满意度",
          "value": "Customer Satisfaction"
        },
        {
          "label": "其他",
          "value": "Other"
        }
      ]
    }),
    priority: Field.select({
      label: '优先级',
      defaultValue: 'Medium',
      options: [
        {
          "label": "高",
          "value": "High"
        },
        {
          "label": "中",
          "value": "Medium"
        },
        {
          "label": "低",
          "value": "Low"
        }
      ]
    }),
    start_date: Field.date({
      label: '开始日期',
      required: true
    }),
    target_date: Field.date({
      label: '目标日期',
      required: true
    }),
    completion_date: Field.date({ label: '完成日期' }),
    status: Field.select({
      label: '状态',
      defaultValue: 'Not Started',
      options: [
        {
          "label": "未开始",
          "value": "Not Started"
        },
        {
          "label": "进行中",
          "value": "In Progress"
        },
        {
          "label": "有风险",
          "value": "At Risk"
        },
        {
          "label": "已完成",
          "value": "Completed"
        },
        {
          "label": "未完成",
          "value": "Not Achieved"
        },
        {
          "label": "已取消",
          "value": "Cancelled"
        }
      ]
    }),
    progress: Field.percent({
      label: '完成进度',
      description: '目标完成百分比',
      defaultValue: 0
    }),
    target_value: Field.number({
      label: '目标值',
      description: '量化的目标数值',
      precision: 2
    }),
    current_value: Field.number({
      label: '当前值',
      description: '当前达成的数值',
      precision: 2
    }),
    unit: Field.text({
      label: '单位',
      description: '目标值的单位，如：个、万元、%',
      maxLength: 40
    }),
    description: Field.textarea({
      label: '目标描述',
      description: '详细的目标说明和期望结果',
    }),
    key_results: Field.textarea({
      label: '关键结果（KR）',
      description: 'OKR的关键结果，可列出多个',
    }),
    performance_review_id: Field.lookup('performance_review', { label: '关联绩效评估' }),
    weight: Field.percent({
      label: '权重',
      description: '在绩效考核中的权重'
    }),
    achievement_notes: Field.textarea({
      label: '达成情况说明',
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
    allowAttachments: false
  },
});