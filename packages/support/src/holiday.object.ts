import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Holiday = ObjectSchema.create({
  name: 'holiday',
  label: 'Holiday',
  pluralLabel: 'Holidays',
  icon: 'star',
  description: 'Public holidays and company closure dates',

  fields: {
    calendar_id: Field.lookup('holiday_calendar', {
      label: 'Holiday Calendar',
      required: true
    }),
    name: Field.text({
      label: 'Holiday name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 1000
    }),
    holiday_date: Field.date({
      label: 'Holiday Date',
      required: true
    }),
    is_recurring: Field.boolean({
      label: 'Recurring',
      description: 'This holiday recurs annually',
      defaultValue: false
    }),
    recurring_day: Field.number({
      label: 'Day of Month',
      description: 'For recurring holidays',
      min: 1,
      max: 31,
      precision: 0
    }),
    recurring_month: Field.select({
      label: 'Month',
      options: [
        {
          "label": "January",
          "value": "month_01"
        },
        {
          "label": "February",
          "value": "month_02"
        },
        {
          "label": "March",
          "value": "month_03"
        },
        {
          "label": "April",
          "value": "month_04"
        },
        {
          "label": "May",
          "value": "month_05"
        },
        {
          "label": "June",
          "value": "month_06"
        },
        {
          "label": "July",
          "value": "month_07"
        },
        {
          "label": "August",
          "value": "month_08"
        },
        {
          "label": "September",
          "value": "month_09"
        },
        {
          "label": "October",
          "value": "month_10"
        },
        {
          "label": "November",
          "value": "month_11"
        },
        {
          "label": "December",
          "value": "month_12"
        }
      ]
    }),
    holiday_type: Field.select({
      label: 'Holiday Type',
      required: true,
      options: [
        {
          "label": "🎉 National Holiday",
          "value": "national"
        },
        {
          "label": "📅 Regional Holiday",
          "value": "regional"
        },
        {
          "label": "🏢 Company Holiday",
          "value": "company"
        },
        {
          "label": "🙏 Religious Holiday",
          "value": "religious"
        },
        {
          "label": "🎊 Cultural Event",
          "value": "cultural"
        },
        {
          "label": "🏖️ Company Closure",
          "value": "closure"
        }
      ]
    }),
    is_full_day: Field.boolean({
      label: 'Full Day',
      defaultValue: true
    }),
    start_time: Field.text({
      label: 'Start Time',
      description: 'For partial day holidays',
      maxLength: 5
    }),
    end_time: Field.text({
      label: 'End Time',
      description: 'For partial day holidays',
      maxLength: 5
    }),
    is_observed: Field.boolean({
      label: 'Observed by Company',
      description: 'Company observes this holiday (no work)',
      defaultValue: true
    }),
    observance_notes: Field.text({
      label: 'Observance Notes',
      maxLength: 500
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});