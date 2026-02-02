import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Holiday = ObjectSchema.create({
  name: 'holiday',
  label: 'Holiday',
  pluralLabel: 'Holidays',
  icon: 'star',
  description: 'Public holidays and company closure dates',

  fields: {
    calendar_id: Field.lookup('HolidayCalendar', {
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
          "value": "1"
        },
        {
          "label": "February",
          "value": "2"
        },
        {
          "label": "March",
          "value": "3"
        },
        {
          "label": "April",
          "value": "4"
        },
        {
          "label": "May",
          "value": "5"
        },
        {
          "label": "June",
          "value": "6"
        },
        {
          "label": "July",
          "value": "7"
        },
        {
          "label": "August",
          "value": "8"
        },
        {
          "label": "September",
          "value": "9"
        },
        {
          "label": "October",
          "value": "10"
        },
        {
          "label": "November",
          "value": "11"
        },
        {
          "label": "December",
          "value": "12"
        }
      ]
    }),
    holiday_type: Field.select({
      label: 'Holiday Type',
      required: true,
      options: [
        {
          "label": "🎉 National Holiday",
          "value": "National"
        },
        {
          "label": "📅 Regional Holiday",
          "value": "Regional"
        },
        {
          "label": "🏢 Company Holiday",
          "value": "Company"
        },
        {
          "label": "🙏 Religious Holiday",
          "value": "Religious"
        },
        {
          "label": "🎊 Cultural Event",
          "value": "Cultural"
        },
        {
          "label": "🏖️ Company Closure",
          "value": "Closure"
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