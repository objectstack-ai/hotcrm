// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Service seeds — the case backlog and the knowledge base.
 *
 * The task list and the interaction log used to be here too: tasks, events and
 * event attendees are the activity layer over every object, and the case seeds
 * are the records they most often hang off (#671). Those three objects are the
 * SALES package's under the ADR-0130 layout (plan item 4 — the activity
 * objects fold into the app package), so their rows moved with them to
 * `src/sales/data/activity.seed.ts`. Nothing about the rows changed: they still
 * reference cases by natural key, and the root config still replays them in
 * the order the lookups resolve in.
 *
 * Split out of the former monolithic `src/data/index.ts` (#635). Seed doctrine
 * lives in `src/sales/data/_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Case } from '../objects/case.object';
import { KnowledgeArticle } from '../objects/knowledge_article.object';
import { CASE_SLA_DEFAULT_TIER, caseSlaHours } from '../objects/_case-sla';
import { celDaysAgo } from '../../sales/data/_shared';
import { accounts } from '../../sales/data/sales.seed';

// ─── Seeded SLA due dates ─────────────────────────────────────────────
//
// Hooks do not run over seeds, so a hook-owned field has to arrive already
// holding what the hook would have computed (`test/seed-consistency.test.ts`
// is the enforcement). `sla_due_date` used to be hand-typed per case — eight
// numbers picked to look plausible — and it is now DERIVED from the same
// priority × account-tier matrix `case_sla_defaults` applies, so a cell change
// moves the demo data with it instead of leaving it lying.
//
// The account tier is read off the account seed itself rather than copied into
// a table here: `crm_account.tier` is the input the matrix takes, and there is
// no reason for this file to hold a second opinion about which tier Acme is.
const TIER_BY_ACCOUNT = new Map<string, string>(
  (accounts.records as ReadonlyArray<Record<string, unknown>>).map((a) => [
    String(a.name),
    typeof a.tier === 'string' ? a.tier : CASE_SLA_DEFAULT_TIER,
  ]),
);

/**
 * `created_date + matrix(priority, tier)`, as a CEL expression.
 *
 * `daysAgo(n)` is a UTC midnight, so the hour offset has to be added on top of
 * it — hence `+ duration('Nh')` rather than a second day-granular helper. The
 * matrix is stated in CALENDAR hours (see `src/objects/_case-sla.ts`), which is
 * exactly what this arithmetic does: no working-day skipping, because the app
 * has no working-day calendar to skip by.
 *
 * A due date that lands in the past is expected and correct on an old open case
 * — that is what a breach IS, and `case_sla_monitor` is the thing that notices
 * it on its next hourly sweep. `is_sla_violated` is deliberately NOT derived
 * from this: the flag is the sweep's to write, and the seed only pre-sets it
 * where the demo wants a breach visible before the first sweep runs.
 */
const celCaseSlaDue = (createdDaysAgo: number, priority: string, accountName?: string) => {
  const hours = caseSlaHours(priority, accountName ? TIER_BY_ACCOUNT.get(accountName) : undefined);
  if (hours === undefined) throw new Error(`seed: no SLA matrix row for priority "${priority}"`);
  return cel`daysAgo(${createdDaysAgo}) + duration('${hours}h')`;
};

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
      sla_due_date: celCaseSlaDue(2, 'high', 'Acme Corporation'),
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
      sla_due_date: celCaseSlaDue(5, 'critical', 'Globex Industries'),
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
      sla_due_date: celCaseSlaDue(3, 'medium', 'Initech Solutions'),
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
      // The deflection link (#601): this case was answered out of the knowledge
      // base, so it names the article that resolved it. Referenced by the
      // article seed's `externalId` (`title`), the same way every other seeded
      // lookup names its target.
      resolved_by_article: 'API Rate Limits',
      // closed−created delta, as case.hook computes it.
      resolution_time_hours: 24.0,
      created_date: cel`daysAgo(7)`,
      closed_date: cel`daysAgo(6)`,
      sla_due_date: celCaseSlaDue(7, 'high', 'Wayne Enterprises'),
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
      sla_due_date: celCaseSlaDue(1, 'medium', 'Stark Medical'),
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
      sla_due_date: celCaseSlaDue(4, 'low', 'Acme Corporation'),
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
      sla_due_date: celCaseSlaDue(3, 'critical', 'Globex Industries'),
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
      sla_due_date: celCaseSlaDue(10, 'low', 'Wayne Enterprises'),
    },
    // ─── Generated demo cases — 30 cases over the last 30 days, mixed across
    // priorities. Powers `CasesOpenedByDayPriorityReport` (daily bucketing
    // matrix) and the service dashboard's daily-volume area chart.
    //
    // ### Why every axis carries a rotation, and not just `i % length` (#1659)
    //
    // These rows used to read ONE counter for every axis: `crm_account` and
    // `status` both took `i % 5`, and `priority`, `type` and `origin` all took
    // `i % 4`. Equal-length lists walked by one index advance in lockstep, so
    // each group came out PERFECTLY correlated — every Acme case `new`, every
    // Globex case `in_progress`, and every `low` case a `question` raised by
    // `email`. Thirty rows of volume with no variety, which is the opposite of
    // what a volume generator is for: the account × status cross-tab held 5 of
    // its 25 cells, and priority × type × origin 4 of 16 apiece.
    //
    // Each list now advances one step per row PLUS a rotation — `c` extra steps
    // every `m` rows. Two axes stay correlated exactly when their relative
    // offset never moves, so the rotations are chosen to make every relative
    // offset sweep its whole cycle. `crm_account` is the anchor and carries no
    // rotation; the other four are stated relative to it.
    //
    // `account × status` is complete BY CONSTRUCTION rather than by luck, and
    // the proof is one line: account `a` takes rows i = a, a+5 … a+25, whose
    // block numbers run 0…5, so its statuses are `(a + b) % 5` over b = 0…5 —
    // all five of them. The thirty rows therefore walk the whole 5 × 5 grid,
    // twenty-five cells once and five of them a second time.
    //
    // ⚠️ The remaining three constants are TUNED, not derived. They were picked
    // by computing all ten pairwise cross-tabs and keeping the assignment that
    // left the fewest empty cells. Measured over the lists as shipped: 188 of
    // the 193 pairwise cells are occupied, no cell holds more than 3 rows, and
    // the marginals stay as flat as thirty rows allow — 6/6/6/6/6 by account
    // and by status, 8/7/7/8 by priority, type and origin. ⛔ Changing the
    // LENGTH of any list below voids that tuning: re-measure the cross-tabs
    // rather than assuming the rotations still separate the axes.
    //
    // Two schemes that read as more principled than they measure were rejected
    // here, and are recorded so they are not re-derived: rotating the 5-lists
    // on the 4-block and the 4-lists on the 5-block ("the lengths are coprime,
    // so they cannot resonate") empties one status completely; and rotating
    // `crm_account` as well — to break the every-fifth-day beat it walks the
    // calendar on — costs twelve further empty cells. That beat is the
    // deliberate price of anchoring: with one row per day, some axis has to be
    // the fixed one the other four are measured against.
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
        // The anchor, then the four rotations the block comment above derives.
        // `10` is the one constant with no reading off a list length — it is
        // the rotation that measured best for `origin` against the other four.
        const account = accountsList[i % accountsList.length];
        const status = statuses[(i + Math.floor(i / accountsList.length)) % statuses.length];
        const priority = priorities[(i + Math.floor(i / priorities.length)) % priorities.length];
        const type = types[(i + 2 * Math.floor(i / types.length)) % types.length];
        const origin = origins[(i + Math.floor(i / 10)) % origins.length];
        const settled = status === 'resolved' || status === 'closed';
        const ageDays = 1 + (i % 30);
        // Settled cases get a resolution delay of 1–3 days (capped at the
        // case's age); resolution_time_hours is exactly the closed−created
        // delta case.hook would compute (daysAgo() is day-granular → 24h steps).
        const resolutionDays = Math.min(ageDays, 1 + (i % 3));
        // SLA breaches only make sense on OPEN cases with a due date already in
        // the past (the case_sla_monitor flow's definition). The old generator
        // flagged rows as violated while giving every row a FUTURE due date.
        //
        // Since #595 the due date is DERIVED (`celCaseSlaDue` below), so the
        // "already in the past" half now holds by construction for these rows:
        // a critical case is due 4h after creation and every generated case is
        // at least a day old. The converse is deliberately not enforced — other
        // open rows are past due too, and `case_sla_monitor` is the thing that
        // notices them. Pre-setting the flag here only decides what the demo
        // shows before the first hourly sweep lands.
        const slaViolated = !settled && priority === 'critical' && i % 3 === 0;
        out.push({
          subject: `Demo case ${String(i + 1).padStart(2, '0')} — ${priority} ${type}`,
          description: `Auto-generated demo case for ${priority} priority on day -${ageDays}.`,
          crm_account: account,
          status,
          priority,
          priority_rank: rankByPriority[priority],
          type,
          origin,
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
          sla_due_date: celCaseSlaDue(ageDays, priority, account),
        });
      }
      return out;
    })(),
  ],
});

// ─── Knowledge Articles ───────────────────────────────────────────────
//
// No `helpful_count` / `not_helpful_count` here, deliberately (#601). Those two
// are now DERIVED: `article_feedback_metrics_refresh` recounts them from
// `crm_article_feedback` on every vote. This file used to type in 38, 96, 5, 9
// — numbers with no rows behind them — and the first real vote on an article
// would have recounted 96 down to 1, in front of whoever pressed the button.
//
// The seed doctrine at the top of this file is what decides it: a hook-owned
// field must arrive holding what the hook WOULD have computed. With no seeded
// feedback rows the honest value is the field's own default, 0. Rows are not
// seeded either, because a seed cannot name a user (see the note on
// `crm_event_attendee` below) and the voter's identity is exactly what the
// one-vote-per-reader index keys on — a table of ownerless verdicts would be
// the same fiction one level down.
//
// The deflection half of #601 does not have this problem and IS seeded: a case
// naming the article that resolved it needs no user, so the closed
// `API rate limit exceeded on production` case above carries a real
// `resolved_by_article` and the Service dashboard's KB tiles have something
// true to show on a fresh `pnpm demo:reset`.
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
    },
  ]
});
