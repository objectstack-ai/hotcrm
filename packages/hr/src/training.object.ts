import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Training = ObjectSchema.create({
  name: 'training',
  label: 'Training',
  pluralLabel: 'Trainings',
  icon: 'graduation-cap',
  description: 'Employee training and learning development management',

  fields: {
    title: Field.text({
      label: 'Training Name',
      required: true,
      maxLength: 255
    }),
    training_code: Field.text({
      label: 'Training Code',
      unique: true,
      maxLength: 40
    }),
    employee_id: Field.lookup('employee', {
      label: 'Trainee',
      required: true
    }),
    training_type: Field.select({
      label: 'Training Type',
      options: [
        {
          "label": "Onboarding",
          "value": "onboarding"
        },
        {
          "label": "Skills Training",
          "value": "skills_training"
        },
        {
          "label": "Leadership",
          "value": "leadership"
        },
        {
          "label": "Compliance",
          "value": "compliance"
        },
        {
          "label": "Product",
          "value": "product"
        },
        {
          "label": "Sales",
          "value": "sales"
        },
        {
          "label": "Safety",
          "value": "safety"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    category: Field.select({
      label: 'Training Category',
      options: [
        {
          "label": "Internal",
          "value": "internal"
        },
        {
          "label": "External",
          "value": "external"
        },
        {
          "label": "Online",
          "value": "online"
        },
        {
          "label": "Workshop",
          "value": "workshop"
        },
        {
          "label": "Conference",
          "value": "conference"
        },
        {
          "label": "Certification",
          "value": "certification"
        }
      ]
    }),
    provider: Field.text({
      label: 'Training Provider/Instructor',
      maxLength: 255
    }),
    start_date: Field.datetime({
      label: 'Start Time',
      required: true
    }),
    end_date: Field.datetime({
      label: 'End Time',
      required: true
    }),
    duration_hours: Field.number({
      label: 'Duration (Hours)',
      precision: 1
    }),
    location: Field.text({
      label: 'Training Location',
      description: 'Physical location or online meeting link',
      maxLength: 255
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'scheduled',
      options: [
        {
          "label": "Scheduled",
          "value": "scheduled"
        },
        {
          "label": "In Progress",
          "value": "in_progress"
        },
        {
          "label": "Completed",
          "value": "completed"
        },
        {
          "label": "Cancelled",
          "value": "cancelled"
        },
        {
          "label": "Absent",
          "value": "no_show"
        }
      ]
    }),
    attendance_status: Field.select({
      label: 'Attendance Status',
      options: [
        {
          "label": "Attended",
          "value": "attended"
        },
        {
          "label": "Partial",
          "value": "partial"
        },
        {
          "label": "Absent",
          "value": "absent"
        }
      ]
    }),
    completion_percentage: Field.percent({ label: 'Completion Progress' }),
    is_mandatory: Field.boolean({
      label: 'Is Mandatory',
      defaultValue: false
    }),
    cost: Field.currency({
      label: 'Training Cost',
      precision: 2
    }),
    exam_score: Field.number({
      label: 'Exam Score',
      description: 'Records exam score if applicable',
      min: 0,
      max: 100,
      precision: 2
    }),
    passed: Field.boolean({
      label: 'Passed',
      defaultValue: false
    }),
    certificate_url: Field.url({ label: 'Certificate URL' }),
    description: Field.textarea({
      label: 'Training Description',
    }),
    learning_objectives: Field.textarea({
      label: 'Learning Objectives',
    }),
    feedback: Field.textarea({
      label: 'Training Feedback',
      description: 'Employee training experience and takeaways',
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