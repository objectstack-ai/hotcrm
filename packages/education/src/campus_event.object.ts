import { ObjectSchema, Field } from '@objectstack/spec/data';

export const CampusEvent = ObjectSchema.create({
  name: 'campus_event',
  label: 'Campus Event',
  icon: 'calendar-days',
  fields: {
    name: Field.text({ label: 'Event Name', required: true, maxLength: 255 }),
    event_type: Field.select({
      label: 'Event Type',
      options: [
        { label: 'Orientation', value: 'orientation' },
        { label: 'Lecture', value: 'lecture' },
        { label: 'Workshop', value: 'workshop' },
        { label: 'Career Fair', value: 'career_fair' },
        { label: 'Social', value: 'social' },
        { label: 'Sports', value: 'sports' },
        { label: 'Graduation', value: 'graduation' },
        { label: 'Open House', value: 'open_house' }
      ]
    }),
    event_date: Field.date({ label: 'Event Date', required: true }),
    location: Field.text({ label: 'Location' }),
    target_audience: Field.select({
      label: 'Target Audience',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Freshmen', value: 'freshmen' },
        { label: 'Upperclassmen', value: 'upperclassmen' },
        { label: 'Graduate', value: 'graduate' },
        { label: 'Alumni', value: 'alumni' },
        { label: 'Faculty', value: 'faculty' }
      ],
      defaultValue: 'all'
    }),
    rsvp_count: Field.number({ label: 'RSVP Count', min: 0, defaultValue: 0 }),
    capacity: Field.number({ label: 'Event Capacity', min: 0 }),
    feedback_score: Field.number({ label: 'Feedback Score', min: 0, max: 5 }),
    description: Field.textarea({ label: 'Description' }),
    organizer_id: Field.lookup('contact', { label: 'Organizer' })
  }
});
