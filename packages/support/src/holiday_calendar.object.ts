import { ObjectSchema, Field } from '@objectstack/spec/data';

export const HolidayCalendar = ObjectSchema.create({
  name: 'holiday_calendar',
  label: 'Holiday Calendar',
  pluralLabel: 'Holiday Calendars',
  icon: 'calendar-check',
  description: 'Holiday calendar for business hours and SLA calculations',

  fields: {
    name: Field.text({
      label: 'Calendar Name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'Description',
      maxLength: 2000
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    }),
    country: Field.select({
      label: 'Country',
      required: true,
      options: [
        {
          "label": "United States",
          "value": "us"
        },
        {
          "label": "China",
          "value": "cn"
        },
        {
          "label": "United Kingdom",
          "value": "uk"
        },
        {
          "label": "Canada",
          "value": "ca"
        },
        {
          "label": "Australia",
          "value": "au"
        },
        {
          "label": "Germany",
          "value": "de"
        },
        {
          "label": "France",
          "value": "fr"
        },
        {
          "label": "Japan",
          "value": "jp"
        },
        {
          "label": "India",
          "value": "in"
        },
        {
          "label": "Singapore",
          "value": "sg"
        }
      ]
    }),
    region: Field.text({
      label: 'Region/State',
      description: 'Specific region or state for regional holidays',
      maxLength: 100
    }),
    year: Field.number({
      label: 'Year',
      required: true,
      min: 2020,
      max: 2100,
      precision: 0
    }),
    auto_update_from_public_api: Field.boolean({
      label: 'Auto-Update from Public API',
      description: 'Automatically sync with public holiday API',
      defaultValue: false
    }),
    last_sync_date: Field.datetime({
      label: 'Last Sync Date',
      readonly: true
    }),
    next_sync_date: Field.datetime({
      label: 'Next Sync Date',
      readonly: true
    }),
    total_holidays: Field.number({
      label: 'Total Holidays',
      description: 'Number of holidays in this calendar',
      defaultValue: 0,
      readonly: true,
      precision: 0
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});