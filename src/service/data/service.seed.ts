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
 * reference cases by natural key. These case rows are registered by the service
 * package and the activity rows by the app package; measured on a fresh boot
 * of the two-package artifact (#1907), the lookups resolve in both directions —
 * every seeded case's account, and every seeded event's case.
 *
 * Split out of the former monolithic `src/data/index.ts` (#635). Seed doctrine
 * lives in `src/sales/data/_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Case } from '../objects/case.object';
import { KnowledgeArticle } from '../objects/knowledge_article.object';
import { CASE_SLA_DEFAULT_TIER, caseSlaBreached, caseSlaCalendarHours } from '../objects/_case-sla';
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

/** The matrix cell `case_sla_defaults` would have applied, in calendar hours after creation. */
const seededSlaHours = (priority: string, accountName?: string): number => {
  const hours = caseSlaCalendarHours(priority, accountName ? TIER_BY_ACCOUNT.get(accountName) : undefined);
  if (hours === undefined) throw new Error(`seed: no SLA matrix row for priority "${priority}"`);
  return hours;
};

/**
 * `created_at + matrix(priority, tier)`, as a CEL expression — the case's
 * authored creation instant (the platform's own `created_at`, which the seed
 * loader keeps on first insert since @objectstack/objectql 17.7.0,
 * objectstack#21646) plus the cell `case_sla_defaults` would have applied.
 *
 * `daysAgo(n)` is a UTC midnight, so the hour offset has to be added on top of
 * it — hence `+ duration('Nh')` rather than a second day-granular helper.
 *
 * A due date that lands in the past is expected and correct on an old open case
 * — that is what a breach IS. On an OPEN case the flag is `case_sla_monitor`'s
 * to write, on a deployment that runs scheduled work, and the seed only pre-sets
 * it where the demo wants a breach visible without a sweep.
 */
const celCaseSlaDue = (createdDaysAgo: number, priority: string, accountName?: string) =>
  cel`daysAgo(${createdDaysAgo}) + duration('${seededSlaHours(priority, accountName)}h')`;

/**
 * `is_sla_violated` of a SETTLED case (resolved or closed) — DERIVED, never
 * picked (#2070). `case_sla_defaults` records the breach on the write that
 * settles a case after its due date, so a settled seed row has to arrive
 * holding exactly what that write would have recorded: `caseSlaBreached` over
 * the row's own dates. Both instants are offsets from the same `daysAgo()`
 * midnight — the due date `matrix(priority, tier)` hours after creation, the
 * settle instant (`closed_date`, which a settled seed row carries as its
 * resolved-date proxy) whole days after it — so the hour counts compare
 * directly, and a case settled exactly on its deadline met it.
 *
 * These rows used to be authored `false` across the board, which made the
 * `sla_performance` report and the compliance gauge read 100% met over closed
 * cases that had finished days late by their own dates.
 */
const seededSettledBreach = (
  createdDaysAgo: number,
  settledDaysAgo: number,
  priority: string,
  accountName?: string,
): boolean => caseSlaBreached(seededSlaHours(priority, accountName), (createdDaysAgo - settledDaysAgo) * 24);

/**
 * `escalated_date` of an escalated case: `hoursAfter` hours after its authored
 * creation instant, as a CEL expression (#2163). Every escalation path stamps
 * this date, so by the seed doctrine (`src/sales/data/_shared.ts`) an escalated
 * seed row carries one; and `case_escalation` reads a missing one as "never
 * escalated", which re-escalated a seeded Critical case on its next edit.
 *
 * The bound keeps the instant after creation and in the past whatever calendar
 * day `daysAgo()` resolves in: it stays inside the case's first
 * `createdDaysAgo - 1` days.
 */
const celEscalatedAt = (createdDaysAgo: number, hoursAfter: number) => {
  if (!(hoursAfter > 0 && hoursAfter <= (createdDaysAgo - 1) * 24)) {
    throw new Error(`seed: escalated ${hoursAfter}h after a case created ${createdDaysAgo} days ago is not between its creation and now`);
  }
  return cel`daysAgo(${createdDaysAgo}) + duration('${hoursAfter}h')`;
};

// ─── Cases ────────────────────────────────────────────────────────────
// INSERT-ONCE (`mode: 'ignore'`, #2139): an agent works each case (status,
// priority, owner, resolution) and closes it; under `upsert` the next boot
// wrote each edited field back to its seeded value. The mechanism and the
// price: beside `leads` in `src/sales/data/sales.seed.ts`.
export const cases = defineSeed(Case, {
  mode: 'ignore',
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
      created_at: cel`daysAgo(2)`,
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
      created_at: cel`daysAgo(5)`,
      escalated_date: celEscalatedAt(5, 3),
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
      is_sla_violated: seededSettledBreach(3, 2, 'medium', 'Initech Solutions'),
      is_escalated: false,
      resolution_time_hours: 24.0,
      created_at: cel`daysAgo(3)`,
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
      is_sla_violated: seededSettledBreach(7, 6, 'high', 'Wayne Enterprises'),
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
      created_at: cel`daysAgo(7)`,
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
      created_at: cel`daysAgo(1)`,
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
      created_at: cel`daysAgo(4)`,
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
      created_at: cel`daysAgo(3)`,
      // Escalated, then put back to work: `in_progress` with the date kept.
      escalated_date: celEscalatedAt(3, 1),
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
      is_sla_violated: seededSettledBreach(10, 8, 'low', 'Wayne Enterprises'),
      is_escalated: false,
      // Required for closed cases (resolution_required_for_closed).
      resolution: 'Delivered CSV bulk-import in the 9.4 release; shared the docs link with the customer.',
      // closed−created delta, as case.hook computes it.
      resolution_time_hours: 48.0,
      created_at: cel`daysAgo(10)`,
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
        // A SETTLED row's flag is derived from its own dates (#2070,
        // `seededSettledBreach`): the write that settled it would have recorded
        // a late finish, so the seed does too.
        //
        // An OPEN row's flag is the sweep's definition — open, and its due date
        // already in the past. The old generator flagged rows as violated while
        // giving every row a FUTURE due date; since #595 the due date is DERIVED
        // (`celCaseSlaDue` below), so "already in the past" holds by
        // construction here: a critical case is due 4h after creation and every
        // generated case is at least a day old. The converse is deliberately not
        // enforced — other open rows are past due too, and `case_sla_monitor`
        // notices them where scheduled work runs. Pre-setting the flag here only
        // decides which open breaches the demo shows without a sweep.
        const slaViolated = settled
          ? seededSettledBreach(ageDays, ageDays - resolutionDays, priority, account)
          : priority === 'critical' && i % 3 === 0;
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
          created_at: celDaysAgo(ageDays),
          // The SLA-risk review the reason names escalates the case halfway
          // through its SLA window, before it falls due.
          ...(status === 'escalated'
            ? { escalated_date: celEscalatedAt(ageDays, Math.ceil(seededSlaHours(priority, account) / 2)) }
            : {}),
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
//
// INSERT-ONCE (`mode: 'ignore'`, #2139): an author revises, publishes and
// archives articles; under `upsert` the next boot wrote each edited field back.
// Under `upsert` it was also the whole of an idle restart's `updated` count:
// until #2060 item 10 the publish hook stamped `last_reviewed_at` on every
// write of a published article, so the seeded value never matched and each
// boot rewrote the published rows. The hook now keeps a date a system write
// supplies, so the review date a row below authors is the one it stores.
//
// THE SET (#2129): three or four articles in every category the object
// declares, so the All Articles grid groups into a knowledge base rather than
// one row per heading, and each tab has rows on a fresh boot. The platform's
// seed-ownership claim hands every article to the dev admin, which is who
// `my_drafts` (draft or in review, owned by the viewer) then lists.
//
// The dates follow the seed doctrine, per status:
//   - published: both dates, the review AFTER the publish; the hook keeps both
//     (`test/hooks-runtime-service.test.ts` pins that the stored review date
//     is the authored one);
//   - archived: the dates it carried while it was live. The hook returns early
//     for anything not published, so what is authored is what is stored;
//   - draft / in review: neither date. Nothing has been published yet, and the
//     hook stamps nothing for them either.
export const knowledgeArticles = defineSeed(KnowledgeArticle, {
  mode: 'ignore',
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

    // ── Getting Started ──────────────────────────────────────────────
    {
      title: 'Importing Your First Accounts and Contacts',
      summary: 'Bring an existing customer list into HotCRM from a CSV file, with duplicates caught on the way in.',
      category: 'getting_started',
      tags: ['data_import'],
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Importing Your First Accounts and Contacts

1. Export your customer list to CSV, one row per company or person.
2. Open **Accounts** and choose **Import**, then map each column to a field.
3. Import accounts first, then contacts, so each contact can name its account.

Leads import the same way. Check a handful of imported records before you
import the rest of the file.`,
      published_at: cel`daysAgo(34)`,
      last_reviewed_at: cel`daysAgo(12)`,
    },
    {
      title: 'Your First Week with the Sales Pipeline',
      summary: 'How deals move from prospecting to closed, and what each stage asks of the rep.',
      category: 'getting_started',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Your First Week with the Sales Pipeline

Every opportunity sits in one stage: prospecting, qualification, needs
analysis, proposal, negotiation, then closed won or closed lost.

- Drag a card on the **Sales Pipeline** board to move it to the next stage.
- Keep **Next Step** current; it is what your manager reads first.
- Deals of $100,000 or more go to your sales manager for approval.`,
      published_at: cel`daysAgo(31)`,
      last_reviewed_at: cel`daysAgo(9)`,
    },
    {
      title: 'Inviting Your Team',
      summary: 'Add colleagues, give each the position they work in, and check what they can see.',
      category: 'getting_started',
      status: 'in_review',
      audience: 'internal',
      language: 'en',
      body: `# Inviting Your Team

1. Open **Setup → Users** and invite each colleague by email.
2. Assign the position they work in (sales rep, sales manager, service agent).
3. Sign in as them once to confirm the records they should see are there.

Waiting on the admin team to confirm the screenshots for the new Setup menu.`,
    },

    // ── How-To ───────────────────────────────────────────────────────
    {
      title: 'Logging Calls, Meetings and Emails',
      summary: 'Record every customer touch on the account, contact or deal it belongs to.',
      category: 'how_to',
      tags: ['email'],
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Logging Calls, Meetings and Emails

Open the record the conversation was about and use **Log a Call**, or add a
meeting as an event related to it. Email a contact with **Send Email** from the
contact's own page.

Each entry lands on the record's activity timeline, so nobody has to ask who
spoke to the customer last.`,
      published_at: cel`daysAgo(58)`,
      last_reviewed_at: cel`daysAgo(21)`,
    },
    {
      title: 'Converting a Qualified Lead',
      summary: 'Turn a lead into an account, a contact and an opportunity in one step.',
      category: 'how_to',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Converting a Qualified Lead

When a lead is qualified, open it and choose **Convert**. HotCRM creates the
account and the contact (or reuses the ones that already exist) and, if you
ask for one, the first opportunity.

A converted lead is read-only from then on; keep working the new opportunity.`,
      published_at: cel`daysAgo(47)`,
      last_reviewed_at: cel`daysAgo(30)`,
    },
    {
      title: 'Saving a Filtered List View',
      summary: 'Keep the filter you use every morning one click away.',
      category: 'how_to',
      tags: ['reports'],
      status: 'draft',
      audience: 'public',
      language: 'en',
      body: `# Saving a Filtered List View (DRAFT)

Open any list, add the filters you need, then choose **Save as view** and give
it a name. Still to write: who else can see a saved view, once the view
menu settles.`,
    },

    // ── Troubleshooting ──────────────────────────────────────────────
    {
      title: 'Emails Missing from the Activity Timeline',
      summary: 'Why a sent email may not appear on the record, and how to get it there.',
      category: 'troubleshooting',
      tags: ['email'],
      status: 'published',
      audience: 'internal',
      language: 'en',
      body: `# Emails Missing from the Activity Timeline

Start from where the email was sent.

1. Check it was sent with the contact's **Send Email** action, not from a
   personal mailbox.
2. Check the recipient matches the contact's email address exactly.
3. If both hold, escalate to the platform team with the record link.`,
      published_at: cel`daysAgo(19)`,
      last_reviewed_at: cel`daysAgo(4)`,
    },
    {
      title: 'A Dashboard Chart Shows No Data',
      summary: 'Most empty charts are a filter or a date range, not missing data.',
      category: 'troubleshooting',
      tags: ['reports', 'performance'],
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# A Dashboard Chart Shows No Data

1. Give the chart a second to load; heavy charts draw just after the page.
2. Widen the dashboard's date range; a quarter with no closed deals is empty.
3. Clear the dashboard filters, then add them back one at a time.

If the chart is still empty, open the report behind it and check its rows.`,
      published_at: cel`daysAgo(66)`,
      last_reviewed_at: cel`daysAgo(14)`,
    },

    // ── Billing & Pricing ────────────────────────────────────────────
    {
      title: 'Understanding Your Invoice',
      summary: 'What each line on the monthly invoice means and when it is charged.',
      category: 'billing',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Understanding Your Invoice

Your invoice lists one line per subscription: the plan, the number of seats
and the billing period it covers. Seats added mid-period are charged pro rata
on the next invoice. Invoices are issued on the first business day of the
period and are due within 30 days.`,
      published_at: cel`daysAgo(88)`,
      last_reviewed_at: cel`daysAgo(33)`,
    },
    {
      title: 'Changing Your Plan or Seat Count',
      summary: 'Upgrade, downgrade or add seats, and when each change takes effect.',
      category: 'billing',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Changing Your Plan or Seat Count

- **More seats** take effect immediately and are charged pro rata.
- **An upgrade** takes effect immediately; the difference appears on the next invoice.
- **A downgrade or fewer seats** take effect at the end of the current period.

Only an administrator of your organization can make these changes.`,
      published_at: cel`daysAgo(73)`,
      last_reviewed_at: cel`daysAgo(18)`,
    },
    {
      title: 'Annual Billing Discount (Previous Price List)',
      summary: 'The prepaid annual discount of the previous price list, kept for customers who signed under it.',
      category: 'billing',
      status: 'archived',
      audience: 'public',
      language: 'en',
      body: `# Annual Billing Discount (Previous Price List)

Customers who prepaid a year under the previous price list received 15% off
the monthly rate. This offer was replaced by the current price list and is no
longer available to new subscriptions.`,
      published_at: cel`daysAgo(520)`,
      last_reviewed_at: cel`daysAgo(430)`,
    },

    // ── API & Integrations ───────────────────────────────────────────
    {
      title: 'Authenticating with API Keys',
      summary: 'Give each integration its own API key, and know what that key can reach.',
      category: 'api',
      tags: ['auth'],
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Authenticating with API Keys

Give every integration its own API key, created by your administrator, so one
can be revoked without breaking the others.

A key acts as the person it belongs to: it reads and writes exactly what they
can, no more. Revoke a key the moment the integration is retired.`,
      published_at: cel`daysAgo(62)`,
      last_reviewed_at: cel`daysAgo(11)`,
    },
    {
      title: 'Receiving Record Changes with Webhooks',
      summary: 'Have HotCRM call your endpoint when a deal, case or account changes.',
      category: 'api',
      tags: ['webhooks'],
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Receiving Record Changes with Webhooks

Register an HTTPS endpoint and pick the objects and events it should hear
about. Answer each delivery quickly with a 2xx and do the slow work afterwards.

Make your handler safe to run twice: the same change can arrive more than
once, and the record's id is how you tell.`,
      published_at: cel`daysAgo(44)`,
      last_reviewed_at: cel`daysAgo(16)`,
    },
    {
      title: 'Bulk Loading Records through the API',
      summary: 'Load thousands of records without tripping rate limits or duplicate rules.',
      category: 'api',
      tags: ['data_import'],
      status: 'published',
      audience: 'internal',
      language: 'en',
      body: `# Bulk Loading Records through the API

Send records in batches of a few hundred, parents before children, and wait
for each batch to finish before sending the next. Use the record's natural key
(account name, contact email) to check for an existing row before inserting.`,
      published_at: cel`daysAgo(27)`,
      last_reviewed_at: cel`daysAgo(6)`,
    },

    // ── Release Notes ────────────────────────────────────────────────
    {
      title: 'Release Notes: Lead Cards and the Lead Calendar',
      summary: 'Lead cards name the person, and the Lead Calendar shows each follow-up.',
      category: 'release_notes',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Release Notes: Lead Cards and the Lead Calendar

- **Lead Pipeline** and **Lead Cards** title each card by the person's name.
- **Lead Calendar** places each lead on its follow-up date.
- A task can be completed from its row with the new **Complete** action.`,
      published_at: cel`daysAgo(12)`,
      last_reviewed_at: cel`daysAgo(5)`,
    },
    {
      title: 'Release Notes: Helpful Votes on Articles',
      summary: 'Readers can now mark an article helpful or not, and authors see the count.',
      category: 'release_notes',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Release Notes: Helpful Votes on Articles

Every published article now carries **Helpful** and **Not Helpful** buttons.
Each reader has one vote per article and can change it. The counts appear on
the Published list, so authors can see which answers land.`,
      published_at: cel`daysAgo(29)`,
      last_reviewed_at: cel`daysAgo(27)`,
    },
    {
      title: 'Release Notes: Forecast Snapshots',
      summary: 'Next release: monthly forecast snapshots for every rep and manager.',
      category: 'release_notes',
      status: 'draft',
      audience: 'internal',
      language: 'en',
      body: `# Release Notes: Forecast Snapshots (DRAFT)

Forecasts will be captured on a schedule so a manager can compare this
period's commit with the last one. Hold until the release date is set.`,
    },

    // ── Policy ───────────────────────────────────────────────────────
    {
      title: 'Data Retention and Deletion',
      summary: 'How long customer data is kept, and how to have it deleted.',
      category: 'policy',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Data Retention and Deletion

Records stay in your organization until you delete them. To close your
organization and have all of its data deleted, an administrator asks support
in writing; support confirms when the deletion is complete.`,
      published_at: cel`daysAgo(150)`,
      last_reviewed_at: cel`daysAgo(35)`,
    },
    {
      title: 'Acceptable Use',
      summary: 'What HotCRM may and may not be used for.',
      category: 'policy',
      status: 'published',
      audience: 'public',
      language: 'en',
      body: `# Acceptable Use

Use HotCRM to manage your own customer relationships. Do not upload data you
have no right to hold, send bulk email to people who have not opted in, or try
to reach another organization's records.`,
      published_at: cel`daysAgo(210)`,
      last_reviewed_at: cel`daysAgo(60)`,
    },
    {
      title: 'Support Hours and Response Targets (Previous Plans)',
      summary: 'The support hours of the previous plans, replaced by the current support plans.',
      category: 'policy',
      status: 'archived',
      audience: 'public',
      language: 'en',
      body: `# Support Hours and Response Targets (Previous Plans)

Support answered weekdays 09:00 to 18:00 UTC, with a first response within one
business day. These hours were replaced by the response targets of the current
support plans.`,
      published_at: cel`daysAgo(400)`,
      last_reviewed_at: cel`daysAgo(310)`,
    },
  ]
});
