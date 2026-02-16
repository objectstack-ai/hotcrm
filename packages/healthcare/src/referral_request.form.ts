import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Referral Request Form
 * Form for creating and submitting patient referrals.
 */
export const ReferralRequestForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'referral'
  },
  sections: [
    {
      label: 'Patient & Provider',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'patient', required: true, placeholder: 'Search for patient' },
        { field: 'referring_provider', required: true, placeholder: 'Referring physician' },
        { field: 'referred_to_provider', required: true, placeholder: 'Referred to specialist' },
        { field: 'specialty', required: true }
      ]
    },
    {
      label: 'Clinical Details',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'reason', required: true, placeholder: 'Reason for referral' },
        { field: 'diagnosis_codes', placeholder: 'ICD-10 codes' },
        { field: 'clinical_notes', colSpan: 2, widget: 'richtext' }
      ]
    },
    {
      label: 'Authorization & Urgency',
      columns: '2' as any,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'urgency', required: true },
        { field: 'insurance_authorization', placeholder: 'Auth number if applicable' },
        { field: 'expiration_date' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(ReferralRequestForm);

export default ReferralRequestForm;
