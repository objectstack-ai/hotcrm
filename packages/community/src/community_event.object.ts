import { ObjectSchema, Field } from '@objectstack/spec/data';

export const CommunityEvent = ObjectSchema.create({
  name: 'community_event',
  label: 'Community Event',
  icon: 'calendar-days',
  fields: {
    title: Field.text({ label: 'Title', required: true, maxLength: 500 }),
    description: Field.textarea({ label: 'Description' }),
    event_type: Field.select({
      label: 'Event Type',
      options: [
        { label: 'Webinar', value: 'webinar' },
        { label: 'Meetup', value: 'meetup' },
        { label: 'Workshop', value: 'workshop' },
        { label: 'Hackathon', value: 'hackathon' },
        { label: 'AMA', value: 'ama' }
      ]
    }),
    start_date: Field.datetime({ label: 'Start Date', required: true }),
    end_date: Field.datetime({ label: 'End Date' }),
    location: Field.text({ label: 'Location', maxLength: 500 }),
    is_virtual: Field.boolean({ label: 'Virtual Event', defaultValue: true }),
    capacity: Field.number({ label: 'Capacity', min: 0 }),
    rsvp_count: Field.number({ label: 'RSVP Count', defaultValue: 0, min: 0 }),
    recording_url: Field.url({ label: 'Recording URL' }),
    organizer_id: Field.lookup('users', { label: 'Organizer', required: true })
  }
});
