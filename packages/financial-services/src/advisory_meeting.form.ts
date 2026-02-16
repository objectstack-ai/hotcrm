import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Advisory Meeting Form
 * Form for scheduling and recording advisory meetings with clients.
 */
export const AdvisoryMeetingForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'advisory'
  },
  sections: [
    {
      label: 'Meeting Details',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'wealth_account', required: true, placeholder: 'Select client account' },
        { field: 'advisor_id', required: true, placeholder: 'Select advisor' },
        { field: 'meeting_date', required: true },
        { field: 'meeting_type', required: true },
        { field: 'duration', placeholder: 'Duration in minutes' },
        { field: 'location', placeholder: 'Office, virtual, or client site' },
        { field: 'attendees', placeholder: 'Additional attendees' },
        { field: 'status' }
      ]
    },
    {
      label: 'Agenda & Objectives',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'agenda', required: true, placeholder: 'Meeting agenda items', widget: 'richtext' },
        { field: 'objectives', placeholder: 'Key objectives for this meeting', widget: 'richtext' }
      ]
    },
    {
      label: 'Follow-Up',
      columns: '2' as any,
      collapsible: true,
      collapsed: true,
      fields: [
        { field: 'follow_up_actions', colSpan: 2, widget: 'richtext', placeholder: 'Action items and next steps' },
        { field: 'next_meeting_date', placeholder: 'Proposed next meeting date' },
        { field: 'assigned_tasks', placeholder: 'Tasks assigned during meeting' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(AdvisoryMeetingForm);

export default AdvisoryMeetingForm;
