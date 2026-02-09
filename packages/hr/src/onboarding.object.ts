import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Onboarding = ObjectSchema.create({
  name: 'onboarding',
  label: 'Onboarding',
  pluralLabel: 'Onboardings',
  icon: 'user-graduate',
  description: '新员工入职和培训流程管理',

  fields: {
    title: Field.text({
      label: 'Onboarding Title',
      required: true,
      maxLength: 255
    }),
    employee_id: Field.lookup('employee', {
      label: 'Employee',
      required: true
    }),
    offer_id: Field.lookup('offer', { label: 'Related Offer' }),
    start_date: Field.date({
      label: 'Hire Date',
      required: true
    }),
    buddy_id: Field.lookup('employee', {
      label: 'Onboarding Buddy',
      description: '帮助新员工熟悉环境的同事'
    }),
    manager_id: Field.lookup('employee', {
      label: 'Direct Manager',
      required: true
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'Not Started',
      options: [
        {
          "label": "Not Started",
          "value": "Not Started"
        },
        {
          "label": "In Progress",
          "value": "In Progress"
        },
        {
          "label": "Completed",
          "value": "Completed"
        },
        {
          "label": "Cancelled",
          "value": "Cancelled"
        }
      ]
    }),
    completion_percentage: Field.percent({
      label: 'Completion Progress',
      description: '入职任务完成百分比',
      readonly: true
    }),
    paperwork_completed: Field.boolean({
      label: 'Paperwork Completed',
      description: '劳动合同、保密协议等',
      defaultValue: false
    }),
    it_setup_completed: Field.boolean({
      label: 'IT Setup Completed',
      description: '电脑、邮箱、系统权限等',
      defaultValue: false
    }),
    workspace_setup_completed: Field.boolean({
      label: 'Workspace Setup Completed',
      defaultValue: false
    }),
    training_completed: Field.boolean({
      label: 'Basic Training Completed',
      description: '公司文化、规章制度等培训',
      defaultValue: false
    }),
    system_access_granted: Field.boolean({
      label: 'System Access Granted',
      defaultValue: false
    }),
    first_day_checklist: Field.textarea({
      label: 'First Day Checklist',
      description: '第一天需要完成的任务',
    }),
    first_week_goals: Field.textarea({
      label: 'First Week Goals',
    }),
    first_month_goals: Field.textarea({
      label: 'First Month Goals',
    }),
    probation_end_date: Field.date({ label: 'Probation End Date' }),
    feedback: Field.textarea({
      label: 'Onboarding Feedback',
      description: '新员工的入职体验反馈',
    }),
    notes: Field.textarea({
      label: 'Notes',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
  },
});