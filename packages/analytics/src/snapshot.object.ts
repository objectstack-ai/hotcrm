import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Snapshot = ObjectSchema.create({
  name: 'snapshot',
  label: 'Snapshot',
  pluralLabel: 'Snapshots',
  icon: 'camera',
  description: 'Data snapshots for historical tracking and trend analysis',

  fields: {
    name: Field.text({
      label: 'Snapshot Name',
      required: true,
      maxLength: 255
    }),
    source_object: Field.text({
      label: 'Source Object',
      required: true,
      maxLength: 100
    }),
    snapshot_date: Field.date({
      label: 'Snapshot Date',
      required: true
    }),
    data: Field.textarea({
      label: 'Snapshot Data',
      description: 'JSON snapshot of the source data'
    }),
    record_count: Field.number({
      label: 'Record Count',
      precision: 0
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});

export default Snapshot;
