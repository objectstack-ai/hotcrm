import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Idea = ObjectSchema.create({
  name: 'idea',
  label: 'Idea',
  fields: {
    title: Field.text({ label: 'Title', required: true, maxLength: 500 }),
    description: Field.textarea({ label: 'Description', required: true }),
    category: Field.select({
      label: 'Category',
      options: [
        { label: 'Feature', value: 'feature' },
        { label: 'Improvement', value: 'improvement' },
        { label: 'Bug Fix', value: 'bug_fix' },
        { label: 'Integration', value: 'integration' }
      ]
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Submitted', value: 'submitted' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Planned', value: 'planned' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Released', value: 'released' },
        { label: 'Declined', value: 'declined' }
      ],
      defaultValue: 'submitted'
    }),
    vote_count: Field.number({ label: 'Vote Count', defaultValue: 0, min: 0 }),
    priority_score: Field.number({ label: 'Priority Score', defaultValue: 0 }),
    assigned_release: Field.text({ label: 'Assigned Release', maxLength: 100 }),
    author_id: Field.lookup('users', { label: 'Author', required: true }),
    product_area: Field.text({ label: 'Product Area', maxLength: 255 })
  }
});
