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
      defaultValue: 'Submitted',
      options: [
        {
          "label": "Submitted",
          "value": "Submitted"
        },
        {
          "label": "Screening",
          "value": "Screening"
        },
        {
          "label": "Interview Scheduled",
          "value": "Interview Scheduled"
        },
        {
          "label": "Interviewing",
          "value": "Interviewing"
        },
        {
          "label": "Shortlisted",
          "value": "Shortlisted"
        },
        {
          "label": "Hired",
          "value": "Offer Extended"
        },
        {
          "label": "Rejected",
          "value": "Rejected"
        },
        {
          "label": "Withdrawn",
          "value": "Withdrawn"
        }
      ]
    }),
    stage: Field.select({
      label: 'Current Stage',
      options: [
        {
          "label": "Resume Review",
          "value": "Resume Review"
        },
        {
          "label": "Phone Screen",
          "value": "Phone Screen"
        },
        {
          "label": "First Interview",
          "value": "First Interview"
        },
        {
          "label": "Second Interview",
          "value": "Second Interview"
        },
        {
          "label": "Final Interview",
          "value": "Final Interview"
        },
        {
          "label": "Offer Discussion",
          "value": "Offer Discussion"
        },
        {
          "label": "Background Check",
          "value": "Background Check"
        }
      ]
    }),
    source: Field.select({
      label: 'Source Channel',
      options: [
        {
          "label": "Job Board",
          "value": "Job Board"
        },
        {
          "label": "Employee Referral",
          "value": "Employee Referral"
        },
        {
          "label": "Headhunter",
          "value": "Headhunter"
        },
        {
          "label": "Social Media",
          "value": "Social Media"
        },
        {
          "label": "Campus",
          "value": "Campus"
        },
        {
          "label": "Direct Application",
          "value": "Direct Application"
        },
        {
          "label": "Other",
          "value": "Other"
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