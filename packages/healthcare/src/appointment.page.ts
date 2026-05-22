import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Appointment Detail Page Layout
 * Appointment record view with scheduling details, telehealth link, and patient context.
 */
export const AppointmentPage = {
  name: 'appointment_detail',
  object: 'appointment',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Appointment Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['physician', 'nurse', 'scheduler', 'medical_admin', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['patient', 'appointment_date', 'type', 'status', 'provider_name']
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
            tabs: ['schedule_info', 'clinical_details', 'telehealth']
          }
        }
      ]
    },
    {
      name: 'schedule_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Scheduling Information',
          properties: {
            fields: [
              'patient', 'provider_name', 'appointment_date', 'appointment_time',
              'duration', 'type', 'status', 'location'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'clinical_details',
      components: [
        {
          type: 'record:details' as const,
          label: 'Clinical Details',
          properties: {
            fields: ['reason', 'notes', 'diagnosis_codes'],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'telehealth',
      components: [
        {
          type: 'record:details' as const,
          label: 'Telehealth Information',
          properties: {
            fields: ['telehealth_link', 'telehealth_platform'],
            columns: 1
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(AppointmentPage);

export default AppointmentPage;
