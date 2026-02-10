import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Recruitment = ObjectSchema.create({
  name: 'recruitment',
  label: 'Recruitment Requisition',
  pluralLabel: 'Recruitment Requisitions',
  icon: 'user-plus',
  description: 'Job recruitment requisition and hiring plan management',

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
      description: 'Manager responsible for this recruitment',
      required: true
    }),
    headcount: Field.number({
      label: 'Headcount',
      required: true,
      defaultValue: 1
    }),
    priority: Field.select({
      label: 'Priority',
      defaultValue: 'medium',
      options: [
        {
          "label": "Urgent",
          "value": "urgent"
        },
        {
          "label": "High",
          "value": "high"
        },
        {
          "label": "Medium",
          "value": "medium"
        },
        {
          "label": "Low",
          "value": "low"
        }
      ]
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'open',
      options: [
        {
          "label": "Draft",
          "value": "draft"
        },
        {
          "label": "Pending Approval",
          "value": "pending_approval"
        },
        {
          "label": "Open",
          "value": "open"
        },
        {
          "label": "In Progress",
          "value": "in_progress"
        },
        {
          "label": "On Hold",
          "value": "on_hold"
        },
        {
          "label": "Completed",
          "value": "filled"
        },
        {
          "label": "Cancelled",
          "value": "cancelled"
        }
      ]
    }),
    target_start_date: Field.date({ label: 'Target Start Date' }),
    posted_date: Field.date({ label: 'Posted Date' }),
    close_date: Field.date({ label: 'Close Date' }),
    job_description: Field.textarea({
      label: 'Position Description',
      description: 'Detailed position responsibilities and requirements',
    }),
    requirements: Field.textarea({
      label: 'Requirements',
      description: 'Education, experience, skills, and other requirements',
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