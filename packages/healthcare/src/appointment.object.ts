import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Appointment = ObjectSchema.create({
  name: 'appointment',
  label: 'Appointment',
  fields: {
    patient_id: Field.masterDetail('patient', { label: 'Patient' }),
    provider_id: Field.lookup('contact', { label: 'Provider' }),
    appointment_type: Field.select({
      label: 'Appointment Type',
      options: [
        { label: 'General', value: 'general' },
        { label: 'Follow Up', value: 'follow_up' },
        { label: 'Specialist', value: 'specialist' },
        { label: 'Telehealth', value: 'telehealth' },
        { label: 'Emergency', value: 'emergency' }
      ]
    }),
    scheduled_date: Field.text({ label: 'Scheduled Date/Time', required: true }),
    duration: Field.number({ label: 'Duration (minutes)', defaultValue: 30 }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Checked In', value: 'checked_in' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'No Show', value: 'no_show' }
      ],
      defaultValue: 'scheduled'
    }),
    notes: Field.textarea({ label: 'Notes' }),
    telehealth_link: Field.text({ label: 'Telehealth Link' }),
    reason: Field.text({ label: 'Reason for Visit' })
  }
});
