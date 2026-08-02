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
import { OpportunityLineItem } from '../objects/opportunity_line_item.object';
import { QuoteLineItem } from '../objects/quote_line_item.object';
import { CampaignMember } from '../objects/campaign_member.object';

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
 *    `stage_entry_date`, `last_contacted_date`, `actual_revenue`) is legitimate
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
    {
      name: 'Northwind Energy',
      type: 'prospect',
      industry: 'energy',
      annual_revenue: 18000000,
      number_of_employees: 1100,
      phone: '+1-303-555-0600',
      website: 'https://northwind.example.com',
      tier: 'enterprise',
      segment: 'net_new',
      last_activity_date: cel`daysAgo(2)`,
      description: 'A regional energy provider evaluating a unified operations and customer-data platform.',
    },
    {
      name: 'Vertex Analytics',
      type: 'customer',
      industry: 'software',
      annual_revenue: 9500000,
      number_of_employees: 420,
      phone: '+1-512-555-0700',
      website: 'https://vertex.example.com',
      tier: 'enterprise',
      segment: 'growth',
      health_score: 'healthy',
      next_renewal_date: cel`daysFromNow(62)`,
      last_activity_date: cel`daysAgo(4)`,
      description: 'An analytics SaaS customer expanding usage from the data team to its revenue organization.',
    },
    {
      name: 'Lattice Education',
      type: 'customer',
      industry: 'education',
      annual_revenue: 6800000,
      number_of_employees: 320,
      phone: '+1-617-555-0800',
      website: 'https://lattice.example.com',
      tier: 'mid_market',
      segment: 'stable',
      health_score: 'healthy',
      next_renewal_date: cel`daysFromNow(36)`,
      last_activity_date: cel`daysAgo(6)`,
      description: 'A higher-education technology company consolidating admissions, student-success and alumni workflows.',
    },
    {
      name: 'Apex Logistics',
      type: 'prospect',
      industry: 'logistics',
      annual_revenue: 22000000,
      number_of_employees: 1400,
      phone: '+1-404-555-0900',
      website: 'https://apexlogistics.example.com',
      tier: 'enterprise',
      segment: 'net_new',
      last_activity_date: cel`daysAgo(9)`,
      description: 'A fast-growing logistics provider assessing a modern data hub for its operations and commercial teams.',
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
    {
      salutation: 'ms',
      first_name: 'Olivia',
      last_name: 'Chen',
      email: 'olivia.chen@northwind.example.com',
      phone: '+1-303-555-0601',
      title: 'VP of Digital Operations',
      department: 'operations',
      crm_account: 'Northwind Energy',
      is_primary: true,
    },
    {
      salutation: 'mr',
      first_name: 'Ethan',
      last_name: 'Brooks',
      email: 'ethan.brooks@vertex.example.com',
      phone: '+1-512-555-0701',
      title: 'Chief Revenue Officer',
      department: 'executive',
      crm_account: 'Vertex Analytics',
      is_primary: true,
    },
    {
      salutation: 'ms',
      first_name: 'Priya',
      last_name: 'Shah',
      email: 'priya.shah@lattice.example.com',
      phone: '+1-617-555-0801',
      title: 'VP of Student Success',
      department: 'operations',
      crm_account: 'Lattice Education',
      is_primary: true,
    },
    {
      salutation: 'mr',
      first_name: 'Marcus',
      last_name: 'Reed',
      email: 'marcus.reed@apexlogistics.example.com',
      phone: '+1-404-555-0901',
      title: 'Director of Commercial Systems',
      department: 'operations',
      crm_account: 'Apex Logistics',
      is_primary: true,
    },
  ]
});

// ─── Leads ────────────────────────────────────────────────────────────
/**
 * Disqualification reasons for the generated `unqualified` demo leads, paired
 * with the note that explains them.
 *
 * `crm_lead.disqualification_reason_required` rejects an unqualified lead that
 * carries no reason, so every seeded unqualified row must supply one — the rows
 * used to carry a budget-flavoured note and no reason at all. Rotated over four
 * values so the demo's disqualification breakdown has more than one bar, and
 * the note always matches the reason it sits next to.
 */
const DISQUALIFICATION_REASONS = [
  { reason: 'no_budget',     note: 'No budget approved for this fiscal year — revisit next planning cycle.' },
  { reason: 'not_a_fit',     note: 'Requirements sit outside what the product covers today.' },
  { reason: 'wrong_persona', note: 'Contact has no say in the buying decision and no path to an owner.' },
  { reason: 'unreachable',   note: 'Six touches across email and phone over four weeks, no response.' },
] as const;

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
      // WHOLE stars only. `lead.hook.ts` rounds its computed score to an
      // integer because "half values rendered inconsistently in the star
      // widget", and the hook leaves an explicitly seeded number alone — so a
      // seeded 4.5 was the one rating in the system the contract could never
      // produce, and it rendered as the broken half-star it was meant to
      // prevent (#591).
      rating: 5,
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
          ? {
              disqualification_reason: DISQUALIFICATION_REASONS[(i >> 2) % DISQUALIFICATION_REASONS.length].reason,
              notes: DISQUALIFICATION_REASONS[(i >> 2) % DISQUALIFICATION_REASONS.length].note,
            }
          : {}),
      };
    }),
  ]
});

// ─── Line items: the one source of truth for deal value ───────────────
/**
 * A configured product line. `unit_price` is the NEGOTIATED price (what the
 * rep sold at); the catalog `list_price` is stamped separately from the
 * product record, exactly as the price-fill hook would.
 */
type LineSpec = {
  readonly product: string;
  readonly quantity: number;
  readonly unit_price: number;
  /** Line-level discount %, defaults to 0. */
  readonly discount?: number;
  readonly description: string;
};

/** `quantity × unit_price × (1 − discount/100)`, rounded exactly as the rollup hooks round. */
const lineTotal = (l: LineSpec): number =>
  Math.round(l.quantity * l.unit_price * (1 - (l.discount ?? 0) / 100) * 100) / 100;

const linesTotal = (lines: readonly LineSpec[]): number =>
  Math.round(lines.reduce((sum, l) => sum + lineTotal(l), 0) * 100) / 100;

/**
 * Opportunity line items, keyed by the opportunity's name (its seed
 * externalId). Every seeded deal is itemised — before #591 not one was, so the
 * Products related list was empty on every opportunity in the demo and the CPQ
 * story had nothing to show.
 *
 * These sums are AUTHORITATIVE: each opportunity's `amount` below is computed
 * from its lines by `dealValue()` rather than typed in, which is the same
 * answer `opportunity_amount_rollup` computes when a rep touches a line. There
 * is therefore no seeded parent total that a first line-item edit can silently
 * rewrite — the acceptance condition of #591 holds by construction rather than
 * by anyone re-checking the arithmetic.
 *
 * Deriving rather than delegating is deliberate. Letting the rollup own the
 * number would make every seeded `amount` depend on whether hooks fire over
 * seed writes — which the doctrine block above says they do not and a boot log
 * says they do (#617) — and on that hook surviving its own write call (#616).
 * A derived literal is correct under every one of those combinations: if the
 * rollup runs it recomputes the same figure, and if it never runs the figure
 * was already right.
 */
const OPPORTUNITY_LINES: Record<string, readonly LineSpec[]> = {
  'Acme Platform Upgrade': [
    { product: 'ObjectStack Platform', quantity: 2, unit_price: 50000, discount: 10, description: 'Enterprise edition — NA + EMEA production tenants (multi-year discount).' },
    { product: 'Premium Support', quantity: 1, unit_price: 25000, description: '24×7 premium support with a named TAM.' },
    { product: 'AI Agent Seat (Annual)', quantity: 35, unit_price: 1000, description: 'Agent seats for the Ops organization.' },
  ],
  'Globex Manufacturing Suite': [
    { product: 'ObjectStack Platform', quantity: 6, unit_price: 50000, description: 'Enterprise edition across six manufacturing sites.' },
    { product: 'Implementation Services', quantity: 2, unit_price: 75000, description: 'Two-phase implementation: plant operations, then commercial.' },
    { product: 'Premium Support', quantity: 2, unit_price: 25000, description: 'Premium support for both production regions.' },
  ],
  'Wayne Enterprise License': [
    { product: 'ObjectStack Platform', quantity: 20, unit_price: 50000, discount: 15, description: 'Enterprise-wide license, volume discount at 20 tenants.' },
    { product: 'Premium Support', quantity: 4, unit_price: 25000, description: 'Premium support across four business units.' },
    { product: 'AI Agent Seat (Annual)', quantity: 250, unit_price: 1000, description: 'Agent seats for the global revenue organization.' },
  ],
  'Initech Cloud Migration': [
    { product: 'Data Migration Services', quantity: 1, unit_price: 35000, description: 'Migration off the legacy on-premise CRM.' },
    { product: 'Cloud Hosting (Annual)', quantity: 2, unit_price: 12000, description: 'Managed hosting, primary + DR region.' },
    { product: 'Standard Support', quantity: 1, unit_price: 9000, description: 'Business-hours support for the first year.' },
    { product: 'AI Agent Seat (Annual)', quantity: 12, unit_price: 1000, description: 'Agent seats for the service desk.' },
  ],
  'Acme Annual Renewal 2025': [
    { product: 'ObjectStack Platform', quantity: 3, unit_price: 50000, description: 'Renewal of the three production tenants.' },
    { product: 'Premium Support', quantity: 1, unit_price: 25000, description: 'Premium support renewal.' },
    { product: 'AI Agent Seat (Annual)', quantity: 45, unit_price: 1000, description: 'Seat expansion driven by the new EMEA team.' },
  ],
  'Stark Medical Pilot': [
    { product: 'ObjectStack Platform', quantity: 2, unit_price: 50000, description: 'Pilot tenants for two clinical service lines.' },
    { product: 'Standard Support', quantity: 1, unit_price: 9000, description: 'Standard support during the pilot.' },
    { product: 'Admin Training Workshop', quantity: 6, unit_price: 6000, description: 'Six workshop days for the clinical operations admins.' },
  ],
  'Wayne Q1 Expansion': [
    { product: 'ObjectStack Platform', quantity: 6, unit_price: 50000, description: 'Expansion into six additional subsidiaries.' },
    { product: 'Premium Support', quantity: 2, unit_price: 25000, description: 'Premium support for the expanded footprint.' },
    { product: 'AI Agent Seat (Annual)', quantity: 30, unit_price: 1000, description: 'Agent seats for the expansion teams.' },
  ],
  'Globex Training Package': [
    { product: 'Admin Training Workshop', quantity: 10, unit_price: 6000, description: 'Ten workshop days across the plant admin community.' },
    { product: 'AI Agent Seat (Annual)', quantity: 5, unit_price: 1000, description: 'Agent seats for the training sandbox.' },
  ],
  'Initech Phase 1': [
    { product: 'Implementation Services', quantity: 1, unit_price: 75000, description: 'Phase 1 implementation: accounts, contacts, pipeline.' },
    { product: 'Standard Support', quantity: 1, unit_price: 9000, description: 'Standard support for phase 1.' },
    { product: 'AI Agent Seat (Annual)', quantity: 6, unit_price: 1000, description: 'Agent seats for the phase-1 pilot group.' },
  ],
  'Acme Add-on (Lost)': [
    { product: 'Analytics Add-on', quantity: 2, unit_price: 22000, description: 'Marketing analytics for two business units.' },
    { product: 'Integration Connector Pack', quantity: 1, unit_price: 16000, description: 'Marketing-automation connector pack.' },
    { product: 'Sandbox Environment (Annual)', quantity: 2, unit_price: 7500, description: 'Two sandboxes for the marketing build-out.' },
  ],
  'Stark Expansion (Lost)': [
    { product: 'ObjectStack Platform', quantity: 2, unit_price: 50000, description: 'Two additional clinical tenants.' },
    { product: 'Field Service Mobile', quantity: 1, unit_price: 14000, description: 'Field service mobile for the device-servicing team.' },
    { product: 'AI Agent Seat (Annual)', quantity: 6, unit_price: 1000, description: 'Agent seats for the service coordinators.' },
  ],
  'Northwind Grid Modernization': [
    { product: 'ObjectStack Platform', quantity: 3, unit_price: 50000, description: 'Enterprise edition for grid, field and customer operations.' },
    { product: 'Implementation Services', quantity: 1, unit_price: 75000, description: 'Operational-data assessment and implementation.' },
    { product: 'AI Agent Seat (Annual)', quantity: 15, unit_price: 1000, description: 'Agent seats for the control-room pilot.' },
  ],
  'Lattice Student Success Platform': [
    { product: 'ObjectStack Platform (SMB Edition)', quantity: 5, unit_price: 18000, description: 'Student-success tenants for five colleges.' },
    { product: 'Admin Training Workshop', quantity: 5, unit_price: 6000, description: 'Five workshop days for the student-success advisers.' },
    { product: 'AI Agent Seat (Annual)', quantity: 5, unit_price: 1000, description: 'Agent seats for the advising team.' },
  ],
  'Vertex Analytics Expansion': [
    { product: 'ObjectStack Platform', quantity: 2, unit_price: 50000, description: 'Two tenants for the revenue organization.' },
    { product: 'Analytics Add-on', quantity: 5, unit_price: 22000, description: 'Analytics for sales, marketing, service, finance and ops.' },
    { product: 'Premium Support', quantity: 2, unit_price: 25000, description: 'Premium support for the expanded footprint.' },
    { product: 'AI Agent Seat (Annual)', quantity: 60, unit_price: 1000, description: 'Agent seats for the full revenue organization.' },
  ],
  'Apex Logistics Data Hub': [
    { product: 'ObjectStack Platform', quantity: 3, unit_price: 50000, description: 'Data-hub tenants for commercial, operations and finance.' },
    { product: 'Data Migration Services', quantity: 1, unit_price: 35000, description: 'Consolidation of four fragmented commercial systems.' },
    { product: 'Implementation Services', quantity: 1, unit_price: 75000, description: 'Architecture workshop through go-live.' },
    { product: 'AI Agent Seat (Annual)', quantity: 15, unit_price: 1000, description: 'Agent seats for the commercial operations team.' },
  ],
  'Lattice Education Renewal': [
    { product: 'ObjectStack Platform', quantity: 3, unit_price: 50000, description: 'Renewal of the three institution tenants.' },
    { product: 'Analytics Add-on', quantity: 1, unit_price: 22000, description: 'Expanded analytics package for the renewal term.' },
    { product: 'Admin Training Workshop', quantity: 3, unit_price: 6000, description: 'Three workshop days for the new admissions admins.' },
    { product: 'AI Agent Seat (Annual)', quantity: 20, unit_price: 1000, description: 'Student-success automation seats.' },
  ],
  'Vertex Enterprise Rollout': [
    { product: 'ObjectStack Platform', quantity: 10, unit_price: 50000, discount: 20, description: 'Phased enterprise rollout, ten tenants (volume discount).' },
    { product: 'Implementation Services', quantity: 1, unit_price: 75000, description: 'Phased deployment with data-residency controls.' },
    { product: 'Premium Support', quantity: 4, unit_price: 25000, description: 'Premium support across four regions.' },
    { product: 'AI Agent Seat (Annual)', quantity: 100, unit_price: 1000, description: 'Agent seats for the first rollout wave.' },
  ],
  // Campaign-attributed wins — see the campaign metrics note below.
  'Lattice Analytics Expansion': [
    { product: 'Analytics Add-on', quantity: 2, unit_price: 22000, description: 'Analytics for admissions and alumni engagement.' },
    { product: 'Admin Training Workshop', quantity: 1, unit_price: 6000, description: 'Analytics enablement day for the institutional-research team.' },
    { product: 'AI Agent Seat (Annual)', quantity: 20, unit_price: 1000, description: 'Agent seats for the admissions team.' },
  ],
  'Wayne Operations Module Rollout': [
    { product: 'ObjectStack Platform', quantity: 2, unit_price: 50000, description: 'Operations tenants for two manufacturing divisions.' },
    { product: 'Standard Support', quantity: 1, unit_price: 9000, description: 'Standard support for the operations rollout.' },
    { product: 'AI Agent Seat (Annual)', quantity: 11, unit_price: 1000, description: 'Agent seats for the operations planners.' },
  ],
  'Vertex Developer Platform Adoption': [
    { product: 'ObjectStack Platform', quantity: 3, unit_price: 50000, description: 'Developer platform tenants for three product teams.' },
    { product: 'Integration Connector Pack', quantity: 1, unit_price: 16000, description: 'Connector pack for the internal data warehouse.' },
    { product: 'Analytics Add-on', quantity: 1, unit_price: 22000, description: 'Product-usage analytics for the platform team.' },
    { product: 'AI Agent Seat (Annual)', quantity: 12, unit_price: 1000, description: 'Agent seats for the developer-experience team.' },
  ],
};

/**
 * `amount` + `expected_revenue` for a seeded deal, both derived from its line
 * items. `expected_revenue` uses opportunity.hook.ts's own expression
 * (`Math.round(amount * probability) / 100`) so the two agree to the cent.
 */
const dealValue = (opportunityName: string, probability: number) => {
  const lines = OPPORTUNITY_LINES[opportunityName];
  if (!lines) throw new Error(`Seed error: no line items authored for opportunity "${opportunityName}"`);
  const amount = linesTotal(lines);
  return { amount, expected_revenue: Math.round(amount * probability) / 100 };
};

// ─── Opportunities ────────────────────────────────────────────────────
// `probability`, `forecast_category` and `expected_revenue` are derived from
// `stage` by opportunity.hook.ts (STAGE_PROBABILITY / STAGE_FORECAST). Hooks
// don't run over seeds, so every row below carries the exact values the hook
// would compute — anything else gets silently rewritten on the first user
// edit (#490).
//
// `stage_entry_date` follows the same rule: the hook stamps it on every insert
// and stage change, so a seeded deal without one is a shape real data never
// has — and it is what the stagnation sweep filters on and what the
// `days_in_stage` FORMULA counts from, so it replaces the old hardcoded
// `days_in_stage` numbers (#489). Open deals carry an age that spans the
// 14-day stale threshold in both directions; settled deals entered their
// closed stage on their close date.
const opportunities = defineSeed(Opportunity, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'Acme Platform Upgrade',
      crm_account: 'Acme Corporation',
      ...dealValue('Acme Platform Upgrade', 60),
      stage: 'proposal',
      probability: 60,
      close_date: cel`daysFromNow(30)`,
      type: 'existing_upgrade',
      forecast_category: 'commit',
      lead_source: 'web',
      stage_entry_date: celDaysAgo(12),
      description: `Upgrade from Standard to Enterprise edition for the
NA + EMEA teams. Drivers: (1) AI agent governance becomes a hard
requirement after their internal compliance review, (2) advanced
analytics seats for the Ops org, (3) priority support SLA.`,
      next_step: `Send the revised proposal (Enterprise edition, 18-month term, 12% multi-year discount) to Jordan Park by EOW. Schedule the AI governance workshop for the week of close_date - 14d.`,
    },
    {
      name: 'Globex Manufacturing Suite',
      crm_account: 'Globex Industries',
      ...dealValue('Globex Manufacturing Suite', 25),
      stage: 'qualification',
      probability: 25,
      close_date: cel`daysFromNow(60)`,
      type: 'new_business',
      forecast_category: 'pipeline',
      lead_source: 'referral',
      stage_entry_date: celDaysAgo(45),
    },
    {
      name: 'Wayne Enterprise License',
      crm_account: 'Wayne Enterprises',
      ...dealValue('Wayne Enterprise License', 80),
      stage: 'negotiation',
      probability: 80,
      close_date: cel`daysFromNow(14)`,
      type: 'new_business',
      forecast_category: 'commit',
      lead_source: 'partner',
      stage_entry_date: celDaysAgo(7),
    },
    {
      name: 'Initech Cloud Migration',
      crm_account: 'Initech Solutions',
      ...dealValue('Initech Cloud Migration', 40),
      stage: 'needs_analysis',
      probability: 40,
      close_date: cel`daysFromNow(45)`,
      type: 'existing_upgrade',
      forecast_category: 'best_case',
      lead_source: 'event',
      stage_entry_date: celDaysAgo(38),
    },
    // ─── Closed Won deals (powers KPIs & revenue trends) ────────────────
    {
      name: 'Acme Annual Renewal 2025',
      crm_account: 'Acme Corporation',
      ...dealValue('Acme Annual Renewal 2025', 100),
      stage: 'closed_won',
      probability: 100,
      close_date: cel`daysAgo(15)`,
      stage_entry_date: cel`daysAgo(15)`,
      type: 'existing_renewal',
      forecast_category: 'closed',
      lead_source: 'partner',
      description: `Annual renewal of the Acme Standard subscription (40 seats), signed two weeks ahead of the renewal date. 22% YoY uplift driven by seat expansion in the new EMEA team. Multi-year option declined this round — they want to see how the platform upgrade lands first.`,
    },
    {
      name: 'Stark Medical Pilot',
      crm_account: 'Stark Medical',
      ...dealValue('Stark Medical Pilot', 100),
      stage: 'closed_won',
      probability: 100,
      close_date: cel`daysAgo(50)`,
      stage_entry_date: cel`daysAgo(50)`,
      type: 'new_business',
      forecast_category: 'closed',
      lead_source: 'event',
    },
    {
      name: 'Wayne Q1 Expansion',
      crm_account: 'Wayne Enterprises',
      ...dealValue('Wayne Q1 Expansion', 100),
      stage: 'closed_won',
      probability: 100,
      close_date: cel`daysAgo(95)`,
      stage_entry_date: cel`daysAgo(95)`,
      type: 'existing_upgrade',
      forecast_category: 'closed',
      lead_source: 'web',
    },
    {
      name: 'Globex Training Package',
      crm_account: 'Globex Industries',
      ...dealValue('Globex Training Package', 100),
      stage: 'closed_won',
      probability: 100,
      close_date: cel`daysAgo(140)`,
      stage_entry_date: cel`daysAgo(140)`,
      type: 'new_business',
      forecast_category: 'closed',
      lead_source: 'referral',
    },
    {
      name: 'Initech Phase 1',
      crm_account: 'Initech Solutions',
      ...dealValue('Initech Phase 1', 100),
      stage: 'closed_won',
      probability: 100,
      close_date: cel`daysAgo(200)`,
      stage_entry_date: cel`daysAgo(200)`,
      type: 'new_business',
      forecast_category: 'closed',
      lead_source: 'web',
    },
    // ─── Campaign-attributed wins ───────────────────────────────────────
    // `crm_campaign` is what `campaign_snapshot_metrics` counts when a campaign
    // completes (`num_opportunities` / `num_won_opportunities` / the summed
    // `actual_revenue`). Before #591 not one opportunity carried it, so those
    // three metrics were structurally zero and every campaign's seeded
    // `actual_revenue` was a number the hook would have erased on completion.
    // These three wins are what make the marketing ROI numbers below TRUE.
    {
      name: 'Lattice Analytics Expansion',
      crm_account: 'Lattice Education',
      primary_contact: 'priya.shah@lattice.example.com',
      crm_campaign: 'Q3 Enterprise Email Nurture',
      ...dealValue('Lattice Analytics Expansion', 100),
      stage: 'closed_won',
      probability: 100,
      close_date: cel`daysAgo(6)`,
      stage_entry_date: cel`daysAgo(6)`,
      type: 'existing_expansion',
      forecast_category: 'closed',
      lead_source: 'email_campaign',
      description: 'Analytics package for admissions and alumni engagement, sourced from the enterprise nurture track.',
    },
    {
      name: 'Wayne Operations Module Rollout',
      crm_account: 'Wayne Enterprises',
      primary_contact: 'rwilson@wayne.example.com',
      crm_campaign: 'Operations Platform Launch',
      ...dealValue('Wayne Operations Module Rollout', 100),
      stage: 'closed_won',
      probability: 100,
      close_date: cel`daysAgo(4)`,
      stage_entry_date: cel`daysAgo(4)`,
      type: 'existing_upgrade',
      forecast_category: 'closed',
      lead_source: 'content',
      description: 'Operations module for two manufacturing divisions, closed off the operations-platform launch program.',
    },
    {
      name: 'Vertex Developer Platform Adoption',
      crm_account: 'Vertex Analytics',
      primary_contact: 'ethan.brooks@vertex.example.com',
      crm_campaign: 'Developer Content Marketing Push',
      ...dealValue('Vertex Developer Platform Adoption', 100),
      stage: 'closed_won',
      probability: 100,
      close_date: cel`daysAgo(6)`,
      stage_entry_date: cel`daysAgo(6)`,
      type: 'existing_expansion',
      forecast_category: 'closed',
      lead_source: 'content',
      description: 'Three product teams adopted the developer platform after the technical content series.',
    },
    // Closed Lost deals (powers win-rate analytics)
    {
      name: 'Acme Add-on (Lost)',
      crm_account: 'Acme Corporation',
      ...dealValue('Acme Add-on (Lost)', 0),
      stage: 'closed_lost',
      probability: 0,
      close_date: cel`daysAgo(25)`,
      stage_entry_date: cel`daysAgo(25)`,
      type: 'existing_upgrade',
      forecast_category: 'omitted',
      lead_source: 'cold_call',
      description: `Tried to bolt on the Marketing Cloud module via cold outbound. Lost because Acme's marketing org is already on a 2-year HubSpot contract. Revisit in Q3 when that contract is up for renewal.`,
    },
    {
      name: 'Stark Expansion (Lost)',
      crm_account: 'Stark Medical',
      ...dealValue('Stark Expansion (Lost)', 0),
      stage: 'closed_lost',
      probability: 0,
      close_date: cel`daysAgo(60)`,
      stage_entry_date: cel`daysAgo(60)`,
      type: 'new_business',
      forecast_category: 'omitted',
      lead_source: 'advertisement',
    },
    // ─── Curated active pipeline ─────────────────────────────────────
    // Two cards in each active stage make the kanban immediately legible in
    // a customer demo. They also tell a coherent sales story instead of
    // overwhelming the board with anonymous generated rows.
    {
      name: 'Northwind Grid Modernization',
      crm_account: 'Northwind Energy',
      primary_contact: 'olivia.chen@northwind.example.com',
      ...dealValue('Northwind Grid Modernization', 10),
      stage: 'prospecting',
      probability: 10,
      close_date: cel`daysFromNow(72)`,
      type: 'new_business',
      forecast_category: 'pipeline',
      lead_source: 'webinar',
      stage_entry_date: celDaysAgo(4),
      description: 'Northwind is assessing a unified grid-modernization program after an executive webinar.',
      next_step: 'Confirm discovery participants and agree the operational-data assessment scope.',
    },
    {
      name: 'Lattice Student Success Platform',
      crm_account: 'Lattice Education',
      primary_contact: 'priya.shah@lattice.example.com',
      crm_campaign: 'Developer Content Marketing Push',
      ...dealValue('Lattice Student Success Platform', 10),
      stage: 'prospecting',
      probability: 10,
      close_date: cel`daysFromNow(96)`,
      type: 'new_business',
      forecast_category: 'pipeline',
      lead_source: 'content',
      stage_entry_date: celDaysAgo(11),
      description: 'A new student-success initiative sourced from the higher-education content series.',
      next_step: 'Invite the operations sponsor to the discovery workshop.',
    },
    {
      name: 'Vertex Analytics Expansion',
      crm_account: 'Vertex Analytics',
      primary_contact: 'ethan.brooks@vertex.example.com',
      ...dealValue('Vertex Analytics Expansion', 25),
      stage: 'qualification',
      probability: 25,
      close_date: cel`daysFromNow(52)`,
      type: 'existing_expansion',
      forecast_category: 'pipeline',
      lead_source: 'partner',
      stage_entry_date: celDaysAgo(8),
      description: 'Vertex wants to extend the platform from its data team to the full revenue organization.',
      next_step: 'Validate the buying committee, budget owner and expansion timeline.',
    },
    {
      name: 'Apex Logistics Data Hub',
      crm_account: 'Apex Logistics',
      primary_contact: 'marcus.reed@apexlogistics.example.com',
      ...dealValue('Apex Logistics Data Hub', 40),
      stage: 'needs_analysis',
      probability: 40,
      close_date: cel`daysFromNow(38)`,
      type: 'new_business',
      forecast_category: 'best_case',
      lead_source: 'partner',
      stage_entry_date: celDaysAgo(18),
      description: 'Apex is mapping its fragmented commercial systems before committing to a data-hub program.',
      next_step: 'Complete the architecture workshop and quantify the integration backlog.',
    },
    {
      name: 'Lattice Education Renewal',
      crm_account: 'Lattice Education',
      primary_contact: 'priya.shah@lattice.example.com',
      crm_campaign: 'Q3 Enterprise Email Nurture',
      ...dealValue('Lattice Education Renewal', 60),
      stage: 'proposal',
      probability: 60,
      close_date: cel`daysFromNow(24)`,
      type: 'existing_renewal',
      forecast_category: 'commit',
      lead_source: 'email_campaign',
      stage_entry_date: celDaysAgo(6),
      description: 'Renewal proposal adds student-success automation and an expanded analytics package.',
      next_step: 'Review the two-year option with procurement before the executive sponsor meeting.',
    },
    {
      name: 'Vertex Enterprise Rollout',
      crm_account: 'Vertex Analytics',
      primary_contact: 'ethan.brooks@vertex.example.com',
      ...dealValue('Vertex Enterprise Rollout', 80),
      stage: 'negotiation',
      probability: 80,
      close_date: cel`daysFromNow(11)`,
      type: 'existing_expansion',
      forecast_category: 'commit',
      lead_source: 'referral',
      stage_entry_date: celDaysAgo(3),
      description: 'An enterprise rollout negotiated around phased deployment and data-residency requirements.',
      next_step: 'Resolve the final security addendum and confirm the procurement signature date.',
    },
  ]
});

// ─── Products ─────────────────────────────────────────────────────────
// The catalog is what every line item below prices against, so it has to be
// wide enough to configure a realistic deal: an edition, an add-on, a
// per-seat subscription, support tiers and professional services. Four
// products could not (#591).
//
// `cost` is populated on every product: `cost_less_than_price` is a real
// validation rule that "has never once evaluated" while the field was blank
// everywhere, and margin is what the product-mix analytics are for. Every row
// keeps cost strictly below list price.
const products = defineSeed(Product, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'ObjectStack Platform',
      description: 'The enterprise edition: unlimited objects, AI agents, governance and audit.',
      category: 'software',
      family: 'enterprise',
      sku: 'OS-PLAT-ENT',
      list_price: 50000,
      cost: 12000,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'ObjectStack Platform (SMB Edition)',
      description: 'The mid-market edition: core CRM objects and automation, capped agent usage.',
      category: 'software',
      family: 'smb',
      sku: 'OS-PLAT-SMB',
      list_price: 18000,
      cost: 4500,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'Cloud Hosting (Annual)',
      description: 'Managed hosting with regional data residency and a 99.9% availability target.',
      category: 'subscription',
      family: 'cloud',
      sku: 'OS-CLOUD-HOST',
      list_price: 12000,
      cost: 4200,
      billing_type: 'annual',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Sandbox Environment (Annual)',
      description: 'A full-copy non-production environment for testing metadata changes before release.',
      category: 'subscription',
      family: 'cloud',
      sku: 'OS-CLOUD-SBX',
      list_price: 7500,
      cost: 2600,
      billing_type: 'annual',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'AI Agent Seat (Annual)',
      description: 'A named-user seat for the Co-Pilot and agent surfaces, billed annually.',
      category: 'subscription',
      family: 'cloud',
      sku: 'OS-AI-SEAT',
      list_price: 1000,
      cost: 260,
      billing_type: 'annual',
      unit_of_measure: 'seat',
      is_active: true,
    },
    {
      name: 'Analytics Add-on',
      description: 'Dashboards, cubes and scheduled reporting for the revenue organization.',
      category: 'software',
      family: 'enterprise',
      sku: 'OS-ADDON-ANL',
      list_price: 22000,
      cost: 6500,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'Integration Connector Pack',
      description: 'Pre-built connectors for ERP, marketing automation and data warehouse targets.',
      category: 'software',
      family: 'enterprise',
      sku: 'OS-ADDON-INT',
      list_price: 16000,
      cost: 5200,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'Field Service Mobile',
      description: 'Offline-capable mobile app for field technicians and route-based service work.',
      category: 'software',
      family: 'smb',
      sku: 'OS-ADDON-FSM',
      list_price: 14000,
      cost: 4200,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'Premium Support',
      description: '24×7 support with a one-hour P1 response target and a named technical account manager.',
      category: 'support',
      family: 'services',
      sku: 'OS-SUP-PREM',
      list_price: 25000,
      cost: 9000,
      billing_type: 'annual',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Standard Support',
      description: 'Business-hours support with a next-business-day response target.',
      category: 'support',
      family: 'services',
      sku: 'OS-SUP-STD',
      list_price: 9000,
      cost: 3600,
      billing_type: 'annual',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Implementation Services',
      description: 'Guided implementation: discovery, metadata build, integration and go-live support.',
      category: 'service',
      family: 'services',
      sku: 'OS-SVC-IMPL',
      list_price: 75000,
      cost: 41000,
      billing_type: 'one_time',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Data Migration Services',
      description: 'Extraction, mapping and reconciliation of legacy CRM and spreadsheet data.',
      category: 'service',
      family: 'services',
      sku: 'OS-SVC-MIGR',
      list_price: 35000,
      cost: 19000,
      billing_type: 'one_time',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Admin Training Workshop',
      description: 'A one-day workshop for administrators on metadata, permissions and analytics.',
      category: 'service',
      family: 'services',
      sku: 'OS-SVC-TRN',
      list_price: 6000,
      cost: 2400,
      billing_type: 'one_time',
      unit_of_measure: 'day',
      is_active: true,
    },
  ]
});

/**
 * Catalog price of a seeded product, read back from the dataset above so the
 * price lives in exactly one place.
 *
 * Line items carry `list_price` explicitly because hooks do NOT run over seeds
 * (#490): the shared price-fill hook (`_line-item-price-fill.ts`) is what
 * stamps `list_price` from `crm_product.list_price` on a real write, so a
 * seeded line has to arrive already carrying what that hook would have
 * written. Reading it from the catalog record makes that literally impossible
 * to get wrong.
 */
const catalogPrice = (productName: string): number => {
  const product = products.records.find((r) => r.name === productName);
  if (!product || typeof product.list_price !== 'number') {
    throw new Error(`Seed error: no catalog product named "${productName}"`);
  }
  return product.list_price;
};

/**
 * Flatten a `{ parent → lines }` table into seed records for one line-item
 * object. `list_price` and `line_number` are the two fields a real write gets
 * from machinery a seed cannot count on (the price-fill hook, and the quote /
 * opportunity line editors), so both are materialised here — the row is then
 * correct whether or not the hook fires over a seed write (#617).
 */
const lineItemRecords = <K extends string>(
  parentField: K,
  table: Record<string, readonly LineSpec[]>,
): Array<Record<string, unknown>> =>
  Object.entries(table).flatMap(([parent, lines]) =>
    lines.map((l, i) => ({
      [parentField]: parent,
      crm_product: l.product,
      description: l.description,
      quantity: l.quantity,
      list_price: catalogPrice(l.product),
      unit_price: l.unit_price,
      discount: l.discount ?? 0,
      line_number: i + 1,
    })),
  );

// ─── Opportunity line items ───────────────────────────────────────────
// Identity is the COMPOSITE natural key (opportunity, product): the object has
// no single natural key — no name, and `line_number` is only unique within a
// parent — and a junction-shaped dataset without one can only run
// `mode: 'insert'`, which re-inserts every row on each replay boot and
// duplicates the table (framework#3434). The loader matches composite key
// fields by their RESOLVED ids, so this dedupes correctly across restarts.
// The practical constraint it imposes: a product appears at most once per
// deal, which is how these lines are authored anyway.
const opportunityLineItems = defineSeed(OpportunityLineItem, {
  mode: 'upsert',
  externalId: ['crm_opportunity', 'crm_product'],
  records: lineItemRecords('crm_opportunity', OPPORTUNITY_LINES),
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

// ─── Campaign membership ──────────────────────────────────────────────
/**
 * Campaign members, keyed by campaign name.
 *
 * Membership is the ONLY path from a campaign to a lead — `crm_lead` has no
 * campaign field — so with this table empty (as it was before #591) every
 * campaign reported `num_sent` 0, `response_rate` 0% and no attributed leads
 * at all, whatever the campaign records claimed.
 *
 * Status vocabulary is deliberately restricted to the lifecycle values a
 * writer actually produces: `sent` (what the campaign_enrollment flow stamps),
 * `responded` and `unsubscribed`. The `opened` / `clicked` / `bounced` states
 * and the `first_opened_date` / `first_clicked_date` stamps have no writer
 * anywhere in the app and are being trimmed under #597 — seeding them would
 * manufacture data that nothing can maintain and that the trim would then
 * invalidate.
 *
 * `converted` is likewise unused here: the hook counts converted leads from
 * `crm_lead.is_converted`, and no seeded lead is converted (conversion is the
 * lead_conversion flow's job at runtime), so a `converted` member would be a
 * member state no lead record backs up.
 */
type CampaignMemberSpec = {
  /** Lead email (the lead dataset's externalId) — mutually exclusive with `contact`. */
  readonly lead?: string;
  /** Contact email (the contact dataset's externalId). */
  readonly contact?: string;
  readonly status: 'sent' | 'responded' | 'unsubscribed';
  readonly addedDaysAgo: number;
  /** Days ago the member responded. Required by `responded`, absent otherwise. */
  readonly respondedDaysAgo?: number;
};

const CAMPAIGN_MEMBERS: Record<string, readonly CampaignMemberSpec[]> = {
  'Q3 Enterprise Email Nurture': [
    { lead: 'noah.patel@vertexanalytics.example.com', status: 'responded', addedDaysAgo: 14, respondedDaysAgo: 9 },
    { lead: 'maya.singh@bluepeaklogistics.example.com', status: 'sent', addedDaysAgo: 14 },
    { lead: 'owen.becker@northwindenergy.example.com', status: 'responded', addedDaysAgo: 14, respondedDaysAgo: 11 },
    { lead: 'sara.lopez@heliossolar.example.com', status: 'sent', addedDaysAgo: 14 },
    { lead: 'leo.vance@cleancart.example.com', status: 'unsubscribed', addedDaysAgo: 14 },
    { lead: 'iris.okafor@pulsehealth.example.com', status: 'sent', addedDaysAgo: 13 },
    { lead: 'ravi.mehta@foundryrobotics.example.com', status: 'sent', addedDaysAgo: 13 },
    { lead: 'tess.brown@latticeeducation.example.com', status: 'responded', addedDaysAgo: 13, respondedDaysAgo: 8 },
    { contact: 'john.smith@acme.example.com', status: 'responded', addedDaysAgo: 14, respondedDaysAgo: 10 },
    { contact: 'ethan.brooks@vertex.example.com', status: 'sent', addedDaysAgo: 14 },
    { contact: 'priya.shah@lattice.example.com', status: 'responded', addedDaysAgo: 14, respondedDaysAgo: 7 },
    { contact: 'rwilson@wayne.example.com', status: 'sent', addedDaysAgo: 13 },
  ],
  'Operations Platform Launch': [
    { lead: 'jonas.holt@polarcargo.example.com', status: 'responded', addedDaysAgo: 11, respondedDaysAgo: 6 },
    { lead: 'anya.volkov@redoakrealty.example.com', status: 'sent', addedDaysAgo: 11 },
    { lead: 'theo.park@skylinemedia.example.com', status: 'sent', addedDaysAgo: 11 },
    { lead: 'wren.garcia@maplebakerygroup.example.com', status: 'responded', addedDaysAgo: 10, respondedDaysAgo: 5 },
    { lead: 'hugo.dubois@nimbusaerospace.example.com', status: 'sent', addedDaysAgo: 10 },
    { contact: 'rwilson@wayne.example.com', status: 'responded', addedDaysAgo: 11, respondedDaysAgo: 7 },
    { contact: 'marcus.reed@apexlogistics.example.com', status: 'sent', addedDaysAgo: 11 },
    { contact: 'olivia.chen@northwind.example.com', status: 'sent', addedDaysAgo: 10 },
    { contact: 'sarah.j@globex.example.com', status: 'sent', addedDaysAgo: 10 },
  ],
  'Developer Content Marketing Push': [
    { lead: 'lena.fischer@graniteinsurance.example.com', status: 'responded', addedDaysAgo: 33, respondedDaysAgo: 27 },
    { lead: 'kai.watanabe@coralreefhotels.example.com', status: 'sent', addedDaysAgo: 33 },
    { lead: 'mira.costa@atlasconstruction.example.com', status: 'unsubscribed', addedDaysAgo: 33 },
    { lead: 'pia.anand@citrinefinance.example.com', status: 'responded', addedDaysAgo: 32, respondedDaysAgo: 24 },
    { lead: 'marco.ricci@auroratravel.example.com', status: 'sent', addedDaysAgo: 32 },
    { lead: 'lisa.t@cloudfirst.example.com', status: 'responded', addedDaysAgo: 30, respondedDaysAgo: 21 },
    { contact: 'ethan.brooks@vertex.example.com', status: 'responded', addedDaysAgo: 33, respondedDaysAgo: 19 },
    { contact: 'mchen@initech.example.com', status: 'sent', addedDaysAgo: 33 },
    { contact: 'john.smith@acme.example.com', status: 'sent', addedDaysAgo: 32 },
    { contact: 'emily.d@starkmed.example.com', status: 'sent', addedDaysAgo: 32 },
    { contact: 'sarah.j@globex.example.com', status: 'sent', addedDaysAgo: 30 },
  ],
  // Campaigns still in `planning` carry their invitation / registration list:
  // the enrollment flow runs for `planning` and `in_progress` campaigns alike
  // and stamps `sent` on enrollment, so a pre-launch target list looks exactly
  // like this.
  'Cloud Migration Webinar': [
    { lead: 'dkim@edutechlabs.example.com', status: 'sent', addedDaysAgo: 4 },
    { lead: 'alice@nextgenretail.example.com', status: 'sent', addedDaysAgo: 4 },
    { lead: 'jonas.holt@polarcargo.example.com', status: 'sent', addedDaysAgo: 3 },
    { lead: 'anya.volkov@redoakrealty.example.com', status: 'sent', addedDaysAgo: 3 },
    { contact: 'mchen@initech.example.com', status: 'sent', addedDaysAgo: 4 },
    { contact: 'marcus.reed@apexlogistics.example.com', status: 'sent', addedDaysAgo: 3 },
  ],
  'Executive AI Governance Roundtable': [
    { contact: 'john.smith@acme.example.com', status: 'sent', addedDaysAgo: 6 },
    { contact: 'rwilson@wayne.example.com', status: 'sent', addedDaysAgo: 6 },
    { contact: 'ethan.brooks@vertex.example.com', status: 'sent', addedDaysAgo: 5 },
    { contact: 'priya.shah@lattice.example.com', status: 'sent', addedDaysAgo: 5 },
    { contact: 'emily.d@starkmed.example.com', status: 'sent', addedDaysAgo: 5 },
  ],
  'Partner Operations Roadshow': [
    { lead: 'maya.singh@bluepeaklogistics.example.com', status: 'sent', addedDaysAgo: 7 },
    { lead: 'ravi.mehta@foundryrobotics.example.com', status: 'sent', addedDaysAgo: 7 },
    { contact: 'marcus.reed@apexlogistics.example.com', status: 'sent', addedDaysAgo: 6 },
    { contact: 'olivia.chen@northwind.example.com', status: 'sent', addedDaysAgo: 6 },
  ],
  'SaaSCon 2026 Trade Show': [
    { lead: 'theo.park@skylinemedia.example.com', status: 'sent', addedDaysAgo: 8 },
    { lead: 'wren.garcia@maplebakerygroup.example.com', status: 'sent', addedDaysAgo: 8 },
    { lead: 'hugo.dubois@nimbusaerospace.example.com', status: 'sent', addedDaysAgo: 7 },
    { lead: 'marco.ricci@auroratravel.example.com', status: 'sent', addedDaysAgo: 7 },
  ],
};

/**
 * The metric block `campaign_snapshot_metrics` writes when a campaign moves to
 * `completed`, computed here from the very same inputs the hook reads: the
 * membership table above and the opportunities attributed via `crm_campaign`.
 *
 * Seeding these by hand is what made them wrong before. The snapshot fires on
 * the transition INTO `completed` and nowhere else, so a hand-typed
 * `actual_revenue` survives untouched right up until someone completes the
 * campaign — at which point the hook replaces it with the truth and the number
 * "mysteriously" changes. Deriving it here makes that snapshot a no-op instead:
 * same inputs, same arithmetic, same answer.
 */
const campaignMetrics = (campaignName: string) => {
  const members = CAMPAIGN_MEMBERS[campaignName] ?? [];
  const leadKeys = new Set(members.map((m) => m.lead).filter((e): e is string => Boolean(e)));
  const convertedLeads = leads.records.filter(
    (l) => typeof l.email === 'string' && leadKeys.has(l.email) && l.is_converted === true,
  ).length;
  const attributed = opportunities.records.filter((o) => o.crm_campaign === campaignName);
  const won = attributed.filter((o) => o.stage === 'closed_won');
  return {
    // "Total members enrolled" — campaign.hook.ts's single definition of num_sent.
    num_sent: members.length,
    // Only the exact `responded` status counts, as in the hook.
    num_responses: members.filter((m) => m.status === 'responded').length,
    num_leads: leadKeys.size,
    num_converted_leads: convertedLeads,
    num_opportunities: attributed.length,
    num_won_opportunities: won.length,
    actual_revenue: won.reduce((sum, o) => sum + (typeof o.amount === 'number' ? o.amount : 0), 0),
  };
};

// ─── Campaigns ────────────────────────────────────────────────────────
const campaigns = defineSeed(Campaign, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'Q3 Enterprise Email Nurture',
      description: 'Multi-touch nurture for enterprise IT decision makers evaluating AI governance and analytics.',
      type: 'email',
      channel: 'email',
      status: 'in_progress',
      start_date: cel`daysAgo(15)`,
      end_date: cel`daysFromNow(21)`,
      budgeted_cost: 28000,
      actual_cost: 14000,
      expected_revenue: 560000,
      target_size: 5000,
      ...campaignMetrics('Q3 Enterprise Email Nurture'),
      landing_page_url: 'https://acme.example.com/lp/enterprise-q3',
      is_active: true,
    },
    {
      name: 'Executive AI Governance Roundtable',
      description: 'A live executive roundtable on operating AI agents with governance, auditability and trust.',
      type: 'conference',
      channel: 'events',
      status: 'planning',
      start_date: cel`daysFromNow(2)`,
      end_date: cel`daysFromNow(3)`,
      budgeted_cost: 22000,
      expected_revenue: 320000,
      target_size: 120,
      ...campaignMetrics('Executive AI Governance Roundtable'),
      is_active: true,
    },
    {
      name: 'Cloud Migration Webinar',
      description: 'A technical webinar on modernizing customer operations and data workflows in the cloud.',
      type: 'webinar',
      channel: 'digital',
      status: 'planning',
      start_date: cel`daysFromNow(6)`,
      end_date: cel`daysFromNow(8)`,
      budgeted_cost: 18000,
      expected_revenue: 360000,
      target_size: 1500,
      ...campaignMetrics('Cloud Migration Webinar'),
      landing_page_url: 'https://acme.example.com/webinars/cloud-migration',
      is_active: true,
    },
    {
      name: 'Operations Platform Launch',
      description: 'Launch campaign for the operations platform, pairing product content with customer proof points.',
      type: 'content',
      channel: 'digital',
      status: 'in_progress',
      // Was `daysFromNow(12)` — an `in_progress` campaign that had not started
      // yet, which no attribution can be consistent with (#591).
      start_date: cel`daysAgo(12)`,
      end_date: cel`daysFromNow(14)`,
      budgeted_cost: 36000,
      actual_cost: 12000,
      expected_revenue: 480000,
      target_size: 8000,
      ...campaignMetrics('Operations Platform Launch'),
      landing_page_url: 'https://acme.example.com/launch/operations-platform',
      is_active: true,
    },
    {
      name: 'Partner Operations Roadshow',
      description: 'Joint regional sessions with strategic partners for operations and IT leaders.',
      type: 'partner',
      channel: 'partner',
      status: 'planning',
      start_date: cel`daysFromNow(19)`,
      end_date: cel`daysFromNow(22)`,
      budgeted_cost: 48000,
      expected_revenue: 720000,
      target_size: 600,
      ...campaignMetrics('Partner Operations Roadshow'),
      is_active: true,
    },
    {
      name: 'SaaSCon 2026 Trade Show',
      description: 'A focused booth, executive dinner and customer-story program at the SaaSCon industry conference.',
      type: 'trade_show',
      channel: 'events',
      status: 'planning',
      start_date: cel`daysFromNow(27)`,
      end_date: cel`daysFromNow(30)`,
      budgeted_cost: 75000,
      expected_revenue: 1200000,
      target_size: 3000,
      ...campaignMetrics('SaaSCon 2026 Trade Show'),
      is_active: true,
    },
    {
      name: 'Developer Content Marketing Push',
      description: 'Technical blog posts, video tutorials and developer community engagement completed last month.',
      type: 'content',
      channel: 'digital',
      status: 'completed',
      start_date: cel`daysAgo(35)`,
      end_date: cel`daysAgo(4)`,
      budgeted_cost: 40000,
      actual_cost: 25000,
      expected_revenue: 250000,
      target_size: 10000,
      ...campaignMetrics('Developer Content Marketing Push'),
      landing_page_url: 'https://acme.example.com/developers',
      is_active: true,
    },
  ]
});

/**
 * Campaign members are seeded as TWO datasets over one object, split by which
 * side of the junction is populated.
 *
 * Not a stylistic choice: the object has no single natural key (its only text
 * identity is a runtime-owned autonumber), so identity has to be the composite
 * of campaign + member. The loader builds a composite key by joining the
 * per-field values and returns an EMPTY key — no dedupe, so a replay boot
 * re-inserts every row — as soon as ANY component is null. `crm_lead` and
 * `crm_contact` are mutually exclusive by design, so a single
 * `['crm_campaign', 'crm_lead', 'crm_contact']` key would be blank on every
 * row. Splitting the rows by member type gives each dataset a key whose parts
 * are all present.
 */
const memberRecords = (
  kind: 'lead' | 'contact',
): Array<Record<string, unknown>> =>
  Object.entries(CAMPAIGN_MEMBERS).flatMap(([campaign, members]) =>
    members
      .filter((m) => (kind === 'lead' ? m.lead : m.contact))
      .map((m) => ({
        crm_campaign: campaign,
        ...(kind === 'lead' ? { crm_lead: m.lead } : { crm_contact: m.contact }),
        status: m.status,
        added_date: celDaysAgo(m.addedDaysAgo),
        // `has_responded` / `response_date` track the `responded` status
        // exactly — a responded member with no response date is a shape the
        // response-tracking surfaces cannot render.
        has_responded: m.status === 'responded',
        ...(m.respondedDaysAgo !== undefined ? { response_date: celDaysAgo(m.respondedDaysAgo) } : {}),
      })),
  );

const campaignMembersFromLeads = defineSeed(CampaignMember, {
  mode: 'upsert',
  externalId: ['crm_campaign', 'crm_lead'],
  records: memberRecords('lead'),
});

const campaignMembersFromContacts = defineSeed(CampaignMember, {
  mode: 'upsert',
  externalId: ['crm_campaign', 'crm_contact'],
  records: memberRecords('contact'),
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
/**
 * Quote line items, keyed by quote name. The four quotes generated from a deal
 * carry that deal's configuration verbatim — which is exactly what the
 * `quote_generation` flow does when it clones opportunity lines onto a quote.
 */
const QUOTE_LINES: Record<string, readonly LineSpec[]> = {
  'Acme Platform Upgrade Quote': OPPORTUNITY_LINES['Acme Platform Upgrade'],
  'Globex Manufacturing Suite Proposal': OPPORTUNITY_LINES['Globex Manufacturing Suite'],
  'Wayne Enterprise License Quote': OPPORTUNITY_LINES['Wayne Enterprise License'],
  'Initech Cloud Migration Estimate': OPPORTUNITY_LINES['Initech Cloud Migration'],
  // Quoted standalone, before any opportunity existed — and then rejected.
  'Stark Medical Pilot Quote': [
    { product: 'Admin Training Workshop', quantity: 5, unit_price: 6000, description: 'Five workshop days for the pilot clinical teams.' },
    { product: 'Standard Support', quantity: 1, unit_price: 9000, description: 'Standard support for the pilot term.' },
    { product: 'AI Agent Seat (Annual)', quantity: 6, unit_price: 1000, description: 'Agent seats for the pilot coordinators.' },
  ],
};

/**
 * `subtotal` / `discount_amount` / `total_price` for a quote, derived from its
 * lines with `quote_total_rollup`'s own model:
 *
 *   subtotal        = Σ line (quantity × unit_price × (1 − line_discount/100))
 *   discount_amount = subtotal × quote.discount%
 *   total_price     = subtotal − discount_amount + tax + shipping_handling
 *
 * Quote-level `tax` and `shipping_handling` stay manual inputs — the rollup
 * does not derive them either. Everything the rollup DOES own is computed here
 * so that the first edit to a seeded line item recomputes the same numbers
 * instead of visibly correcting them.
 */
const quoteTotals = (
  quoteName: string,
  opts: { discount: number; tax: number; shipping_handling: number },
) => {
  const lines = QUOTE_LINES[quoteName];
  if (!lines) throw new Error(`Seed error: no line items authored for quote "${quoteName}"`);
  const subtotal = linesTotal(lines);
  const discount_amount = Math.round(subtotal * (opts.discount / 100) * 100) / 100;
  const total_price =
    Math.round((subtotal - discount_amount + opts.tax + opts.shipping_handling) * 100) / 100;
  return {
    subtotal,
    discount: opts.discount,
    discount_amount,
    tax: opts.tax,
    shipping_handling: opts.shipping_handling,
    total_price,
  };
};

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
      ...quoteTotals('Acme Platform Upgrade Quote', { discount: 10, tax: 11475, shipping_handling: 0 }),
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
      ...quoteTotals('Globex Manufacturing Suite Proposal', { discount: 5, tax: 38000, shipping_handling: 2500 }),
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
      ...quoteTotals('Wayne Enterprise License Quote', { discount: 15, tax: 81600, shipping_handling: 0 }),
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
      ...quoteTotals('Initech Cloud Migration Estimate', { discount: 0, tax: 6400, shipping_handling: 0 }),
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
      ...quoteTotals('Stark Medical Pilot Quote', { discount: 0, tax: 3600, shipping_handling: 0 }),
      payment_terms: 'net_30',
      description: 'Pilot project quote, rejected due to budget constraints.',
      internal_notes: 'Customer requested re-quote with smaller scope.',
    },
  ]
});

// ─── Quote line items ─────────────────────────────────────────────────
// Same composite-key reasoning as the opportunity lines above: (quote,
// product) is the only natural key this junction-shaped object has.
const quoteLineItems = defineSeed(QuoteLineItem, {
  mode: 'upsert',
  externalId: ['crm_quote', 'crm_product'],
  // `tax_rate` is deliberately left at its 0 default: in this app tax is a
  // QUOTE-level figure (`crm_quote.tax`, applied after the quote-level
  // discount) and `quote_total_rollup` ignores the per-line rate entirely.
  // Seeding a rate here would put a second, contradictory tax number on the
  // record.
  records: lineItemRecords('crm_quote', QUOTE_LINES),
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
// Deeper history: quota-attainment and coverage trends need more than a single
// prior period to plot (#591). These are all SETTLED periods — deliberately so:
// the forecast snapshot sweep upserts on (owner, period) for the CURRENT
// period, so historical rows can never collide with what it writes.
const quarterStartAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastQuarterMonth - 3 * n, 1));
const quarterEndAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastQuarterMonth - 3 * (n - 1), 0));
const monthStartAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastMonth - n, 1));
const monthEndAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastMonth - n + 1, 0));

/** A settled (past) period snapshot: pipeline is gone, only the closed number remains. */
const closedPeriod = (
  period: 'month' | 'quarter',
  start: Date,
  end: Date,
  quota: number,
  closed: number,
  notes: string,
) => ({
  period,
  period_label: period === 'quarter' ? forecastQuarterLabel(start) : forecastMonthLabel(start),
  period_start: forecastIsoDate(start),
  period_end: forecastIsoDate(end),
  snapshot_date: forecastIsoDate(end),
  quota,
  pipeline_amount: 0,
  best_case_amount: 0,
  commit_amount: 0,
  closed_amount: closed,
  source: 'scheduled' as const,
  notes,
});

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
    closedPeriod('quarter', quarterStartAgo(2), quarterEndAgo(2), 1300000, 1196000,
      'Closed at 92% of quota — two enterprise deals slipped into the next quarter.'),
    closedPeriod('quarter', quarterStartAgo(3), quarterEndAgo(3), 1200000, 1308000,
      'Closed at 109% of quota, carried by the enterprise renewal cohort.'),
    closedPeriod('quarter', quarterStartAgo(4), quarterEndAgo(4), 1100000, 1045000,
      'Closed at 95% of quota in the first quarter on the new territory model.'),
    closedPeriod('month', monthStartAgo(1), monthEndAgo(1), 480000, 505000,
      'Closed at 105% of quota; the expansion motion covered a soft new-business month.'),
    closedPeriod('month', monthStartAgo(2), monthEndAgo(2), 460000, 414000,
      'Closed at 90% of quota — summer slowdown across the mid-market segment.'),
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
 *
 * That sweep owns BOTH ownership columns, and it has to (#622). Seed writes
 * run under `{ isSystem: true }`, which by the seeder's documented contract
 * disables the security plugin's auto-injection of `organization_id` /
 * `owner_id` — "seeds either declare those fields explicitly per record" — and
 * per the paragraph above these seeds cannot declare it. So a seeded row can
 * reach the database owned by nobody at the PLATFORM level (`owner_id` null)
 * even though the app's own `owner` lookup later reads as claimed, and under
 * `sharingModel: 'private'` such a row is editable by no one at all, admin
 * included. Nothing here should grow an `owner` / `owner_id` seed value to
 * paper over that: the sweep is the mechanism, and
 * `test/flow-scheduled.test.ts` holds it to claiming both columns.
 */

/** All CRM seed datasets */
export const CrmSeedData = [
  accounts,
  contacts,
  leads,
  opportunities,
  products,
  opportunityLineItems,
  tasks,
  cases,
  campaigns,
  campaignMembersFromLeads,
  campaignMembersFromContacts,
  contracts,
  quotes,
  quoteLineItems,
  forecasts,
  knowledgeArticles,
];
