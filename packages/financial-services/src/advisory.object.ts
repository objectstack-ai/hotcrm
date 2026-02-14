import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Advisory = ObjectSchema.create({
  name: 'advisory',
  label: 'Advisory',
  fields: {
    client_id: Field.masterDetail('wealth_account'),
    advisor_id: Field.lookup('contact', { label: 'Advisor' }),
    meeting_type: Field.select({
      label: 'Meeting Type',
      required: true,
      options: [
        { label: 'Initial Consultation', value: 'initial_consultation' },
        { label: 'Quarterly Review', value: 'quarterly_review' },
        { label: 'Annual Review', value: 'annual_review' },
        { label: 'Ad Hoc', value: 'ad_hoc' },
        { label: 'Phone', value: 'phone' }
      ]
    }),
    recommendations: Field.textarea({ label: 'Recommendations' }),
    next_review: Field.text({ label: 'Next Review Date' }),
    compliance_approved: Field.select({
      label: 'Compliance Approved',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' }
      ],
      defaultValue: 'pending'
    }),
    meeting_date: Field.text({ label: 'Meeting Date' }),
    meeting_notes: Field.textarea({ label: 'Meeting Notes' }),
    action_items: Field.textarea({ label: 'Action Items' })
  }
});
