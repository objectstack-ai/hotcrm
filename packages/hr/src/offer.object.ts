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
      defaultValue: 'full_time',
      options: [
        {
          "label": "Full-time",
          "value": "full_time"
        },
        {
          "label": "Part-time",
          "value": "part_time"
        },
        {
          "label": "Contract",
          "value": "contract"
        },
        {
          "label": "Intern",
          "value": "intern"
        }
      ]
    }),
    probation_period: Field.select({
      label: 'Probation',
      options: [
        {
          "label": "None",
          "value": "none"
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
        },
        {
          "label": "6 Months",
          "value": "six_months"
        }
      ]
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'draft',
      options: [
        {
          "label": "Draft",
          "value": "draft"
        },
        {
          "label": "Pending Approval",
          "value": "pending_approval"
        },
        {
          "label": "Extended",
          "value": "extended"
        },
        {
          "label": "Accepted",
          "value": "accepted"
        },
        {
          "label": "Rejected",
          "value": "rejected"
        },
        {
          "label": "Withdrawn",
          "value": "withdrawn"
        },
        {
          "label": "Expired",
          "value": "expired"
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