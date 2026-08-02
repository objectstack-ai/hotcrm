// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales seeds — accounts, contacts, leads, opportunities and their line items.
 *
 * Split out of the former monolithic `src/data/index.ts` (#635). Seed doctrine
 * lives in `./_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Account } from '../objects/account.object';
import { Contact } from '../objects/contact.object';
import { Lead } from '../objects/lead.object';
import { Opportunity } from '../objects/opportunity.object';
import { OpportunityLineItem } from '../objects/opportunity_line_item.object';
import { celDaysAgo, linesTotal, type LineSpec } from './_shared';
import { lineItemRecords } from './catalog.seed';

// ─── Accounts ─────────────────────────────────────────────────────────
//
// `billing_address` is load-bearing demo data, not decoration (#638). The two
// territory sharing rules filter on `crm_account.billing_country` — the flat
// projection `account_protection` derives from `billing_address.country` — so
// an account with no address belongs to no territory. Until now not one seeded
// account carried an address, which meant #621 shipped two territory rules
// that installed correctly and then matched zero records: Setup listed two
// territories with nothing behind them.
//
// The nine accounts partition deliberately across all THREE outcomes the rules
// can produce, so a demo shows the split instead of asserting it:
//
//   north_america_territory  ["US","CA","MX"]            → 6  (5 × US, 1 × CA)
//   europe_territory         ["UK","DE","FR","IT","ES"]  → 2  (DE, UK)
//   neither territory                                     → 1  (SG)
//
// `country` carries the 2-LETTER CODE the rules match on. The projection trims
// and upper-cases; it does not translate, so 'United States' would silently
// land an account outside every territory. `UK` rather than the ISO `GB` for
// the same reason — that is the code the europe rule is authored against (see
// the `billing_country` note in `src/objects/account.object.ts`).
//
// `billing_country` itself is deliberately NOT authored here. Hooks DO run
// over seed writes (#617, corrected in `./_shared.ts`), so the projection is
// computed at seed time; the field is `readonly` and hook-owned, and a
// hand-copied value would be a second source of truth for something
// `account_protection` already maintains — the exact drift the doctrine block
// exists to prevent. `test/territory-seed-coverage.test.ts` pins the dependency
// from the other side: every seeded address must carry a country the
// projection can turn into the territory bucket claimed above.
//
// Phone numbers moved with the addresses: a Munich account answering a Denver
// number is the kind of incoherence an evaluator notices before the feature.
export const accounts = defineSeed(Account, {
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
      billing_address: { street: '500 Howard Street, Suite 400', city: 'San Francisco', state: 'CA', postalCode: '94105', country: 'US' },
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
      billing_address: { street: '233 South Wacker Drive', city: 'Chicago', state: 'IL', postalCode: '60606', country: 'US' },
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
      billing_address: { street: '1 Liberty Plaza, 23rd Floor', city: 'New York', state: 'NY', postalCode: '10006', country: 'US' },
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
      // The one Canadian account: still inside north_america_territory, and the
      // reason that rule's `$in` list is not a single-country list in disguise.
      phone: '+1-416-555-0400',
      billing_address: { street: '181 Bay Street, Suite 2200', city: 'Toronto', state: 'ON', postalCode: 'M5J 2T3', country: 'CA' },
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
      billing_address: { street: '3000 Hanover Street', city: 'Palo Alto', state: 'CA', postalCode: '94304', country: 'US' },
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
      // europe_territory, half 1: DE.
      phone: '+49-89-5550-0600',
      billing_address: { street: 'Leopoldstrasse 21', city: 'Munich', state: 'BY', postalCode: '80802', country: 'DE' },
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
      billing_address: { street: '600 Congress Avenue, Floor 14', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
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
      // europe_territory, half 2: UK — the code the rule names, not ISO `GB`.
      // No `state`: an address without a subdivision is a normal shape, and the
      // projection only ever reads `country`.
      phone: '+44-20-7946-0800',
      billing_address: { street: '20 Fenchurch Street', city: 'London', postalCode: 'EC3M 3BY', country: 'UK' },
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
      // Outside BOTH territories on purpose: without a record that matches
      // neither rule, "the rules partition the accounts" is unfalsifiable —
      // a match-all regression would look identical to a working one.
      phone: '+65-6555-0900',
      billing_address: { street: '10 Marina Boulevard, #30-01', city: 'Singapore', postalCode: '018983', country: 'SG' },
      website: 'https://apexlogistics.example.com',
      tier: 'enterprise',
      segment: 'net_new',
      last_activity_date: cel`daysAgo(9)`,
      description: 'A fast-growing logistics provider assessing a modern data hub for its operations and commercial teams.',
    },
  ]
});

// ─── Contacts ─────────────────────────────────────────────────────────
export const contacts = defineSeed(Contact, {
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

export const leads = defineSeed(Lead, {
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
export const OPPORTUNITY_LINES: Record<string, readonly LineSpec[]> = {
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
export const opportunities = defineSeed(Opportunity, {
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

// ─── Opportunity line items ───────────────────────────────────────────
// Identity is the COMPOSITE natural key (opportunity, product): the object has
// no single natural key — no name, and `line_number` is only unique within a
// parent — and a junction-shaped dataset without one can only run
// `mode: 'insert'`, which re-inserts every row on each replay boot and
// duplicates the table (framework#3434). The loader matches composite key
// fields by their RESOLVED ids, so this dedupes correctly across restarts.
// The practical constraint it imposes: a product appears at most once per
// deal, which is how these lines are authored anyway.
export const opportunityLineItems = defineSeed(OpportunityLineItem, {
  mode: 'upsert',
  externalId: ['crm_opportunity', 'crm_product'],
  records: lineItemRecords('crm_opportunity', OPPORTUNITY_LINES),
});
