
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
    name: {
      type: 'text',
      label: 'Calendar name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000
    },
    is_active: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    is_default: {
      type: 'checkbox',
      label: 'Default Calendar',
      defaultValue: false,
      description: 'Use as default for new SLA templates'
    },
    // Timezone
    time_zone: {
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
    monday_enabled: {
      type: 'checkbox',
      label: 'Monday Working Day',
      defaultValue: true
    },
    monday_start_time: {
      type: 'time',
      label: 'Monday Start',
      defaultValue: '09:00'
    },
    monday_end_time: {
      type: 'time',
      label: 'Monday End',
      defaultValue: '18:00'
    },
    // Tuesday
    tuesday_enabled: {
      type: 'checkbox',
      label: 'Tuesday Working Day',
      defaultValue: true
    },
    tuesday_start_time: {
      type: 'time',
      label: 'Tuesday Start',
      defaultValue: '09:00'
    },
    tuesday_end_time: {
      type: 'time',
      label: 'Tuesday End',
      defaultValue: '18:00'
    },
    // Wednesday
    wednesday_enabled: {
      type: 'checkbox',
      label: 'Wednesday Working Day',
      defaultValue: true
    },
    wednesday_start_time: {
      type: 'time',
      label: 'Wednesday Start',
      defaultValue: '09:00'
    },
    wednesday_end_time: {
      type: 'time',
      label: 'Wednesday End',
      defaultValue: '18:00'
    },
    // Thursday
    thursday_enabled: {
      type: 'checkbox',
      label: 'Thursday Working Day',
      defaultValue: true
    },
    thursday_start_time: {
      type: 'time',
      label: 'Thursday Start',
      defaultValue: '09:00'
    },
    thursday_end_time: {
      type: 'time',
      label: 'Thursday End',
      defaultValue: '18:00'
    },
    // Friday
    friday_enabled: {
      type: 'checkbox',
      label: 'Friday Working Day',
      defaultValue: true
    },
    friday_start_time: {
      type: 'time',
      label: 'Friday Start',
      defaultValue: '09:00'
    },
    friday_end_time: {
      type: 'time',
      label: 'Friday End',
      defaultValue: '18:00'
    },
    // Saturday
    saturday_enabled: {
      type: 'checkbox',
      label: 'Saturday Working Day',
      defaultValue: false
    },
    saturday_start_time: {
      type: 'time',
      label: 'Saturday Start',
      defaultValue: '09:00'
    },
    saturday_end_time: {
      type: 'time',
      label: 'Saturday End',
      defaultValue: '13:00'
    },
    // Sunday
    sunday_enabled: {
      type: 'checkbox',
      label: 'Sunday Working Day',
      defaultValue: false
    },
    sunday_start_time: {
      type: 'time',
      label: 'Sunday Start',
      defaultValue: '09:00'
    },
    sunday_end_time: {
      type: 'time',
      label: 'Sunday End',
      defaultValue: '13:00'
    },
    // Holiday Handling
    exclude_holidays: {
      type: 'checkbox',
      label: 'Exclude Holidays',
      defaultValue: true,
      description: 'Exclude public holidays from business hours'
    },
    holiday_calendar_id: {
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
      formula: 'is_default = true'
    },
    {
      name: 'HolidayCalendarRequired',
      errorMessage: 'Holiday calendar is required when holidays are excluded',
      formula: 'AND(exclude_holidays = true, ISBLANK(holiday_calendar_id))'
    }
  ],
  listViews: [
    {
      name: 'AllBusinessHours',
      label: 'All Business Hours',
      filters: [],
      columns: ['name', 'time_zone', 'is_default', 'is_active', 'exclude_holidays'],
      sort: [['is_default', 'desc'], ['name', 'asc']]
    },
    {
      name: 'ActiveHours',
      label: 'Active Hours',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['name', 'time_zone', 'is_default', 'exclude_holidays'],
      sort: [['name', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Calendar Information',
        columns: 2,
        fields: ['name', 'description', 'time_zone', 'is_active', 'is_default']
      },
      {
        label: 'Monday',
        columns: 3,
        fields: ['monday_enabled', 'monday_start_time', 'monday_end_time']
      },
      {
        label: 'Tuesday',
        columns: 3,
        fields: ['tuesday_enabled', 'tuesday_start_time', 'tuesday_end_time']
      },
      {
        label: 'Wednesday',
        columns: 3,
        fields: ['wednesday_enabled', 'wednesday_start_time', 'wednesday_end_time']
      },
      {
        label: 'Thursday',
        columns: 3,
        fields: ['thursday_enabled', 'thursday_start_time', 'thursday_end_time']
      },
      {
        label: 'Friday',
        columns: 3,
        fields: ['friday_enabled', 'friday_start_time', 'friday_end_time']
      },
      {
        label: 'Saturday',
        columns: 3,
        fields: ['saturday_enabled', 'saturday_start_time', 'saturday_end_time']
      },
      {
        label: 'Sunday',
        columns: 3,
        fields: ['sunday_enabled', 'sunday_start_time', 'sunday_end_time']
      },
      {
        label: 'Holiday Settings',
        columns: 2,
        fields: ['exclude_holidays', 'holiday_calendar_id']
      }
    ]
  }
};

export default BusinessHours;
