import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Badge = ObjectSchema.create({
  name: 'badge',
  label: 'Badge',
  fields: {
    name: Field.text({ label: 'Badge Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description' }),
    icon: Field.text({ label: 'Icon', maxLength: 100 }),
    criteria: Field.textarea({ label: 'Criteria (JSON)' }),
    points_value: Field.number({ label: 'Points Value', defaultValue: 0, min: 0 }),
    is_automatic: Field.boolean({ label: 'Automatic Award', defaultValue: true }),
    badge_type: Field.select({
      label: 'Badge Type',
      options: [
        { label: 'Achievement', value: 'achievement' },
        { label: 'Milestone', value: 'milestone' },
        { label: 'Special', value: 'special' },
        { label: 'Seasonal', value: 'seasonal' }
      ]
    }),
    rarity: Field.select({
      label: 'Rarity',
      options: [
        { label: 'Common', value: 'common' },
        { label: 'Uncommon', value: 'uncommon' },
        { label: 'Rare', value: 'rare' },
        { label: 'Legendary', value: 'legendary' }
      ],
      defaultValue: 'common'
    })
  }
});
