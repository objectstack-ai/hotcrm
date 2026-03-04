import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Report = ObjectSchema.create({
  name: 'report',
  label: 'Report',
  icon: 'file-bar-chart',
  fields: {
    name: Field.text({ label: 'Report Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 }),
    object_name: Field.text({ label: 'Source Object', required: true, maxLength: 100 }),
    report_type: Field.select({
      label: 'Report Type',
      required: true,
      options: [
        { label: 'Tabular', value: 'tabular' },
        { label: 'Summary', value: 'summary' },
        { label: 'Matrix', value: 'matrix' },
        { label: 'Joined', value: 'joined' }
      ],
      defaultValue: 'tabular'
    }),
    columns: Field.textarea({ label: 'Columns (JSON)', maxLength: 10000 }),
    filters: Field.textarea({ label: 'Filters (JSON)', maxLength: 5000 }),
    groupings: Field.textarea({ label: 'Groupings (JSON)', maxLength: 5000 }),
    aggregations: Field.textarea({ label: 'Aggregations (JSON)', maxLength: 5000 }),
    sort_order: Field.textarea({ label: 'Sort Order (JSON)', maxLength: 2000 }),
    chart_type: Field.select({
      label: 'Chart Type',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Bar', value: 'bar' },
        { label: 'Line', value: 'line' },
        { label: 'Pie', value: 'pie' },
        { label: 'Funnel', value: 'funnel' },
        { label: 'Donut', value: 'donut' }
      ],
      defaultValue: 'none'
    }),
    is_public: Field.boolean({ label: 'Public', defaultValue: false }),
    folder: Field.text({ label: 'Folder', maxLength: 255 }),
    owner_id: Field.lookup('users', { label: 'Owner' }),
    last_run_at: Field.datetime({ label: 'Last Run At' }),
    run_count: Field.number({ label: 'Run Count', defaultValue: 0, min: 0 })
  }
});
