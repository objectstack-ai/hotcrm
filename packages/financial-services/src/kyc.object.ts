import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Kyc = ObjectSchema.create({
  name: 'kyc',
  label: 'KYC',
  icon: 'scan-face',
  fields: {
    client_id: Field.masterDetail('wealth_account'),
    document_type: Field.select({
      label: 'Document Type',
      required: true,
      options: [
        { label: 'Passport', value: 'passport' },
        { label: 'Drivers License', value: 'drivers_license' },
        { label: 'National ID', value: 'national_id' },
        { label: 'Utility Bill', value: 'utility_bill' },
        { label: 'Bank Statement', value: 'bank_statement' }
      ]
    }),
    document_id: Field.text({ label: 'Document ID', required: true }),
    verification_status: Field.select({
      label: 'Verification Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Expired', value: 'expired' }
      ],
      defaultValue: 'pending'
    }),
    verified_date: Field.date({ label: 'Verification Date' }),
    expiry_date: Field.date({ label: 'Document Expiry Date' }),
    risk_level: Field.select({
      label: 'Risk Level',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Very High', value: 'very_high' }
      ],
      defaultValue: 'low'
    }),
    verified_by: Field.lookup('contact', { label: 'Verified By' }),
    notes: Field.textarea({ label: 'Notes' })
  }
});
