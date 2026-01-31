
const Holiday = {
  name: 'holiday',
  label: 'Holiday',
  labelPlural: 'Holidays',
  icon: 'star',
  description: 'Public holidays and company closure dates',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Relationship
    calendar_id: {
      type: 'lookup',
      label: 'Holiday Calendar',
      reference: 'HolidayCalendar',
      required: true
    },
    // Basic Information
    name: {
      type: 'text',
      label: 'Holiday name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 1000
    },
    // Date
    holiday_date: {
      type: 'date',
      label: 'Holiday Date',
      required: true
    },
    is_recurring: {
      type: 'checkbox',
      label: 'Recurring',
      defaultValue: false,
      description: 'This holiday recurs annually'
    },
    recurring_day: {
      type: 'number',
      label: 'Day of Month',
      precision: 0,
      min: 1,
      max: 31,
      description: 'For recurring holidays'
    },
    recurring_month: {
      type: 'select',
      label: 'Month',
      options: [
        { label: 'January', value: '1' },
        { label: 'February', value: '2' },
        { label: 'March', value: '3' },
        { label: 'April', value: '4' },
        { label: 'May', value: '5' },
        { label: 'June', value: '6' },
        { label: 'July', value: '7' },
        { label: 'August', value: '8' },
        { label: 'September', value: '9' },
        { label: 'October', value: '10' },
        { label: 'November', value: '11' },
        { label: 'December', value: '12' }
      ]
    },
    // Type
    holiday_type: {
      type: 'select',
      label: 'Holiday Type',
      required: true,
      options: [
        { label: '🎉 National Holiday', value: 'National' },
        { label: '📅 Regional Holiday', value: 'Regional' },
        { label: '🏢 Company Holiday', value: 'Company' },
        { label: '🙏 Religious Holiday', value: 'Religious' },
        { label: '🎊 Cultural Event', value: 'Cultural' },
        { label: '🏖️ Company Closure', value: 'Closure' }
      ]
    },
    // Duration
    is_full_day: {
      type: 'checkbox',
      label: 'Full Day',
      defaultValue: true
    },
    start_time: {
      type: 'time',
      label: 'Start Time',
      description: 'For partial day holidays'
    },
    end_time: {
      type: 'time',
      label: 'End Time',
      description: 'For partial day holidays'
    },
    // Observance
    is_observed: {
      type: 'checkbox',
      label: 'Observed by Company',
      defaultValue: true,
      description: 'Company observes this holiday (no work)'
    },
    observance_notes: {
      type: 'text',
      label: 'Observance Notes',
      maxLength: 500
    }
  },
  validationRules: [
    {
      name: 'RecurringFieldsRequired',
      errorMessage: 'Recurring day and month are required for recurring holidays',
      formula: 'AND(is_recurring = true, OR(ISBLANK(recurring_day), ISBLANK(recurring_month)))'
    },
    {
      name: 'PartialDayTimesRequired',
      errorMessage: 'Start and end times are required for partial day holidays',
      formula: 'AND(is_full_day = false, OR(ISBLANK(start_time), ISBLANK(end_time)))'
    },
    {
      name: 'ValidTimeRange',
      errorMessage: 'End time must be after start time',
      formula: 'AND(NOT(is_full_day), NOT(ISBLANK(start_time)), NOT(ISBLANK(end_time)), end_time <= start_time)'
    }
  ],
  listViews: [
    {
      name: 'AllHolidays',
      label: 'All Holidays',
      filters: [],
      columns: ['name', 'holiday_date', 'holiday_type', 'is_observed', 'calendar_id'],
      sort: [['holiday_date', 'asc']]
    },
    {
      name: 'UpcomingHolidays',
      label: 'Upcoming Holidays',
      filters: [
        ['holiday_date', '>=', 'TODAY()'],
        ['is_observed', '=', true]
      ],
      columns: ['name', 'holiday_date', 'holiday_type', 'is_full_day'],
      sort: [['holiday_date', 'asc']]
    },
    {
      name: 'ThisYear',
      label: 'This Year',
      filters: [
        ['holiday_date', 'this_year', null]
      ],
      columns: ['name', 'holiday_date', 'holiday_type', 'is_observed', 'calendar_id'],
      sort: [['holiday_date', 'asc']]
    },
    {
      name: 'ObservedHolidays',
      label: 'Observed by Company',
      filters: [
        ['is_observed', '=', true]
      ],
      columns: ['name', 'holiday_date', 'holiday_type', 'is_full_day'],
      sort: [['holiday_date', 'asc']]
    },
    {
      name: 'RecurringHolidays',
      label: 'Recurring Holidays',
      filters: [
        ['is_recurring', '=', true]
      ],
      columns: ['name', 'recurring_month', 'recurring_day', 'holiday_type', 'is_observed'],
      sort: [['recurring_month', 'asc'], ['recurring_day', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Holiday Information',
        columns: 2,
        fields: ['calendar_id', 'name', 'description', 'holiday_type']
      },
      {
        label: 'Date',
        columns: 2,
        fields: ['holiday_date', 'is_recurring', 'recurring_month', 'recurring_day']
      },
      {
        label: 'Duration',
        columns: 3,
        fields: ['is_full_day', 'start_time', 'end_time']
      },
      {
        label: 'Observance',
        columns: 1,
        fields: ['is_observed', 'observance_notes']
      }
    ]
  }
};

export default Holiday;
