
const BusinessHours = {
  name: 'business_hours',
  label: 'Business Hours',
  labelPlural: 'Business Hours',
  icon: 'calendar-alt',
  description: 'Working hours calendar for SLA time calculations',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Calendar Name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000
    },
    IsActive: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    IsDefault: {
      type: 'checkbox',
      label: 'Default Calendar',
      defaultValue: false,
      description: 'Use as default for new SLA templates'
    },
    // Timezone
    TimeZone: {
      type: 'select',
      label: 'Time Zone',
      required: true,
      defaultValue: 'Asia/Shanghai',
      options: [
        { label: 'UTC', value: 'UTC' },
        { label: 'America/New_York', value: 'America/New_York' },
        { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
        { label: 'Europe/London', value: 'Europe/London' },
        { label: 'Europe/Paris', value: 'Europe/Paris' },
        { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
        { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
        { label: 'Asia/Singapore', value: 'Asia/Singapore' },
        { label: 'Australia/Sydney', value: 'Australia/Sydney' }
      ]
    },
    // Monday
    MondayEnabled: {
      type: 'checkbox',
      label: 'Monday Working Day',
      defaultValue: true
    },
    MondayStartTime: {
      type: 'time',
      label: 'Monday Start',
      defaultValue: '09:00'
    },
    MondayEndTime: {
      type: 'time',
      label: 'Monday End',
      defaultValue: '18:00'
    },
    // Tuesday
    TuesdayEnabled: {
      type: 'checkbox',
      label: 'Tuesday Working Day',
      defaultValue: true
    },
    TuesdayStartTime: {
      type: 'time',
      label: 'Tuesday Start',
      defaultValue: '09:00'
    },
    TuesdayEndTime: {
      type: 'time',
      label: 'Tuesday End',
      defaultValue: '18:00'
    },
    // Wednesday
    WednesdayEnabled: {
      type: 'checkbox',
      label: 'Wednesday Working Day',
      defaultValue: true
    },
    WednesdayStartTime: {
      type: 'time',
      label: 'Wednesday Start',
      defaultValue: '09:00'
    },
    WednesdayEndTime: {
      type: 'time',
      label: 'Wednesday End',
      defaultValue: '18:00'
    },
    // Thursday
    ThursdayEnabled: {
      type: 'checkbox',
      label: 'Thursday Working Day',
      defaultValue: true
    },
    ThursdayStartTime: {
      type: 'time',
      label: 'Thursday Start',
      defaultValue: '09:00'
    },
    ThursdayEndTime: {
      type: 'time',
      label: 'Thursday End',
      defaultValue: '18:00'
    },
    // Friday
    FridayEnabled: {
      type: 'checkbox',
      label: 'Friday Working Day',
      defaultValue: true
    },
    FridayStartTime: {
      type: 'time',
      label: 'Friday Start',
      defaultValue: '09:00'
    },
    FridayEndTime: {
      type: 'time',
      label: 'Friday End',
      defaultValue: '18:00'
    },
    // Saturday
    SaturdayEnabled: {
      type: 'checkbox',
      label: 'Saturday Working Day',
      defaultValue: false
    },
    SaturdayStartTime: {
      type: 'time',
      label: 'Saturday Start',
      defaultValue: '09:00'
    },
    SaturdayEndTime: {
      type: 'time',
      label: 'Saturday End',
      defaultValue: '13:00'
    },
    // Sunday
    SundayEnabled: {
      type: 'checkbox',
      label: 'Sunday Working Day',
      defaultValue: false
    },
    SundayStartTime: {
      type: 'time',
      label: 'Sunday Start',
      defaultValue: '09:00'
    },
    SundayEndTime: {
      type: 'time',
      label: 'Sunday End',
      defaultValue: '13:00'
    },
    // Holiday Handling
    ExcludeHolidays: {
      type: 'checkbox',
      label: 'Exclude Holidays',
      defaultValue: true,
      description: 'Exclude public holidays from business hours'
    },
    HolidayCalendarId: {
      type: 'lookup',
      label: 'Holiday Calendar',
      reference: 'HolidayCalendar',
      description: 'Calendar containing public holidays'
    }
  },
  validationRules: [
    {
      name: 'OnlyOneDefault',
      errorMessage: 'Only one business hours calendar can be set as default',
      formula: 'IsDefault = true'
    },
    {
      name: 'HolidayCalendarRequired',
      errorMessage: 'Holiday calendar is required when holidays are excluded',
      formula: 'AND(ExcludeHolidays = true, ISBLANK(HolidayCalendarId))'
    }
  ],
  listViews: [
    {
      name: 'AllBusinessHours',
      label: 'All Business Hours',
      filters: [],
      columns: ['Name', 'TimeZone', 'IsDefault', 'IsActive', 'ExcludeHolidays'],
      sort: [['IsDefault', 'desc'], ['Name', 'asc']]
    },
    {
      name: 'ActiveHours',
      label: 'Active Hours',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'TimeZone', 'IsDefault', 'ExcludeHolidays'],
      sort: [['Name', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Calendar Information',
        columns: 2,
        fields: ['Name', 'Description', 'TimeZone', 'IsActive', 'IsDefault']
      },
      {
        label: 'Monday',
        columns: 3,
        fields: ['MondayEnabled', 'MondayStartTime', 'MondayEndTime']
      },
      {
        label: 'Tuesday',
        columns: 3,
        fields: ['TuesdayEnabled', 'TuesdayStartTime', 'TuesdayEndTime']
      },
      {
        label: 'Wednesday',
        columns: 3,
        fields: ['WednesdayEnabled', 'WednesdayStartTime', 'WednesdayEndTime']
      },
      {
        label: 'Thursday',
        columns: 3,
        fields: ['ThursdayEnabled', 'ThursdayStartTime', 'ThursdayEndTime']
      },
      {
        label: 'Friday',
        columns: 3,
        fields: ['FridayEnabled', 'FridayStartTime', 'FridayEndTime']
      },
      {
        label: 'Saturday',
        columns: 3,
        fields: ['SaturdayEnabled', 'SaturdayStartTime', 'SaturdayEndTime']
      },
      {
        label: 'Sunday',
        columns: 3,
        fields: ['SundayEnabled', 'SundayStartTime', 'SundayEndTime']
      },
      {
        label: 'Holiday Settings',
        columns: 2,
        fields: ['ExcludeHolidays', 'HolidayCalendarId']
      }
    ]
  }
};

export default BusinessHours;
