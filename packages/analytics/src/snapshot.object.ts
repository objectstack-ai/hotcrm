import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Snapshot = ObjectSchema.create({
  name: 'snapshot',
  label: 'Data Snapshot',
  fields: {
    name: Field.text({ label: 'Snapshot Name', required: true, maxLength: 255 }),
    source_object: Field.text({ label: 'Source Object', required: true, maxLength: 100 }),
    snapshot_date: Field.datetime({ label: 'Snapshot Date', required: true }),
    record_count: Field.number({ label: 'Record Count', defaultValue: 0, min: 0 }),
    data_hash: Field.text({ label: 'Data Hash', maxLength: 64 }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Complete', value: 'complete' },
        { label: 'Failed', value: 'failed' }
      ],
      defaultValue: 'pending'
    }),
    owner_id: Field.lookup({ label: 'Owner', reference_to: 'users' })
  }
});
