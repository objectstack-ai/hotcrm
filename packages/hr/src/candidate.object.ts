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
          "value": "PhD"
        },
        {
          "label": "Master",
          "value": "Master"
        },
        {
          "label": "Bachelor",
          "value": "Bachelor"
        },
        {
          "label": "Associate",
          "value": "Associate"
        },
        {
          "label": "High School",
          "value": "High School"
        },
        {
          "label": "Other",
          "value": "Other"
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
          "value": "Immediate"
        },
        {
          "label": "1 Week",
          "value": "1 Week"
        },
        {
          "label": "2 Weeks",
          "value": "2 Weeks"
        },
        {
          "label": "1 Month",
          "value": "1 Month"
        },
        {
          "label": "2 Months",
          "value": "2 Months"
        },
        {
          "label": "3 Months",
          "value": "3 Months"
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
    status: Field.select({
      label: 'Status',
      defaultValue: 'New',
      options: [
        {
          "label": "New",
          "value": "New"
        },
        {
          "label": "Under Review",
          "value": "Under Review"
        },
        {
          "label": "Interviewing",
          "value": "Interviewing"
        },
        {
          "label": "Hired",
          "value": "Hired"
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