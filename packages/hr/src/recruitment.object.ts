import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Recruitment = ObjectSchema.create({
  name: 'recruitment',
  label: 'Recruitment Requisition',
  pluralLabel: 'Recruitment Requisitions',
  icon: 'user-plus',
  description: '职位招聘需求和招聘计划管理',

  fields: {
    title: Field.text({
      label: 'Recruitment Title',
      required: true,
      maxLength: 255
    }),
    requisition_number: Field.text({
      label: 'Requisition Number',
      unique: true,
      maxLength: 40
    }),
    position_id: Field.lookup('position', {
      label: 'Position',
      required: true
    }),
    department_id: Field.lookup('department', {
      label: 'Department',
      required: true
    }),
    hiring_manager_id: Field.lookup('employee', {
      label: 'Hiring Manager',
      description: '负责此次招聘的经理',
      required: true
    }),
    headcount: Field.number({
      label: 'Headcount',
      required: true,
      defaultValue: 1
    }),
    priority: Field.select({
      label: 'Priority',
      defaultValue: 'Medium',
      options: [
        {
          "label": "Urgent",
          "value": "Urgent"
        },
        {
          "label": "High",
          "value": "High"
        },
        {
          "label": "Medium",
          "value": "Medium"
        },
        {
          "label": "Low",
          "value": "Low"
        }
      ]
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'Open',
      options: [
        {
          "label": "Draft",
          "value": "Draft"
        },
        {
          "label": "Pending Approval",
          "value": "Pending Approval"
        },
        {
          "label": "Open",
          "value": "Open"
        },
        {
          "label": "In Progress",
          "value": "In Progress"
        },
        {
          "label": "On Hold",
          "value": "On Hold"
        },
        {
          "label": "Completed",
          "value": "Filled"
        },
        {
          "label": "Cancelled",
          "value": "Cancelled"
        }
      ]
    }),
    target_start_date: Field.date({ label: 'Target Start Date' }),
    posted_date: Field.date({ label: 'Posted Date' }),
    close_date: Field.date({ label: 'Close Date' }),
    job_description: Field.textarea({
      label: 'Position Description',
      description: '详细的职位职责和要求',
    }),
    requirements: Field.textarea({
      label: 'Requirements',
      description: '学历、经验、技能等要求',
    }),
    salary_range_min: Field.currency({
      label: 'Salary Range (Min)',
      precision: 2
    }),
    salary_range_max: Field.currency({
      label: 'Salary Range (Max)',
      precision: 2
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