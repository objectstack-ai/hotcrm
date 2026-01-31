
const HolidayCalendar = {
  name: 'holiday_calendar',
  label: 'Holiday Calendar',
  labelPlural: 'Holiday Calendars',
  icon: 'calendar-check',
  description: 'Holiday calendar for business hours and SLA calculations',
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
    // Location
    country: {
      type: 'select',
      label: 'country',
      required: true,
      options: [
        { label: 'United States', value: 'US' },
        { label: 'China', value: 'CN' },
        { label: 'United Kingdom', value: 'UK' },
        { label: 'Canada', value: 'CA' },
        { label: 'Australia', value: 'AU' },
        { label: 'Germany', value: 'DE' },
        { label: 'France', value: 'FR' },
        { label: 'Japan', value: 'JP' },
        { label: 'India', value: 'IN' },
        { label: 'Singapore', value: 'SG' }
      ]
    },
    region: {
      type: 'text',
      label: 'region/State',
      maxLength: 100,
      description: 'Specific region or state for regional holidays'
    },
    year: {
      type: 'number',
      label: 'year',
      precision: 0,
      required: true,
      min: 2020,
      max: 2100
    },
    // Auto-Update
    auto_update_from_public_api: {
      type: 'checkbox',
      label: 'Auto-Update from Public API',
      defaultValue: false,
      description: 'Automatically sync with public holiday API'
    },
    last_sync_date: {
      type: 'datetime',
      label: 'Last Sync Date',
      readonly: true
    },
    next_sync_date: {
      type: 'datetime',
      label: 'Next Sync Date',
      readonly: true
    },
    // Statistics
    total_holidays: {
      type: 'number',
      label: 'Total Holidays',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Number of holidays in this calendar'
    }
  },
  relationships: [
    {
      name: 'Holidays',
      type: 'hasMany',
      object: 'Holiday',
      foreignKey: 'calendar_id',
      label: 'Holidays'
    }
  ],
  validationRules: [
    {
      name: 'UniqueCalendarYear',
      errorMessage: 'A calendar already exists for this country, region, and year',
      formula: 'AND(NOT(ISNEW()), EXISTS(SELECT Id FROM HolidayCalendar WHERE country = $country AND region = $region AND year = $year AND Id != $Id))'
    }
  ],
  listViews: [
    {
      name: 'AllCalendars',
      label: 'All Calendars',
      filters: [],
      columns: ['name', 'country', 'region', 'year', 'total_holidays', 'is_active'],
      sort: [['year', 'desc'], ['country', 'asc']]
    },
    {
      name: 'ActiveCalendars',
      label: 'Active Calendars',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['name', 'country', 'year', 'total_holidays', 'last_sync_date'],
      sort: [['year', 'desc']]
    },
    {
      name: 'CurrentYear',
      label: 'Current year',
      filters: [
        ['year', '=', 'YEAR(TODAY())']
      ],
      columns: ['name', 'country', 'region', 'total_holidays', 'is_active'],
      sort: [['country', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Calendar Information',
        columns: 2,
        fields: ['name', 'description', 'is_active']
      },
      {
        label: 'Location',
        columns: 3,
        fields: ['country', 'region', 'year']
      },
      {
        label: 'Auto-Update',
        columns: 3,
        fields: ['auto_update_from_public_api', 'last_sync_date', 'next_sync_date']
      },
      {
        label: 'Statistics',
        columns: 1,
        fields: ['total_holidays']
      }
    ]
  }
};

export default HolidayCalendar;
