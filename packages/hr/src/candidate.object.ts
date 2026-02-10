import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Candidate = ObjectSchema.create({
  name: 'candidate',
  label: 'Candidate',
  pluralLabel: 'Candidates',
  icon: 'user-check',
  description: 'Job candidate information management',

  fields: {
    first_name: Field.text({
      label: 'First Name',
      required: true,
      maxLength: 40
    }),
    last_name: Field.text({
      label: 'Last Name',
      required: true,
      maxLength: 80
    }),
    email: Field.email({
      label: 'Email',
      required: true,
      unique: true
    }),
    phone: Field.phone({ label: 'Phone' }),
    mobile_phone: Field.phone({
      label: 'Mobile',
      required: true
    }),
    linkedin_url: Field.url({ label: 'LinkedIn URL' }),
    current_company: Field.text({
      label: 'Current Company',
      maxLength: 255
    }),
    current_title: Field.text({
      label: 'Current Title',
      maxLength: 255
    }),
    years_of_experience: Field.number({
      label: 'Years of Experience',
      description: 'Total years of work experience',
      precision: 1
    }),
    highest_education: Field.select({
      label: 'Highest Education',
      options: [
        {
          "label": "PhD",
          "value": "phd"
        },
        {
          "label": "Master",
          "value": "master"
        },
        {
          "label": "Bachelor",
          "value": "bachelor"
        },
        {
          "label": "Associate",
          "value": "associate"
        },
        {
          "label": "High School",
          "value": "high_school"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    university: Field.text({
      label: 'University',
      maxLength: 255
    }),
    major: Field.text({
      label: 'Major',
      maxLength: 255
    }),
    current_salary: Field.currency({
      label: 'Current Salary',
      precision: 2
    }),
    expected_salary: Field.currency({
      label: 'Expected Salary',
      precision: 2
    }),
    notice_period: Field.select({
      label: 'Notice Period',
      options: [
        {
          "label": "Immediate",
          "value": "immediate"
        },
        {
          "label": "1 Week",
          "value": "one_week"
        },
        {
          "label": "2 Weeks",
          "value": "two_weeks"
        },
        {
          "label": "1 Month",
          "value": "one_month"
        },
        {
          "label": "2 Months",
          "value": "two_months"
        },
        {
          "label": "3 Months",
          "value": "three_months"
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
    status: Field.select({
      label: 'Status',
      defaultValue: 'new',
      options: [
        {
          "label": "New",
          "value": "new"
        },
        {
          "label": "Under Review",
          "value": "under_review"
        },
        {
          "label": "Interviewing",
          "value": "interviewing"
        },
        {
          "label": "Hired",
          "value": "hired"
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
    resume_url: Field.url({ label: 'Resume URL' }),
    city: Field.text({
      label: 'City',
      maxLength: 40
    }),
    country: Field.text({
      label: 'Country',
      maxLength: 40
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