import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Appointment Schedule Form
 * Wizard-style form for scheduling patient appointments.
 */
export const AppointmentScheduleForm = {
  type: 'wizard' as const,
  data: {
    provider: 'object' as const,
    object: 'appointment'
  },
  sections: [
    {
      label: 'Patient Selection',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'patient', required: true, placeholder: 'Search for patient' },
        { field: 'type', required: true }
      ]
    },
    {
      label: 'Schedule',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'appointment_date', required: true },
        { field: 'appointment_time', required: true },
        { field: 'duration', required: true },
        { field: 'provider_name', required: true, placeholder: 'Select provider' }
      ]
    },
    {
      label: 'Details',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'reason', placeholder: 'Reason for visit' },
        { field: 'location', placeholder: 'Clinic or facility' },
        { field: 'notes', widget: 'richtext' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(AppointmentScheduleForm);

export default AppointmentScheduleForm;
