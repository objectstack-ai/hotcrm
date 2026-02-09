import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Interview = ObjectSchema.create({
  name: 'interview',
  label: 'Interview',
  pluralLabel: 'Interviews',
  icon: 'comments',
  description: '面试安排和记录管理',

  fields: {
    title: Field.text({
      label: 'Interview Title',
      required: true,
      maxLength: 255
    }),
    candidate_id: Field.lookup('candidate', {
      label: 'Candidate',
      required: true
    }),
    application_id: Field.lookup('application', {
      label: 'Application',
      required: true
    }),
    recruitment_id: Field.lookup('recruitment', {
      label: 'Recruitment Requisition',
      required: true
    }),
    interview_type: Field.select({
      label: 'Interview Type',
      defaultValue: 'First Round',
      options: [
        {
          "label": "Phone Screen",
          "value": "Phone Screen"
        },
        {
          "label": "Video Interview",
          "value": "Video Interview"
        },
        {
          "label": "First Interview",
          "value": "First Round"
        },
        {
          "label": "Second Interview",
          "value": "Second Round"
        },
        {
          "label": "Final Interview",
          "value": "Final Round"
        },
        {
          "label": "Technical",
          "value": "Technical"
        },
        {
          "label": "HR Interview",
          "value": "HR"
        }
      ]
    }),
    scheduled_date: Field.datetime({
      label: 'Interview Date',
      required: true
    }),
    duration: Field.number({
      label: 'Duration (Minutes)',
      defaultValue: 60
    }),
    location: Field.text({
      label: 'Interview Location',
      description: '线下地点或线上会议链接',
      maxLength: 255
    }),
    interviewer_id: Field.lookup('employee', {
      label: 'Lead Interviewer',
      required: true
    }),
    panel_members: Field.text({
      label: 'Interview Panel',
      description: '多位面试官用逗号分隔',
      maxLength: 500
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
          "label": "Confirmed",
          "value": "Confirmed"
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
          "label": "No Show",
          "value": "No Show"
        },
        {
          "label": "Rescheduled",
          "value": "Rescheduled"
        }
      ]
    }),
    result: Field.select({
      label: 'Interview Result',
      options: [
        {
          "label": "Strong Hire",
          "value": "Strong Hire"
        },
        {
          "label": "Hire",
          "value": "Hire"
        },
        {
          "label": "Maybe",
          "value": "Maybe"
        },
        {
          "label": "No Hire",
          "value": "No Hire"
        },
        {
          "label": "Strong No Hire",
          "value": "Strong No Hire"
        }
      ]
    }),
    feedback: Field.textarea({
      label: 'Interview Feedback',
      description: '详细的面试评价和建议',
    }),
    strengths: Field.textarea({
      label: 'Strengths',
    }),
    weaknesses: Field.textarea({
      label: 'Weaknesses',
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