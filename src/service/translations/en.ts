// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { activityActions } from '../../sales/translations/en/_shared';

/**
 * English (en) — the support module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const en: TranslationData = {
  objects: {
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
    crm_case: {
      label: 'Case',
      pluralLabel: 'Cases',
      fields: {
        case_number: { label: 'Case Number' },
        subject: { label: 'Subject' },
        description: { label: 'Description' },
        crm_account: { label: 'Account' },
        crm_contact: { label: 'Contact' },
        supplied_name: { label: 'Supplied Name', help: 'The name the person raising the case gave, as typed. Not verified, and not linked to any contact.' },
        supplied_email: { label: 'Supplied Email', help: 'The reply address the person raising the case gave, as typed. Not verified, and not linked to any contact.' },
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
        closed_date: { label: 'Closed Date' },
        first_response_date: { label: 'First Response Date' },
        resolution_time_hours: { label: 'Resolution Time (Hours)' },
        sla_due_date: { label: 'SLA Due Date', help: 'Set from the case priority and the account’s Customer Tier, in calendar hours: nights, weekends and holidays count.' },
        is_sla_violated: { label: 'SLA Violated' },
        is_escalated: { label: 'Escalated' },
        escalation_reason: { label: 'Escalation Reason' },
        resolution: { label: 'Resolution' },
        resolved_by_article: { label: 'Resolved by Article', help: 'Knowledge article that resolved this case — the deflection signal.' },
        internal_notes: { label: 'Internal Notes', help: 'Internal notes; not visible to the customer.' },
        is_closed: { label: 'Is Closed' },
        display_title: { label: 'Display Title' },
        priority_rank: { label: 'Priority Rank' },
        escalated_date: { label: 'Escalated Date' },
        escalated_from: { label: 'Escalated From' },
      },
      _views: {
        // The public Web-to-Case form's heading (#2284), as `web_to_lead`.
        web_to_case: { title: 'Contact Support' },
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
        // The detail page's sections reference the groups above (#970), so it
        // has no section names of its own.
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
  },
  dashboards: {
    service_dashboard: {
      label: 'Customer Service',
      description: 'Case load, SLA health, and resolution performance',
      widgets: {
        open_cases: { title: 'Open Cases', description: 'Cases that are not yet closed' },
        critical_cases: { title: 'Critical Cases', description: 'Open cases marked as critical priority' },
        avg_resolution_time: { title: 'Avg Resolution Time', description: 'Mean time to close, in hours' },
        sla_violations: { title: 'SLA Violations', description: 'Cases that breached their SLA' },
        cases_by_status: { title: 'Cases by Status', description: 'Workload distribution across the pipeline' },
        cases_by_priority: { title: 'Cases by Priority', description: 'Open case mix by urgency' },
        cases_by_origin: { title: 'Cases by Origin', description: 'Where our cases are coming from' },
        daily_case_volume: { title: 'Daily Case Volume', description: 'New cases created over the last 30 days' },
        sla_compliance_gauge: { title: 'SLA Compliance', description: 'Percent of cases resolved within SLA this period' },
        kb_deflection_rate: { title: 'KB Deflection Rate', description: 'Share of closed cases resolved with a knowledge article' },
        kb_resolved_cases: { title: 'Resolved by KB', description: 'Closed cases pointing at the article that resolved them' },
        closed_cases_total: { title: 'Closed Cases', description: 'The denominator behind the deflection rate' },
        top_resolving_articles: { title: 'Top Resolving Articles', description: 'Knowledge articles ranked by the closed cases they resolved' },
        my_open_cases_by_priority: { title: 'My Open Cases by Priority', description: 'Your open cases and their SLA-violation rate, broken down by priority' },
      },
    },
  },
  pages: {
    case_detail_page: {
      label: 'Case Detail',
      description: 'Service-agent case record: highlights, SLA path, details and activity timeline.',
      title: '{case_number} · {subject}',
      subtitle: '{crm_account}',
      components: {
        case_highlights: { label: 'Key Information' },
        case_status_path: { label: 'Case Status Path' },
      },
    },
  },
};
