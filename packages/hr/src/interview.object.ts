import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Interview = ObjectSchema.create({
  name: 'interview',
  label: 'Interview',
  pluralLabel: 'Interviews',
  icon: 'comments',
  description: 'Interview scheduling and record management',

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
      defaultValue: 'first_round',
      options: [
        {
          "label": "Phone Screen",
          "value": "phone_screen"
        },
        {
          "label": "Video Interview",
          "value": "video_interview"
        },
        {
          "label": "First Interview",
          "value": "first_round"
        },
        {
          "label": "Second Interview",
          "value": "second_round"
        },
        {
          "label": "Final Interview",
          "value": "final_round"
        },
        {
          "label": "Technical",
          "value": "technical"
        },
        {
          "label": "HR Interview",
          "value": "hr"
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
      description: 'Physical location or online meeting link',
      maxLength: 255
    }),
    interviewer_id: Field.lookup('employee', {
      label: 'Lead Interviewer',
      required: true
    }),
    panel_members: Field.text({
      label: 'Interview Panel',
      description: 'Multiple interviewers separated by commas',
      maxLength: 500
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
          "label": "Confirmed",
          "value": "confirmed"
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
          "label": "No Show",
          "value": "no_show"
        },
        {
          "label": "Rescheduled",
          "value": "rescheduled"
        }
      ]
    }),
    result: Field.select({
      label: 'Interview Result',
      options: [
        {
          "label": "Strong Hire",
          "value": "strong_hire"
        },
        {
          "label": "Hire",
          "value": "hire"
        },
        {
          "label": "Maybe",
          "value": "maybe"
        },
        {
          "label": "No Hire",
          "value": "no_hire"
        },
        {
          "label": "Strong No Hire",
          "value": "strong_no_hire"
        }
      ]
    }),
    feedback: Field.textarea({
      label: 'Interview Feedback',
      description: 'Detailed interview evaluation and recommendations',
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