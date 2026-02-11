import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Activity = ObjectSchema.create({
  name: 'activity',
  label: 'Activity',
  pluralLabel: 'Activities',
  icon: 'calendar-check',
  description: 'Sales activity tracking including calls, emails, meetings, and tasks',

  fields: {
    subject: Field.text({
      label: 'subject',
      required: true,
      maxLength: 255
    }),
    type: Field.select({
      label: 'Activity type',
      required: true,
      options: [
        {
          "label": "📞 Call",
          "value": "call"
        },
        {
          "label": "📧 Email",
          "value": "email"
        },
        {
          "label": "🤝 Meeting",
          "value": "meeting"
        },
        {
          "label": "📝 Task",
          "value": "task"
        },
        {
          "label": "📋 Note",
          "value": "note"
        },
        {
          "label": "📱 SMS",
          "value": "sms"
        },
        {
          "label": "🎤 Demo",
          "value": "demo"
        },
        {
          "label": "📊 Proposal",
          "value": "proposal"
        },
        {
          "label": "🍽️ Lunch",
          "value": "lunch"
        },
        {
          "label": "🎯 Other",
          "value": "other"
        }
      ]
    }),
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'planned',
      options: [
        {
          "label": "📋 Planned",
          "value": "planned"
        },
        {
          "label": "🚀 In Progress",
          "value": "in_progress"
        },
        {
          "label": "✅ Completed",
          "value": "completed"
        },
        {
          "label": "❌ Cancelled",
          "value": "cancelled"
        },
        {
          "label": "⏰ Deferred",
          "value": "deferred"
        }
      ]
    }),
    priority: Field.select({
      label: 'priority',
      defaultValue: 'medium',
      options: [
        {
          "label": "🔴 High",
          "value": "high"
        },
        {
          "label": "🟡 Medium",
          "value": "medium"
        },
        {
          "label": "🟢 Low",
          "value": "low"
        }
      ]
    }),
    activity_date: Field.datetime({
      label: 'Activity Date',
      required: true
    }),
    due_date: Field.date({ label: 'Due Date' }),
    end_date_time: Field.datetime({ label: 'End Time' }),
    duration_in_minutes: Field.number({
      label: 'Duration (Minutes)',
      precision: 0
    }),
    completed_date: Field.datetime({
      label: 'Completed Date',
      readonly: true
    }),
    who_id: Field.lookup("contact", {
      label: 'Related Person',
      description: 'Link to Contact or Lead'
    }),
    what_id: Field.lookup("account", {
      label: 'Related To',
      description: 'Link to Account, Opportunity, Contract, or Case'
    }),
    owner_id: Field.lookup('users', {
      label: 'Assigned To',
      required: true
    }),
    location: Field.text({
      label: 'location',
      maxLength: 255
    }),
    is_online: Field.boolean({
      label: 'Online Activity',
      defaultValue: false
    }),
    meeting_link: Field.url({
      label: 'Meeting Link',
      description: 'Zoom/Teams/Tencent Meeting link'
    }),
    check_in_time: Field.datetime({
      label: 'Check-in Time',
      readonly: true
    }),
    check_in_location: Field.text({
      label: 'Check-in location',
      readonly: true,
      maxLength: 255
    }),
    check_in_latitude: Field.number({
      label: 'Check-in Latitude',
      readonly: true,
      precision: 7
    }),
    check_in_longitude: Field.number({
      label: 'Check-in Longitude',
      readonly: true,
      precision: 7
    }),
    call_type: Field.select({
      label: 'Call type',
      options: [
        {
          "label": "Outbound",
          "value": "outbound"
        },
        {
          "label": "Inbound",
          "value": "inbound"
        },
        {
          "label": "Internal",
          "value": "internal"
        }
      ]
    }),
    call_duration_in_seconds: Field.number({
      label: 'Call Duration (Seconds)',
      readonly: true,
      precision: 0
    }),
    call_result: Field.select({
      label: 'Call Result',
      options: [
        {
          "label": "✅ Connected",
          "value": "connected"
        },
        {
          "label": "❌ Not Connected",
          "value": "not_connected"
        },
        {
          "label": "📧 Left Message",
          "value": "left_message"
        },
        {
          "label": "⏰ Call Back Later",
          "value": "call_back_later"
        },
        {
          "label": "🚫 Rejected",
          "value": "rejected"
        }
      ]
    }),
    email_subject: Field.text({
      label: 'Email subject',
      maxLength: 255
    }),
    email_body: Field.textarea({
      label: 'Email Body',
      maxLength: 32000
    }),
    email_from_address: Field.email({ label: 'From' }),
    email_to_address: Field.email({ label: 'To' }),
    email_cc_address: Field.text({
      label: 'CC',
      maxLength: 500
    }),
    sms_body: Field.text({
      label: 'SMS Content',
      maxLength: 1000
    }),
    sms_phone_number: Field.phone({ label: 'SMS Phone Number' }),
    is_recurring: Field.boolean({
      label: 'Recurring Task',
      defaultValue: false
    }),
    recurrence_pattern: Field.select({
      label: 'Recurrence Pattern',
      options: [
        {
          "label": "Daily",
          "value": "daily"
        },
        {
          "label": "Weekly",
          "value": "weekly"
        },
        {
          "label": "Monthly",
          "value": "monthly"
        },
        {
          "label": "Yearly",
          "value": "yearly"
        }
      ]
    }),
    recurrence_interval: Field.number({
      label: 'Recurrence Interval',
      description: 'Repeat every N days/weeks/months/years',
      min: 1,
      precision: 0
    }),
    recurrence_end_date: Field.date({ label: 'Recurrence End Date' }),
    recurrence_instance_id: Field.lookup('activity', {
      label: 'Parent Recurring Activity',
      description: 'Link to the master recurring activity',
      readonly: true
    }),
    description: Field.textarea({
      label: 'description/Notes',
      maxLength: 32000
    }),
    ai_transcription: Field.textarea({
      label: 'AI Transcription',
      description: 'AI-powered voice-to-text transcription',
      readonly: true,
      maxLength: 32000
    }),
    ai_action_items: Field.textarea({
      label: 'AI Extracted Action Items',
      description: 'Auto-extracted action items from meetings/calls',
      readonly: true,
      maxLength: 5000
    }),
    ai_sentiment_analysis: Field.select({
      label: 'AI Sentiment',
      readonly: true,
      options: [
        {
          "label": "😊 Positive",
          "value": "positive"
        },
        {
          "label": "😐 Neutral",
          "value": "neutral"
        },
        {
          "label": "😟 Negative",
          "value": "negative"
        }
      ]
    }),
    ai_key_points: Field.textarea({
      label: 'AI Key Points',
      description: 'AI summary of key discussion points',
      readonly: true,
      maxLength: 2000
    }),
    ai_next_step_suggestion: Field.text({
      label: 'AI Next Step',
      readonly: true,
      maxLength: 500
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true
  },
});