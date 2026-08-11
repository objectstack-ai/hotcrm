// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Marketing seeds — campaigns and their membership.
 *
 * Reads the sales seeds (`leads`, `opportunities`) because the campaign metric
 * block is DERIVED from them rather than typed in — see `campaignMetrics`.
 *
 * Split out of the former monolithic `src/data/index.ts` (#635). Seed doctrine
 * lives in `./_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Campaign } from '../objects/campaign.object';
import { CampaignMember } from '../objects/campaign_member.object';
import { celDaysAgo } from './_shared';
import { leads, opportunities } from './sales.seed';

// ─── Campaign membership ──────────────────────────────────────────────
/**
 * Campaign members, keyed by campaign name.
 *
 * Membership is the ONLY path from a campaign to a lead — `crm_lead` has no
 * campaign field — so with this table empty (as it was before #591) every
 * campaign reported `num_sent` 0, `response_rate` 0% and no attributed leads
 * at all, whatever the campaign records claimed.
 *
 * Status vocabulary is restricted to the lifecycle values a writer actually
 * produces: `sent` (what the campaign_enrollment flow and the two
 * Add-to-Campaign actions stamp), `responded` (the `mark_responded` action)
 * and `unsubscribed`. The `opened` / `clicked` / `bounced` states and the
 * `first_opened_date` / `first_clicked_date` stamps were REMOVED from the
 * object under #597 — no email-tracking engine exists on the platform, so
 * nothing could ever have written them.
 *
 * `converted` is a live status with a real writer
 * (`campaign_lead_conversion_refresh` promotes a member when its lead's
 * `is_converted` flips) but is deliberately not SEEDED: no seeded lead is
 * converted — conversion is the lead_conversion flow's job at runtime — so a
 * `converted` member would be a member state no lead record backs up.
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
 * The metric block the campaign metric hooks maintain, computed here from the
 * very same inputs they read: the membership table above and the opportunities
 * attributed via `crm_campaign`.
 *
 * Seeding these by hand is what made them wrong before — a hand-typed
 * `actual_revenue` survived untouched until something recomputed, at which
 * point the hook replaced it with the truth and the number "mysteriously"
 * changed. Deriving it here makes the first recompute a no-op instead: same
 * inputs, same arithmetic, same answer.
 *
 * That first recompute now arrives much sooner than it used to. Before #597 the
 * only writer fired on the `→ completed` transition, so these seeded values
 * were the ONLY numbers a live campaign ever showed; today any membership,
 * attribution or conversion change refreshes them (see
 * `src/objects/_campaign-metrics.ts`). The derivation below is therefore a
 * mirror of that module and has to stay one — `test/seed-consistency.test.ts`
 * checks the seeds against it.
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
    // `responded` or `converted`, as in `computeCampaignMetrics`. The seed set
    // holds no `converted` member (see the note on CAMPAIGN_MEMBERS), so the
    // two predicates coincide on this data — spelled the narrow way because
    // widening it here would suggest a seeded state that does not exist.
    num_responses: members.filter((m) => m.status === 'responded').length,
    num_leads: leadKeys.size,
    num_converted_leads: convertedLeads,
    num_opportunities: attributed.length,
    num_won_opportunities: won.length,
    actual_revenue: won.reduce((sum, o) => sum + (typeof o.amount === 'number' ? o.amount : 0), 0),
  };
};

// ─── Campaigns ────────────────────────────────────────────────────────
export const campaigns = defineSeed(Campaign, {
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

export const campaignMembersFromLeads = defineSeed(CampaignMember, {
  mode: 'upsert',
  externalId: ['crm_campaign', 'crm_lead'],
  records: memberRecords('lead'),
});

export const campaignMembersFromContacts = defineSeed(CampaignMember, {
  mode: 'upsert',
  externalId: ['crm_campaign', 'crm_contact'],
  records: memberRecords('contact'),
});
