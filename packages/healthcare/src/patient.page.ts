import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Patient Record Page Layout
 * Comprehensive patient view with demographics, medical info, appointments, and insurance.
 */
export const PatientPage = {
  name: 'patient_detail',
  object: 'patient',
  type: 'record' as const,
  label: 'Patient Record',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['physician', 'nurse', 'medical_admin', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'status', 'medical_record_number', 'date_of_birth', 'primary_physician']
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
            tabs: ['demographics', 'medical', 'appointments', 'insurance']
          }
        }
      ]
    },
    {
      name: 'demographics',
      components: [
        {
          type: 'record:details' as const,
          label: 'Personal Information',
          properties: {
            fields: [
              'first_name', 'last_name', 'date_of_birth', 'gender',
              'email', 'phone'
            ],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Emergency Contact',
          properties: {
            fields: ['emergency_contact_name', 'emergency_contact_phone'],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'medical',
      components: [
        {
          type: 'record:details' as const,
          label: 'Medical Information',
          properties: {
            fields: ['primary_physician', 'allergies', 'insurance'],
            columns: 2
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Prescriptions',
          properties: {
            object: 'prescription',
            columns: ['medication_name', 'dosage', 'frequency', 'status'],
            actions: ['new', 'edit']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Care Plans',
          properties: {
            object: 'care_plan',
            columns: ['name', 'status', 'start_date'],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'appointments',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Appointments',
          properties: {
            object: 'appointment',
            columns: ['appointment_date', 'type', 'provider_name', 'status'],
            sort: [{ field: 'appointment_date', direction: 'desc' }],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    },
    {
      name: 'insurance',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Insurance Plans',
          properties: {
            object: 'insurance',
            columns: ['plan_name', 'provider', 'type', 'is_active'],
            actions: ['new', 'edit']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(PatientPage);

export default PatientPage;
