// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * CRM Seed Data
 *
 * Demo records for all core CRM objects.
 * Uses defineSeed() for type-safe field name checking at compile time.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Account } from '../objects/account.object';
import { Contact } from '../objects/contact.object';
import { Lead } from '../objects/lead.object';
import { Opportunity } from '../objects/opportunity.object';
import { Product } from '../objects/product.object';
import { Task } from '../objects/task.object';
import { Case } from '../objects/case.object';
import { Campaign } from '../objects/campaign.object';
import { Contract } from '../objects/contract.object';
import { Quote } from '../objects/quote.object';
import { Forecast } from '../objects/forecast.object';
import { KnowledgeArticle } from '../objects/knowledge_article.object';

/**
 * Build a CEL `daysAgo(N)` expression from a runtime number. Mirrors the
 * existing tagged-template usage (`cel\`daysAgo(N)\``) so we can produce
 * timestamps inside `.map()` generators without manufacturing fake template
 * string arrays.
 */
const celDaysAgo = (n: number) => cel`daysAgo(${n})`;
const celDaysFromNow = (n: number) => cel`daysFromNow(${n})`;

/**
 * A note on system-computed fields in seeds (#490).
 *
 * The seed loader writes with `{ isSystem: true, skipTriggers: true }`: hooks
 * do NOT run over seed rows, and readonly stripping only guards user writes.
 * Two consequences shape everything below:
 *
 * 1. Seeding historical values into readonly fields (`created_date`,
 *    `days_in_stage`, `last_contacted_date`, `actual_revenue`) is legitimate
 *    and load-bearing — it is the only way demo reports get history — and the
 *    platform explicitly preserves explicit seed values.
 * 2. BUT nothing recomputes derived fields for seed rows, so every seeded
 *    value of a hook-owned field MUST match what the hook would compute
 *    (`is_closed` ⇔ status, `resolution_time_hours` ⇔ closed−created,
 *    opportunity `probability`/`forecast_category`/`expected_revenue` ⇔ stage,
 *    forecast `period_label` ⇔ period_start). Otherwise the first genuine
 *    user edit "mysteriously" rewrites the record.
 *
 * Autonumber fields (`case_number`, `contract_number`, `quote_number`) are
 * NEVER seeded: the runtime owns those sequences (the SQL driver bootstraps
 * each counter past existing rows), so hand-numbering them only invites
 * drift. Upsert identity uses a natural key instead (subject / name /
 * description).
 */

// ─── Accounts ─────────────────────────────────────────────────────────
const accounts = defineSeed(Account, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'Acme Corporation',
      type: 'customer',
      industry: 'technology',
      annual_revenue: 5000000,
      number_of_employees: 250,
      phone: '+1-415-555-0100',
      website: 'https://acme.example.com',
      tier: 'enterprise',
      segment: 'growth',
      health_score: 'healthy',
      next_renewal_date: cel`daysFromNow(45)`,
      last_activity_date: cel`daysAgo(3)`,
      description: `**Strategic Customer · Enterprise Tier**

Acme Corporation is a Series-C robotics & industrial automation
company that switched from a competitor 18 months ago. They run
HotCRM as their system of record for sales + service across
three regional teams (NA, EMEA, APAC).

**Relationship**
- Primary economic buyer: Jordan Park (CTO) — values our open
  architecture and AI roadmap.
- Day-to-day champion: John Smith (VP Engineering) — owns the
  technical evaluation and integration questions.
- Procurement: handled by Lisa Kim — prefers annual contracts,
  net-30 terms.

**Current state**
- ARR: $220K (signed Q1 2025 renewal). Up 22% YoY.
- 1 open enterprise opportunity ($150K platform upgrade) in proposal
  stage, 1 service ticket open (login issues), 1 billing dispute
  awaiting customer response.
- Renewal due in 45 days — they've already verbally committed but
  want a workshop on AI agent governance before signing.

**Red flags**
- Slipped one opportunity ($75K add-on) in the last quarter due
  to slow procurement cycle on their side.
- Login issues ticket is approaching its SLA — needs eyes today.`,
    },
    {
      name: 'Globex Industries',
      type: 'prospect',
      industry: 'manufacturing',
      annual_revenue: 12000000,
      number_of_employees: 800,
      phone: '+1-312-555-0200',
      website: 'https://globex.example.com',
      tier: 'enterprise',
      segment: 'net_new',
      last_activity_date: cel`daysAgo(8)`,
    },
    {
      name: 'Initech Solutions',
      type: 'customer',
      industry: 'finance',
      annual_revenue: 3500000,
      number_of_employees: 150,
      phone: '+1-212-555-0300',
      website: 'https://initech.example.com',
      tier: 'mid_market',
      segment: 'at_risk',
      health_score: 'at_risk',
      next_renewal_date: cel`daysFromNow(75)`,
      last_activity_date: cel`daysAgo(21)`,
    },
    {
      name: 'Stark Medical',
      type: 'partner',
      industry: 'healthcare',
      annual_revenue: 8000000,
      number_of_employees: 400,
      phone: '+1-617-555-0400',
      website: 'https://starkmed.example.com',
      tier: 'mid_market',
      segment: 'stable',
      last_activity_date: cel`daysAgo(5)`,
    },
    {
      name: 'Wayne Enterprises',
      type: 'customer',
      industry: 'technology',
      annual_revenue: 25000000,
      number_of_employees: 2000,
      phone: '+1-650-555-0500',
      website: 'https://wayne.example.com',
      tier: 'strategic',
      segment: 'growth',
      health_score: 'healthy',
      next_renewal_date: cel`daysFromNow(28)`,
      last_activity_date: cel`daysAgo(1)`,
    },
  ]
});

// ─── Contacts ─────────────────────────────────────────────────────────
const contacts = defineSeed(Contact, {
  mode: 'upsert',
  externalId: 'email',
  records: [
    {
      salutation: 'mr',
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@acme.example.com',
      phone: '+1-415-555-0101',
      title: 'VP of Engineering',
      department: 'engineering',
      crm_account: 'Acme Corporation',
      is_primary: true,
    },
    {
      salutation: 'ms',
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.j@globex.example.com',
      phone: '+1-312-555-0201',
      title: 'Chief Procurement Officer',
      department: 'executive',
      crm_account: 'Globex Industries',
      is_primary: true,
    },
    {
      salutation: 'dr',
      first_name: 'Michael',
      last_name: 'Chen',
      email: 'mchen@initech.example.com',
      phone: '+1-212-555-0301',
      title: 'Director of Operations',
      department: 'operations',
      crm_account: 'Initech Solutions',
      is_primary: true,
    },
    {
      salutation: 'ms',
      first_name: 'Emily',
      last_name: 'Davis',
      email: 'emily.d@starkmed.example.com',
      phone: '+1-617-555-0401',
      title: 'Head of Partnerships',
      department: 'sales',
      crm_account: 'Stark Medical',
      is_primary: true,
    },
    {
      salutation: 'mr',
      first_name: 'Robert',
      last_name: 'Wilson',
      email: 'rwilson@wayne.example.com',
      phone: '+1-650-555-0501',
      title: 'CTO',
      department: 'engineering',
      crm_account: 'Wayne Enterprises',
      is_primary: true,
    },
  ]
});

// ─── Leads ────────────────────────────────────────────────────────────
const leads = defineSeed(Lead, {
  mode: 'upsert',
  externalId: 'email',
  records: [
    {
      first_name: 'Alice',
      last_name: 'Martinez',
      company: 'NextGen Retail',
      email: 'alice@nextgenretail.example.com',
      phone: '+1-503-555-0600',
      status: 'new',
      lead_source: 'web',
      industry: 'retail',
      rating: 3,
      next_followup_date: cel`daysFromNow(2)`,
    },
    {
      first_name: 'David',
      last_name: 'Kim',
      company: 'EduTech Labs',
      email: 'dkim@edutechlabs.example.com',
      phone: '+1-408-555-0700',
      status: 'contacted',
      lead_source: 'referral',
      industry: 'education',
      rating: 4,
      next_followup_date: cel`daysFromNow(1)`,
      last_contacted_date: cel`daysAgo(3)`,
    },
    {
      first_name: 'Lisa',
      last_name: 'Thompson',
      company: 'CloudFirst Inc',
      email: 'lisa.t@cloudfirst.example.com',
      phone: '+1-206-555-0800',
      status: 'qualified',
      lead_source: 'event',
      industry: 'technology',
      rating: 4.5,
      next_followup_date: cel`daysFromNow(0)`,
      last_contacted_date: cel`daysAgo(1)`,
    },
    // ─── Generated demo leads — spread across 6 months for monthly-bucket reports
    // (`LeadInflowByMonthSourceReport`). Each `last_contacted_date` lives in a
    // distinct month / source pair so the matrix has multiple cells populated.
    ...[
      { fn: 'Noah',    ln: 'Patel',    co: 'Vertex Analytics',     src: 'web',         ind: 'technology',   age: 7   },
      { fn: 'Maya',    ln: 'Singh',    co: 'BluePeak Logistics',   src: 'referral',    ind: 'logistics',    age: 14  },
      { fn: 'Owen',    ln: 'Becker',   co: 'Northwind Energy',     src: 'event',       ind: 'energy',       age: 21  },
      { fn: 'Sara',    ln: 'Lopez',    co: 'Helios Solar',         src: 'partner',     ind: 'energy',       age: 28  },
      { fn: 'Leo',     ln: 'Vance',    co: 'CleanCart',            src: 'web',         ind: 'retail',       age: 38  },
      { fn: 'Iris',    ln: 'Okafor',   co: 'PulseHealth',          src: 'cold_call',   ind: 'healthcare',   age: 45  },
      { fn: 'Ravi',    ln: 'Mehta',    co: 'Foundry Robotics',     src: 'event',       ind: 'manufacturing',age: 52  },
      { fn: 'Tess',    ln: 'Brown',    co: 'Lattice Education',    src: 'referral',    ind: 'education',    age: 67  },
      { fn: 'Marco',   ln: 'Ricci',    co: 'Aurora Travel',        src: 'advertisement', ind: 'hospitality',       age: 74  },
      { fn: 'Pia',     ln: 'Anand',    co: 'Citrine Finance',      src: 'partner',     ind: 'finance', age: 81 },
      { fn: 'Jonas',   ln: 'Holt',     co: 'Polar Cargo',          src: 'web',         ind: 'logistics',    age: 95  },
      { fn: 'Anya',    ln: 'Volkov',   co: 'RedOak Realty',        src: 'cold_call',   ind: 'real_estate',  age: 102 },
      { fn: 'Theo',    ln: 'Park',     co: 'Skyline Media',        src: 'advertisement', ind: 'media',        age: 116 },
      { fn: 'Wren',    ln: 'Garcia',   co: 'Maple Bakery Group',   src: 'event',       ind: 'retail', age: 123 },
      { fn: 'Hugo',    ln: 'Dubois',   co: 'Nimbus Aerospace',     src: 'referral',    ind: 'manufacturing',age: 138 },
      { fn: 'Lena',    ln: 'Fischer',  co: 'Granite Insurance',    src: 'partner',     ind: 'finance', age: 145 },
      { fn: 'Kai',     ln: 'Watanabe', co: 'Coral Reef Hotels',    src: 'web',         ind: 'hospitality',       age: 162 },
      { fn: 'Mira',    ln: 'Costa',    co: 'Atlas Construction',   src: 'cold_call',   ind: 'other', age: 175 },
    ].map((l, i) => {
      const domain = `${l.co.toLowerCase().replace(/\s+/g, '')}.example.com`;
      const status = (['new', 'contacted', 'qualified', 'unqualified'] as const)[i % 4];
      return {
        first_name: l.fn,
        last_name: l.ln,
        company: l.co,
        email: `${l.fn.toLowerCase()}.${l.ln.toLowerCase()}@${domain}`,
        phone: `+1-555-01${String(i).padStart(2, '0')}-${String(1000 + i * 7)}`,
        status,
        lead_source: l.src,
        industry: l.ind,
        rating: 1 + ((i * 7) % 5),
        last_contacted_date: celDaysAgo(l.age),
        // The qualification fields were left blank on every generated lead, so
        // the detail page's Contact / Lead Detail / Description sections had
        // nothing to render (they also drop whatever the highlights strip
        // already shows, so all four collapsed to nothing) and the demo read
        // like a half-finished import.
        title: (['VP Operations', 'Head of IT', 'Director of Sales', 'COO', 'Procurement Lead'] as const)[i % 5],
        mobile: `+1-555-02${String(i).padStart(2, '0')}-${String(2000 + i * 3)}`,
        website: `https://${domain}`,
        annual_revenue: 2_000_000 + ((i * 3_700_000) % 90_000_000),
        number_of_employees: 25 + ((i * 137) % 4_800),
        description:
          `Inbound via ${l.src.replace(/_/g, ' ')}. Evaluating a CRM to replace spreadsheets ` +
          `across their ${l.ind.replace(/_/g, ' ')} operation.`,
        ...(status === 'unqualified'
          ? { notes: 'No budget approved for this fiscal year — revisit next planning cycle.' }
          : {}),
      };
    }),
  ]
});

// ─── Opportunities ────────────────────────────────────────────────────
// `probability`, `forecast_category` and `expected_revenue` are derived from
// `stage` by opportunity.hook.ts (STAGE_PROBABILITY / STAGE_FORECAST). Hooks
// don't run over seeds, so every row below carries the exact values the hook
// would compute — anything else gets silently rewritten on the first user
// edit (#490).
const opportunities = defineSeed(Opportunity, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'Acme Platform Upgrade',
      crm_account: 'Acme Corporation',
      amount: 150000,
      stage: 'proposal',
      probability: 60,
      expected_revenue: 90000,
      close_date: cel`daysFromNow(30)`,
      type: 'existing_upgrade',
      forecast_category: 'commit',
      lead_source: 'web',
      days_in_stage: 12,
      description: `Upgrade from Standard to Enterprise edition for the
NA + EMEA teams. Drivers: (1) AI agent governance becomes a hard
requirement after their internal compliance review, (2) advanced
analytics seats for the Ops org, (3) priority support SLA.`,
      next_step: `Send the revised proposal (Enterprise edition, 18-month term, 12% multi-year discount) to Jordan Park by EOW. Schedule the AI governance workshop for the week of close_date - 14d.`,
    },
    {
      name: 'Globex Manufacturing Suite',
      crm_account: 'Globex Industries',
      amount: 500000,
      stage: 'qualification',
      probability: 25,
      expected_revenue: 125000,
      close_date: cel`daysFromNow(60)`,
      type: 'new_business',
      forecast_category: 'pipeline',
      lead_source: 'referral',
      days_in_stage: 45,
    },
    {
      name: 'Wayne Enterprise License',
      crm_account: 'Wayne Enterprises',
      amount: 1200000,
      stage: 'negotiation',
      probability: 80,
      expected_revenue: 960000,
      close_date: cel`daysFromNow(14)`,
      type: 'new_business',
      forecast_category: 'commit',
      lead_source: 'partner',
      days_in_stage: 7,
    },
    {
      name: 'Initech Cloud Migration',
      crm_account: 'Initech Solutions',
      amount: 80000,
      stage: 'needs_analysis',
      probability: 40,
      expected_revenue: 32000,
      close_date: cel`daysFromNow(45)`,
      type: 'existing_upgrade',
      forecast_category: 'best_case',
      lead_source: 'event',
      days_in_stage: 38,
    },
    // ─── Closed Won deals (powers KPIs & revenue trends) ────────────────
    {
      name: 'Acme Annual Renewal 2025',
      crm_account: 'Acme Corporation',
      amount: 220000,
      stage: 'closed_won',
      probability: 100,
      expected_revenue: 220000,
      close_date: cel`daysAgo(15)`,
      type: 'existing_renewal',
      forecast_category: 'closed',
      lead_source: 'partner',
      description: `Annual renewal of the Acme Standard subscription (40 seats), signed two weeks ahead of the renewal date. 22% YoY uplift driven by seat expansion in the new EMEA team. Multi-year option declined this round — they want to see how the platform upgrade lands first.`,
    },
    {
      name: 'Stark Medical Pilot',
      crm_account: 'Stark Medical',
      amount: 145000,
      stage: 'closed_won',
      probability: 100,
      expected_revenue: 145000,
      close_date: cel`daysAgo(50)`,
      type: 'new_business',
      forecast_category: 'closed',
      lead_source: 'event',
    },
    {
      name: 'Wayne Q1 Expansion',
      crm_account: 'Wayne Enterprises',
      amount: 380000,
      stage: 'closed_won',
      probability: 100,
      expected_revenue: 380000,
      close_date: cel`daysAgo(95)`,
      type: 'existing_upgrade',
      forecast_category: 'closed',
      lead_source: 'web',
    },
    {
      name: 'Globex Training Package',
      crm_account: 'Globex Industries',
      amount: 65000,
      stage: 'closed_won',
      probability: 100,
      expected_revenue: 65000,
      close_date: cel`daysAgo(140)`,
      type: 'new_business',
      forecast_category: 'closed',
      lead_source: 'referral',
    },
    {
      name: 'Initech Phase 1',
      crm_account: 'Initech Solutions',
      amount: 90000,
      stage: 'closed_won',
      probability: 100,
      expected_revenue: 90000,
      close_date: cel`daysAgo(200)`,
      type: 'new_business',
      forecast_category: 'closed',
      lead_source: 'web',
    },
    // Closed Lost deals (powers win-rate analytics)
    {
      name: 'Acme Add-on (Lost)',
      crm_account: 'Acme Corporation',
      amount: 75000,
      stage: 'closed_lost',
      probability: 0,
      expected_revenue: 0,
      close_date: cel`daysAgo(25)`,
      type: 'existing_upgrade',
      forecast_category: 'omitted',
      lead_source: 'cold_call',
      description: `Tried to bolt on the Marketing Cloud module via cold outbound. Lost because Acme's marketing org is already on a 2-year HubSpot contract. Revisit in Q3 when that contract is up for renewal.`,
    },
    {
      name: 'Stark Expansion (Lost)',
      crm_account: 'Stark Medical',
      amount: 120000,
      stage: 'closed_lost',
      probability: 0,
      expected_revenue: 0,
      close_date: cel`daysAgo(60)`,
      type: 'new_business',
      forecast_category: 'omitted',
      lead_source: 'advertisement',
    },
    // ─── Generated demo opportunities — ~50 deals across ~6 months close_date
    // spread over every stage / forecast / source combination so the
    // `PipelineCoverageByQuarterReport`, `OpportunityFunnelByOwnerStageReport`,
    // and the dashboard funnel/area widgets all have rich data to chew on.
    ...((): readonly Record<string, unknown>[] => {
      const stages = ['qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;
      // Mirrors of opportunity.hook.ts STAGE_FORECAST / STAGE_PROBABILITY —
      // hooks don't run over seeds, so the generator must produce exactly the
      // values the hook derives from `stage` (#490). The old block used a
      // pseudo-random probability and mapped proposal → best_case, both of
      // which the hook rewrote on the first user edit.
      const forecastByStage: Record<typeof stages[number], string> = {
        qualification: 'pipeline',
        needs_analysis: 'best_case',
        proposal: 'commit',
        negotiation: 'commit',
        closed_won: 'closed',
        closed_lost: 'omitted',
      };
      const probabilityByStage: Record<typeof stages[number], number> = {
        qualification: 25,
        needs_analysis: 40,
        proposal: 60,
        negotiation: 80,
        closed_won: 100,
        closed_lost: 0,
      };
      const sources = ['web', 'referral', 'partner', 'event', 'cold_call', 'advertisement'] as const;
      const types = ['new_business', 'existing_upgrade', 'existing_renewal'] as const;
      const accountsList = ['Acme Corporation', 'Globex Industries', 'Wayne Enterprises', 'Initech Solutions', 'Stark Medical'] as const;
      const isClosed = (s: string) => s === 'closed_won' || s === 'closed_lost';
      const out: Record<string, unknown>[] = [];
      for (let i = 0; i < 50; i++) {
        const stage = stages[i % stages.length];
        // Close date follows the stage instead of being scattered blindly
        // across ±180 days. The old spread produced open deals whose close
        // date was six months in the PAST — a pipeline that looks abandoned —
        // and won deals still to close in the future. Open deals land 7–180
        // days out; settled ones 5–180 days back.
        const spread = Math.floor((i * 367) % 174);
        const close_date = isClosed(stage)
          ? celDaysAgo(5 + spread)
          : celDaysFromNow(7 + spread);
        const amount = 20000 + ((i * 17_393) % 480_000);
        const probability = probabilityByStage[stage];
        out.push({
          name: `Demo Deal ${String(i + 1).padStart(2, '0')}`,
          crm_account: accountsList[i % accountsList.length],
          amount,
          stage,
          probability,
          // Same formula as the hook: round(amount * probability) / 100.
          expected_revenue: Math.round(amount * probability) / 100,
          close_date,
          type: types[i % types.length],
          forecast_category: forecastByStage[stage],
          lead_source: sources[i % sources.length],
          ...(isClosed(stage) ? {} : { days_in_stage: 3 + (i * 11) % 60 }),
        });
      }
      return out;
    })(),
  ]
});

// ─── Products ─────────────────────────────────────────────────────────
const products = defineSeed(Product, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'ObjectStack Platform',
      category: 'software',
      family: 'enterprise',
      list_price: 50000,
      is_active: true,
    },
    {
      name: 'Cloud Hosting (Annual)',
      category: 'subscription',
      family: 'cloud',
      list_price: 12000,
      is_active: true,
    },
    {
      name: 'Premium Support',
      category: 'support',
      family: 'services',
      list_price: 25000,
      is_active: true,
    },
    {
      name: 'Implementation Services',
      category: 'service',
      family: 'services',
      list_price: 75000,
      is_active: true,
    },
  ]
});

// ─── Tasks ────────────────────────────────────────────────────────────
// Polymorphic parents need BOTH halves: `related_to_type` names the parent
// object and the matching `related_to_*` lookup carries the record. The
// Related tab and task.hook's activity bubble key off `related_to_type`, so a
// lookup without it is invisible to both (#490).
const tasks = defineSeed(Task, {
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
const cases = defineSeed(Case, {
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

// ─── Campaigns ────────────────────────────────────────────────────────
const campaigns = defineSeed(Campaign, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'Q2 Enterprise Email Nurture',
      description: 'Multi-touch email nurture targeting enterprise IT decision makers.',
      type: 'email',
      channel: 'email',
      status: 'in_progress',
      start_date: cel`daysAgo(30)`,
      end_date: cel`daysFromNow(30)`,
      budgeted_cost: 25000,
      actual_cost: 12500,
      expected_revenue: 500000,
      target_size: 5000,
      landing_page_url: 'https://acme.example.com/lp/enterprise-q2',
      is_active: true,
    },
    {
      name: 'Cloud Migration Webinar Series',
      description: 'Three-part webinar series on cloud migration best practices.',
      type: 'webinar',
      channel: 'digital',
      status: 'completed',
      start_date: cel`daysAgo(90)`,
      end_date: cel`daysAgo(30)`,
      budgeted_cost: 15000,
      actual_cost: 14200,
      expected_revenue: 300000,
      actual_revenue: 285000,
      target_size: 1500,
      landing_page_url: 'https://acme.example.com/webinars/cloud-migration',
      is_active: false,
    },
    {
      name: 'SaaSCon 2026 Trade Show',
      description: 'Booth and sponsorship at the SaaSCon 2026 industry conference.',
      type: 'trade_show',
      channel: 'events',
      status: 'planning',
      start_date: cel`daysFromNow(60)`,
      end_date: cel`daysFromNow(63)`,
      budgeted_cost: 75000,
      expected_revenue: 1200000,
      target_size: 3000,
      is_active: true,
    },
    {
      name: 'Developer Content Marketing Push',
      description: 'Technical blog posts, video tutorials, and developer community engagement.',
      type: 'content',
      channel: 'digital',
      status: 'in_progress',
      start_date: cel`daysAgo(60)`,
      end_date: cel`daysFromNow(90)`,
      budgeted_cost: 40000,
      actual_cost: 18000,
      expected_revenue: 250000,
      target_size: 10000,
      landing_page_url: 'https://acme.example.com/developers',
      is_active: true,
    },
    {
      name: 'Partner Co-Marketing Initiative',
      description: 'Joint marketing campaigns with strategic technology partners.',
      type: 'partner',
      channel: 'partner',
      status: 'planning',
      start_date: cel`daysFromNow(14)`,
      end_date: cel`daysFromNow(120)`,
      budgeted_cost: 50000,
      expected_revenue: 800000,
      target_size: 2000,
      is_active: true,
    },
  ]
});

// ─── Contracts ────────────────────────────────────────────────────────
// `contract_number` is a runtime-owned autonumber and is NOT seeded (#490).
// Contract has no natural-name field, so the (unique, stable) description
// doubles as the upsert identity for these fixtures.
const contracts = defineSeed(Contract, {
  mode: 'upsert',
  externalId: 'description',
  records: [
    {
      crm_account: 'Acme Corporation',
      crm_contact: 'john.smith@acme.example.com',
      crm_opportunity: 'Acme Platform Upgrade',
      status: 'activated',
      contract_term_months: 12,
      start_date: cel`daysAgo(30)`,
      end_date: cel`daysFromNow(335)`,
      contract_value: 150000,
      billing_frequency: 'annually',
      payment_terms: 'net_30',
      auto_renewal: true,
      renewal_notice_days: 60,
      contract_type: 'subscription',
      signed_date: cel`daysAgo(32)`,
      signed_by: 'John Smith',
      description: 'Annual platform subscription with premium support tier.',
    },
    {
      crm_account: 'Wayne Enterprises',
      crm_contact: 'rwilson@wayne.example.com',
      crm_opportunity: 'Wayne Enterprise License',
      status: 'in_approval',
      contract_term_months: 36,
      start_date: cel`daysFromNow(14)`,
      end_date: cel`daysFromNow(1109)`,
      contract_value: 1200000,
      billing_frequency: 'annually',
      payment_terms: 'net_60',
      auto_renewal: false,
      renewal_notice_days: 90,
      contract_type: 'license',
      description: 'Multi-year enterprise license with custom SLA.',
    },
    {
      crm_account: 'Initech Solutions',
      crm_contact: 'mchen@initech.example.com',
      status: 'expired',
      contract_term_months: 12,
      start_date: cel`daysAgo(400)`,
      end_date: cel`daysAgo(35)`,
      contract_value: 60000,
      billing_frequency: 'quarterly',
      payment_terms: 'net_30',
      auto_renewal: false,
      renewal_notice_days: 30,
      contract_type: 'service',
      signed_date: cel`daysAgo(405)`,
      signed_by: 'Michael Chen',
      description: 'Initial service agreement, pending renewal discussion.',
    },
    {
      crm_account: 'Stark Medical',
      crm_contact: 'emily.d@starkmed.example.com',
      status: 'draft',
      contract_term_months: 24,
      start_date: cel`daysFromNow(30)`,
      end_date: cel`daysFromNow(760)`,
      contract_value: 350000,
      billing_frequency: 'monthly',
      payment_terms: 'net_30',
      auto_renewal: true,
      renewal_notice_days: 60,
      contract_type: 'partnership',
      description: 'Healthcare partnership agreement, currently under legal review.',
    },
  ]
});

// ─── Quotes ───────────────────────────────────────────────────────────
// `quote_number` is a runtime-owned autonumber and is NOT seeded (#490);
// the (unique) quote name is the upsert identity instead.
const quotes = defineSeed(Quote, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'Acme Platform Upgrade Quote',
      crm_account: 'Acme Corporation',
      crm_contact: 'john.smith@acme.example.com',
      crm_opportunity: 'Acme Platform Upgrade',
      status: 'accepted',
      quote_date: cel`daysAgo(45)`,
      expiration_date: cel`daysAgo(15)`,
      subtotal: 150000,
      discount: 10,
      discount_amount: 15000,
      tax: 11475,
      shipping_handling: 0,
      total_price: 146475,
      payment_terms: 'net_30',
      description: 'Platform upgrade with 10% loyalty discount applied.',
    },
    {
      name: 'Globex Manufacturing Suite Proposal',
      crm_account: 'Globex Industries',
      crm_contact: 'sarah.j@globex.example.com',
      crm_opportunity: 'Globex Manufacturing Suite',
      status: 'presented',
      quote_date: cel`daysAgo(7)`,
      expiration_date: cel`daysFromNow(23)`,
      subtotal: 500000,
      discount: 5,
      discount_amount: 25000,
      tax: 38000,
      shipping_handling: 2500,
      total_price: 515500,
      payment_terms: 'net_60',
      description: 'Manufacturing suite licensing with implementation services.',
    },
    {
      name: 'Wayne Enterprise License Quote',
      crm_account: 'Wayne Enterprises',
      crm_contact: 'rwilson@wayne.example.com',
      crm_opportunity: 'Wayne Enterprise License',
      status: 'in_review',
      quote_date: cel`daysAgo(3)`,
      expiration_date: cel`daysFromNow(27)`,
      subtotal: 1200000,
      discount: 15,
      discount_amount: 180000,
      tax: 81600,
      shipping_handling: 0,
      total_price: 1101600,
      payment_terms: 'net_60',
      description: 'Multi-year enterprise license with volume discount.',
    },
    {
      name: 'Initech Cloud Migration Estimate',
      crm_account: 'Initech Solutions',
      crm_contact: 'mchen@initech.example.com',
      crm_opportunity: 'Initech Cloud Migration',
      status: 'draft',
      quote_date: cel`daysAgo(1)`,
      expiration_date: cel`daysFromNow(29)`,
      subtotal: 80000,
      discount: 0,
      discount_amount: 0,
      tax: 6400,
      shipping_handling: 0,
      total_price: 86400,
      payment_terms: 'net_30',
      description: 'Cloud migration services, awaiting internal review.',
    },
    {
      name: 'Stark Medical Pilot Quote',
      crm_account: 'Stark Medical',
      crm_contact: 'emily.d@starkmed.example.com',
      status: 'rejected',
      quote_date: cel`daysAgo(60)`,
      expiration_date: cel`daysAgo(30)`,
      subtotal: 45000,
      discount: 0,
      discount_amount: 0,
      tax: 3600,
      shipping_handling: 0,
      total_price: 48600,
      payment_terms: 'net_30',
      description: 'Pilot project quote, rejected due to budget constraints.',
      internal_notes: 'Customer requested re-quote with smaller scope.',
    },
  ]
});

// ─── Forecasts ────────────────────────────────────────────────────────
// `owner` is left unset: seed inserts bypass field-level defaults and run
// before any human user exists, so ownership is backfilled to the active user
// at runtime (same as every other CRM object).
//
// Periods are REAL calendar periods, labelled exactly the way
// forecast.hook.ts derives them ('Q3 2026' / 'Aug 2026') — hooks don't run
// over seeds, and the hook only fills a BLANK period_label, so seeded rows
// must speak the same dialect as runtime snapshots or list views end up
// mixing 'This Quarter' with 'Q3 2026' (#490). Calendar-true period_start
// values also make the `this_quarter_forecasts` view's
// `{this_quarter_start}` filter actually match the seeded row.
//
// Computed in plain TS (UTC, mirroring the hook's helpers): this module is
// evaluated when the app bundle loads, the same moment the cel`...` seeds
// are resolved.
const FORECAST_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const forecastIsoDate = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const forecastQuarterLabel = (d: Date) => `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
const forecastMonthLabel = (d: Date) => `${FORECAST_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const forecastNow = new Date();
const forecastYear = forecastNow.getUTCFullYear();
const forecastMonth = forecastNow.getUTCMonth();
const forecastQuarterMonth = Math.floor(forecastMonth / 3) * 3;
const thisQuarterStart = new Date(Date.UTC(forecastYear, forecastQuarterMonth, 1));
const thisQuarterEnd = new Date(Date.UTC(forecastYear, forecastQuarterMonth + 3, 0));
const thisMonthStart = new Date(Date.UTC(forecastYear, forecastMonth, 1));
const thisMonthEnd = new Date(Date.UTC(forecastYear, forecastMonth + 1, 0));
const lastQuarterStart = new Date(Date.UTC(forecastYear, forecastQuarterMonth - 3, 1));
const lastQuarterEnd = new Date(Date.UTC(forecastYear, forecastQuarterMonth, 0));

const forecasts = defineSeed(Forecast, {
  mode: 'upsert',
  externalId: 'period_label',
  records: [
    {
      period: 'quarter',
      period_label: forecastQuarterLabel(thisQuarterStart),
      period_start: forecastIsoDate(thisQuarterStart),
      period_end: forecastIsoDate(thisQuarterEnd),
      snapshot_date: cel`today()`,
      quota: 1500000,
      pipeline_amount: 2400000,
      best_case_amount: 1800000,
      commit_amount: 1100000,
      closed_amount: 820000,
      source: 'scheduled',
      notes: 'On track — commit + closed covers 64% of quota with the quarter still open.',
    },
    {
      period: 'month',
      period_label: forecastMonthLabel(thisMonthStart),
      period_start: forecastIsoDate(thisMonthStart),
      period_end: forecastIsoDate(thisMonthEnd),
      snapshot_date: cel`today()`,
      quota: 500000,
      pipeline_amount: 760000,
      best_case_amount: 540000,
      commit_amount: 360000,
      closed_amount: 295000,
      source: 'scheduled',
      notes: 'Healthy coverage; two commit deals expected to close this week.',
    },
    {
      period: 'quarter',
      period_label: forecastQuarterLabel(lastQuarterStart),
      period_start: forecastIsoDate(lastQuarterStart),
      period_end: forecastIsoDate(lastQuarterEnd),
      snapshot_date: forecastIsoDate(lastQuarterEnd),
      quota: 1400000,
      pipeline_amount: 0,
      best_case_amount: 0,
      commit_amount: 0,
      closed_amount: 1485000,
      source: 'scheduled',
      notes: 'Closed at 106% of quota.',
    },
  ]
});

// ─── Knowledge Articles ───────────────────────────────────────────────
const knowledgeArticles = defineSeed(KnowledgeArticle, {
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

/**
 * Ownership and CRM positions are NOT seeded here — they can't be.
 *
 * A seed can't name a user. Lookup values are resolved against the target's
 * externalId and that only works for objects in the app's own graph, so
 * `owner: 'Dev Admin'` stores the literal string rather than an id (verified:
 * a `sys_user_position` row seeded that way is unmatchable by the real user
 * id), and `cel\`os.user.id\`` inside a seed evaluates to nothing. The id does
 * not exist until first boot.
 *
 * The `demo_bootstrap` scheduled flow (`src/flows/demo-bootstrap.flow.ts`)
 * does it at the only moment it can: once the first real user exists, its
 * periodic sweep claims every ownerless seeded record for that user.
 */

/** All CRM seed datasets */
export const CrmSeedData = [
  accounts,
  contacts,
  leads,
  opportunities,
  products,
  tasks,
  cases,
  campaigns,
  contracts,
  quotes,
  forecasts,
  knowledgeArticles,
];
