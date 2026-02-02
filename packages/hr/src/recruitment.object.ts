import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Recruitment = ObjectSchema.create({
  name: 'recruitment',
  label: '招聘需求',
  pluralLabel: '招聘需求',
  icon: 'user-plus',
  description: '职位招聘需求和招聘计划管理',

  fields: {
    title: Field.text({
      label: '招聘标题',
      required: true,
      maxLength: 255
    }),
    requisition_number: Field.text({
      label: '需求编号',
      unique: true,
      maxLength: 40
    }),
    position_id: Field.lookup('position', {
      label: '招聘职位',
      required: true
    }),
    department_id: Field.lookup('department', {
      label: '所属部门',
      required: true
    }),
    hiring_manager_id: Field.lookup('employee', {
      label: '招聘负责人',
      description: '负责此次招聘的经理',
      required: true
    }),
    headcount: Field.number({
      label: '招聘人数',
      required: true,
      defaultValue: 1
    }),
    priority: Field.select({
      label: '优先级',
      defaultValue: 'Medium',
      options: [
        {
          "label": "紧急",
          "value": "Urgent"
        },
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
    status: Field.select({
      label: '状态',
      defaultValue: 'Open',
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
          "label": "开放",
          "value": "Open"
        },
        {
          "label": "进行中",
          "value": "In Progress"
        },
        {
          "label": "暂停",
          "value": "On Hold"
        },
        {
          "label": "已完成",
          "value": "Filled"
        },
        {
          "label": "已取消",
          "value": "Cancelled"
        }
      ]
    }),
    target_start_date: Field.date({ label: '期望到岗日期' }),
    posted_date: Field.date({ label: '发布日期' }),
    close_date: Field.date({ label: '关闭日期' }),
    job_description: Field.textarea({
      label: '职位描述',
      description: '详细的职位职责和要求',
      rows: 8
    }),
    requirements: Field.textarea({
      label: '任职要求',
      description: '学历、经验、技能等要求',
      rows: 5
    }),
    salary_range_min: Field.currency({
      label: '薪资范围（最低）',
      precision: 2
    }),
    salary_range_max: Field.currency({
      label: '薪资范围（最高）',
      precision: 2
    }),
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