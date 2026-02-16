import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Referral Tracking Page Layout
 * Referral record view with patient context, provider details, and status tracking.
 */
export const ReferralPage = {
  name: 'referral_detail',
  object: 'referral',
  type: 'record' as const,
  label: 'Referral Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['physician', 'nurse', 'referral_coordinator', 'medical_admin', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['patient', 'referring_provider', 'referred_to_provider', 'status', 'urgency']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['referral_info', 'clinical_info', 'tracking']
          }
        }
      ]
    },
    {
      name: 'referral_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Referral Information',
          properties: {
            fields: [
              'patient', 'referring_provider', 'referred_to_provider', 'specialty',
              'referral_date', 'expiration_date', 'status', 'urgency'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'clinical_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Clinical Information',
          properties: {
            fields: ['reason', 'diagnosis_codes', 'clinical_notes', 'insurance_authorization'],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'tracking',
      components: [
        {
          type: 'record:details' as const,
          label: 'Status Tracking',
          properties: {
            fields: ['appointment_scheduled_date', 'appointment_completed_date', 'outcome', 'follow_up_required'],
            columns: 2
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ReferralPage);

export default ReferralPage;
