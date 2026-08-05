// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * CRM Seed Data — the aggregating export.
 *
 * Demo records for all core CRM objects, authored per object family in the
 * `*.seed.ts` modules below and collected here as the single `CrmSeedData`
 * array `objectstack.config.ts` registers. Uses `defineSeed()` for type-safe
 * field name checking at compile time.
 *
 * The families were one 100KB module until #635: it sat ~1.5KB under the
 * `pnpm hygiene` byte cap, so the next demo record — the billing addresses of
 * #638 — would have failed the build, and the cheapest way out would have been
 * deleting the explanatory comments the cap exists to protect. Where to add a
 * record now follows from the object:
 *
 *   - `_shared.ts`      seed doctrine + helpers used by more than one family
 *   - `catalog.seed.ts` products, and the catalogue price lookup
 *   - `sales.seed.ts`   accounts, contacts, leads, opportunities, opp lines
 *   - `service.seed.ts` tasks, cases, knowledge articles, events + attendees
 *   - `marketing.seed.ts` campaigns, campaign members
 *   - `revenue.seed.ts` contracts, quotes, quote lines, forecasts
 */
import { products } from './catalog.seed';
import { accounts, contacts, leads, opportunities, opportunityLineItems } from './sales.seed';
import {
  tasks,
  cases,
  knowledgeArticles,
  events,
  eventAttendeesFromContacts,
  eventAttendeesFromLeads,
} from './service.seed';
import { campaigns, campaignMembersFromLeads, campaignMembersFromContacts } from './marketing.seed';
import { contracts, quotes, quoteLineItems, forecasts } from './revenue.seed';

/**
 * Ownership and CRM positions are NOT seeded here — they can't be.
 *
 * A seed can't name a user. Lookup values are resolved against the target's
 * externalId and that only works for objects in the app's own graph, so
 * `owner_id: 'Dev Admin'` would store the literal string rather than an id (verified:
 * a `sys_user_position` row seeded that way is unmatchable by the real user
 * id), and `cel\`os.user.id\`` inside a seed evaluates to nothing. The id does
 * not exist until first boot.
 *
 * The `demo_bootstrap` scheduled flow (`src/flows/demo-bootstrap.flow.ts`)
 * does it at the only moment it can: once the first real user exists, its
 * periodic sweep claims every ownerless seeded record for that user.
 *
 * That sweep owns the app's ONE ownership column, `owner_id` (#548 retired the
 * app-authored `owner` lookup that used to sit beside it — the #622 split).
 * Seed writes run under `{ isSystem: true }`, which short-circuits the security
 * middleware, so its insert-time auto-stamp of `owner_id` never fires — "seeds
 * either declare those fields explicitly per record" — and per the paragraph
 * above these seeds cannot declare it. So a seeded row reaches the database
 * owned by nobody at the PLATFORM level (`owner_id` null), and under
 * `sharingModel: 'private'` such a row is editable by no one at all, admin
 * included. Nothing here should grow an `owner_id` seed value to paper over
 * that: the sweep is the mechanism, and `test/flow-scheduled.test.ts` holds it
 * to leaving no claimed object ownerless.
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
  // Events come after the five objects their `related_to_*` lookups resolve
  // against (accounts, contacts, leads, opportunities, cases); the attendee
  // junctions come after the events they hang off.
  events,
  eventAttendeesFromContacts,
  eventAttendeesFromLeads,
  campaigns,
  campaignMembersFromLeads,
  campaignMembersFromContacts,
  contracts,
  quotes,
  quoteLineItems,
  forecasts,
  knowledgeArticles,
];
