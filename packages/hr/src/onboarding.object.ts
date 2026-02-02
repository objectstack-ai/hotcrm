import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Onboarding = ObjectSchema.create({
  name: 'onboarding',
  label: '入职流程',
  pluralLabel: '入职流程',
  icon: 'user-graduate',
  description: '新员工入职和培训流程管理',

  fields: {
    title: Field.text({
      label: '入职流程名称',
      required: true,
      maxLength: 255
    }),
    employee_id: Field.lookup('employee', {
      label: '员工',
      required: true
    }),
    offer_id: Field.lookup('offer', { label: '关联Offer' }),
    start_date: Field.date({
      label: '入职日期',
      required: true
    }),
    buddy_id: Field.lookup('employee', {
      label: '入职导师',
      description: '帮助新员工熟悉环境的同事'
    }),
    manager_id: Field.lookup('employee', {
      label: '直属经理',
      required: true
    }),
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
          "label": "已完成",
          "value": "Completed"
        },
        {
          "label": "已取消",
          "value": "Cancelled"
        }
      ]
    }),
    completion_percentage: Field.percent({
      label: '完成进度',
      description: '入职任务完成百分比',
      readonly: true
    }),
    paperwork_completed: Field.checkbox({
      label: '文件签署完成',
      description: '劳动合同、保密协议等',
      defaultValue: false
    }),
    it_setup_completed: Field.checkbox({
      label: 'IT设备配置完成',
      description: '电脑、邮箱、系统权限等',
      defaultValue: false
    }),
    workspace_setup_completed: Field.checkbox({
      label: '工位准备完成',
      defaultValue: false
    }),
    training_completed: Field.checkbox({
      label: '基础培训完成',
      description: '公司文化、规章制度等培训',
      defaultValue: false
    }),
    system_access_granted: Field.checkbox({
      label: '系统访问权限已开通',
      defaultValue: false
    }),
    first_day_checklist: Field.textarea({
      label: '首日任务清单',
      description: '第一天需要完成的任务',
      rows: 6
    }),
    first_week_goals: Field.textarea({
      label: '第一周目标',
      rows: 4
    }),
    first_month_goals: Field.textarea({
      label: '第一个月目标',
      rows: 4
    }),
    probation_end_date: Field.date({ label: '试用期结束日期' }),
    feedback: Field.textarea({
      label: '入职反馈',
      description: '新员工的入职体验反馈',
      rows: 5
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