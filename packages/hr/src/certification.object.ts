import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Certification = ObjectSchema.create({
  name: 'certification',
  label: 'Certification',
  pluralLabel: 'Certifications',
  icon: 'certificate',
  description: 'Employee professional certification and qualification management',

  fields: {
    title: Field.text({
      label: 'Certification Name',
      required: true,
      maxLength: 255
    }),
    employee_id: Field.lookup('employee', {
      label: 'Employee',
      required: true
    }),
    certification_type: Field.select({
      label: 'Certification Type',
      options: [
        {
          "label": "Professional",
          "value": "professional"
        },
        {
          "label": "Technical",
          "value": "technical"
        },
        {
          "label": "Language",
          "value": "language"
        },
        {
          "label": "Management",
          "value": "management"
        },
        {
          "label": "Safety",
          "value": "safety"
        },
        {
          "label": "Compliance",
          "value": "compliance"
        },
        {
          "label": "Other",
          "value": "other"
        }
      ]
    }),
    issuing_organization: Field.text({
      label: 'Issuing Organization',
      required: true,
      maxLength: 255
    }),
    certification_number: Field.text({
      label: 'Certificate Number',
      maxLength: 100
    }),
    issue_date: Field.date({
      label: 'Issue Date',
      required: true
    }),
    expiry_date: Field.date({
      label: 'Expiry Date',
      description: 'Applicable if the certificate has an expiration date'
    }),
    is_active: Field.boolean({
      label: 'Is Active',
      description: 'Whether the certificate is currently valid',
      defaultValue: true
    }),
    renewal_required: Field.boolean({
      label: 'Renewal Required',
      defaultValue: false
    }),
    next_renewal_date: Field.date({ label: 'Next Renewal Date' }),
    training_id: Field.lookup('training', {
      label: 'Related Training',
      description: 'If obtained through training'
    }),
    score: Field.number({
      label: 'Exam Score',
      description: 'Records exam score if applicable',
      precision: 2
    }),
    certificate_url: Field.url({ label: 'Certificate URL' }),
    verification_url: Field.url({
      label: 'Verification URL',
      description: 'Link to verify the certificate online'
    }),
    cost: Field.currency({
      label: 'Certification Cost',
      precision: 2
    }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'active',
      options: [
        {
          "label": "Active",
          "value": "active"
        },
        {
          "label": "Expiring Soon",
          "value": "expiring_soon"
        },
        {
          "label": "Expired",
          "value": "expired"
        },
        {
          "label": "Revoked",
          "value": "revoked"
        }
      ]
    }),
    description: Field.textarea({
      label: 'Certification Description',
      description: 'Content and value of the certification',
    }),
    notes: Field.textarea({
      label: 'Notes',
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: true,
  },
});