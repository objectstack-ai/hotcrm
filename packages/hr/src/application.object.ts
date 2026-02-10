import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Application = ObjectSchema.create({
  name: 'application',
  label: 'Job Application',
  pluralLabel: 'Job Applications',
  icon: 'file-alt',
  description: 'Candidate job application record management',

  fields: {
    application_number: Field.text({
      label: 'Application Number',
      unique: true,
      maxLength: 40
    }),
    candidate_id: Field.lookup('candidate', {
      label: 'Candidate',
      required: true
    }),
    recruitment_id: Field.lookup('recruitment', {
      label: 'Recruitment Requisition',
      required: true
    }),
    applied_date: Field.date({
      label: 'Application Date',
      required: true,
      defaultValue: '$today'
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'submitted',
      options: [
        {
          "label": "Submitted",
          "value": "submitted"
        },
        {
          "label": "Screening",
          "value": "screening"
        },
        {
          "label": "Interview Scheduled",
          "value": "interview_scheduled"
        },
        {
          "label": "Interviewing",
          "value": "interviewing"
        },
        {
          "label": "Shortlisted",
          "value": "shortlisted"
        },
        {
          "label": "Hired",
          "value": "offer_extended"
        },
        {
          "label": "Rejected",
          "value": "rejected"
        },
        {
          "label": "Withdrawn",
          "value": "withdrawn"
        }
      ]
    }),
    stage: Field.select({
      label: 'Current Stage',
      options: [
        {
          "label": "Resume Review",
          "value": "resume_review"
        },
        {
          "label": "Phone Screen",
          "value": "phone_screen"
        },
        {
          "label": "First Interview",
          "value": "first_interview"
        },
        {
          "label": "Second Interview",
          "value": "second_interview"
        },
        {
          "label": "Final Interview",
          "value": "final_interview"
        },
        {
          "label": "Offer Discussion",
          "value": "offer_discussion"
        },
        {
          "label": "Background Check",
          "value": "background_check"
        }
      ]
    }),
    source: Field.select({
      label: 'Source Channel',
      options: [
        {
          "label": "Job Board",
          "value": "job_board"
        },
        {
          "label": "Employee Referral",
          "value": "employee_referral"
        },
        {
          "label": "Headhunter",
          "value": "headhunter"
        },
        {
          "label": "Social Media",
          "value": "social_media"
        },
        {
          "label": "Campus",
          "value": "campus"
        },
        {
          "label": "Direct Application",
          "value": "direct_application"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    referrer_id: Field.lookup('employee', {
      label: 'Referrer',
      description: 'Records the referrer for employee referrals'
    }),
    resume_url: Field.url({ label: 'Resume URL' }),
    cover_letter: Field.textarea({
      label: 'Cover Letter',
    }),
    rejection_reason: Field.textarea({
      label: 'Rejection Reason',
      description: 'Records the reason if rejected',
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