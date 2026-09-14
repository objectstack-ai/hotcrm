// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Activity seeds — the task list and the interaction log.
 *
 * `crm_task`, `crm_event` and `crm_event_attendee` are the activity layer over
 * every object in the app (accounts, opportunities AND cases), which is why
 * plan item 4 folds them into the app package rather than giving activities a
 * module of their own: "activities are a cross-cutting capability no customer
 * buys separately". Their rows were authored in `src/data/service.seed.ts`,
 * beside the cases they most often hang off; those cases are now
 * `src/service/data/service.seed.ts` and are referenced from here by natural
 * key exactly as before, with the replay order held by the root config.
 *
 * Seed doctrine lives in `./_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Task } from '../objects/task.object';
import { Event } from '../objects/event.object';
import { EventAttendee } from '../objects/event_attendee.object';
import { celDaysAgo } from './_shared';

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
      // The workshop this task asks someone to book is ALREADY on the
      // calendar: the `Acme — AI agent governance workshop` event lower in
      // this file is `planned` at daysFromNow(6), and the attendee builder
      // dates its invitation `daysAgo(max(-6 + invitedDaysBefore(9), 0))` =
      // daysAgo(3) — already sent, and already answered `tentative`. So the
      // booking task is DONE, and it was done the day the invitation went
      // out. An open "schedule it" task beside a booked-and-invited meeting
      // is the contradiction itself, not a due date to nudge (#1660).
      //
      // The EVENT owns the workshop's date. Nothing here restates it — both
      // dates below derive from the invitation instant — so there is no
      // second copy to drift out of step.
      subject: 'Acme — schedule AI governance workshop',
      description: 'Block a 90-min joint workshop with Acme’s compliance team to walk through how HotCRM agents handle data scoping, RBAC, audit trails, and human-in-the-loop. Pre-read: ADR-0007 + the governance demo deck.',
      status: 'completed',
      priority: 'high',
      priority_rank: 3,
      due_date: cel`daysAgo(3)`,
      completed_date: cel`daysAgo(3)`,
      // Hooks don't run over seeds — mirror what task_completion would stamp.
      is_completed: true,
      progress_percent: 100,
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

// ─── Events & attendees: the interaction log ──────────────────────────
//
// #592 shipped the activity model — `crm_event`, `crm_event_attendee`, the
// per-object log/schedule actions, the `event_metrics` cube and the Sales
// Activity dashboard — and deliberately left the demo rows to this issue
// (#671). Until now the demo booted with the whole model installed and not one
// row in it: every widget on that dashboard read 0, the calendar and
// interaction-history views were empty, and the three churn tiles had nothing
// to stratify.
//
// # Time is authored in CEL, never in TypeScript
//
// `start_datetime` / `end_datetime` are `cel` expressions
// (`daysAgo(12) + duration("9h0m")`), resolved by the seed loader at BOOT.
// Plain-TS dates would freeze into `dist/objectstack.json` at BUILD time, and a
// published artifact would ship a calendar that ages out — the same hazard
// `test/analytics-integrity.test.ts` guards on report filters. `daysAgo()`
// alone returns UTC midnight, which is why the duration term is there: a
// calendar object whose every row starts at 00:00 is a calendar nobody would
// demo.
//
// # A `held` event stamps TODAY on its account — that is the whole layout rule
//
// Lifecycle hooks run over seed writes (#617), so `event_activity_bubble` fires
// on these inserts and stamps `crm_account.last_activity_date` /
// `crm_contact.last_contacted_date` / `crm_lead.last_contacted_date` with the
// SEED MOMENT — not with the event's own timestamp. Nothing here can make an
// account look quiet AND give it a held interaction; the two are the same
// column. So the quiet accounts of `sales.seed.ts` carry only `planned`,
// `cancelled` and `no_show` rows, none of which bubble, and the accounts that
// do carry held rows are authored at `today()` there. The long note beside the
// account records states the boundary; `test/activity-seed-coverage.test.ts`
// recomputes the bubble's own reachability over these rows and fails if a held
// event ever reaches an account the churn tiles depend on.
//
// # Upsert identity is `subject`
//
// Same choice as `crm_task` and `crm_case` above, and it carries the same known
// cost: a user who logs an interaction under a subject this file also uses
// would have their row adopted (and overwritten) by the next re-seed. The
// forecast seeds escape that with a dedicated `seed_key` column (#613), which
// is an OBJECT change and out of this issue's scope; the subjects below are
// long and account-specific so the collision needs deliberate effort, and the
// two activity-shaped objects that came before already accept the same trade.
// No collision exists with the runtime writer's own rows: `log_call` /
// `log_meeting` / `schedule_meeting` insert with an explicit `owner_id`
// (`src/actions/global.actions.ts`), so they are never ownerless and
// `demo_bootstrap`'s claim sweep never sees them — the "one producer per
// window" question #702 raised, answered for this object.

/** Which `related_to_*` lookup carries each `related_to_type`. */
const EVENT_RELATED_FIELD = {
  crm_account: 'related_to_account',
  crm_contact: 'related_to_contact',
  crm_opportunity: 'related_to_opportunity',
  crm_lead: 'related_to_lead',
  crm_case: 'related_to_case',
} as const;

type EventRelatedType = keyof typeof EVENT_RELATED_FIELD;

type AttendeeSpec = {
  /** Contact email — the contact dataset's externalId. Exclusive with `lead`. */
  readonly contact?: string;
  /** Lead email — the lead dataset's externalId. */
  readonly lead?: string;
  readonly response: 'accepted' | 'declined' | 'tentative' | 'no_response';
};

type EventSpec = {
  readonly subject: string;
  readonly type: 'meeting' | 'call' | 'demo' | 'webinar' | 'onsite_visit' | 'other';
  readonly status: 'held' | 'planned' | 'cancelled' | 'no_show';
  /** Days before boot. NEGATIVE means that many days AFTER boot. */
  readonly daysAgo: number;
  /** UTC wall clock the slot opens at: `[hour, minute]`. */
  readonly at: readonly [number, number];
  /** Slot length in minutes — the gap between start and end on the calendar. */
  readonly minutes: number;
  readonly relatedType: EventRelatedType;
  /** Natural key of the related record (that dataset's externalId). */
  readonly relatedKey: string;
  /**
   * Account natural key, when the related record hangs off one. Authored on the
   * event as well as implied through the parent — same shape the task seeds
   * use, and it is what puts the row in the ACCOUNT's activity related list.
   */
  readonly account?: string;
  readonly location?: string;
  readonly description?: string;
  readonly outcome?: string;
  readonly attendees: readonly AttendeeSpec[];
  /** Days before the event the invitation went out. Defaults to 3. */
  readonly invitedDaysBefore?: number;
};

/**
 * A wall-clock instant on a day relative to the boot date.
 *
 * `daysAgo(n)` / `daysFromNow(n)` both return UTC midnight of that calendar
 * day, and CEL timestamp + duration arithmetic is what puts a real time on it.
 */
const celClock = (daysAgo: number, hour: number, minute: number) => {
  const clock = `${hour}h${minute}m`;
  return daysAgo >= 0
    ? cel`daysAgo(${daysAgo}) + duration(${clock})`
    : cel`daysFromNow(${-daysAgo}) + duration(${clock})`;
};

/**
 * The interaction log.
 *
 * `held` rows span all five `related_to_type` values and five of the six
 * `type` values across roughly nine weeks, because that is what the Sales
 * Activity dashboard reads: the mix donut groups by `type`, the "where the
 * activity lands" bar groups by `related_to_type`, and the volume area chart
 * buckets `start_datetime` by week. A block of rows in one week on one parent
 * would light every widget up while proving none of them.
 */
const EVENT_SPECS: readonly EventSpec[] = [
  // ─── Acme Corporation — the hero account, worked across every parent ────
  {
    subject: 'Acme — Enterprise edition walkthrough',
    type: 'demo', status: 'held', daysAgo: 2, at: [10, 0], minutes: 60,
    relatedType: 'crm_opportunity', relatedKey: 'Acme Platform Upgrade', account: 'Acme Corporation',
    location: 'Zoom',
    outcome: 'Walked the Ops team through agent governance and the analytics seats. Revised proposal to follow this week.',
    attendees: [{ contact: 'john.smith@acme.example.com', response: 'accepted' }],
  },
  {
    subject: 'Acme — proposal follow-up call',
    type: 'call', status: 'held', daysAgo: 5, at: [15, 30], minutes: 25,
    relatedType: 'crm_contact', relatedKey: 'john.smith@acme.example.com', account: 'Acme Corporation',
    outcome: 'Procurement wants an 18-month term. Pricing to be re-cut before the governance workshop.',
    attendees: [{ contact: 'john.smith@acme.example.com', response: 'accepted' }],
  },
  {
    subject: 'Acme — AI governance scoping session',
    type: 'meeting', status: 'held', daysAgo: 12, at: [9, 0], minutes: 90,
    relatedType: 'crm_account', relatedKey: 'Acme Corporation',
    location: 'Google Meet',
    outcome: 'Agreed the workshop agenda: data scoping, RBAC, audit trails, human-in-the-loop.',
    attendees: [{ contact: 'john.smith@acme.example.com', response: 'accepted' }],
  },
  {
    subject: 'Acme — login incident status call',
    type: 'call', status: 'held', daysAgo: 16, at: [8, 30], minutes: 20,
    relatedType: 'crm_case', relatedKey: 'Login issues after platform upgrade', account: 'Acme Corporation',
    outcome: 'Confirmed the EMEA SSO clock-skew hypothesis; engineering reproducing in staging.',
    attendees: [{ contact: 'john.smith@acme.example.com', response: 'accepted' }],
  },
  {
    subject: 'Acme — renewal signature review',
    type: 'meeting', status: 'held', daysAgo: 20, at: [14, 0], minutes: 45,
    relatedType: 'crm_opportunity', relatedKey: 'Acme Annual Renewal 2025', account: 'Acme Corporation',
    outcome: 'Signed two weeks ahead of the renewal date. Multi-year deferred to the upgrade decision.',
    attendees: [{ contact: 'john.smith@acme.example.com', response: 'accepted' }],
  },
  {
    subject: 'Acme — San Francisco HQ business review',
    type: 'onsite_visit', status: 'held', daysAgo: 33, at: [13, 0], minutes: 120,
    relatedType: 'crm_account', relatedKey: 'Acme Corporation',
    location: '500 Howard Street, Suite 400, San Francisco',
    outcome: 'Quarterly review with the CTO org. Expansion into the EMEA team confirmed as the next motion.',
    attendees: [{ contact: 'john.smith@acme.example.com', response: 'accepted' }],
  },

  // ─── Wayne Enterprises — a deal in negotiation ──────────────────────────
  {
    subject: 'Wayne — enterprise license negotiation',
    type: 'meeting', status: 'held', daysAgo: 3, at: [16, 0], minutes: 60,
    relatedType: 'crm_opportunity', relatedKey: 'Wayne Enterprise License', account: 'Wayne Enterprises',
    location: 'Zoom',
    outcome: 'Volume tier agreed at 20 tenants. Security addendum is the last open item.',
    attendees: [{ contact: 'rwilson@wayne.example.com', response: 'accepted' }],
  },
  {
    subject: 'Wayne — security addendum walkthrough',
    type: 'call', status: 'held', daysAgo: 8, at: [11, 0], minutes: 30,
    relatedType: 'crm_contact', relatedKey: 'rwilson@wayne.example.com', account: 'Wayne Enterprises',
    outcome: 'Legal to return redlines within the week.',
    attendees: [{ contact: 'rwilson@wayne.example.com', response: 'accepted' }],
  },
  {
    subject: 'Wayne — platform governance webinar',
    type: 'webinar', status: 'held', daysAgo: 26, at: [15, 0], minutes: 60,
    relatedType: 'crm_account', relatedKey: 'Wayne Enterprises',
    location: 'https://acme.example.com/webinars/governance',
    outcome: 'Four business units attended; two asked for their own rollout plan.',
    attendees: [{ contact: 'rwilson@wayne.example.com', response: 'accepted' }],
  },
  {
    subject: 'Wayne — bulk import rollout check-in',
    type: 'call', status: 'held', daysAgo: 45, at: [10, 30], minutes: 25,
    relatedType: 'crm_case', relatedKey: 'Request: bulk import via CSV', account: 'Wayne Enterprises',
    outcome: 'CSV import shipped and documented; the customer closed the request out on the call.',
    attendees: [{ contact: 'rwilson@wayne.example.com', response: 'accepted' }],
  },

  // ─── Vertex Analytics — expansion, then an enterprise rollout ───────────
  {
    subject: 'Vertex — rollout phasing and data residency',
    type: 'meeting', status: 'held', daysAgo: 1, at: [9, 30], minutes: 75,
    relatedType: 'crm_opportunity', relatedKey: 'Vertex Enterprise Rollout', account: 'Vertex Analytics',
    location: 'Zoom',
    outcome: 'Phase 1 scoped to four regions. Residency controls to be confirmed with their security team.',
    attendees: [{ contact: 'ethan.brooks@vertex.example.com', response: 'accepted' }],
  },
  {
    subject: 'Vertex — revenue analytics demo',
    type: 'demo', status: 'held', daysAgo: 10, at: [14, 30], minutes: 45,
    relatedType: 'crm_opportunity', relatedKey: 'Vertex Analytics Expansion', account: 'Vertex Analytics',
    location: 'Zoom',
    outcome: 'Sales, marketing and service leads all asked for their own workspace — the expansion case makes itself.',
    attendees: [{ contact: 'ethan.brooks@vertex.example.com', response: 'accepted' }],
  },
  {
    subject: 'Vertex — expansion buying committee call',
    type: 'call', status: 'held', daysAgo: 19, at: [16, 30], minutes: 30,
    relatedType: 'crm_contact', relatedKey: 'ethan.brooks@vertex.example.com', account: 'Vertex Analytics',
    outcome: 'CRO owns the budget; the data team stays the technical sponsor.',
    attendees: [{ contact: 'ethan.brooks@vertex.example.com', response: 'accepted' }],
  },
  {
    subject: 'Vertex — developer platform retrospective',
    type: 'meeting', status: 'held', daysAgo: 38, at: [11, 0], minutes: 60,
    relatedType: 'crm_account', relatedKey: 'Vertex Analytics',
    outcome: 'Three product teams live on the developer platform; usage analytics is the next ask.',
    attendees: [{ contact: 'ethan.brooks@vertex.example.com', response: 'accepted' }],
  },

  // ─── Stark Medical — the partner motion ────────────────────────────────
  {
    subject: 'Stark Medical — Toronto clinical operations visit',
    type: 'onsite_visit', status: 'held', daysAgo: 52, at: [9, 0], minutes: 180,
    relatedType: 'crm_account', relatedKey: 'Stark Medical',
    location: '181 Bay Street, Suite 2200, Toronto',
    outcome: 'Two clinical service lines live on the pilot. Device-servicing expansion parked on budget.',
    attendees: [{ contact: 'emily.d@starkmed.example.com', response: 'accepted' }],
  },

  // ─── Leads: the only held rows that touch a prospect's own clock ────────
  {
    subject: 'CloudFirst — qualification call with Lisa Thompson',
    type: 'call', status: 'held', daysAgo: 1, at: [11, 0], minutes: 30,
    relatedType: 'crm_lead', relatedKey: 'lisa.t@cloudfirst.example.com',
    outcome: 'Budget confirmed and a technical evaluation agreed — qualified.',
    attendees: [{ lead: 'lisa.t@cloudfirst.example.com', response: 'accepted' }],
  },
  {
    subject: 'EduTech Labs — discovery call with David Kim',
    type: 'call', status: 'held', daysAgo: 4, at: [13, 0], minutes: 30,
    relatedType: 'crm_lead', relatedKey: 'dkim@edutechlabs.example.com',
    outcome: 'Replacing spreadsheets across admissions. Referral source confirmed.',
    attendees: [{ lead: 'dkim@edutechlabs.example.com', response: 'accepted' }],
  },

  // ─── Booked, not held: the calendar ahead ───────────────────────────────
  // These are what `status` exists for. Not one of them moves a recency clock,
  // and the three re-engagement rows below sit on the accounts the churn tiles
  // count — which is the demonstration, not an oversight.
  {
    subject: 'Acme — AI agent governance workshop',
    type: 'meeting', status: 'planned', daysAgo: -6, at: [9, 0], minutes: 90,
    relatedType: 'crm_opportunity', relatedKey: 'Acme Platform Upgrade', account: 'Acme Corporation',
    location: 'Google Meet',
    description: 'Joint workshop with Acme compliance: data scoping, RBAC, audit trails, human-in-the-loop.',
    attendees: [{ contact: 'john.smith@acme.example.com', response: 'tentative' }],
    invitedDaysBefore: 9,
  },
  {
    subject: 'Wayne — procurement signature call',
    type: 'meeting', status: 'planned', daysAgo: -1, at: [11, 0], minutes: 30,
    relatedType: 'crm_opportunity', relatedKey: 'Wayne Enterprise License', account: 'Wayne Enterprises',
    description: 'Confirm the signature date once the security addendum is closed.',
    attendees: [{ contact: 'rwilson@wayne.example.com', response: 'accepted' }],
    invitedDaysBefore: 4,
  },
  {
    subject: 'Globex — manufacturing suite demo',
    type: 'demo', status: 'planned', daysAgo: -5, at: [15, 0], minutes: 60,
    relatedType: 'crm_opportunity', relatedKey: 'Globex Manufacturing Suite', account: 'Globex Industries',
    location: 'Zoom',
    description: 'Plant-operations demo for the six-site rollout, ahead of the qualification review.',
    attendees: [{ contact: 'sarah.j@globex.example.com', response: 'accepted' }],
    invitedDaysBefore: 8,
  },
  {
    subject: 'Lattice — renewal proposal review',
    type: 'meeting', status: 'planned', daysAgo: -3, at: [10, 0], minutes: 45,
    relatedType: 'crm_opportunity', relatedKey: 'Lattice Education Renewal', account: 'Lattice Education',
    description: 'Walk procurement through the two-year option before the executive sponsor meeting.',
    attendees: [{ contact: 'priya.shah@lattice.example.com', response: 'accepted' }],
    invitedDaysBefore: 6,
  },
  {
    subject: 'Initech — re-engagement call before renewal',
    type: 'call', status: 'planned', daysAgo: -2, at: [14, 0], minutes: 30,
    relatedType: 'crm_account', relatedKey: 'Initech Solutions',
    description: 'Nobody has spoken to Initech in ten weeks and the renewal is 75 days out. Re-open the relationship.',
    attendees: [{ contact: 'mchen@initech.example.com', response: 'no_response' }],
    invitedDaysBefore: 5,
  },
  {
    subject: 'Northwind — grid modernization discovery workshop',
    type: 'meeting', status: 'planned', daysAgo: -7, at: [9, 30], minutes: 120,
    relatedType: 'crm_opportunity', relatedKey: 'Northwind Grid Modernization', account: 'Northwind Energy',
    location: 'Leopoldstrasse 21, Munich',
    description: 'Confirm discovery participants and agree the operational-data assessment scope.',
    attendees: [{ contact: 'olivia.chen@northwind.example.com', response: 'tentative' }],
    invitedDaysBefore: 10,
  },
  {
    subject: 'Apex Logistics — data hub re-engagement call',
    type: 'call', status: 'planned', daysAgo: -4, at: [16, 0], minutes: 30,
    relatedType: 'crm_account', relatedKey: 'Apex Logistics',
    description: 'The data-hub evaluation has been silent for a quarter. Re-establish the commercial sponsor.',
    attendees: [{ contact: 'marcus.reed@apexlogistics.example.com', response: 'no_response' }],
    invitedDaysBefore: 6,
  },
  {
    subject: 'NextGen Retail — first discovery call with Alice Martinez',
    type: 'call', status: 'planned', daysAgo: -2, at: [15, 0], minutes: 30,
    relatedType: 'crm_lead', relatedKey: 'alice@nextgenretail.example.com',
    description: 'Inbound web lead, booked on her follow-up date.',
    attendees: [{ lead: 'alice@nextgenretail.example.com', response: 'no_response' }],
    invitedDaysBefore: 3,
  },

  // ─── Neither held nor booked ────────────────────────────────────────────
  // `duration_minutes` is 0 on both, exactly as `event_schedule_derive`
  // recomputes it: a meeting nobody attended occupies nobody's time, while the
  // calendar slot it was booked into stays on the record as evidence of the
  // attempt.
  {
    subject: 'Globex — line expansion review',
    type: 'meeting', status: 'cancelled', daysAgo: 30, at: [14, 0], minutes: 60,
    relatedType: 'crm_opportunity', relatedKey: 'Globex Line Expansion (Lost)', account: 'Globex Industries',
    description: 'Cancelled by the customer: the incumbent MES vendor had already bundled the two lines.',
    attendees: [{ contact: 'sarah.j@globex.example.com', response: 'declined' }],
    invitedDaysBefore: 7,
  },
  {
    subject: 'Initech — SSO configuration check-in',
    type: 'call', status: 'no_show', daysAgo: 55, at: [10, 0], minutes: 30,
    relatedType: 'crm_account', relatedKey: 'Initech Solutions',
    description: 'Customer did not join. The last attempt to reach Initech before the account went quiet.',
    attendees: [{ contact: 'mchen@initech.example.com', response: 'no_response' }],
    invitedDaysBefore: 4,
  },
];

/** `[hour, minute]` plus `minutes`, as the end-of-slot wall clock. */
const endClock = (spec: EventSpec): readonly [number, number] => {
  const total = spec.at[0] * 60 + spec.at[1] + spec.minutes;
  return [Math.floor(total / 60), total % 60];
};

export const events = defineSeed(Event, {
  mode: 'upsert',
  externalId: 'subject',
  records: EVENT_SPECS.map((spec) => {
    const [endHour, endMinute] = endClock(spec);
    return {
      subject: spec.subject,
      type: spec.type,
      status: spec.status,
      start_datetime: celClock(spec.daysAgo, spec.at[0], spec.at[1]),
      end_datetime: celClock(spec.daysAgo, endHour, endMinute),
      // Authored rather than left to the hook, and authored to the value the
      // hook computes: `event_schedule_derive` measures the gap between the two
      // timestamps above, then zeroes it for a cancelled / no-show row. Both
      // branches agree with this literal, so the figure is right whether or not
      // hooks fire over the seed write (`./_shared.ts`, doctrine rule 2).
      duration_minutes: spec.status === 'cancelled' || spec.status === 'no_show' ? 0 : spec.minutes,
      all_day: false,
      related_to_type: spec.relatedType,
      [EVENT_RELATED_FIELD[spec.relatedType]]: spec.relatedKey,
      // The account link is authored on every row that has one, including rows
      // whose `related_to_type` is the contact / opportunity / case — the same
      // shape the task seeds use, and what fills the ACCOUNT's activity list.
      ...(spec.account && spec.relatedType !== 'crm_account'
        ? { related_to_account: spec.account }
        : {}),
      ...(spec.location ? { location: spec.location } : {}),
      ...(spec.description ? { description: spec.description } : {}),
      ...(spec.outcome ? { outcome_notes: spec.outcome } : {}),
      // No `owner_id`: a seed cannot name a user (see `src/data/index.ts`), so
      // these rows land ownerless and `demo_bootstrap` claims them — which is
      // why `crm_event` is in that flow's CLAIMED_OBJECTS (#671).
    };
  }),
});

/**
 * Attendees, seeded as TWO datasets over one object, split by which party
 * lookup is populated — the same construction, for the same reason, as
 * `campaignMembersFromLeads` / `campaignMembersFromContacts`: the loader's
 * composite key is EMPTY when any component is null, which silently disables
 * dedupe and re-inserts every row on each replay boot.
 *
 * There is no third dataset for `sys_user` attendees, and no `is_organizer:
 * true` row anywhere below. The organiser of every one of these meetings is the
 * rep — a `sys_user` — and a seed cannot name a user: lookup values resolve
 * against the target's externalId, which only works inside the app's own
 * object graph. `global.actions.ts` adds the organiser row at runtime, where
 * the id exists. Nothing is invented here to stand in for it.
 *
 * # The external guest, revisited (#740)
 *
 * #671 seeded no external-only attendee for a reason that has now EXPIRED, and
 * the note is updated rather than deleted because the reason was a defect, not
 * a taste: `attendee_type` had no `external` value, so the only way to store a
 * guest who is in no CRM object was to file the row under `contact` and leave
 * `crm_contact` empty — a seed that lies about its own discriminator. #740 added
 * the fourth option and made `attendee_resolves` / `attendee_type_exclusive`
 * enforce the pairing, so `{ attendee_type: 'external', external_name: "…" }` is
 * now an honest, accepted row and seeding one is legitimate.
 *
 * It is still not seeded, on the narrower ground that survives: every row below
 * is drawn from a seeded contact or lead so the demo's related lists and churn
 * tiles hang together, and an invented outside counsel would buy a third
 * dataset (its own `externalId: ['crm_event', 'external_name']`, since the
 * loader's composite key is empty when a component is null) for one decorative
 * row that no view, cube or dashboard reads. The capability is proven where the
 * question actually is — on the real engine, in
 * `test/attendee-type-resolution.test.ts` — not in the fixture book. Add one
 * here the day a demo scenario genuinely has a guest in the room; nothing in
 * the metadata stands in the way any more.
 */
const attendeeRecords = (kind: 'contact' | 'lead') =>
  EVENT_SPECS.flatMap((spec) =>
    spec.attendees
      .filter((a) => (kind === 'lead' ? a.lead : a.contact))
      .map((a) => ({
        crm_event: spec.subject,
        attendee_type: kind,
        ...(kind === 'lead' ? { crm_lead: a.lead } : { crm_contact: a.contact }),
        response: a.response,
        is_organizer: false,
        // The invitation predates the slot. Clamped at 0 so a meeting booked
        // for the day after tomorrow was invited today, never tomorrow.
        invited_date: celDaysAgo(Math.max(spec.daysAgo + (spec.invitedDaysBefore ?? 3), 0)),
      })),
  );

export const eventAttendeesFromContacts = defineSeed(EventAttendee, {
  mode: 'upsert',
  externalId: ['crm_event', 'crm_contact'],
  records: attendeeRecords('contact'),
});

export const eventAttendeesFromLeads = defineSeed(EventAttendee, {
  mode: 'upsert',
  externalId: ['crm_event', 'crm_lead'],
  records: attendeeRecords('lead'),
});
