import type { ServiceObject } from '@objectstack/spec/data';

const Activity = {
  name: 'Activity',
  label: 'Activity',
  labelPlural: 'Activities',
  icon: 'calendar-check',
  description: 'Sales activity tracking including calls, emails, meetings, and tasks',
  capabilities: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true
  },
  fields: {
    // Basic Information
    Subject: {
      type: 'text',
      label: 'Subject',
      required: true,
      searchable: true,
      maxLength: 255
    },
    Type: {
      type: 'select',
      label: 'Activity Type',
      required: true,
      options: [
        { label: '📞 Call', value: 'Call' },
        { label: '📧 Email', value: 'Email' },
        { label: '🤝 Meeting', value: 'Meeting' },
        { label: '📝 Task', value: 'Task' },
        { label: '📋 Note', value: 'Note' },
        { label: '📱 SMS', value: 'SMS' },
        { label: '🎤 Demo', value: 'Demo' },
        { label: '📊 Proposal', value: 'Proposal' },
        { label: '🍽️ Lunch', value: 'Lunch' },
        { label: '🎯 Other', value: 'Other' }
      ]
    },
    Status: {
      type: 'select',
      label: 'Status',
      required: true,
      defaultValue: 'Planned',
      options: [
        { label: '📋 Planned', value: 'Planned' },
        { label: '🚀 In Progress', value: 'In Progress' },
        { label: '✅ Completed', value: 'Completed' },
        { label: '❌ Cancelled', value: 'Cancelled' },
        { label: '⏰ Deferred', value: 'Deferred' }
      ]
    },
    Priority: {
      type: 'select',
      label: 'Priority',
      defaultValue: 'Medium',
      options: [
        { label: '🔴 High', value: 'High' },
        { label: '🟡 Medium', value: 'Medium' },
        { label: '🟢 Low', value: 'Low' }
      ]
    },
    // Date & Time
    ActivityDate: {
      type: 'datetime',
      label: 'Activity Date',
      required: true
    },
    DueDate: {
      type: 'date',
      label: 'Due Date'
    },
    EndDateTime: {
      type: 'datetime',
      label: 'End Time'
    },
    DurationInMinutes: {
      type: 'number',
      label: 'Duration (Minutes)',
      precision: 0
    },
    CompletedDate: {
      type: 'datetime',
      label: 'Completed Date',
      readonly: true
    },
    // Related Records (Who/What Pattern)
    WhoId: {
      type: 'lookup',
      label: 'Related Person',
      reference: ['Contact', 'Lead'],
      description: 'Link to Contact or Lead'
    },
    WhatId: {
      type: 'lookup',
      label: 'Related To',
      reference: ['Account', 'Opportunity', 'Contract', 'Case'],
      description: 'Link to Account, Opportunity, Contract, or Case'
    },
    OwnerId: {
      type: 'lookup',
      label: 'Assigned To',
      reference: 'User',
      required: true
    },
    // Location
    Location: {
      type: 'text',
      label: 'Location',
      maxLength: 255
    },
    IsOnline: {
      type: 'checkbox',
      label: 'Online Activity',
      defaultValue: false
    },
    MeetingLink: {
      type: 'url',
      label: 'Meeting Link',
      description: 'Zoom/Teams/Tencent Meeting link'
    },
    // Check-in (for field visits)
    CheckInTime: {
      type: 'datetime',
      label: 'Check-in Time',
      readonly: true
    },
    CheckInLocation: {
      type: 'text',
      label: 'Check-in Location',
      readonly: true,
      maxLength: 255
    },
    CheckInLatitude: {
      type: 'number',
      label: 'Check-in Latitude',
      readonly: true,
      precision: 7
    },
    CheckInLongitude: {
      type: 'number',
      label: 'Check-in Longitude',
      readonly: true,
      precision: 7
    },
    // Call Details
    CallType: {
      type: 'select',
      label: 'Call Type',
      options: [
        { label: 'Outbound', value: 'Outbound' },
        { label: 'Inbound', value: 'Inbound' },
        { label: 'Internal', value: 'Internal' }
      ]
    },
    CallDurationInSeconds: {
      type: 'number',
      label: 'Call Duration (Seconds)',
      precision: 0,
      readonly: true
    },
    CallResult: {
      type: 'select',
      label: 'Call Result',
      options: [
        { label: '✅ Connected', value: 'Connected' },
        { label: '❌ Not Connected', value: 'Not Connected' },
        { label: '📧 Left Message', value: 'Left Message' },
        { label: '⏰ Call Back Later', value: 'Call Back Later' },
        { label: '🚫 Rejected', value: 'Rejected' }
      ]
    },
    // Email Details
    EmailSubject: {
      type: 'text',
      label: 'Email Subject',
      maxLength: 255
    },
    EmailBody: {
      type: 'textarea',
      label: 'Email Body',
      maxLength: 32000
    },
    EmailFromAddress: {
      type: 'email',
      label: 'From'
    },
    EmailToAddress: {
      type: 'email',
      label: 'To'
    },
    EmailCcAddress: {
      type: 'text',
      label: 'CC',
      maxLength: 500
    },
    // SMS Details
    SMSBody: {
      type: 'text',
      label: 'SMS Content',
      maxLength: 1000
    },
    SMSPhoneNumber: {
      type: 'phone',
      label: 'SMS Phone Number'
    },
    // Recurring Task Support
    IsRecurring: {
      type: 'checkbox',
      label: 'Recurring Task',
      defaultValue: false
    },
    RecurrencePattern: {
      type: 'select',
      label: 'Recurrence Pattern',
      options: [
        { label: 'Daily', value: 'Daily' },
        { label: 'Weekly', value: 'Weekly' },
        { label: 'Monthly', value: 'Monthly' },
        { label: 'Yearly', value: 'Yearly' }
      ]
    },
    RecurrenceInterval: {
      type: 'number',
      label: 'Recurrence Interval',
      precision: 0,
      min: 1,
      description: 'Repeat every N days/weeks/months/years'
    },
    RecurrenceEndDate: {
      type: 'date',
      label: 'Recurrence End Date'
    },
    RecurrenceInstanceId: {
      type: 'lookup',
      label: 'Parent Recurring Activity',
      reference: 'Activity',
      readonly: true,
      description: 'Link to the master recurring activity'
    },
    // Content & Notes
    Description: {
      type: 'textarea',
      label: 'Description/Notes',
      maxLength: 32000,
      searchable: true
    },
    // AI Enhancement Fields
    AITranscription: {
      type: 'textarea',
      label: 'AI Transcription',
      readonly: true,
      maxLength: 32000,
      description: 'AI-powered voice-to-text transcription'
    },
    AIActionItems: {
      type: 'textarea',
      label: 'AI Extracted Action Items',
      readonly: true,
      maxLength: 5000,
      description: 'Auto-extracted action items from meetings/calls'
    },
    AISentimentAnalysis: {
      type: 'select',
      label: 'AI Sentiment',
      readonly: true,
      options: [
        { label: '😊 Positive', value: 'Positive' },
        { label: '😐 Neutral', value: 'Neutral' },
        { label: '😟 Negative', value: 'Negative' }
      ]
    },
    AIKeyPoints: {
      type: 'textarea',
      label: 'AI Key Points',
      readonly: true,
      maxLength: 2000,
      description: 'AI summary of key discussion points'
    },
    AINextStepSuggestion: {
      type: 'text',
      label: 'AI Next Step',
      readonly: true,
      maxLength: 500
    }
  },
  relationships: [
    {
      name: 'Attachments',
      type: 'hasMany',
      object: 'Attachment',
      foreignKey: 'ParentId',
      label: 'Attachments'
    },
    {
      name: 'RecurringInstances',
      type: 'hasMany',
      object: 'Activity',
      foreignKey: 'RecurrenceInstanceId',
      label: 'Recurring Instances'
    }
  ],
  listViews: [
    {
      name: 'AllActivities',
      label: 'All Activities',
      filters: [],
      columns: ['Subject', 'Type', 'Status', 'ActivityDate', 'WhoId', 'WhatId', 'OwnerId'],
      sort: [['ActivityDate', 'desc']]
    },
    {
      name: 'MyActivities',
      label: 'My Activities',
      filters: [['OwnerId', '=', '$currentUser']],
      columns: ['Subject', 'Type', 'Status', 'Priority', 'ActivityDate', 'WhoId', 'WhatId'],
      sort: [['ActivityDate', 'desc']]
    },
    {
      name: 'TodayActivities',
      label: 'Today',
      filters: [
        ['ActivityDate', 'today', null],
        ['OwnerId', '=', '$currentUser']
      ],
      columns: ['Subject', 'Type', 'Status', 'ActivityDate', 'WhoId', 'WhatId', 'Location'],
      sort: [['ActivityDate', 'asc']]
    },
    {
      name: 'ThisWeekActivities',
      label: 'This Week',
      filters: [
        ['ActivityDate', 'this_week', null],
        ['OwnerId', '=', '$currentUser']
      ],
      columns: ['Subject', 'Type', 'Status', 'Priority', 'ActivityDate', 'WhoId', 'WhatId'],
      sort: [['ActivityDate', 'asc']]
    },
    {
      name: 'UpcomingActivities',
      label: 'Upcoming',
      filters: [
        ['ActivityDate', 'next_n_days', 7],
        ['Status', 'not in', ['Completed', 'Cancelled']]
      ],
      columns: ['Subject', 'Type', 'Priority', 'ActivityDate', 'WhoId', 'WhatId', 'OwnerId'],
      sort: [['ActivityDate', 'asc']]
    },
    {
      name: 'OverdueActivities',
      label: 'Overdue',
      filters: [
        ['DueDate', '<', '$today'],
        ['Status', 'not in', ['Completed', 'Cancelled']]
      ],
      columns: ['Subject', 'Type', 'Priority', 'DueDate', 'WhoId', 'WhatId', 'OwnerId'],
      sort: [['DueDate', 'asc']]
    },
    {
      name: 'CompletedActivities',
      label: 'Completed',
      filters: [['Status', '=', 'Completed']],
      columns: ['Subject', 'Type', 'ActivityDate', 'CompletedDate', 'WhoId', 'WhatId', 'OwnerId'],
      sort: [['CompletedDate', 'desc']]
    },
    {
      name: 'MeetingRecords',
      label: 'Meetings',
      filters: [
        ['Type', '=', 'Meeting'],
        ['Status', '=', 'Completed']
      ],
      columns: ['Subject', 'ActivityDate', 'Location', 'WhoId', 'WhatId', 'OwnerId', 'AIKeyPoints'],
      sort: [['ActivityDate', 'desc']]
    },
    {
      name: 'TeamCalendar',
      label: 'Team Calendar',
      filters: [
        ['ActivityDate', 'this_month', null],
        ['Type', 'in', ['Meeting', 'Call', 'Demo']]
      ],
      columns: ['Subject', 'Type', 'Status', 'ActivityDate', 'WhoId', 'WhatId', 'OwnerId'],
      sort: [['ActivityDate', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'EndDateTimeAfterStart',
      errorMessage: 'End time must be after start time',
      formula: 'AND(NOT(ISBLANK(ActivityDate)), NOT(ISBLANK(EndDateTime)), EndDateTime < ActivityDate)'
    },
    {
      name: 'MeetingRequiresLocation',
      errorMessage: 'In-person meetings must have a location',
      formula: 'AND(Type = "Meeting", IsOnline = false, ISBLANK(Location))'
    },
    {
      name: 'OnlineMeetingRequiresLink',
      errorMessage: 'Online meetings should have a meeting link',
      formula: 'AND(Type = "Meeting", IsOnline = true, ISBLANK(MeetingLink))'
    },
    {
      name: 'CallRequiresCallType',
      errorMessage: 'Call activities must specify call type',
      formula: 'AND(Type = "Call", ISBLANK(CallType))'
    },
    {
      name: 'EmailRequiresRecipient',
      errorMessage: 'Email activities must have a recipient',
      formula: 'AND(Type = "Email", ISBLANK(EmailToAddress))'
    },
    {
      name: 'SMSRequiresPhoneNumber',
      errorMessage: 'SMS activities must have a phone number',
      formula: 'AND(Type = "SMS", ISBLANK(SMSPhoneNumber))'
    },
    {
      name: 'RecurringTaskRequiresPattern',
      errorMessage: 'Recurring tasks must have a recurrence pattern',
      formula: 'AND(IsRecurring = true, ISBLANK(RecurrencePattern))'
    },
    {
      name: 'RecurrenceEndDateValid',
      errorMessage: 'Recurrence end date must be after activity date',
      formula: 'AND(IsRecurring = true, NOT(ISBLANK(RecurrenceEndDate)), RecurrenceEndDate < ActivityDate)'
    },
    {
      name: 'DueDateValidation',
      errorMessage: 'Due date must be after activity date',
      formula: 'AND(NOT(ISBLANK(DueDate)), NOT(ISBLANK(ActivityDate)), DueDate < ActivityDate)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Activity Information',
        columns: 2,
        fields: ['Subject', 'Type', 'Status', 'Priority', 'OwnerId']
      },
      {
        label: 'Date & Time',
        columns: 2,
        fields: ['ActivityDate', 'EndDateTime', 'DueDate', 'DurationInMinutes', 'CompletedDate']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['WhoId', 'WhatId']
      },
      {
        label: 'Location',
        columns: 2,
        fields: ['Location', 'IsOnline', 'MeetingLink']
      },
      {
        label: 'Check-in',
        columns: 2,
        fields: ['CheckInTime', 'CheckInLocation', 'CheckInLatitude', 'CheckInLongitude']
      },
      {
        label: 'Call Details',
        columns: 2,
        fields: ['CallType', 'CallDurationInSeconds', 'CallResult']
      },
      {
        label: 'Email Details',
        columns: 2,
        fields: ['EmailSubject', 'EmailFromAddress', 'EmailToAddress', 'EmailCcAddress']
      },
      {
        label: 'SMS Details',
        columns: 2,
        fields: ['SMSBody', 'SMSPhoneNumber']
      },
      {
        label: 'Recurring Task',
        columns: 2,
        fields: ['IsRecurring', 'RecurrencePattern', 'RecurrenceInterval', 'RecurrenceEndDate', 'RecurrenceInstanceId']
      },
      {
        label: 'AI Insights',
        columns: 1,
        fields: ['AITranscription', 'AIActionItems', 'AIKeyPoints', 'AISentimentAnalysis', 'AINextStepSuggestion']
      },
      {
        label: 'Description & Notes',
        columns: 1,
        fields: ['Description', 'EmailBody']
      }
    ]
  }
};

export default Activity;
