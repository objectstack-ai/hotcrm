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
          "value": "v_1_val"
        },
        {
          "label": "February",
          "value": "v_2_val"
        },
        {
          "label": "March",
          "value": "v_3_val"
        },
        {
          "label": "April",
          "value": "v_4_val"
        },
        {
          "label": "May",
          "value": "v_5_val"
        },
        {
          "label": "June",
          "value": "v_6_val"
        },
        {
          "label": "July",
          "value": "v_7_val"
        },
        {
          "label": "August",
          "value": "v_8_val"
        },
        {
          "label": "September",
          "value": "v_9_val"
        },
        {
          "label": "October",
          "value": "v_10"
        },
        {
          "label": "November",
          "value": "v_11"
        },
        {
          "label": "December",
          "value": "v_12"
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