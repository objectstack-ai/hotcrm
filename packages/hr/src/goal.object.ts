import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Goal = ObjectSchema.create({
  name: 'goal',
  label: 'Goal',
  pluralLabel: 'Goals',
  icon: 'bullseye',
  description: 'OKR and individual goal management',

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
      description: 'Typically the direct manager'
    }),
    goal_type: Field.select({
      label: 'Goal Type',
      defaultValue: 'individual',
      options: [
        {
          "label": "Individual",
          "value": "individual"
        },
        {
          "label": "Team",
          "value": "team"
        },
        {
          "label": "OKR",
          "value": "okr"
        },
        {
          "label": "Development",
          "value": "development"
        },
        {
          "label": "Project",
          "value": "project"
        }
      ]
    }),
    category: Field.select({
      label: 'Goal Category',
      options: [
        {
          "label": "Performance",
          "value": "performance"
        },
        {
          "label": "Skill Development",
          "value": "skill_development"
        },
        {
          "label": "Leadership",
          "value": "leadership"
        },
        {
          "label": "Innovation",
          "value": "innovation"
        },
        {
          "label": "Teamwork",
          "value": "teamwork"
        },
        {
          "label": "Customer Satisfaction",
          "value": "customer_satisfaction"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    priority: Field.select({
      label: 'Priority',
      defaultValue: 'medium',
      options: [
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
      defaultValue: 'not_started',
      options: [
        {
          "label": "Not Started",
          "value": "not_started"
        },
        {
          "label": "In Progress",
          "value": "in_progress"
        },
        {
          "label": "At Risk",
          "value": "at_risk"
        },
        {
          "label": "Completed",
          "value": "completed"
        },
        {
          "label": "Not Achieved",
          "value": "not_achieved"
        },
        {
          "label": "Cancelled",
          "value": "cancelled"
        }
      ]
    }),
    progress: Field.percent({
      label: 'Completion Progress',
      description: 'Goal completion percentage',
      defaultValue: 0
    }),
    target_value: Field.number({
      label: 'Target Value',
      description: 'Quantified target value',
      precision: 2
    }),
    current_value: Field.number({
      label: 'Current Value',
      description: 'Current achieved value',
      precision: 2
    }),
    unit: Field.text({
      label: 'Unit',
      description: 'Unit of the target value, e.g., items, dollars, %',
      maxLength: 40
    }),
    description: Field.textarea({
      label: 'Goal Description',
      description: 'Detailed goal description and expected outcomes',
    }),
    key_results: Field.textarea({
      label: 'Key Results (KR)',
      description: 'Key results for OKR; multiple entries allowed',
    }),
    performance_review_id: Field.lookup('performance_review', { label: 'Related Performance Review' }),
    weight: Field.percent({
      label: 'Weight',
      description: 'Weight in performance evaluation'
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