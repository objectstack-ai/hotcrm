
const Task = {
  name: 'task',
  label: 'Task',
  labelPlural: 'Tasks',
  icon: 'check-square',
  description: 'Specialized task management with Kanban boards, dependencies, and time tracking',
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
      label: 'Task subject',
      required: true,
      searchable: true,
      maxLength: 255
    },
    priority: {
      type: 'select',
      label: 'priority',
      required: true,
      defaultValue: 'Normal',
      options: [
        { label: '🔴 High', value: 'High' },
        { label: '🟡 Normal', value: 'Normal' },
        { label: '🟢 Low', value: 'Low' }
      ]
    },
    status: {
      type: 'select',
      label: 'status',
      required: true,
      defaultValue: 'Not Started',
      options: [
        { label: '📋 Not Started', value: 'Not Started' },
        { label: '🚀 In Progress', value: 'In Progress' },
        { label: '✅ Completed', value: 'Completed' },
        { label: '⏰ Waiting', value: 'Waiting' },
        { label: '⏸️ Deferred', value: 'Deferred' }
      ]
    },
    
    // Dates & Reminders
    due_date: {
      type: 'date',
      label: 'Due Date',
      required: true,
      description: 'Task must have a due date'
    },
    start_date: {
      type: 'date',
      label: 'Start Date'
    },
    completed_date: {
      type: 'datetime',
      label: 'Completed Date',
      readonly: true
    },
    reminder_date_time: {
      type: 'datetime',
      label: 'Reminder Date/Time',
      description: 'When to send a reminder notification'
    },
    is_reminder_set: {
      type: 'checkbox',
      label: 'Reminder Set',
      defaultValue: false
    },
    
    // Recurrence Support
    recurrence_type: {
      type: 'select',
      label: 'Recurrence Type',
      options: [
        { label: '📅 Daily', value: 'Daily' },
        { label: '📆 Weekly', value: 'Weekly' },
        { label: '🗓️ Monthly', value: 'Monthly' },
        { label: '📊 Yearly', value: 'Yearly' }
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
      label: 'Recurrence End Date',
      description: 'When the recurring task should stop'
    },
    recurrence_parent_id: {
      type: 'lookup',
      label: 'Recurring Parent Task',
      reference: 'Task',
      readonly: true,
      description: 'Link to the master recurring task'
    },
    
    // Related Records
    what_id: {
      type: 'lookup',
      label: 'Related To',
      reference: ['Account', 'Opportunity', 'Contact', 'Lead', 'Case', 'Contract'],
      description: 'Link to related business object'
    },
    who_id: {
      type: 'lookup',
      label: 'Related Person',
      reference: ['Contact', 'Lead'],
      description: 'Link to Contact or Lead'
    },
    owner_id: {
      type: 'lookup',
      label: 'Assigned To',
      reference: 'User',
      required: true,
      defaultValue: '$currentUser'
    },
    parent_task_id: {
      type: 'lookup',
      label: 'Parent Task',
      reference: 'Task',
      description: 'For creating task hierarchies and subtasks'
    },
    
    // Time Tracking
    estimated_hours: {
      type: 'number',
      label: 'Estimated Hours',
      precision: 2,
      min: 0,
      description: 'Estimated time to complete this task'
    },
    actual_hours: {
      type: 'number',
      label: 'Actual Hours',
      precision: 2,
      min: 0,
      description: 'Actual time spent on this task'
    },
    percent_complete: {
      type: 'percent',
      label: 'Percent Complete',
      min: 0,
      max: 1,
      description: 'Task completion percentage (0-100%)'
    },
    
    // Task Dependencies
    blocked_by: {
      type: 'text',
      label: 'Blocked By',
      maxLength: 500,
      description: 'Comma-separated task IDs that block this task'
    },
    blocks: {
      type: 'text',
      label: 'blocks',
      maxLength: 500,
      description: 'Comma-separated task IDs that this task blocks'
    },
    
    // Checklist Support
    checklist_items: {
      type: 'textarea',
      label: 'Checklist Items',
      maxLength: 5000,
      description: 'JSON array of checklist items with completion status'
    },
    checklist_completed_count: {
      type: 'number',
      label: 'Checklist Completed Count',
      precision: 0,
      readonly: true,
      description: 'Number of completed checklist items'
    },
    checklist_total_count: {
      type: 'number',
      label: 'Checklist Total Count',
      precision: 0,
      readonly: true,
      description: 'Total number of checklist items'
    },
    
    // description & Notes
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 32000,
      searchable: true
    },
    
    // Kanban Board Fields
    kanban_column: {
      type: 'select',
      label: 'Kanban Column',
      options: [
        { label: '📝 To Do', value: 'todo' },
        { label: '🚀 In Progress', value: 'in_progress' },
        { label: '👀 Review', value: 'review' },
        { label: '✅ Done', value: 'done' }
      ]
    },
    kanban_order: {
      type: 'number',
      label: 'Kanban Order',
      precision: 0,
      description: 'Order within Kanban column'
    },
    
    // tags & Labels
    tags: {
      type: 'text',
      label: 'tags',
      maxLength: 500,
      description: 'Comma-separated tags for categorization'
    },
    
    // AI Enhancement
    a_i_suggested_priority: {
      type: 'select',
      label: 'AI Suggested priority',
      readonly: true,
      options: [
        { label: '🔴 High', value: 'High' },
        { label: '🟡 Normal', value: 'Normal' },
        { label: '🟢 Low', value: 'Low' }
      ]
    },
    a_i_estimated_duration: {
      type: 'number',
      label: 'AI Estimated Duration (Hours)',
      readonly: true,
      precision: 2,
      description: 'AI-predicted task duration'
    }
  },
  relationships: [
    {
      name: 'SubTasks',
      type: 'hasMany',
      object: 'Task',
      foreignKey: 'parent_task_id',
      label: 'Subtasks'
    },
    {
      name: 'RecurringInstances',
      type: 'hasMany',
      object: 'Task',
      foreignKey: 'recurrence_parent_id',
      label: 'Recurring Task Instances'
    },
    {
      name: 'Attachments',
      type: 'hasMany',
      object: 'Attachment',
      foreignKey: 'parent_id',
      label: 'Attachments'
    }
  ],
  listViews: [
    {
      name: 'AllTasks',
      label: 'All Tasks',
      filters: [],
      columns: ['subject', 'status', 'priority', 'due_date', 'owner_id', 'percent_complete'],
      sort: [['due_date', 'asc']]
    },
    {
      name: 'MyTasks',
      label: 'My Tasks',
      filters: [['owner_id', '=', '$currentUser']],
      columns: ['subject', 'status', 'priority', 'due_date', 'percent_complete', 'what_id'],
      sort: [['due_date', 'asc']]
    },
    {
      name: 'TodayTasks',
      label: 'Due Today',
      filters: [
        ['due_date', 'today', null],
        ['status', 'not in', ['Completed']]
      ],
      columns: ['subject', 'priority', 'status', 'owner_id', 'what_id', 'percent_complete'],
      sort: [['priority', 'desc'], ['due_date', 'asc']]
    },
    {
      name: 'OverdueTasks',
      label: 'Overdue',
      filters: [
        ['due_date', '<', '$today'],
        ['status', 'not in', ['Completed']]
      ],
      columns: ['subject', 'priority', 'due_date', 'owner_id', 'what_id', 'status'],
      sort: [['due_date', 'asc']]
    },
    {
      name: 'HighPriority',
      label: 'High priority',
      filters: [
        ['priority', '=', 'High'],
        ['status', 'not in', ['Completed']]
      ],
      columns: ['subject', 'status', 'due_date', 'owner_id', 'what_id', 'percent_complete'],
      sort: [['due_date', 'asc']]
    },
    {
      name: 'InProgress',
      label: 'In Progress',
      filters: [['status', '=', 'In Progress']],
      columns: ['subject', 'priority', 'due_date', 'owner_id', 'percent_complete', 'actual_hours'],
      sort: [['due_date', 'asc']]
    },
    {
      name: 'Completed',
      label: 'Completed',
      filters: [['status', '=', 'Completed']],
      columns: ['subject', 'priority', 'completed_date', 'owner_id', 'actual_hours', 'what_id'],
      sort: [['completed_date', 'desc']]
    },
    {
      name: 'RecurringTasks',
      label: 'Recurring Tasks',
      filters: [['recurrence_type', '!=', null]],
      columns: ['subject', 'recurrence_type', 'recurrence_interval', 'recurrence_end_date', 'owner_id'],
      sort: [['due_date', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'PreventSelfReference',
      errorMessage: 'A task cannot be its own parent task',
      formula: 'parent_task_id = Id'
    },
    {
      name: 'PreventRecurrenceSelfReference',
      errorMessage: 'A task cannot be its own recurring parent',
      formula: 'recurrence_parent_id = Id'
    },
    {
      name: 'StartDateBeforeDueDate',
      errorMessage: 'Start Date must be before Due Date',
      formula: 'AND(NOT(ISBLANK(start_date)), NOT(ISBLANK(due_date)), start_date > due_date)'
    },
    {
      name: 'RecurrenceRequiresType',
      errorMessage: 'Recurrence Interval requires Recurrence Type to be set',
      formula: 'AND(NOT(ISBLANK(recurrence_interval)), ISBLANK(recurrence_type))'
    },
    {
      name: 'RecurrenceEndDateValid',
      errorMessage: 'Recurrence End Date must be after Due Date',
      formula: 'AND(NOT(ISBLANK(recurrence_end_date)), NOT(ISBLANK(due_date)), recurrence_end_date < due_date)'
    },
    {
      name: 'PercentCompleteRange',
      errorMessage: 'Percent Complete must be between 0 and 100%',
      formula: 'OR(percent_complete < 0, percent_complete > 1)'
    },
    {
      name: 'CompletedTasksRequire100Percent',
      errorMessage: 'Completed tasks must have 100% completion',
      formula: 'AND(status = "Completed", percent_complete < 1)'
    },
    {
      name: 'ActualHoursValid',
      errorMessage: 'Actual Hours cannot exceed 999 hours',
      formula: 'actual_hours > 999'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Task Information',
        columns: 2,
        fields: ['subject', 'status', 'priority', 'owner_id', 'parent_task_id']
      },
      {
        label: 'Dates & Deadlines',
        columns: 2,
        fields: ['start_date', 'due_date', 'completed_date', 'reminder_date_time', 'is_reminder_set']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['what_id', 'who_id']
      },
      {
        label: 'Time Tracking',
        columns: 2,
        fields: ['estimated_hours', 'actual_hours', 'percent_complete']
      },
      {
        label: 'Recurrence Settings',
        columns: 2,
        fields: ['recurrence_type', 'recurrence_interval', 'recurrence_end_date', 'recurrence_parent_id']
      },
      {
        label: 'Task Dependencies',
        columns: 2,
        fields: ['blocked_by', 'blocks']
      },
      {
        label: 'Checklist',
        columns: 2,
        fields: ['checklist_items', 'checklist_completed_count', 'checklist_total_count']
      },
      {
        label: 'Kanban Board',
        columns: 2,
        fields: ['kanban_column', 'kanban_order', 'tags']
      },
      {
        label: 'AI Insights',
        columns: 2,
        fields: ['a_i_suggested_priority', 'a_i_estimated_duration']
      },
      {
        label: 'description',
        columns: 1,
        fields: ['description']
      }
    ]
  }
};

export default Task;
