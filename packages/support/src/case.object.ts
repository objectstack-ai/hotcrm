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
      defaultValue: 'new',
      options: [
        {
          "label": "🆕 New",
          "value": "new"
        },
        {
          "label": "📋 Open",
          "value": "open"
        },
        {
          "label": "🔄 In Progress",
          "value": "in_progress"
        },
        {
          "label": "⏸️ Waiting on Customer",
          "value": "waiting_on_customer"
        },
        {
          "label": "⏰ Escalated",
          "value": "escalated"
        },
        {
          "label": "✅ Resolved",
          "value": "resolved"
        },
        {
          "label": "🔒 Closed",
          "value": "closed"
        }
      ]
    }),
    priority: Field.select({
      label: 'priority',
      required: true,
      defaultValue: 'medium',
      options: [
        {
          "label": "🔴 Critical",
          "value": "critical"
        },
        {
          "label": "🟠 High",
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
    severity: Field.select({
      label: 'severity',
      options: [
        {
          "label": "S1 - Critical Impact",
          "value": "s1"
        },
        {
          "label": "S2 - High Impact",
          "value": "s2"
        },
        {
          "label": "S3 - Medium Impact",
          "value": "s3"
        },
        {
          "label": "S4 - Low Impact",
          "value": "s4"
        }
      ]
    }),
    type: Field.select({
      label: 'Case type',
      options: [
        {
          "label": "🐛 Problem",
          "value": "problem"
        },
        {
          "label": "❓ Question",
          "value": "question"
        },
        {
          "label": "🆘 Incident",
          "value": "incident"
        },
        {
          "label": "💡 Feature Request",
          "value": "feature_request"
        },
        {
          "label": "🎓 Training",
          "value": "training"
        },
        {
          "label": "🔧 Maintenance",
          "value": "maintenance"
        },
        {
          "label": "📖 Other",
          "value": "other"
        }
      ]
    }),
    origin: Field.select({
      label: 'origin Channel',
      required: true,
      options: [
        {
          "label": "📧 Email",
          "value": "email"
        },
        {
          "label": "🌐 Web",
          "value": "web"
        },
        {
          "label": "📞 Phone",
          "value": "phone"
        },
        {
          "label": "💬 WeChat",
          "value": "wechat"
        },
        {
          "label": "🤖 Chat Bot",
          "value": "chat_bot"
        },
        {
          "label": "📱 Mobile App",
          "value": "mobile_app"
        },
        {
          "label": "👤 Walk-in",
          "value": "walk_in"
        },
        {
          "label": "🎯 Other",
          "value": "other"
        }
      ]
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      required: true
    }),
    contact_id: Field.lookup('contact', { label: 'Contact' }),
    contract_id: Field.lookup('contract', {
      label: 'Contract',
      description: 'Service contract'
    }),
    product_id: Field.lookup('product', { label: 'Product' }),
    asset_id: Field.lookup('asset', {
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
    assigned_to_queue_id: Field.lookup('queue', {
      label: 'Queue',
      description: 'Support team queue'
    }),
    sla_level: Field.select({
      label: 'SLA Level',
      options: [
        {
          "label": "🏆 Platinum",
          "value": "platinum"
        },
        {
          "label": "🥇 Gold",
          "value": "gold"
        },
        {
          "label": "🥈 Silver",
          "value": "silver"
        },
        {
          "label": "🥉 Bronze",
          "value": "bronze"
        },
        {
          "label": "📋 Standard",
          "value": "standard"
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
          "value": "response"
        },
        {
          "label": "resolution Time Violation",
          "value": "resolution"
        },
        {
          "label": "Both",
          "value": "both"
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
          "value": "technical_support"
        },
        {
          "label": "📚 Product Guidance",
          "value": "product_guidance"
        },
        {
          "label": "🔧 Configuration Change",
          "value": "configuration_change"
        },
        {
          "label": "🐛 Bug Fix",
          "value": "bug_fix"
        },
        {
          "label": "📦 Product Update",
          "value": "product_update"
        },
        {
          "label": "🎓 Training",
          "value": "training"
        },
        {
          "label": "❌ No Fix Needed",
          "value": "no_fix_needed"
        },
        {
          "label": "🎯 Other",
          "value": "other"
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
          "value": "very_satisfied"
        },
        {
          "label": "🙂 Satisfied",
          "value": "satisfied"
        },
        {
          "label": "😐 Neutral",
          "value": "neutral"
        },
        {
          "label": "😟 Dissatisfied",
          "value": "dissatisfied"
        },
        {
          "label": "😡 Very Dissatisfied",
          "value": "very_dissatisfied"
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
          "value": "technical"
        },
        {
          "label": "Product",
          "value": "product"
        },
        {
          "label": "Billing",
          "value": "billing"
        },
        {
          "label": "Feature",
          "value": "feature"
        },
        {
          "label": "Complaint",
          "value": "complaint"
        },
        {
          "label": "Other",
          "value": "other"
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
          "value": "positive"
        },
        {
          "label": "😐 Neutral",
          "value": "neutral"
        },
        {
          "label": "😟 Negative",
          "value": "negative"
        },
        {
          "label": "😡 Angry",
          "value": "angry"
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
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
});