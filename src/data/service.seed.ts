// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Service seeds — the task list, the case backlog and the knowledge base.
 *
 * Tasks live here rather than with the sales pipeline because they are the
 * activity layer over every object (accounts, opportunities AND cases), and the
 * case seeds are the records they most often hang off.
 *
 * Split out of the former monolithic `src/data/index.ts` (#635). Seed doctrine
 * lives in `./_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Task } from '../objects/task.object';
import { Case } from '../objects/case.object';
import { KnowledgeArticle } from '../objects/knowledge_article.object';
import { celDaysAgo, celDaysFromNow } from './_shared';

// ─── Tasks ────────────────────────────────────────────────────────────
// Polymorphic parents need BOTH halves: `related_to_type` names the parent
// object and the matching `related_to_*` lookup carries the record. The
// Related tab and task.hook's activity bubble key off `related_to_type`, so a
// lookup without it is invisible to both (#490).
export const tasks = defineSeed(Task, {
  mode: 'upsert',
  externalId: 'subject',
  records: [
    {
      subject: 'Follow up with Acme on proposal',
      description: 'Send Jordan Park the revised Enterprise proposal and a 30-min calendar slot to walk through the AI governance section.',
      status: 'not_started',
      priority: 'high',
      priority_rank: 3,
      due_date: cel`daysFromNow(2)`,
      related_to_type: 'crm_opportunity',
      related_to_account: 'Acme Corporation',
      related_to_opportunity: 'Acme Platform Upgrade',
    },
    {
      subject: 'Acme — schedule AI governance workshop',
      description: 'Block a 90-min joint workshop with Acme’s compliance team to walk through how HotCRM agents handle data scoping, RBAC, audit trails, and human-in-the-loop. Pre-read: ADR-0007 + the governance demo deck.',
      status: 'not_started',
      priority: 'high',
      priority_rank: 3,
      due_date: cel`daysFromNow(7)`,
      related_to_type: 'crm_opportunity',
      related_to_account: 'Acme Corporation',
      related_to_opportunity: 'Acme Platform Upgrade',
    },
    {
      subject: 'Acme — close out login-issues ticket before SLA',
      description: 'Confirm engineering has the EMEA SSO clock-skew patch ready, deploy to Acme’s tenant, and send Lisa Kim a customer-facing post-mortem.',
      status: 'in_progress',
      priority: 'urgent',
      priority_rank: 4,
      due_date: cel`daysFromNow(1)`,
      related_to_type: 'crm_case',
      related_to_account: 'Acme Corporation',
      related_to_case: 'Login issues after platform upgrade',
    },
    {
      subject: 'Schedule demo for Globex team',
      status: 'in_progress',
      priority: 'normal',
      priority_rank: 2,
      due_date: cel`daysFromNow(5)`,
      related_to_type: 'crm_account',
      related_to_account: 'Globex Industries',
    },
    {
      subject: 'Prepare contract for Wayne Enterprises',
      status: 'not_started',
      priority: 'urgent',
      priority_rank: 4,
      due_date: cel`daysFromNow(1)`,
      related_to_type: 'crm_account',
      related_to_account: 'Wayne Enterprises',
    },
    {
      subject: 'Send welcome package to Stark Medical',
      status: 'completed',
      priority: 'low',
      priority_rank: 1,
      completed_date: cel`daysAgo(2)`,
      // Hooks don't run over seeds — mirror what task_completion would stamp.
      is_completed: true,
      progress_percent: 100,
      related_to_type: 'crm_account',
      related_to_account: 'Stark Medical',
    },
    {
      // Internal housekeeping task — deliberately unparented (the
      // related_to_required rule is a warning, not an error).
      subject: 'Update CRM pipeline report',
      status: 'not_started',
      priority: 'normal',
      priority_rank: 2,
      due_date: cel`daysFromNow(7)`,
    },
  ]
});

// ─── Cases ────────────────────────────────────────────────────────────
export const cases = defineSeed(Case, {
  mode: 'upsert',
  externalId: 'subject',
  records: [
    {
      subject: 'Login issues after platform upgrade',
      description: `Users in the EMEA office report intermittent 401 errors when logging in after the v4.2 upgrade rolled out Wednesday night. Pattern: only affects users authenticating via SAML through Okta, only between 09:00–10:30 UTC. NA and APAC users are unaffected.

**Customer impact:** ~40 users blocked at peak, costing ~3 productive hours per affected user.

**Initial triage:** Suspect a clock-skew issue on the EMEA SSO relay added during the upgrade window. Engineering is reproducing in staging.`,
      crm_account: 'Acme Corporation',
      crm_contact: 'john.smith@acme.example.com',
      status: 'in_progress',
      priority: 'high',
      priority_rank: 3,
      type: 'problem',
      origin: 'email',
      is_closed: false,
      is_sla_violated: false,
      is_escalated: false,
      created_date: cel`daysAgo(2)`,
      sla_due_date: cel`daysFromNow(1)`,
    },
    {
      subject: 'Data export timing out for large datasets',
      description: 'CSV export fails for datasets over 10k rows.',
      crm_account: 'Globex Industries',
      crm_contact: 'sarah.j@globex.example.com',
      status: 'escalated',
      priority: 'critical',
      priority_rank: 4,
      type: 'bug',
      origin: 'phone',
      is_closed: false,
      is_sla_violated: true,
      is_escalated: true,
      escalation_reason: 'Customer threatening churn',
      created_date: cel`daysAgo(5)`,
      sla_due_date: cel`daysAgo(2)`,
    },
    {
      subject: 'How to configure SSO with Okta?',
      description: 'Customer needs guidance on SSO setup with Okta.',
      crm_account: 'Initech Solutions',
      crm_contact: 'mchen@initech.example.com',
      status: 'resolved',
      priority: 'medium',
      priority_rank: 2,
      type: 'question',
      origin: 'web',
      // Resolved-but-not-closed: case.hook keeps is_closed=false and stamps
      // closed_date as the resolved-date proxy; resolution_time_hours is the
      // closed−created delta the hook would compute (daysAgo() is day-granular,
      // so deltas come in 24h steps).
      is_closed: false,
      is_sla_violated: false,
      is_escalated: false,
      resolution_time_hours: 24.0,
      created_date: cel`daysAgo(3)`,
      closed_date: cel`daysAgo(2)`,
      sla_due_date: cel`daysFromNow(2)`,
    },
    {
      subject: 'API rate limit exceeded on production',
      description: 'Production environment hitting rate limits during peak hours.',
      crm_account: 'Wayne Enterprises',
      crm_contact: 'rwilson@wayne.example.com',
      status: 'closed',
      priority: 'high',
      priority_rank: 3,
      type: 'problem',
      origin: 'chat',
      is_closed: true,
      is_sla_violated: false,
      is_escalated: false,
      // `resolution` is REQUIRED when status is 'closed' (object validation
      // `resolution_required_for_closed`) — without it the seed row is rejected.
      resolution: 'Raised the production rate-limit tier and added client-side backoff; usage now within limits.',
      // closed−created delta, as case.hook computes it.
      resolution_time_hours: 24.0,
      created_date: cel`daysAgo(7)`,
      closed_date: cel`daysAgo(6)`,
      sla_due_date: cel`daysAgo(6)`,
    },
    {
      subject: 'PDF reports not rendering charts correctly',
      description: 'Charts appear blank when exporting dashboard to PDF.',
      crm_account: 'Stark Medical',
      crm_contact: 'emily.d@starkmed.example.com',
      status: 'new',
      priority: 'medium',
      priority_rank: 2,
      type: 'bug',
      origin: 'email',
      is_closed: false,
      is_sla_violated: false,
      is_escalated: false,
      created_date: cel`daysAgo(1)`,
      sla_due_date: cel`daysFromNow(2)`,
    },
    {
      subject: 'Billing discrepancy on last invoice',
      description: `Customer (Lisa Kim, Procurement) flagged that the May invoice shows 15 active seats but Acme is only using 12. Two of the seats were de-provisioned in early April when two engineers left the company.

**Root cause:** the de-provisioning happened in our admin console but the seat-count metric in billing only refreshes monthly, so the May invoice picked up the pre-change count.

**Resolution path:** issue a $1,200 credit memo and switch Acme to the new real-time seat-billing pipeline so this can't recur. Waiting on Lisa to confirm she's good with the credit-memo treatment vs a refund.`,
      crm_account: 'Acme Corporation',
      crm_contact: 'john.smith@acme.example.com',
      status: 'waiting_customer',
      priority: 'low',
      priority_rank: 1,
      type: 'problem',
      origin: 'email',
      is_closed: false,
      is_sla_violated: false,
      is_escalated: false,
      created_date: cel`daysAgo(4)`,
      sla_due_date: cel`daysFromNow(3)`,
    },
    {
      subject: 'Mobile app crashes on iOS 17',
      description: 'App crashes on launch for users running iOS 17.2+.',
      crm_account: 'Globex Industries',
      crm_contact: 'sarah.j@globex.example.com',
      status: 'in_progress',
      priority: 'critical',
      priority_rank: 4,
      type: 'bug',
      origin: 'web',
      is_closed: false,
      is_sla_violated: true,
      is_escalated: true,
      escalation_reason: 'Affects 30% of mobile users',
      created_date: cel`daysAgo(3)`,
      sla_due_date: cel`daysAgo(1)`,
    },
    {
      subject: 'Request: bulk import via CSV',
      description: 'Customer requesting ability to import records via CSV upload.',
      crm_account: 'Wayne Enterprises',
      crm_contact: 'rwilson@wayne.example.com',
      status: 'closed',
      priority: 'low',
      priority_rank: 1,
      type: 'feature_request',
      origin: 'web',
      is_closed: true,
      is_sla_violated: false,
      is_escalated: false,
      // Required for closed cases (resolution_required_for_closed).
      resolution: 'Delivered CSV bulk-import in the 9.4 release; shared the docs link with the customer.',
      // closed−created delta, as case.hook computes it.
      resolution_time_hours: 48.0,
      created_date: cel`daysAgo(10)`,
      closed_date: cel`daysAgo(8)`,
      sla_due_date: cel`daysAgo(8)`,
    },
    // ─── Generated demo cases — 30 cases over the last 30 days, mixed across
    // priorities. Powers `CasesOpenedByDayPriorityReport` (daily bucketing
    // matrix) and the service dashboard's daily-volume area chart.
    ...((): readonly Record<string, unknown>[] => {
      const priorities = ['low', 'medium', 'high', 'critical'] as const;
      // Mirror of case.hook's priority rank map — hooks don't run over seeds.
      const rankByPriority: Record<typeof priorities[number], number> = { low: 1, medium: 2, high: 3, critical: 4 };
      const types = ['question', 'bug', 'problem', 'feature_request'] as const;
      const origins = ['email', 'phone', 'web', 'chat'] as const;
      const statuses = ['new', 'in_progress', 'resolved', 'closed', 'escalated'] as const;
      const accountsList = ['Acme Corporation', 'Globex Industries', 'Wayne Enterprises', 'Initech Solutions', 'Stark Medical'] as const;
      const out: Record<string, unknown>[] = [];
      for (let i = 0; i < 30; i++) {
        const priority = priorities[i % priorities.length];
        const status = statuses[i % statuses.length];
        const settled = status === 'resolved' || status === 'closed';
        const ageDays = 1 + (i % 30);
        // Settled cases get a resolution delay of 1–3 days (capped at the
        // case's age); resolution_time_hours is exactly the closed−created
        // delta case.hook would compute (daysAgo() is day-granular → 24h steps).
        const resolutionDays = Math.min(ageDays, 1 + (i % 3));
        // SLA breaches only make sense on OPEN cases with a due date already in
        // the past (the case_sla_monitor flow's definition). The old generator
        // flagged rows as violated while giving every row a FUTURE due date.
        const slaViolated = !settled && priority === 'critical' && i % 3 === 0;
        out.push({
          subject: `Demo case ${String(i + 1).padStart(2, '0')} — ${priority} ${types[i % types.length]}`,
          description: `Auto-generated demo case for ${priority} priority on day -${ageDays}.`,
          crm_account: accountsList[i % accountsList.length],
          status,
          priority,
          priority_rank: rankByPriority[priority],
          type: types[i % types.length],
          origin: origins[i % origins.length],
          // is_closed strictly mirrors case.hook: true ONLY for status
          // 'closed' — a resolved case is NOT closed yet.
          is_closed: status === 'closed',
          is_sla_violated: slaViolated,
          is_escalated: status === 'escalated',
          ...(settled ? { resolution_time_hours: resolutionDays * 24 } : {}),
          // Object validations require these when closed/escalated — without
          // them the generated rows are rejected (resolution_required_for_closed
          // / escalation_reason_required).
          ...(status === 'closed' ? { resolution: 'Resolved per standard runbook; root cause documented and customer confirmed.' } : {}),
          ...(status === 'escalated' ? { escalation_reason: 'Escalated to tier-2 engineering for SLA-risk review.' } : {}),
          created_date: celDaysAgo(ageDays),
          // Resolved cases also carry closed_date: case.hook stamps it as the
          // resolved-date proxy while keeping is_closed=false.
          ...(settled ? { closed_date: celDaysAgo(ageDays - resolutionDays) } : {}),
          sla_due_date: slaViolated
            ? celDaysAgo(1)
            : celDaysFromNow(priority === 'critical' ? 1 : priority === 'high' ? 2 : 4),
        });
      }
      return out;
    })(),
  ],
});

// ─── Knowledge Articles ───────────────────────────────────────────────
export const knowledgeArticles = defineSeed(KnowledgeArticle, {
  mode: 'upsert',
  externalId: 'title',
  records: [
    {
      title: 'Getting Started with HotCRM',
      summary: 'A five-minute tour of accounts, contacts, leads and the sales pipeline.',
      category: 'getting_started',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Getting Started with HotCRM

Welcome! This guide walks you through the core objects:

1. **Accounts** — the companies you sell to and serve.
2. **Contacts** — the people at those accounts.
3. **Leads** — unqualified prospects in the top of the funnel.
4. **Opportunities** — qualified deals moving through your pipeline.

Open the **Sales Pipeline** kanban to drag deals between stages, and use the
**Executive Overview** dashboard to track revenue at a glance.`,
      published_at: cel`daysAgo(40)`,
      last_reviewed_at: cel`daysAgo(20)`,
      view_count: 412,
      helpful_count: 38,
      not_helpful_count: 2,
    },
    {
      title: 'Resetting Your Password',
      summary: 'How end users reset a forgotten password from the login screen.',
      category: 'how_to',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Resetting Your Password

1. On the login screen, click **Forgot password?**
2. Enter the email associated with your account.
3. Check your inbox for a reset link (valid for 30 minutes).
4. Choose a new password of at least 12 characters.

If the email does not arrive, check spam or contact your administrator.`,
      published_at: cel`daysAgo(25)`,
      last_reviewed_at: cel`daysAgo(10)`,
      view_count: 1280,
      helpful_count: 96,
      not_helpful_count: 7,
    },
    {
      title: 'API Rate Limits',
      summary: 'Per-token request quotas and recommended back-off strategy.',
      category: 'api',
      status: 'draft',
      audience: 'internal',
      language: 'en',
      body: `# API Rate Limits (DRAFT)

Default quota is 600 requests/minute per token. On HTTP 429, back off
exponentially starting at 1s. Numbers pending final review with platform team.`,
    },
    {
      title: 'Legacy SSO Setup',
      summary: 'SAML configuration for the pre-2025 identity stack.',
      category: 'troubleshooting',
      status: 'published',
      audience: 'internal',
      language: 'en',
      body: `# Legacy SSO Setup

This covers the deprecated SAML 1.1 flow. New tenants should use the OIDC
connector instead. Retained for customers still on the legacy stack.`,
      published_at: cel`daysAgo(240)`,
      last_reviewed_at: cel`daysAgo(220)`,
      view_count: 64,
      helpful_count: 5,
      not_helpful_count: 9,
    },
  ]
});
