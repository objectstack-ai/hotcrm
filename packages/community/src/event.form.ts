import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Community Event Form Definition
 * Layout for creating and editing Community Event records.
 * Leverages FormView features: collapsible sections, placeholder, helpText.
 */
export const EventForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'community_event'
  },
  sections: [
    {
      label: 'Event Details',
      columns: '2' as const,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'event_name', required: true, placeholder: 'Enter the event name' },
        { field: 'event_type', required: true, helpText: 'Select the type of community event' },
        { field: 'description' }
      ]
    },
    {
      label: 'Schedule',
      columns: '2' as const,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'start_date', required: true },
        { field: 'end_date', required: true },
        { field: 'timezone' },
        { field: 'location' }
      ]
    },
    {
      label: 'Registration',
      columns: '2' as const,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'max_attendees', helpText: 'Maximum number of participants allowed' },
        { field: 'registration_required' },
        { field: 'registration_deadline' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(EventForm);

export default EventForm;
