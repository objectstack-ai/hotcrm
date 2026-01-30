import type { ServiceObject } from '@objectstack/spec/data';

const HolidayCalendar = {
  name: 'holiday_calendar',
  label: 'Holiday Calendar',
  labelPlural: 'Holiday Calendars',
  icon: 'calendar-check',
  description: 'Holiday calendar for business hours and SLA calculations',
  capabilities: {
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
    // Location
    Country: {
      type: 'select',
      label: 'Country',
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
    Region: {
      type: 'text',
      label: 'Region/State',
      maxLength: 100,
      description: 'Specific region or state for regional holidays'
    },
    Year: {
      type: 'number',
      label: 'Year',
      precision: 0,
      required: true,
      min: 2020,
      max: 2100
    },
    // Auto-Update
    AutoUpdateFromPublicAPI: {
      type: 'checkbox',
      label: 'Auto-Update from Public API',
      defaultValue: false,
      description: 'Automatically sync with public holiday API'
    },
    LastSyncDate: {
      type: 'datetime',
      label: 'Last Sync Date',
      readonly: true
    },
    NextSyncDate: {
      type: 'datetime',
      label: 'Next Sync Date',
      readonly: true
    },
    // Statistics
    TotalHolidays: {
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
      foreignKey: 'CalendarId',
      label: 'Holidays'
    }
  ],
  validationRules: [
    {
      name: 'UniqueCalendarYear',
      errorMessage: 'A calendar already exists for this country, region, and year',
      formula: 'AND(NOT(ISNEW()), EXISTS(SELECT Id FROM HolidayCalendar WHERE Country = $Country AND Region = $Region AND Year = $Year AND Id != $Id))'
    }
  ],
  listViews: [
    {
      name: 'AllCalendars',
      label: 'All Calendars',
      filters: [],
      columns: ['Name', 'Country', 'Region', 'Year', 'TotalHolidays', 'IsActive'],
      sort: [['Year', 'desc'], ['Country', 'asc']]
    },
    {
      name: 'ActiveCalendars',
      label: 'Active Calendars',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'Country', 'Year', 'TotalHolidays', 'LastSyncDate'],
      sort: [['Year', 'desc']]
    },
    {
      name: 'CurrentYear',
      label: 'Current Year',
      filters: [
        ['Year', '=', 'YEAR(TODAY())']
      ],
      columns: ['Name', 'Country', 'Region', 'TotalHolidays', 'IsActive'],
      sort: [['Country', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Calendar Information',
        columns: 2,
        fields: ['Name', 'Description', 'IsActive']
      },
      {
        label: 'Location',
        columns: 3,
        fields: ['Country', 'Region', 'Year']
      },
      {
        label: 'Auto-Update',
        columns: 3,
        fields: ['AutoUpdateFromPublicAPI', 'LastSyncDate', 'NextSyncDate']
      },
      {
        label: 'Statistics',
        columns: 1,
        fields: ['TotalHolidays']
      }
    ]
  }
};

export default HolidayCalendar;
