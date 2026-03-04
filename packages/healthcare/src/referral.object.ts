import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Referral = ObjectSchema.create({
  name: 'referral',
  label: 'Referral',
  icon: 'forward',
  fields: {
    patient_id: Field.masterDetail('patient', { label: 'Patient' }),
    referring_provider: Field.lookup('contact', { label: 'Referring Provider' }),
    receiving_provider: Field.lookup('contact', { label: 'Receiving Provider' }),
    reason: Field.textarea({ label: 'Referral Reason', required: true }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Completed', value: 'completed' },
        { label: 'Declined', value: 'declined' },
        { label: 'Expired', value: 'expired' }
      ],
      defaultValue: 'pending'
    }),
    urgency: Field.select({
      label: 'Urgency',
      options: [
        { label: 'Routine', value: 'routine' },
        { label: 'Urgent', value: 'urgent' },
        { label: 'Emergent', value: 'emergent' }
      ],
      defaultValue: 'routine'
    }),
    referral_date: Field.text({ label: 'Referral Date' }),
    authorization_number: Field.text({ label: 'Authorization Number' }),
    notes: Field.textarea({ label: 'Notes' })
  }
});
