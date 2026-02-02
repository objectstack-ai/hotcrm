import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Case = ObjectSchema.create({
  name: 'case',
  label: 'Case',
  pluralLabel: 'Cases',
  icon: 'ticket-alt',
  description: 'Customer service case and support request management with SLA tracking and AI-powered routing',

  fields: {
    case_number: Field.autonumber({
      label: 'Case Number',
      readonly: true,
      format: 'CASE-{YYYY}-{0000}'
    }),
    subject: Field.text({
      label: 'subject',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      required: true,
      maxLength: 32000
    }),
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'New',
      options: [
        {
          "label": "🆕 New",
          "value": "New"
        },
        {
          "label": "📋 Open",
          "value": "Open"
        },
        {
          "label": "🔄 In Progress",
          "value": "In Progress"
        },
        {
          "label": "⏸️ Waiting on Customer",
          "value": "Waiting on Customer"
        },
        {
          "label": "⏰ Escalated",
          "value": "Escalated"
        },
        {
          "label": "✅ Resolved",
          "value": "Resolved"
        },
        {
          "label": "🔒 Closed",
          "value": "Closed"
        }
      ]
    }),
    priority: Field.select({
      label: 'priority',
      required: true,
      defaultValue: 'Medium',
      options: [
        {
          "label": "🔴 Critical",
          "value": "Critical"
        },
        {
          "label": "🟠 High",
          "value": "High"
        },
        {
          "label": "🟡 Medium",
          "value": "Medium"
        },
        {
          "label": "🟢 Low",
          "value": "Low"
        }
      ]
    }),
    severity: Field.select({
      label: 'severity',
      options: [
        {
          "label": "S1 - Critical Impact",
          "value": "S1"
        },
        {
          "label": "S2 - High Impact",
          "value": "S2"
        },
        {
          "label": "S3 - Medium Impact",
          "value": "S3"
        },
        {
          "label": "S4 - Low Impact",
          "value": "S4"
        }
      ]
    }),
    type: Field.select({
      label: 'Case type',
      options: [
        {
          "label": "🐛 Problem",
          "value": "Problem"
        },
        {
          "label": "❓ Question",
          "value": "Question"
        },
        {
          "label": "🆘 Incident",
          "value": "Incident"
        },
        {
          "label": "💡 Feature Request",
          "value": "Feature Request"
        },
        {
          "label": "🎓 Training",
          "value": "Training"
        },
        {
          "label": "🔧 Maintenance",
          "value": "Maintenance"
        },
        {
          "label": "📖 Other",
          "value": "Other"
        }
      ]
    }),
    origin: Field.select({
      label: 'origin Channel',
      required: true,
      options: [
        {
          "label": "📧 Email",
          "value": "Email"
        },
        {
          "label": "🌐 Web",
          "value": "Web"
        },
        {
          "label": "📞 Phone",
          "value": "Phone"
        },
        {
          "label": "💬 WeChat",
          "value": "WeChat"
        },
        {
          "label": "🤖 Chat Bot",
          "value": "Chat Bot"
        },
        {
          "label": "📱 Mobile App",
          "value": "Mobile App"
        },
        {
          "label": "👤 Walk-in",
          "value": "Walk-in"
        },
        {
          "label": "🎯 Other",
          "value": "Other"
        }
      ]
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      required: true
    }),
    contact_id: Field.lookup('contact', { label: 'Contact' }),
    contract_id: Field.lookup('Contract', {
      label: 'Contract',
      description: 'Service contract'
    }),
    product_id: Field.lookup('product', { label: 'Product' }),
    asset_id: Field.lookup('Asset', {
      label: 'Asset',
      description: 'Related asset or equipment'
    }),
    parent_case_id: Field.lookup('case', {
      label: 'Parent Case',
      description: 'Parent case if this is a sub-case'
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true
    }),
    assigned_to_queue_id: Field.lookup('Queue', {
      label: 'Queue',
      description: 'Support team queue'
    }),
    sla_level: Field.select({
      label: 'SLA Level',
      options: [
        {
          "label": "🏆 Platinum",
          "value": "Platinum"
        },
        {
          "label": "🥇 Gold",
          "value": "Gold"
        },
        {
          "label": "🥈 Silver",
          "value": "Silver"
        },
        {
          "label": "🥉 Bronze",
          "value": "Bronze"
        },
        {
          "label": "📋 Standard",
          "value": "Standard"
        }
      ]
    }),
    response_due_date: Field.datetime({
      label: 'Response Due',
      description: 'Auto-calculated based on SLA',
      readonly: true
    }),
    resolution_due_date: Field.datetime({
      label: 'resolution Due',
      description: 'Auto-calculated based on SLA',
      readonly: true
    }),
    first_response_time: Field.datetime({
      label: 'First Response Time',
      readonly: true
    }),
    actual_resolution_time: Field.datetime({
      label: 'Actual resolution Time',
      readonly: true
    }),
    response_time_minutes: Field.number({
      label: 'Response Time (Minutes)',
      readonly: true,
      precision: 0
    }),
    resolution_time_minutes: Field.number({
      label: 'resolution Time (Minutes)',
      readonly: true,
      precision: 0
    }),
    is_sla_violated: Field.boolean({
      label: 'SLA Violated',
      defaultValue: false,
      readonly: true
    }),
    sla_violation_type: Field.select({
      label: 'SLA Violation type',
      readonly: true,
      options: [
        {
          "label": "Response Time Violation",
          "value": "Response"
        },
        {
          "label": "resolution Time Violation",
          "value": "resolution"
        },
        {
          "label": "Both",
          "value": "Both"
        }
      ]
    }),
    is_escalated: Field.boolean({
      label: 'Escalated',
      defaultValue: false
    }),
    escalated_date: Field.datetime({
      label: 'Escalated Date',
      readonly: true
    }),
    escalated_to_id: Field.lookup('users', { label: 'Escalated To' }),
    escalation_reason: Field.textarea({
      label: 'Escalation Reason',
      maxLength: 2000
    }),
    escalation_level: Field.number({
      label: 'Escalation Level',
      description: 'Number of times escalated',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    resolution: Field.textarea({
      label: 'resolution',
      maxLength: 32000
    }),
    root_cause: Field.textarea({
      label: 'Root Cause',
      maxLength: 5000
    }),
    resolution_category: Field.select({
      label: 'resolution Category',
      options: [
        {
          "label": "💻 Technical Support",
          "value": "Technical Support"
        },
        {
          "label": "📚 Product Guidance",
          "value": "Product Guidance"
        },
        {
          "label": "🔧 Configuration Change",
          "value": "Configuration Change"
        },
        {
          "label": "🐛 Bug Fix",
          "value": "Bug Fix"
        },
        {
          "label": "📦 Product Update",
          "value": "Product Update"
        },
        {
          "label": "🎓 Training",
          "value": "Training"
        },
        {
          "label": "❌ No Fix Needed",
          "value": "No Fix Needed"
        },
        {
          "label": "🎯 Other",
          "value": "Other"
        }
      ]
    }),
    work_around_provided: Field.boolean({
      label: 'Workaround Provided',
      defaultValue: false
    }),
    customer_satisfaction: Field.select({
      label: 'Customer Satisfaction',
      readonly: true,
      options: [
        {
          "label": "😄 Very Satisfied",
          "value": "Very Satisfied"
        },
        {
          "label": "🙂 Satisfied",
          "value": "Satisfied"
        },
        {
          "label": "😐 Neutral",
          "value": "Neutral"
        },
        {
          "label": "😟 Dissatisfied",
          "value": "Dissatisfied"
        },
        {
          "label": "😡 Very Dissatisfied",
          "value": "Very Dissatisfied"
        }
      ]
    }),
    satisfaction_score: Field.number({
      label: 'CSAT Score',
      description: 'Customer satisfaction rating (1-5)',
      readonly: true,
      min: 1,
      max: 5,
      precision: 0
    }),
    customer_feedback: Field.textarea({
      label: 'Customer Feedback',
      readonly: true,
      maxLength: 5000
    }),
    csat_survey_date: Field.datetime({
      label: 'CSAT Survey Date',
      readonly: true
    }),
    closed_date: Field.datetime({
      label: 'Closed Date',
      readonly: true
    }),
    reopened_date: Field.datetime({
      label: 'Reopened Date',
      readonly: true
    }),
    reopen_count: Field.number({
      label: 'Reopen Count',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    ai_auto_category: Field.select({
      label: 'AI Auto Category',
      readonly: true,
      options: [
        {
          "label": "Technical",
          "value": "Technical"
        },
        {
          "label": "Product",
          "value": "Product"
        },
        {
          "label": "Billing",
          "value": "Billing"
        },
        {
          "label": "Feature",
          "value": "Feature"
        },
        {
          "label": "Complaint",
          "value": "Complaint"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    ai_suggested_assignee_id: Field.lookup('users', {
      label: 'AI Suggested Assignee',
      description: 'AI-recommended agent based on skills and availability',
      readonly: true
    }),
    ai_related_knowledge: Field.text({
      label: 'AI Related Knowledge',
      description: 'Related knowledge base article IDs',
      readonly: true,
      maxLength: 500
    }),
    ai_suggested_solution: Field.textarea({
      label: 'AI Suggested Solution',
      description: 'AI-generated solution based on knowledge base',
      readonly: true,
      maxLength: 5000
    }),
    ai_sentiment_analysis: Field.select({
      label: 'AI Sentiment',
      readonly: true,
      options: [
        {
          "label": "😊 Positive",
          "value": "Positive"
        },
        {
          "label": "😐 Neutral",
          "value": "Neutral"
        },
        {
          "label": "😟 Negative",
          "value": "Negative"
        },
        {
          "label": "😡 Angry",
          "value": "Angry"
        }
      ]
    }),
    ai_urgency_score: Field.number({
      label: 'AI Urgency Score',
      description: 'AI-calculated urgency score (0-100)',
      readonly: true,
      min: 0,
      max: 100,
      precision: 0
    }),
    ai_keywords: Field.text({
      label: 'AI Keywords',
      description: 'Extracted keywords from case description',
      readonly: true,
      maxLength: 500
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: true,
    allowFeeds: true,
    allowAttachments: true,
    emailToCase: true
  },
});