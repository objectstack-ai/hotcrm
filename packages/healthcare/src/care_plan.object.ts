import { ObjectSchema, Field } from '@objectstack/spec/data';

export const CarePlan = ObjectSchema.create({
  name: 'care_plan',
  label: 'Care Plan',
  fields: {
    patient_id: Field.masterDetail('patient', { label: 'Patient' }),
    condition: Field.text({ label: 'Medical Condition', required: true }),
    goals: Field.textarea({ label: 'Treatment Goals', required: true }),
    interventions: Field.textarea({ label: 'Planned Interventions' }),
    start_date: Field.text({ label: 'Start Date' }),
    review_date: Field.text({ label: 'Next Review Date' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'On Hold', value: 'on_hold' },
        { label: 'Cancelled', value: 'cancelled' }
      ],
      defaultValue: 'active'
    }),
    assigned_provider: Field.lookup('contact', { label: 'Assigned Provider' }),
    notes: Field.textarea({ label: 'Notes' })
  }
});
