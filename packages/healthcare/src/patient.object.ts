import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Patient = ObjectSchema.create({
  name: 'patient',
  label: 'Patient',
  icon: 'heart-pulse',
  fields: {
    name: Field.text({ label: 'Patient Name', required: true, maxLength: 255 }),
    date_of_birth: Field.date({ label: 'Date of Birth' }),
    gender: Field.select({
      label: 'Gender',
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
        { label: 'Prefer Not to Say', value: 'prefer_not_to_say' }
      ]
    }),
    insurance_id: Field.lookup('insurance', { label: 'Insurance' }),
    primary_physician: Field.lookup('contact', { label: 'Primary Physician' }),
    allergies: Field.textarea({ label: 'Allergies' }),
    medical_record_number: Field.text({ label: 'Medical Record Number', unique: true }),
    email: Field.email({ label: 'Email' }),
    phone: Field.phone({ label: 'Phone' }),
    emergency_contact: Field.text({ label: 'Emergency Contact' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Deceased', value: 'deceased' }
      ],
      defaultValue: 'active'
    })
  }
});
