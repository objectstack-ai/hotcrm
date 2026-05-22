import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Course = ObjectSchema.create({
  name: 'course',
  label: 'Course',
  icon: 'book-open',
  fields: {
    name: Field.text({ label: 'Course Name', required: true, maxLength: 255 }),
    course_code: Field.text({ label: 'Course Code', required: true, unique: true }),
    department: Field.text({ label: 'Department', required: true }),
    credits: Field.number({ label: 'Credits', required: true, min: 0 }),
    instructor_id: Field.lookup('contact', { label: 'Instructor' }),
    capacity: Field.number({ label: 'Max Capacity', min: 0 }),
    schedule: Field.text({ label: 'Schedule' }),
    prerequisites: Field.textarea({ label: 'Prerequisites (JSON)' }),
    description: Field.textarea({ label: 'Description' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Archived', value: 'archived' },
        { label: "Completed", value: "completed" }
      ],
      defaultValue: 'active'
    })
  }
});
