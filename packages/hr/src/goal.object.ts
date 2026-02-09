import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Goal = ObjectSchema.create({
  name: 'goal',
  label: 'Goal',
  pluralLabel: 'Goals',
  icon: 'bullseye',
  description: 'OKR和个人目标管理',

  fields: {
    title: Field.text({
      label: 'Goal Name',
      required: true,
      maxLength: 255
    }),
    employee_id: Field.lookup('employee', {
      label: 'Assigned Employee',
      required: true
    }),
    manager_id: Field.lookup('employee', {
      label: 'Goal Setter',
      description: '通常是直属经理'
    }),
    goal_type: Field.select({
      label: 'Goal Type',
      defaultValue: 'Individual',
      options: [
        {
          "label": "Individual",
          "value": "Individual"
        },
        {
          "label": "Team",
          "value": "Team"
        },
        {
          "label": "OKR",
          "value": "OKR"
        },
        {
          "label": "Development",
          "value": "Development"
        },
        {
          "label": "Project",
          "value": "Project"
        }
      ]
    }),
    category: Field.select({
      label: 'Goal Category',
      options: [
        {
          "label": "Performance",
          "value": "Performance"
        },
        {
          "label": "Skill Development",
          "value": "Skill Development"
        },
        {
          "label": "Leadership",
          "value": "Leadership"
        },
        {
          "label": "Innovation",
          "value": "Innovation"
        },
        {
          "label": "Teamwork",
          "value": "Teamwork"
        },
        {
          "label": "Customer Satisfaction",
          "value": "Customer Satisfaction"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    priority: Field.select({
      label: 'Priority',
      defaultValue: 'Medium',
      options: [
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
    start_date: Field.date({
      label: 'Start Date',
      required: true
    }),
    target_date: Field.date({
      label: 'Target Date',
      required: true
    }),
    completion_date: Field.date({ label: 'Completion Date' }),
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
          "label": "At Risk",
          "value": "At Risk"
        },
        {
          "label": "Completed",
          "value": "Completed"
        },
        {
          "label": "Not Achieved",
          "value": "Not Achieved"
        },
        {
          "label": "Cancelled",
          "value": "Cancelled"
        }
      ]
    }),
    progress: Field.percent({
      label: 'Completion Progress',
      description: '目标完成百分比',
      defaultValue: 0
    }),
    target_value: Field.number({
      label: 'Target Value',
      description: '量化的目标数值',
      precision: 2
    }),
    current_value: Field.number({
      label: 'Current Value',
      description: '当前达成的数值',
      precision: 2
    }),
    unit: Field.text({
      label: 'Unit',
      description: '目标值的单位，如：个、万元、%',
      maxLength: 40
    }),
    description: Field.textarea({
      label: 'Goal Description',
      description: '详细的目标说明和期望结果',
    }),
    key_results: Field.textarea({
      label: 'Key Results (KR)',
      description: 'OKR的关键结果，可列出多个',
    }),
    performance_review_id: Field.lookup('performance_review', { label: 'Related Performance Review' }),
    weight: Field.percent({
      label: 'Weight',
      description: '在绩效考核中的权重'
    }),
    achievement_notes: Field.textarea({
      label: 'Achievement Notes',
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