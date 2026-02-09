import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Offer = ObjectSchema.create({
  name: 'offer',
  label: 'Offer',
  pluralLabel: 'Offers',
  icon: 'file-contract',
  description: 'Employment offer notification and management',

  fields: {
    offer_number: Field.text({
      label: 'Offer Number',
      unique: true,
      maxLength: 40
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
    position_id: Field.lookup('position', {
      label: 'Position',
      required: true
    }),
    department_id: Field.lookup('department', {
      label: 'Department',
      required: true
    }),
    hiring_manager_id: Field.lookup('employee', {
      label: 'Hiring Manager',
      required: true
    }),
    offer_date: Field.date({
      label: 'Offer Date',
      required: true,
      defaultValue: '$today'
    }),
    expiry_date: Field.date({
      label: 'Expiry Date',
      description: 'Offer expiration date'
    }),
    start_date: Field.date({
      label: 'Expected Start Date',
      required: true
    }),
    base_salary: Field.currency({
      label: 'Base Salary',
      required: true,
      precision: 2
    }),
    bonus: Field.currency({
      label: 'Bonus',
      precision: 2
    }),
    equity: Field.text({
      label: 'Equity/Stock Options',
      description: 'Equity or stock options description',
      maxLength: 255
    }),
    benefits: Field.textarea({
      label: 'Benefits',
      description: 'Benefits such as health insurance, paid time off, etc.',
    }),
    employment_type: Field.select({
      label: 'Employment Type',
      defaultValue: 'Full-time',
      options: [
        {
          "label": "Full-time",
          "value": "Full-time"
        },
        {
          "label": "Part-time",
          "value": "Part-time"
        },
        {
          "label": "Contract",
          "value": "Contract"
        },
        {
          "label": "Intern",
          "value": "Intern"
        }
      ]
    }),
    probation_period: Field.select({
      label: 'Probation',
      options: [
        {
          "label": "None",
          "value": "None"
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
        },
        {
          "label": "6 Months",
          "value": "6 Months"
        }
      ]
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'Draft',
      options: [
        {
          "label": "Draft",
          "value": "Draft"
        },
        {
          "label": "Pending Approval",
          "value": "Pending Approval"
        },
        {
          "label": "Extended",
          "value": "Extended"
        },
        {
          "label": "Accepted",
          "value": "Accepted"
        },
        {
          "label": "Rejected",
          "value": "Rejected"
        },
        {
          "label": "Withdrawn",
          "value": "Withdrawn"
        },
        {
          "label": "Expired",
          "value": "Expired"
        }
      ]
    }),
    response_date: Field.date({ label: 'Candidate Response Date' }),
    rejection_reason: Field.textarea({
      label: 'Rejection Reason',
      description: 'Records the reason if the candidate declines',
    }),
    offer_letter_url: Field.url({ label: 'Offer Letter URL' }),
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