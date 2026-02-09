import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Training = ObjectSchema.create({
  name: 'training',
  label: 'Training',
  pluralLabel: 'Trainings',
  icon: 'graduation-cap',
  description: '员工培训和学习发展管理',

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
          "value": "Onboarding"
        },
        {
          "label": "Skills Training",
          "value": "Skills Training"
        },
        {
          "label": "Leadership",
          "value": "Leadership"
        },
        {
          "label": "Compliance",
          "value": "Compliance"
        },
        {
          "label": "Product",
          "value": "Product"
        },
        {
          "label": "Sales",
          "value": "Sales"
        },
        {
          "label": "Safety",
          "value": "Safety"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    category: Field.select({
      label: 'Training Category',
      options: [
        {
          "label": "Internal",
          "value": "Internal"
        },
        {
          "label": "External",
          "value": "External"
        },
        {
          "label": "Online",
          "value": "Online"
        },
        {
          "label": "Workshop",
          "value": "Workshop"
        },
        {
          "label": "Conference",
          "value": "Conference"
        },
        {
          "label": "Certification",
          "value": "Certification"
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
      description: '线下地点或线上会议链接',
      maxLength: 255
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'Scheduled',
      options: [
        {
          "label": "Scheduled",
          "value": "Scheduled"
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
        },
        {
          "label": "Absent",
          "value": "No Show"
        }
      ]
    }),
    attendance_status: Field.select({
      label: 'Attendance Status',
      options: [
        {
          "label": "Attended",
          "value": "Attended"
        },
        {
          "label": "Partial",
          "value": "Partial"
        },
        {
          "label": "Absent",
          "value": "Absent"
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
      description: '如有考试，记录成绩',
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
      description: '员工的培训体验和收获',
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