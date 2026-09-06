// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * English (en) — `objects` translations for the SERVICE family:
 * post-sale support — cases and the knowledge that deflects them.
 *
 * Roster: `crm_case`, `crm_knowledge_article`, `crm_article_feedback`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/en.ts`.
 */
export const service: Record<string, ObjectTranslationData> = {
  crm_case: {
    label: 'Case',
    pluralLabel: 'Cases',
    fields: {
      case_number: { label: 'Case Number' },
      subject: { label: 'Subject' },
      description: { label: 'Description' },
      crm_account: { label: 'Account' },
      crm_contact: { label: 'Contact' },
      status: {
        label: 'Status',
        options: {
          new: 'New', in_progress: 'In Progress', waiting_customer: 'Waiting on Customer',
          waiting_support: 'Waiting on Support', escalated: 'Escalated',
          resolved: 'Resolved', closed: 'Closed',
        },
      },
      priority: {
        label: 'Priority',
        options: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' },
      },
      type: {
        label: 'Case Type',
        options: {
          question: 'Question', problem: 'Problem',
          feature_request: 'Feature Request', bug: 'Bug',
        },
      },
      origin: {
        label: 'Case Origin',
        options: { email: 'Email', phone: 'Phone', web: 'Web', chat: 'Chat', social_media: 'Social Media' },
      },
      owner_id: { label: 'Case Owner' },
      created_date: { label: 'Created Date' },
      closed_date: { label: 'Closed Date' },
      first_response_date: { label: 'First Response Date' },
      resolution_time_hours: { label: 'Resolution Time (Hours)' },
      sla_due_date: { label: 'SLA Due Date' },
      is_sla_violated: { label: 'SLA Violated' },
      is_escalated: { label: 'Escalated' },
      escalation_reason: { label: 'Escalation Reason' },
      resolution: { label: 'Resolution' },
      resolved_by_article: { label: 'Resolved by Article', help: 'Knowledge article that resolved this case — the deflection signal.' },
      customer_rating: {
        label: 'Customer Satisfaction',
        help: 'Customer satisfaction rating (1-5 stars)',
      },
      customer_feedback: { label: 'Customer Feedback' },
      internal_notes: { label: 'Internal Notes', help: 'Internal notes; not visible to the customer.' },
      is_closed: { label: 'Is Closed' },
      display_title: { label: 'Display Title' },
      priority_rank: { label: 'Priority Rank' },
      escalated_date: { label: 'Escalated Date' },
    },
    _views: {
      all_cases: { label: 'All Cases' },
      case_workflow: { label: 'Service Workflow' },
      sla_calendar: { label: 'SLA Calendar' },
      case_timeline: { label: 'Case Timeline' },
      unassigned_triage: {
        label: 'Unassigned — triage',
        emptyState: {
          title: 'Nothing waiting for triage',
          message: 'Every case has an owner. Cases appear here when they arrive with no owner — typically a web-to-case submission that arrived while nobody held the Service Agent position.',
        },
      },
      escalated_cases: { label: 'Escalated Cases' },
      my_open_cases: { label: 'My Open Cases' },
      sla_at_risk: { label: '⏰ SLA at Risk' },
    },
    _sections: {
      basic: { label: 'Case Information' },
      origin: { label: 'Origin & Routing' },
      sla: { label: 'SLA & Priority' },
      resolution: { label: 'Resolution' },
      escalation: { label: 'Escalation' },
      system: { label: 'System' },
      // Detail-page sections (src/pages/case_detail.page.ts)
      info: { label: 'Case Information' },
      status: { label: 'Status & SLA' },
      description: { label: 'Description' },
      // Form section names on case.view.ts (#1100).
      case: { label: 'Case' },
      how_can_we_help: { label: 'How can we help?' },
    },
    _actions: {
      ...activityActions,
      escalate_case: {
        label: 'Escalate Case',
        confirmText: 'This will escalate the case to the escalation team. Continue?',
        successMessage: 'Case escalated successfully!',
      },
      close_case: {
        label: 'Close Case',
        confirmText: 'Are you sure you want to close this case?',
        successMessage: 'Case closed successfully!',
      },
      claim_case: {
        label: 'Claim Case',
        successMessage: 'Case claimed — it is yours now.',
      },
    },
  },
  crm_knowledge_article: {
    label: 'Knowledge Article',
    pluralLabel: 'Knowledge Base',
    description: 'Reusable answers and how-to guides for customers and agents',
    fields: {
      article_number: { label: 'Article #' },
      title: { label: 'Title' },
      summary: { label: 'Summary', help: 'One-paragraph TL;DR shown in search results and AI citations.' },
      body: { label: 'Body', help: 'Full article content (Markdown).' },
      category: {
        label: 'Category',
        options: {
          getting_started: 'Getting Started', how_to: 'How-To',
          troubleshooting: 'Troubleshooting', billing: 'Billing & Pricing', api: 'API & Integrations',
          release_notes: 'Release Notes', policy: 'Policy',
        },
      },
      tags: {
        label: 'Tags',
        options: {
          auth: 'Auth', sso: 'SSO', mobile: 'Mobile', email: 'Email',
          reports: 'Reports', performance: 'Performance', data_import: 'Data Import',
          webhooks: 'Webhooks',
        },
      },
      status: {
        label: 'Status',
        options: { draft: 'Draft', in_review: 'In Review', published: 'Published', archived: 'Archived' },
      },
      audience: {
        label: 'Audience',
        help: 'Public articles are visible in the customer portal; internal articles are agent-only.',
        options: { public: 'Public', internal: 'Internal' },
      },
      language: {
        label: 'Language',
        options: { en: 'English', zh_cn: 'Simplified Chinese', es_es: 'Spanish', ja_jp: 'Japanese' },
      },
      owner_id: { label: 'Owner' },
      related_to_case: { label: 'Source Case', help: 'Case this article was authored from (optional).' },
      published_at: { label: 'Published At' },
      last_reviewed_at: { label: 'Last Reviewed' },
      helpful_count: { label: 'Helpful', help: 'Recounted from crm_article_feedback — never typed in.' },
      not_helpful_count: { label: 'Not Helpful', help: 'Recounted from crm_article_feedback — never typed in.' },
      display_title: { label: 'Display Title' },
    },
    _views: {
      all_articles: { label: 'All Articles' },
      published_articles: { label: 'Published' },
      my_drafts: { label: 'My Drafts' },
    },
    _sections: {
      basic: { label: 'Article Information' },
      content: { label: 'Content' },
      taxonomy: { label: 'Categorization' },
      metrics: { label: 'Engagement' },
      engagement: { label: 'Engagement' },
      // Form section name on knowledge_article.view.ts (#1100)
      article: { label: 'Article' },
    },
    _actions: {
      mark_article_helpful: {
        label: 'Helpful',
        successMessage: 'Thanks — recorded as helpful.',
      },
      mark_article_not_helpful: {
        label: 'Not Helpful',
        successMessage: 'Thanks — recorded as not helpful.',
      },
    },
  },
  crm_article_feedback: {
    label: 'Article Feedback',
    pluralLabel: 'Article Feedback',
    description: 'One reader’s helpful / not-helpful verdict on a knowledge article',
    fields: {
      feedback_number: { label: 'Feedback #' },
      owner_id: { label: 'Reader' },
      crm_knowledge_article: { label: 'Article', help: 'Knowledge article this feedback is about.' },
      verdict: {
        label: 'Verdict',
        options: { helpful: 'Helpful', not_helpful: 'Not Helpful' },
      },
      comment: { label: 'Comment', help: 'Optional note explaining the verdict — read by the article’s author.' },
    },
    _sections: {
      basic: { label: 'Feedback' },
    },
  },
};
