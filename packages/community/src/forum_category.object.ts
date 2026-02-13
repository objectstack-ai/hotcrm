import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ForumCategory = ObjectSchema.create({
  name: 'forum_category',
  label: 'Forum Category',
  fields: {
    name: Field.text({ label: 'Category Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description' }),
    parent_category_id: Field.lookup({ label: 'Parent Category', reference_to: 'forum_category' }),
    sort_order: Field.number({ label: 'Sort Order', defaultValue: 0 }),
    icon: Field.text({ label: 'Icon', maxLength: 100 }),
    is_archived: Field.boolean({ label: 'Archived', defaultValue: false }),
    topic_count: Field.number({ label: 'Topic Count', defaultValue: 0, min: 0 }),
    post_count: Field.number({ label: 'Post Count', defaultValue: 0, min: 0 })
  }
});
