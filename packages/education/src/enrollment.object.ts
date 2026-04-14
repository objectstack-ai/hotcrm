import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Enrollment = ObjectSchema.create({
  name: 'enrollment',
  label: 'Enrollment',
  icon: 'user-check',
  fields: {
    student_id: Field.masterDetail('student', { label: 'Student' }),
    course_id: Field.lookup('course', { label: 'Course', required: true }),
    term: Field.text({ label: 'Term', required: true }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Enrolled', value: 'enrolled' },
        { label: 'Completed', value: 'completed' },
        { label: 'Dropped', value: 'dropped' },
        { label: 'Withdrawn', value: 'withdrawn' },
        { label: 'Incomplete', value: 'incomplete' }
      ],
      defaultValue: 'enrolled'
    }),
    grade: Field.text({ label: 'Grade' }),
    credits: Field.number({ label: 'Credits', min: 0 }),
    enrollment_date: Field.date({ label: 'Enrollment Date' })
  }
});
