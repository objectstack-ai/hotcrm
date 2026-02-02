import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Task = ObjectSchema.create({
  name: 'task',
  label: 'Task',
  pluralLabel: 'Tasks',
  icon: 'check-square',
  description: 'Specialized task management with Kanban boards, dependencies, and time tracking',

  fields: {
    subject: Field.text({
      label: 'Task subject',
      required: true,
      maxLength: 255
    }),
    priority: Field.select({
      label: 'priority',
      required: true,
      defaultValue: 'Normal',
      options: [
        {
          "label": "🔴 High",
          "value": "High"
        },
        {
          "label": "🟡 Normal",
          "value": "Normal"
        },
        {
          "label": "🟢 Low",
          "value": "Low"
        }
      ]
    }),
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'Not Started',
      options: [
        {
          "label": "📋 Not Started",
          "value": "Not Started"
        },
        {
          "label": "🚀 In Progress",
          "value": "In Progress"
        },
        {
          "label": "✅ Completed",
          "value": "Completed"
        },
        {
          "label": "⏰ Waiting",
          "value": "Waiting"
        },
        {
          "label": "⏸️ Deferred",
          "value": "Deferred"
        }
      ]
    }),
    due_date: Field.date({
      label: 'Due Date',
      description: 'Task must have a due date',
      required: true
    }),
    start_date: Field.date({ label: 'Start Date' }),
    completed_date: Field.datetime({
      label: 'Completed Date',
      readonly: true
    }),
    reminder_date_time: Field.datetime({
      label: 'Reminder Date/Time',
      description: 'When to send a reminder notification'
    }),
    is_reminder_set: Field.boolean({
      label: 'Reminder Set',
      defaultValue: false
    }),
    recurrence_type: Field.select({
      label: 'Recurrence Type',
      options: [
        {
          "label": "📅 Daily",
          "value": "Daily"
        },
        {
          "label": "📆 Weekly",
          "value": "Weekly"
        },
        {
          "label": "🗓️ Monthly",
          "value": "Monthly"
        },
        {
          "label": "📊 Yearly",
          "value": "Yearly"
        }
      ]
    }),
    recurrence_interval: Field.number({
      label: 'Recurrence Interval',
      description: 'Repeat every N days/weeks/months/years',
      min: 1,
      precision: 0
    }),
    recurrence_end_date: Field.date({
      label: 'Recurrence End Date',
      description: 'When the recurring task should stop'
    }),
    recurrence_parent_id: Field.lookup('Task', {
      label: 'Recurring Parent Task',
      description: 'Link to the master recurring task',
      readonly: true
    }),
    what_id: Field.lookup("Account", {
      label: 'Related To',
      description: 'Link to related business object'
    }),
    who_id: Field.lookup("Contact", {
      label: 'Related Person',
      description: 'Link to Contact or Lead'
    }),
    owner_id: Field.lookup('users', {
      label: 'Assigned To',
      required: true,
      defaultValue: '$currentUser'
    }),
    parent_task_id: Field.lookup('Task', {
      label: 'Parent Task',
      description: 'For creating task hierarchies and subtasks'
    }),
    estimated_hours: Field.number({
      label: 'Estimated Hours',
      description: 'Estimated time to complete this task',
      min: 0,
      precision: 2
    }),
    actual_hours: Field.number({
      label: 'Actual Hours',
      description: 'Actual time spent on this task',
      min: 0,
      precision: 2
    }),
    percent_complete: Field.percent({
      label: 'Percent Complete',
      description: 'Task completion percentage (0-100%)'
    }),
    blocked_by: Field.text({
      label: 'Blocked By',
      description: 'Comma-separated task IDs that block this task',
      maxLength: 500
    }),
    blocks: Field.text({
      label: 'blocks',
      description: 'Comma-separated task IDs that this task blocks',
      maxLength: 500
    }),
    checklist_items: Field.textarea({
      label: 'Checklist Items',
      description: 'JSON array of checklist items with completion status',
      maxLength: 5000
    }),
    checklist_completed_count: Field.number({
      label: 'Checklist Completed Count',
      description: 'Number of completed checklist items',
      readonly: true,
      precision: 0
    }),
    checklist_total_count: Field.number({
      label: 'Checklist Total Count',
      description: 'Total number of checklist items',
      readonly: true,
      precision: 0
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 32000
    }),
    kanban_column: Field.select({
      label: 'Kanban Column',
      options: [
        {
          "label": "📝 To Do",
          "value": "todo"
        },
        {
          "label": "🚀 In Progress",
          "value": "in_progress"
        },
        {
          "label": "👀 Review",
          "value": "review"
        },
        {
          "label": "✅ Done",
          "value": "done"
        }
      ]
    }),
    kanban_order: Field.number({
      label: 'Kanban Order',
      description: 'Order within Kanban column',
      precision: 0
    }),
    tags: Field.text({
      label: 'tags',
      description: 'Comma-separated tags for categorization',
      maxLength: 500
    }),
    ai_suggested_priority: Field.select({
      label: 'AI Suggested priority',
      readonly: true,
      options: [
        {
          "label": "🔴 High",
          "value": "High"
        },
        {
          "label": "🟡 Normal",
          "value": "Normal"
        },
        {
          "label": "🟢 Low",
          "value": "Low"
        }
      ]
    }),
    ai_estimated_duration: Field.number({
      label: 'AI Estimated Duration (Hours)',
      description: 'AI-predicted task duration',
      readonly: true,
      precision: 2
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true
  },
});