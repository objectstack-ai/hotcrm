import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Healthcare Home Page Layout
 * Landing page for healthcare users with appointment summary, patient queue, and clinical insights.
 */
export const HealthcareHomePage = {
  name: 'healthcare_home',
  type: 'home' as const,
  label: 'Healthcare Home Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['physician', 'nurse', 'scheduler', 'medical_admin', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'page:header' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'summary',
      components: [
        {
          type: 'page:card' as const,
          label: "Today's Appointments",
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Pending Referrals',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Active Patients',
          properties: {}
        }
      ]
    },
    {
      name: 'insights',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'Clinical Insights',
          properties: {
            context: 'healthcare_operations'
          }
        }
      ]
    },
    {
      name: 'upcoming_appointments',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Upcoming Appointments',
          properties: {
            object: 'appointment',
            columns: ['patient', 'appointment_date', 'type', 'provider_name', 'status']
          }
        }
      ]
    },
    {
      name: 'recent_referrals',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Recent Referrals',
          properties: {
            object: 'referral',
            columns: ['patient', 'referred_to_provider', 'specialty', 'status', 'urgency']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(HealthcareHomePage);

export default HealthcareHomePage;
