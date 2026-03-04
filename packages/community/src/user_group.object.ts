import { ObjectSchema, Field } from '@objectstack/spec/data';

export const UserGroup = ObjectSchema.create({
  name: 'user_group',
  label: 'User Group',
  icon: 'users-round',
  fields: {
    name: Field.text({ label: 'Group Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description' }),
    group_type: Field.select({
      label: 'Group Type',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
        { label: 'Hidden', value: 'hidden' }
      ],
      defaultValue: 'public'
    }),
    criteria: Field.textarea({ label: 'Criteria (JSON)' }),
    member_count: Field.number({ label: 'Member Count', defaultValue: 0, min: 0 }),
    access_level: Field.select({
      label: 'Access Level',
      options: [
        { label: 'Basic', value: 'basic' },
        { label: 'Contributor', value: 'contributor' },
        { label: 'Moderator', value: 'moderator' },
        { label: 'Admin', value: 'admin' }
      ],
      defaultValue: 'basic'
    }),
    owner_id: Field.lookup('users', { label: 'Owner' })
  }
});
