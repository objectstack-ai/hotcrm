import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Topic = ObjectSchema.create({
  name: 'topic',
  label: 'Topic',
  fields: {
    title: Field.text({ label: 'Title', required: true, maxLength: 500 }),
    body: Field.textarea({ label: 'Body', required: true }),
    category_id: Field.lookup('forum_category', { label: 'Category', required: true }),
    author_id: Field.lookup('users', { label: 'Author', required: true }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
        { label: 'Pinned', value: 'pinned' },
        { label: 'Archived', value: 'archived' }
      ],
      defaultValue: 'open'
    }),
    is_pinned: Field.boolean({ label: 'Pinned', defaultValue: false }),
    is_locked: Field.boolean({ label: 'Locked', defaultValue: false }),
    view_count: Field.number({ label: 'View Count', defaultValue: 0, min: 0 }),
    reply_count: Field.number({ label: 'Reply Count', defaultValue: 0, min: 0 }),
    last_activity_at: Field.datetime({ label: 'Last Activity' }),
    tags: Field.textarea({ label: 'Tags' })
  }
});
