import type { ServiceObject } from '@objectstack/spec/data';

const Task = {
  name: 'task',
  label: 'Task',
  labelPlural: 'Tasks',
  icon: 'check-square',
  description: 'Specialized task management with Kanban boards, dependencies, and time tracking',
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
      label: 'Task Subject',
      required: true,
      searchable: true,
      maxLength: 255
    },
    Priority: {
      type: 'select',
      label: 'Priority',
      required: true,
      defaultValue: 'Normal',
      options: [
        { label: '🔴 High', value: 'High' },
        { label: '🟡 Normal', value: 'Normal' },
        { label: '🟢 Low', value: 'Low' }
      ]
    },
    Status: {
      type: 'select',
      label: 'Status',
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
    DueDate: {
      type: 'date',
      label: 'Due Date',
      required: true,
      description: 'Task must have a due date'
    },
    StartDate: {
      type: 'date',
      label: 'Start Date'
    },
    CompletedDate: {
      type: 'datetime',
      label: 'Completed Date',
      readonly: true
    },
    ReminderDateTime: {
      type: 'datetime',
      label: 'Reminder Date/Time',
      description: 'When to send a reminder notification'
    },
    IsReminderSet: {
      type: 'checkbox',
      label: 'Reminder Set',
      defaultValue: false
    },
    
    // Recurrence Support
    RecurrenceType: {
      type: 'select',
      label: 'Recurrence Type',
      options: [
        { label: '📅 Daily', value: 'Daily' },
        { label: '📆 Weekly', value: 'Weekly' },
        { label: '🗓️ Monthly', value: 'Monthly' },
        { label: '📊 Yearly', value: 'Yearly' }
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
      label: 'Recurrence End Date',
      description: 'When the recurring task should stop'
    },
    RecurrenceParentId: {
      type: 'lookup',
      label: 'Recurring Parent Task',
      reference: 'Task',
      readonly: true,
      description: 'Link to the master recurring task'
    },
    
    // Related Records
    WhatId: {
      type: 'lookup',
      label: 'Related To',
      reference: ['Account', 'Opportunity', 'Contact', 'Lead', 'Case', 'Contract'],
      description: 'Link to related business object'
    },
    WhoId: {
      type: 'lookup',
      label: 'Related Person',
      reference: ['Contact', 'Lead'],
      description: 'Link to Contact or Lead'
    },
    OwnerId: {
      type: 'lookup',
      label: 'Assigned To',
      reference: 'User',
      required: true,
      defaultValue: '$currentUser'
    },
    ParentTaskId: {
      type: 'lookup',
      label: 'Parent Task',
      reference: 'Task',
      description: 'For creating task hierarchies and subtasks'
    },
    
    // Time Tracking
    EstimatedHours: {
      type: 'number',
      label: 'Estimated Hours',
      precision: 2,
      min: 0,
      description: 'Estimated time to complete this task'
    },
    ActualHours: {
      type: 'number',
      label: 'Actual Hours',
      precision: 2,
      min: 0,
      description: 'Actual time spent on this task'
    },
    PercentComplete: {
      type: 'percent',
      label: 'Percent Complete',
      min: 0,
      max: 1,
      description: 'Task completion percentage (0-100%)'
    },
    
    // Task Dependencies
    BlockedBy: {
      type: 'text',
      label: 'Blocked By',
      maxLength: 500,
      description: 'Comma-separated task IDs that block this task'
    },
    Blocks: {
      type: 'text',
      label: 'Blocks',
      maxLength: 500,
      description: 'Comma-separated task IDs that this task blocks'
    },
    
    // Checklist Support
    ChecklistItems: {
      type: 'textarea',
      label: 'Checklist Items',
      maxLength: 5000,
      description: 'JSON array of checklist items with completion status'
    },
    ChecklistCompletedCount: {
      type: 'number',
      label: 'Checklist Completed Count',
      precision: 0,
      readonly: true,
      description: 'Number of completed checklist items'
    },
    ChecklistTotalCount: {
      type: 'number',
      label: 'Checklist Total Count',
      precision: 0,
      readonly: true,
      description: 'Total number of checklist items'
    },
    
    // Description & Notes
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 32000,
      searchable: true
    },
    
    // Kanban Board Fields
    KanbanColumn: {
      type: 'select',
      label: 'Kanban Column',
      options: [
        { label: '📝 To Do', value: 'todo' },
        { label: '🚀 In Progress', value: 'in_progress' },
        { label: '👀 Review', value: 'review' },
        { label: '✅ Done', value: 'done' }
      ]
    },
    KanbanOrder: {
      type: 'number',
      label: 'Kanban Order',
      precision: 0,
      description: 'Order within Kanban column'
    },
    
    // Tags & Labels
    Tags: {
      type: 'text',
      label: 'Tags',
      maxLength: 500,
      description: 'Comma-separated tags for categorization'
    },
    
    // AI Enhancement
    AISuggestedPriority: {
      type: 'select',
      label: 'AI Suggested Priority',
      readonly: true,
      options: [
        { label: '🔴 High', value: 'High' },
        { label: '🟡 Normal', value: 'Normal' },
        { label: '🟢 Low', value: 'Low' }
      ]
    },
    AIEstimatedDuration: {
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
      foreignKey: 'ParentTaskId',
      label: 'Subtasks'
    },
    {
      name: 'RecurringInstances',
      type: 'hasMany',
      object: 'Task',
      foreignKey: 'RecurrenceParentId',
      label: 'Recurring Task Instances'
    },
    {
      name: 'Attachments',
      type: 'hasMany',
      object: 'Attachment',
      foreignKey: 'ParentId',
      label: 'Attachments'
    }
  ],
  listViews: [
    {
      name: 'AllTasks',
      label: 'All Tasks',
      filters: [],
      columns: ['Subject', 'Status', 'Priority', 'DueDate', 'OwnerId', 'PercentComplete'],
      sort: [['DueDate', 'asc']]
    },
    {
      name: 'MyTasks',
      label: 'My Tasks',
      filters: [['OwnerId', '=', '$currentUser']],
      columns: ['Subject', 'Status', 'Priority', 'DueDate', 'PercentComplete', 'WhatId'],
      sort: [['DueDate', 'asc']]
    },
    {
      name: 'TodayTasks',
      label: 'Due Today',
      filters: [
        ['DueDate', 'today', null],
        ['Status', 'not in', ['Completed']]
      ],
      columns: ['Subject', 'Priority', 'Status', 'OwnerId', 'WhatId', 'PercentComplete'],
      sort: [['Priority', 'desc'], ['DueDate', 'asc']]
    },
    {
      name: 'OverdueTasks',
      label: 'Overdue',
      filters: [
        ['DueDate', '<', '$today'],
        ['Status', 'not in', ['Completed']]
      ],
      columns: ['Subject', 'Priority', 'DueDate', 'OwnerId', 'WhatId', 'Status'],
      sort: [['DueDate', 'asc']]
    },
    {
      name: 'HighPriority',
      label: 'High Priority',
      filters: [
        ['Priority', '=', 'High'],
        ['Status', 'not in', ['Completed']]
      ],
      columns: ['Subject', 'Status', 'DueDate', 'OwnerId', 'WhatId', 'PercentComplete'],
      sort: [['DueDate', 'asc']]
    },
    {
      name: 'InProgress',
      label: 'In Progress',
      filters: [['Status', '=', 'In Progress']],
      columns: ['Subject', 'Priority', 'DueDate', 'OwnerId', 'PercentComplete', 'ActualHours'],
      sort: [['DueDate', 'asc']]
    },
    {
      name: 'Completed',
      label: 'Completed',
      filters: [['Status', '=', 'Completed']],
      columns: ['Subject', 'Priority', 'CompletedDate', 'OwnerId', 'ActualHours', 'WhatId'],
      sort: [['CompletedDate', 'desc']]
    },
    {
      name: 'RecurringTasks',
      label: 'Recurring Tasks',
      filters: [['RecurrenceType', '!=', null]],
      columns: ['Subject', 'RecurrenceType', 'RecurrenceInterval', 'RecurrenceEndDate', 'OwnerId'],
      sort: [['DueDate', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'DueDateRequired',
      errorMessage: 'Due Date is required for all tasks',
      formula: 'ISBLANK(DueDate)'
    },
    {
      name: 'StartDateBeforeDueDate',
      errorMessage: 'Start Date must be before Due Date',
      formula: 'AND(NOT(ISBLANK(StartDate)), NOT(ISBLANK(DueDate)), StartDate > DueDate)'
    },
    {
      name: 'RecurrenceRequiresType',
      errorMessage: 'Recurrence Interval requires Recurrence Type to be set',
      formula: 'AND(NOT(ISBLANK(RecurrenceInterval)), ISBLANK(RecurrenceType))'
    },
    {
      name: 'RecurrenceEndDateValid',
      errorMessage: 'Recurrence End Date must be after Due Date',
      formula: 'AND(NOT(ISBLANK(RecurrenceEndDate)), NOT(ISBLANK(DueDate)), RecurrenceEndDate < DueDate)'
    },
    {
      name: 'PercentCompleteRange',
      errorMessage: 'Percent Complete must be between 0 and 100%',
      formula: 'OR(PercentComplete < 0, PercentComplete > 1)'
    },
    {
      name: 'CompletedTasksRequire100Percent',
      errorMessage: 'Completed tasks must have 100% completion',
      formula: 'AND(Status = "Completed", PercentComplete < 1)'
    },
    {
      name: 'ActualHoursValid',
      errorMessage: 'Actual Hours cannot exceed 999 hours',
      formula: 'ActualHours > 999'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Task Information',
        columns: 2,
        fields: ['Subject', 'Status', 'Priority', 'OwnerId', 'ParentTaskId']
      },
      {
        label: 'Dates & Deadlines',
        columns: 2,
        fields: ['StartDate', 'DueDate', 'CompletedDate', 'ReminderDateTime', 'IsReminderSet']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['WhatId', 'WhoId']
      },
      {
        label: 'Time Tracking',
        columns: 2,
        fields: ['EstimatedHours', 'ActualHours', 'PercentComplete']
      },
      {
        label: 'Recurrence Settings',
        columns: 2,
        fields: ['RecurrenceType', 'RecurrenceInterval', 'RecurrenceEndDate', 'RecurrenceParentId']
      },
      {
        label: 'Task Dependencies',
        columns: 2,
        fields: ['BlockedBy', 'Blocks']
      },
      {
        label: 'Checklist',
        columns: 2,
        fields: ['ChecklistItems', 'ChecklistCompletedCount', 'ChecklistTotalCount']
      },
      {
        label: 'Kanban Board',
        columns: 2,
        fields: ['KanbanColumn', 'KanbanOrder', 'Tags']
      },
      {
        label: 'AI Insights',
        columns: 2,
        fields: ['AISuggestedPriority', 'AIEstimatedDuration']
      },
      {
        label: 'Description',
        columns: 1,
        fields: ['Description']
      }
    ]
  }
};

export default Task;
