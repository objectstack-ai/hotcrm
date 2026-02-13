import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Report = ObjectSchema.create({
  name: 'report',
  label: 'Report',
  pluralLabel: 'Reports',
  icon: 'file-bar-chart',
  description: 'Saved report definitions for tabular, summary, and matrix reports',

  fields: {
    name: Field.text({
      label: 'Report Name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'Description',
    }),
    object_name: Field.text({
      label: 'Source Object',
      required: true,
      maxLength: 100
    }),
    report_type: Field.select({
      label: 'Report Type',
      options: [
        { label: 'Tabular', value: 'tabular' },
        { label: 'Summary', value: 'summary' },
        { label: 'Matrix', value: 'matrix' }
      ]
    }),
    columns: Field.textarea({
      label: 'Columns',
      description: 'JSON array of column definitions'
    }),
    filters: Field.textarea({
      label: 'Filters',
      description: 'JSON array of filter conditions'
    }),
    groupings_down: Field.textarea({
      label: 'Row Groupings',
      description: 'JSON array of row grouping fields'
    }),
    groupings_across: Field.textarea({
      label: 'Column Groupings',
      description: 'JSON array of column grouping fields'
    }),
    sort_order: Field.textarea({
      label: 'Sort Order',
      description: 'JSON array of sort definitions'
    }),
    chart_type: Field.select({
      label: 'Chart Type',
      options: [
        { label: 'Bar', value: 'bar' },
        { label: 'Line', value: 'line' },
        { label: 'Pie', value: 'pie' },
        { label: 'Funnel', value: 'funnel' },
        { label: 'Donut', value: 'donut' },
        { label: 'None', value: 'none' }
      ]
    }),
    is_public: Field.boolean({
      label: 'Public',
      defaultValue: false
    }),
    folder: Field.text({
      label: 'Folder',
      maxLength: 255
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

export default Report;
