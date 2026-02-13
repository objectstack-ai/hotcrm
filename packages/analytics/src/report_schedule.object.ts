import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ReportSchedule = ObjectSchema.create({
  name: 'report_schedule',
  label: 'Report Schedule',
  pluralLabel: 'Report Schedules',
  icon: 'clock',
  description: 'Scheduled report delivery configuration',

  fields: {
    name: Field.text({
      label: 'Schedule Name',
      required: true,
      maxLength: 255
    }),
    report_id: Field.lookup('report', {
      label: 'Report',
      required: true
    }),
    frequency: Field.select({
      label: 'Frequency',
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' }
      ]
    }),
    recipients: Field.textarea({
      label: 'Recipients',
      description: 'Comma-separated list of email addresses'
    }),
    format: Field.select({
      label: 'Export Format',
      options: [
        { label: 'CSV', value: 'csv' },
        { label: 'PDF', value: 'pdf' },
        { label: 'Excel', value: 'xlsx' }
      ]
    }),
    next_run: Field.datetime({
      label: 'Next Run'
    }),
    last_run: Field.datetime({
      label: 'Last Run',
      readonly: true
    }),
    timezone: Field.text({
      label: 'Timezone',
      defaultValue: 'UTC',
      maxLength: 50
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});

export default ReportSchedule;
