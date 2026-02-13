import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ReportSchedule = ObjectSchema.create({
  name: 'report_schedule',
  label: 'Report Schedule',
  fields: {
    name: Field.text({ label: 'Schedule Name', required: true, maxLength: 255 }),
    report_id: Field.lookup('report', { label: 'Report', required: true }),
    frequency: Field.select({
      label: 'Frequency',
      required: true,
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' }
      ]
    }),
    recipients: Field.textarea({ label: 'Recipients (JSON)', maxLength: 5000 }),
    format: Field.select({
      label: 'Export Format',
      options: [
        { label: 'PDF', value: 'pdf' },
        { label: 'CSV', value: 'csv' },
        { label: 'Excel', value: 'xlsx' }
      ],
      defaultValue: 'pdf'
    }),
    next_run: Field.datetime({ label: 'Next Run' }),
    last_run: Field.datetime({ label: 'Last Run' }),
    timezone: Field.text({ label: 'Timezone', maxLength: 50, defaultValue: 'UTC' }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true }),
    owner_id: Field.lookup('users', { label: 'Owner' })
  }
});
