
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
    CalendarId: {
      type: 'lookup',
      label: 'Holiday Calendar',
      reference: 'HolidayCalendar',
      required: true
    },
    // Basic Information
    Name: {
      type: 'text',
      label: 'Holiday Name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 1000
    },
    // Date
    HolidayDate: {
      type: 'date',
      label: 'Holiday Date',
      required: true
    },
    IsRecurring: {
      type: 'checkbox',
      label: 'Recurring',
      defaultValue: false,
      description: 'This holiday recurs annually'
    },
    RecurringDay: {
      type: 'number',
      label: 'Day of Month',
      precision: 0,
      min: 1,
      max: 31,
      description: 'For recurring holidays'
    },
    RecurringMonth: {
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
    HolidayType: {
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
    IsFullDay: {
      type: 'checkbox',
      label: 'Full Day',
      defaultValue: true
    },
    StartTime: {
      type: 'time',
      label: 'Start Time',
      description: 'For partial day holidays'
    },
    EndTime: {
      type: 'time',
      label: 'End Time',
      description: 'For partial day holidays'
    },
    // Observance
    IsObserved: {
      type: 'checkbox',
      label: 'Observed by Company',
      defaultValue: true,
      description: 'Company observes this holiday (no work)'
    },
    ObservanceNotes: {
      type: 'text',
      label: 'Observance Notes',
      maxLength: 500
    }
  },
  validationRules: [
    {
      name: 'RecurringFieldsRequired',
      errorMessage: 'Recurring day and month are required for recurring holidays',
      formula: 'AND(IsRecurring = true, OR(ISBLANK(RecurringDay), ISBLANK(RecurringMonth)))'
    },
    {
      name: 'PartialDayTimesRequired',
      errorMessage: 'Start and end times are required for partial day holidays',
      formula: 'AND(IsFullDay = false, OR(ISBLANK(StartTime), ISBLANK(EndTime)))'
    },
    {
      name: 'ValidTimeRange',
      errorMessage: 'End time must be after start time',
      formula: 'AND(NOT(IsFullDay), NOT(ISBLANK(StartTime)), NOT(ISBLANK(EndTime)), EndTime <= StartTime)'
    }
  ],
  listViews: [
    {
      name: 'AllHolidays',
      label: 'All Holidays',
      filters: [],
      columns: ['Name', 'HolidayDate', 'HolidayType', 'IsObserved', 'CalendarId'],
      sort: [['HolidayDate', 'asc']]
    },
    {
      name: 'UpcomingHolidays',
      label: 'Upcoming Holidays',
      filters: [
        ['HolidayDate', '>=', 'TODAY()'],
        ['IsObserved', '=', true]
      ],
      columns: ['Name', 'HolidayDate', 'HolidayType', 'IsFullDay'],
      sort: [['HolidayDate', 'asc']]
    },
    {
      name: 'ThisYear',
      label: 'This Year',
      filters: [
        ['HolidayDate', 'this_year', null]
      ],
      columns: ['Name', 'HolidayDate', 'HolidayType', 'IsObserved', 'CalendarId'],
      sort: [['HolidayDate', 'asc']]
    },
    {
      name: 'ObservedHolidays',
      label: 'Observed by Company',
      filters: [
        ['IsObserved', '=', true]
      ],
      columns: ['Name', 'HolidayDate', 'HolidayType', 'IsFullDay'],
      sort: [['HolidayDate', 'asc']]
    },
    {
      name: 'RecurringHolidays',
      label: 'Recurring Holidays',
      filters: [
        ['IsRecurring', '=', true]
      ],
      columns: ['Name', 'RecurringMonth', 'RecurringDay', 'HolidayType', 'IsObserved'],
      sort: [['RecurringMonth', 'asc'], ['RecurringDay', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Holiday Information',
        columns: 2,
        fields: ['CalendarId', 'Name', 'Description', 'HolidayType']
      },
      {
        label: 'Date',
        columns: 2,
        fields: ['HolidayDate', 'IsRecurring', 'RecurringMonth', 'RecurringDay']
      },
      {
        label: 'Duration',
        columns: 3,
        fields: ['IsFullDay', 'StartTime', 'EndTime']
      },
      {
        label: 'Observance',
        columns: 1,
        fields: ['IsObserved', 'ObservanceNotes']
      }
    ]
  }
};

export default Holiday;
