import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Student = ObjectSchema.create({
  name: 'student',
  label: 'Student',
  icon: 'user',
  fields: {
    name: Field.text({ label: 'Student Name', required: true, maxLength: 255 }),
    email: Field.text({ label: 'Email', required: true }),
    enrollment_status: Field.select({
      label: 'Enrollment Status',
      options: [
        { label: 'Prospective', value: 'prospective' },
        { label: 'Applied', value: 'applied' },
        { label: 'Admitted', value: 'admitted' },
        { label: 'Enrolled', value: 'enrolled' },
        { label: 'Graduated', value: 'graduated' },
        { label: 'Withdrawn', value: 'withdrawn' },
        { label: 'Suspended', value: 'suspended' }
      ],
      defaultValue: 'prospective'
    }),
    program: Field.text({ label: 'Program' }),
    gpa: Field.number({ label: 'GPA', min: 0, max: 4 }),
    advisor_id: Field.lookup('contact', { label: 'Academic Advisor' }),
    graduation_date: Field.text({ label: 'Expected Graduation Date' }),
    student_id_number: Field.text({ label: 'Student ID', unique: true }),
    phone: Field.text({ label: 'Phone' }),
    major: Field.text({ label: 'Major' }),
    minor: Field.text({ label: 'Minor' }),
    year: Field.select({
      label: 'Academic Year',
      options: [
        { label: 'Freshman', value: 'freshman' },
        { label: 'Sophomore', value: 'sophomore' },
        { label: 'Junior', value: 'junior' },
        { label: 'Senior', value: 'senior' },
        { label: 'Graduate', value: 'graduate' }
      ]
    })
  }
});
