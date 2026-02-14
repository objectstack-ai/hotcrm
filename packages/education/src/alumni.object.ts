import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Alumni = ObjectSchema.create({
  name: 'alumni',
  label: 'Alumni',
  fields: {
    student_id: Field.lookup('student', { label: 'Student' }),
    name: Field.text({ label: 'Alumni Name', required: true, maxLength: 255 }),
    graduation_year: Field.number({ label: 'Graduation Year' }),
    degree: Field.text({ label: 'Degree' }),
    employer: Field.text({ label: 'Current Employer' }),
    job_title: Field.text({ label: 'Job Title' }),
    giving_history: Field.number({ label: 'Lifetime Giving ($)', min: 0, defaultValue: 0 }),
    engagement_score: Field.number({ label: 'Engagement Score', min: 0, max: 100 }),
    email: Field.text({ label: 'Email' }),
    location: Field.text({ label: 'Location' })
  }
});
