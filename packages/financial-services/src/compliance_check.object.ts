import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ComplianceCheck = ObjectSchema.create({
  name: 'compliance_check',
  label: 'Compliance Check',
  icon: 'clipboard-check',
  fields: {
    entity_id: Field.text({ label: 'Entity ID', required: true }),
    entity_type: Field.select({
      label: 'Entity Type',
      options: [
        { label: 'Client', value: 'client' },
        { label: 'Account', value: 'account' },
        { label: 'Transaction', value: 'transaction' },
        { label: 'Advisor', value: 'advisor' }
      ]
    }),
    check_type: Field.select({
      label: 'Check Type',
      required: true,
      options: [
        { label: 'AML', value: 'aml' },
        { label: 'KYC', value: 'kyc' },
        { label: 'Sanctions', value: 'sanctions' },
        { label: 'PEP', value: 'pep' },
        { label: 'Adverse Media', value: 'adverse_media' }
      ]
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Passed', value: 'passed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Review Required', value: 'review_required' }
      ],
      defaultValue: 'pending'
    }),
    findings: Field.textarea({ label: 'Findings' }),
    reviewer: Field.lookup('contact', { label: 'Reviewer' }),
    review_date: Field.text({ label: 'Review Date' }),
    regulation: Field.text({ label: 'Applicable Regulation' }),
    risk_score: Field.number({ label: 'Risk Score', min: 0, max: 100 }),
    next_review: Field.text({ label: 'Next Scheduled Review' })
  }
});
