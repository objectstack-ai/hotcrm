import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Reply = ObjectSchema.create({
  name: 'reply',
  label: 'Reply',
  icon: 'message-circle',
  fields: {
    topic_id: Field.lookup('topic', { label: 'Topic', required: true }),
    body: Field.textarea({ label: 'Body', required: true }),
    author_id: Field.lookup('users', { label: 'Author', required: true }),
    is_accepted_answer: Field.boolean({ label: 'Accepted Answer', defaultValue: false }),
    upvotes: Field.number({ label: 'Upvotes', defaultValue: 0, min: 0 }),
    downvotes: Field.number({ label: 'Downvotes', defaultValue: 0, min: 0 }),
    is_flagged: Field.boolean({ label: 'Flagged', defaultValue: false }),
    flag_reason: Field.text({ label: 'Flag Reason', maxLength: 500 }),
    parent_reply_id: Field.lookup('reply', { label: 'Parent Reply' })
  }
});
