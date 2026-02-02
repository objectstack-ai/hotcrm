import { ObjectSchema, Field } from '@objectstack/spec/data';

export const BusinessHours = ObjectSchema.create({
  name: 'business_hours',
  label: 'Business Hours',
  pluralLabel: 'Business Hours',
  icon: 'calendar-alt',
  description: 'Working hours calendar for SLA time calculations',

  fields: {
    name: Field.text({
      label: 'Calendar name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 2000
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    }),
    is_default: Field.boolean({
      label: 'Default Calendar',
      description: 'Use as default for new SLA templates',
      defaultValue: false
    }),
    time_zone: Field.select({
      label: 'Time Zone',
      required: true,
      defaultValue: 'Asia/Shanghai',
      options: [
        {
          "label": "UTC",
          "value": "UTC"
        },
        {
          "label": "America/New_York",
          "value": "America/New_York"
        },
        {
          "label": "America/Los_Angeles",
          "value": "America/Los_Angeles"
        },
        {
          "label": "Europe/London",
          "value": "Europe/London"
        },
        {
          "label": "Europe/Paris",
          "value": "Europe/Paris"
        },
        {
          "label": "Asia/Shanghai",
          "value": "Asia/Shanghai"
        },
        {
          "label": "Asia/Tokyo",
          "value": "Asia/Tokyo"
        },
        {
          "label": "Asia/Singapore",
          "value": "Asia/Singapore"
        },
        {
          "label": "Australia/Sydney",
          "value": "Australia/Sydney"
        }
      ]
    }),
    monday_enabled: Field.boolean({
      label: 'Monday Working Day',
      defaultValue: true
    }),
    monday_start_time: Field.text({
      label: 'Monday Start',
      defaultValue: '09:00',
      maxLength: 5
    }),
    monday_end_time: Field.text({
      label: 'Monday End',
      defaultValue: '18:00',
      maxLength: 5
    }),
    tuesday_enabled: Field.boolean({
      label: 'Tuesday Working Day',
      defaultValue: true
    }),
    tuesday_start_time: Field.text({
      label: 'Tuesday Start',
      defaultValue: '09:00',
      maxLength: 5
    }),
    tuesday_end_time: Field.text({
      label: 'Tuesday End',
      defaultValue: '18:00',
      maxLength: 5
    }),
    wednesday_enabled: Field.boolean({
      label: 'Wednesday Working Day',
      defaultValue: true
    }),
    wednesday_start_time: Field.text({
      label: 'Wednesday Start',
      defaultValue: '09:00',
      maxLength: 5
    }),
    wednesday_end_time: Field.text({
      label: 'Wednesday End',
      defaultValue: '18:00',
      maxLength: 5
    }),
    thursday_enabled: Field.boolean({
      label: 'Thursday Working Day',
      defaultValue: true
    }),
    thursday_start_time: Field.text({
      label: 'Thursday Start',
      defaultValue: '09:00',
      maxLength: 5
    }),
    thursday_end_time: Field.text({
      label: 'Thursday End',
      defaultValue: '18:00',
      maxLength: 5
    }),
    friday_enabled: Field.boolean({
      label: 'Friday Working Day',
      defaultValue: true
    }),
    friday_start_time: Field.text({
      label: 'Friday Start',
      defaultValue: '09:00',
      maxLength: 5
    }),
    friday_end_time: Field.text({
      label: 'Friday End',
      defaultValue: '18:00',
      maxLength: 5
    }),
    saturday_enabled: Field.boolean({
      label: 'Saturday Working Day',
      defaultValue: false
    }),
    saturday_start_time: Field.text({
      label: 'Saturday Start',
      defaultValue: '09:00',
      maxLength: 5
    }),
    saturday_end_time: Field.text({
      label: 'Saturday End',
      defaultValue: '13:00',
      maxLength: 5
    }),
    sunday_enabled: Field.boolean({
      label: 'Sunday Working Day',
      defaultValue: false
    }),
    sunday_start_time: Field.text({
      label: 'Sunday Start',
      defaultValue: '09:00',
      maxLength: 5
    }),
    sunday_end_time: Field.text({
      label: 'Sunday End',
      defaultValue: '13:00',
      maxLength: 5
    }),
    exclude_holidays: Field.boolean({
      label: 'Exclude Holidays',
      description: 'Exclude public holidays from business hours',
      defaultValue: true
    }),
    holiday_calendar_id: Field.lookup('HolidayCalendar', {
      label: 'Holiday Calendar',
      description: 'Calendar containing public holidays'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});