import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ApplicationForm = ObjectSchema.create({
  name: 'application_form',
  label: 'Application Form',
  icon: 'file-pen',
  fields: {
    applicant_name: Field.text({ label: 'Applicant Name', required: true, maxLength: 255 }),
    email: Field.email({ label: 'Email', required: true }),
    program: Field.text({ label: 'Applied Program', required: true }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Submitted', value: 'submitted' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Interview', value: 'interview' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Enrolled', value: 'enrolled' }
      ],
      defaultValue: 'submitted'
    }),
    test_scores: Field.textarea({ label: 'Test Scores (JSON)' }),
    gpa: Field.number({ label: 'High School GPA', min: 0, max: 4 }),
    essays: Field.textarea({ label: 'Essay Submissions' }),
    recommendations: Field.number({ label: 'Recommendations Count', min: 0 }),
    decision: Field.select({
      label: 'Decision',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Admit', value: 'admit' },
        { label: 'Deny', value: 'deny' },
        { label: 'Waitlist', value: 'waitlist' },
        { label: 'Defer', value: 'defer' }
      ],
      defaultValue: 'pending'
    }),
    application_date: Field.date({ label: 'Application Date' }),
    decision_date: Field.date({ label: 'Decision Date' }),
    notes: Field.textarea({ label: 'Notes' })
  }
});
