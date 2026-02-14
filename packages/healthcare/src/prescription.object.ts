import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Prescription = ObjectSchema.create({
  name: 'prescription',
  label: 'Prescription',
  fields: {
    patient_id: Field.masterDetail('patient', { label: 'Patient' }),
    medication: Field.text({ label: 'Medication Name', required: true }),
    dosage: Field.text({ label: 'Dosage', required: true }),
    frequency: Field.text({ label: 'Frequency', required: true }),
    prescriber_id: Field.lookup('contact', { label: 'Prescriber' }),
    pharmacy: Field.text({ label: 'Pharmacy' }),
    refills_remaining: Field.number({ label: 'Refills Remaining', min: 0, defaultValue: 0 }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Expired', value: 'expired' }
      ],
      defaultValue: 'active'
    }),
    start_date: Field.text({ label: 'Start Date' }),
    end_date: Field.text({ label: 'End Date' }),
    instructions: Field.textarea({ label: 'Special Instructions' })
  }
});
