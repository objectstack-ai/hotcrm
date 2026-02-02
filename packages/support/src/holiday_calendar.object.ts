import { ObjectSchema, Field } from '@objectstack/spec/data';

export const HolidayCalendar = ObjectSchema.create({
  name: 'holiday_calendar',
  label: 'Holiday Calendar',
  pluralLabel: 'Holiday Calendars',
  icon: 'calendar-check',
  description: 'Holiday calendar for business hours and SLA calculations',

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
    country: Field.select({
      label: 'country',
      required: true,
      options: [
        {
          "label": "United States",
          "value": "US"
        },
        {
          "label": "China",
          "value": "CN"
        },
        {
          "label": "United Kingdom",
          "value": "UK"
        },
        {
          "label": "Canada",
          "value": "CA"
        },
        {
          "label": "Australia",
          "value": "AU"
        },
        {
          "label": "Germany",
          "value": "DE"
        },
        {
          "label": "France",
          "value": "FR"
        },
        {
          "label": "Japan",
          "value": "JP"
        },
        {
          "label": "India",
          "value": "IN"
        },
        {
          "label": "Singapore",
          "value": "SG"
        }
      ]
    }),
    region: Field.text({
      label: 'region/State',
      description: 'Specific region or state for regional holidays',
      maxLength: 100
    }),
    year: Field.number({
      label: 'year',
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