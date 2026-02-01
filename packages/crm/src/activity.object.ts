
const Activity = {
  name: 'activity',
  label: 'Activity',
  labelPlural: 'Activities',
  icon: 'calendar-check',
  description: 'Sales activity tracking including calls, emails, meetings, and tasks',
  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true
  },
  fields: {
    // Basic Information
    subject: {
      type: 'text',
      label: 'subject',
      required: true,
      searchable: true,
      maxLength: 255
    },
    type: {
      type: 'select',
      label: 'Activity type',
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
    status: {
      type: 'select',
      label: 'status',
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
    priority: {
      type: 'select',
      label: 'priority',
      defaultValue: 'Medium',
      options: [
        { label: '🔴 High', value: 'High' },
        { label: '🟡 Medium', value: 'Medium' },
        { label: '🟢 Low', value: 'Low' }
      ]
    },
    // Date & Time
    activity_date: {
      type: 'datetime',
      label: 'Activity Date',
      required: true
    },
    due_date: {
      type: 'date',
      label: 'Due Date'
    },
    end_date_time: {
      type: 'datetime',
      label: 'End Time'
    },
    duration_in_minutes: {
      type: 'number',
      label: 'Duration (Minutes)',
      precision: 0
    },
    completed_date: {
      type: 'datetime',
      label: 'Completed Date',
      readonly: true
    },
    // Related Records (Who/What Pattern)
    who_id: {
      type: 'lookup',
      label: 'Related Person',
      reference: ['Contact', 'Lead'],
      description: 'Link to Contact or Lead'
    },
    what_id: {
      type: 'lookup',
      label: 'Related To',
      reference: ['Account', 'Opportunity', 'Contract', 'Case'],
      description: 'Link to Account, Opportunity, Contract, or Case'
    },
    owner_id: {
      type: 'lookup',
      label: 'Assigned To',
      reference: 'User',
      required: true
    },
    // location
    location: {
      type: 'text',
      label: 'location',
      maxLength: 255
    },
    is_online: {
      type: 'checkbox',
      label: 'Online Activity',
      defaultValue: false
    },
    meeting_link: {
      type: 'url',
      label: 'Meeting Link',
      description: 'Zoom/Teams/Tencent Meeting link'
    },
    // Check-in (for field visits)
    check_in_time: {
      type: 'datetime',
      label: 'Check-in Time',
      readonly: true
    },
    check_in_location: {
      type: 'text',
      label: 'Check-in location',
      readonly: true,
      maxLength: 255
    },
    check_in_latitude: {
      type: 'number',
      label: 'Check-in Latitude',
      readonly: true,
      precision: 7
    },
    check_in_longitude: {
      type: 'number',
      label: 'Check-in Longitude',
      readonly: true,
      precision: 7
    },
    // Call Details
    call_type: {
      type: 'select',
      label: 'Call type',
      options: [
        { label: 'Outbound', value: 'Outbound' },
        { label: 'Inbound', value: 'Inbound' },
        { label: 'Internal', value: 'Internal' }
      ]
    },
    call_duration_in_seconds: {
      type: 'number',
      label: 'Call Duration (Seconds)',
      precision: 0,
      readonly: true
    },
    call_result: {
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
    email_subject: {
      type: 'text',
      label: 'Email subject',
      maxLength: 255
    },
    email_body: {
      type: 'textarea',
      label: 'Email Body',
      maxLength: 32000
    },
    email_from_address: {
      type: 'email',
      label: 'From'
    },
    email_to_address: {
      type: 'email',
      label: 'To'
    },
    email_cc_address: {
      type: 'text',
      label: 'CC',
      maxLength: 500
    },
    // SMS Details
    sms_body: {
      type: 'text',
      label: 'SMS Content',
      maxLength: 1000
    },
    sms_phone_number: {
      type: 'phone',
      label: 'SMS Phone Number'
    },
    // Recurring Task Support
    is_recurring: {
      type: 'checkbox',
      label: 'Recurring Task',
      defaultValue: false
    },
    recurrence_pattern: {
      type: 'select',
      label: 'Recurrence Pattern',
      options: [
        { label: 'Daily', value: 'Daily' },
        { label: 'Weekly', value: 'Weekly' },
        { label: 'Monthly', value: 'Monthly' },
        { label: 'Yearly', value: 'Yearly' }
      ]
    },
    recurrence_interval: {
      type: 'number',
      label: 'Recurrence Interval',
      precision: 0,
      min: 1,
      description: 'Repeat every N days/weeks/months/years'
    },
    recurrence_end_date: {
      type: 'date',
      label: 'Recurrence End Date'
    },
    recurrence_instance_id: {
      type: 'lookup',
      label: 'Parent Recurring Activity',
      reference: 'activity',
      readonly: true,
      description: 'Link to the master recurring activity'
    },
    // Content & Notes
    description: {
      type: 'textarea',
      label: 'description/Notes',
      maxLength: 32000,
      searchable: true
    },
    // AI Enhancement Fields
    ai_transcription: {
      type: 'textarea',
      label: 'AI Transcription',
      readonly: true,
      maxLength: 32000,
      description: 'AI-powered voice-to-text transcription'
    },
    ai_action_items: {
      type: 'textarea',
      label: 'AI Extracted Action Items',
      readonly: true,
      maxLength: 5000,
      description: 'Auto-extracted action items from meetings/calls'
    },
    ai_sentiment_analysis: {
      type: 'select',
      label: 'AI Sentiment',
      readonly: true,
      options: [
        { label: '😊 Positive', value: 'Positive' },
        { label: '😐 Neutral', value: 'Neutral' },
        { label: '😟 Negative', value: 'Negative' }
      ]
    },
    ai_key_points: {
      type: 'textarea',
      label: 'AI Key Points',
      readonly: true,
      maxLength: 2000,
      description: 'AI summary of key discussion points'
    },
    ai_next_step_suggestion: {
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
      foreignKey: 'parent_id',
      label: 'Attachments'
    },
    {
      name: 'RecurringInstances',
      type: 'hasMany',
      object: 'Activity',
      foreignKey: 'recurrence_instance_id',
      label: 'Recurring Instances'
    }
  ],
  listViews: [
    {
      name: 'AllActivities',
      label: 'All Activities',
      filters: [],
      columns: ['subject', 'type', 'status', 'activity_date', 'who_id', 'what_id', 'owner_id'],
      sort: [['activity_date', 'desc']]
    },
    {
      name: 'MyActivities',
      label: 'My Activities',
      filters: [['owner_id', '=', '$currentUser']],
      columns: ['subject', 'type', 'status', 'priority', 'activity_date', 'who_id', 'what_id'],
      sort: [['activity_date', 'desc']]
    },
    {
      name: 'TodayActivities',
      label: 'Today',
      filters: [
        ['activity_date', 'today', null],
        ['owner_id', '=', '$currentUser']
      ],
      columns: ['subject', 'type', 'status', 'activity_date', 'who_id', 'what_id', 'location'],
      sort: [['activity_date', 'asc']]
    },
    {
      name: 'ThisWeekActivities',
      label: 'This Week',
      filters: [
        ['activity_date', 'this_week', null],
        ['owner_id', '=', '$currentUser']
      ],
      columns: ['subject', 'type', 'status', 'priority', 'activity_date', 'who_id', 'what_id'],
      sort: [['activity_date', 'asc']]
    },
    {
      name: 'UpcomingActivities',
      label: 'Upcoming',
      filters: [
        ['activity_date', 'next_n_days', 7],
        ['status', 'not in', ['Completed', 'Cancelled']]
      ],
      columns: ['subject', 'type', 'priority', 'activity_date', 'who_id', 'what_id', 'owner_id'],
      sort: [['activity_date', 'asc']]
    },
    {
      name: 'OverdueActivities',
      label: 'Overdue',
      filters: [
        ['due_date', '<', '$today'],
        ['status', 'not in', ['Completed', 'Cancelled']]
      ],
      columns: ['subject', 'type', 'priority', 'due_date', 'who_id', 'what_id', 'owner_id'],
      sort: [['due_date', 'asc']]
    },
    {
      name: 'CompletedActivities',
      label: 'Completed',
      filters: [['status', '=', 'Completed']],
      columns: ['subject', 'type', 'activity_date', 'completed_date', 'who_id', 'what_id', 'owner_id'],
      sort: [['completed_date', 'desc']]
    },
    {
      name: 'MeetingRecords',
      label: 'Meetings',
      filters: [
        ['type', '=', 'Meeting'],
        ['status', '=', 'Completed']
      ],
      columns: ['subject', 'activity_date', 'location', 'who_id', 'what_id', 'owner_id', 'ai_key_points'],
      sort: [['activity_date', 'desc']]
    },
    {
      name: 'TeamCalendar',
      label: 'Team Calendar',
      filters: [
        ['activity_date', 'this_month', null],
        ['type', 'in', ['Meeting', 'Call', 'Demo']]
      ],
      columns: ['subject', 'type', 'status', 'activity_date', 'who_id', 'what_id', 'owner_id'],
      sort: [['activity_date', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'EndDateTimeAfterStart',
      errorMessage: 'End time must be after start time',
      formula: 'AND(NOT(ISBLANK(activity_date)), NOT(ISBLANK(end_date_time)), end_date_time < activity_date)'
    },
    {
      name: 'MeetingRequiresLocation',
      errorMessage: 'In-person meetings must have a location',
      formula: 'AND(type = "Meeting", is_online = false, ISBLANK(location))'
    },
    {
      name: 'OnlineMeetingRequiresLink',
      errorMessage: 'Online meetings should have a meeting link',
      formula: 'AND(type = "Meeting", is_online = true, ISBLANK(meeting_link))'
    },
    {
      name: 'CallRequiresCallType',
      errorMessage: 'Call activities must specify call type',
      formula: 'AND(type = "Call", ISBLANK(call_type))'
    },
    {
      name: 'EmailRequiresRecipient',
      errorMessage: 'Email activities must have a recipient',
      formula: 'AND(type = "Email", ISBLANK(email_to_address))'
    },
    {
      name: 'SMSRequiresPhoneNumber',
      errorMessage: 'SMS activities must have a phone number',
      formula: 'AND(type = "SMS", ISBLANK(sms_phone_number))'
    },
    {
      name: 'RecurringTaskRequiresPattern',
      errorMessage: 'Recurring tasks must have a recurrence pattern',
      formula: 'AND(is_recurring = true, ISBLANK(recurrence_pattern))'
    },
    {
      name: 'RecurrenceEndDateValid',
      errorMessage: 'Recurrence end date must be after activity date',
      formula: 'AND(is_recurring = true, NOT(ISBLANK(recurrence_end_date)), recurrence_end_date < activity_date)'
    },
    {
      name: 'DueDateValidation',
      errorMessage: 'Due date must be after activity date',
      formula: 'AND(NOT(ISBLANK(due_date)), NOT(ISBLANK(activity_date)), due_date < activity_date)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Activity Information',
        columns: 2,
        fields: ['subject', 'type', 'status', 'priority', 'owner_id']
      },
      {
        label: 'Date & Time',
        columns: 2,
        fields: ['activity_date', 'end_date_time', 'due_date', 'duration_in_minutes', 'completed_date']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['who_id', 'what_id']
      },
      {
        label: 'location',
        columns: 2,
        fields: ['location', 'is_online', 'meeting_link']
      },
      {
        label: 'Check-in',
        columns: 2,
        fields: ['check_in_time', 'check_in_location', 'check_in_latitude', 'check_in_longitude']
      },
      {
        label: 'Call Details',
        columns: 2,
        fields: ['call_type', 'call_duration_in_seconds', 'call_result']
      },
      {
        label: 'Email Details',
        columns: 2,
        fields: ['email_subject', 'email_from_address', 'email_to_address', 'email_cc_address']
      },
      {
        label: 'SMS Details',
        columns: 2,
        fields: ['sms_body', 'sms_phone_number']
      },
      {
        label: 'Recurring Task',
        columns: 2,
        fields: ['is_recurring', 'recurrence_pattern', 'recurrence_interval', 'recurrence_end_date', 'recurrence_instance_id']
      },
      {
        label: 'AI Insights',
        columns: 1,
        fields: ['ai_transcription', 'ai_action_items', 'ai_key_points', 'ai_sentiment_analysis', 'ai_next_step_suggestion']
      },
      {
        label: 'description & Notes',
        columns: 1,
        fields: ['description', 'email_body']
      }
    ]
  }
};

export default Activity;
