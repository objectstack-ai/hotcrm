import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * KYC Verification Form
 * Form for conducting KYC identity verification and risk assessment.
 */
export const KycVerificationForm = {
  type: 'wizard' as const,
  data: {
    provider: 'object' as const,
    object: 'kyc'
  },
  sections: [
    {
      label: 'Identity Verification',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'wealth_account', required: true, placeholder: 'Select client account' },
        { field: 'document_type', required: true },
        { field: 'document_number', required: true, placeholder: 'ID document number' },
        { field: 'issuing_country', required: true },
        { field: 'issue_date', required: true },
        { field: 'expiry_date', required: true }
      ]
    },
    {
      label: 'Supporting Documents',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'proof_of_address', placeholder: 'Upload proof of address document' },
        { field: 'photo_id', placeholder: 'Upload government-issued photo ID' },
        { field: 'additional_documents', placeholder: 'Upload any additional supporting documents' }
      ]
    },
    {
      label: 'Risk Assessment',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'risk_rating', required: true },
        { field: 'source_of_funds', required: true, placeholder: 'Describe source of funds' },
        { field: 'source_of_wealth', placeholder: 'Describe source of wealth' },
        { field: 'pep_status', required: true, helpText: 'Politically Exposed Person status' },
        { field: 'sanctions_check', required: true, helpText: 'Result of sanctions screening' },
        { field: 'notes', colSpan: 2, widget: 'richtext', placeholder: 'Additional compliance notes' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(KycVerificationForm);

export default KycVerificationForm;
