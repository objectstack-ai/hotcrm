// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Object Definitions Barrel
 * 
 * Re-exports all *.object.ts definitions for auto-registration.
 * Hooks (*.hook.ts) and state machines (*.state.ts) are excluded —
 * they are auto-associated by naming convention at runtime.
 */

/*
 * Canonical note — the collaboration capabilities (`enable.files`,
 * `enable.feeds`). Referenced from each object that opts in (#602).
 *
 * **`enable.files` — attachments. Opt-in, spec default `false`.** It is a real,
 * doubly-enforced switch, not documentation:
 *
 * - Server: `plugin-audit`'s `enforceFilesCapability` runs `beforeInsert` on
 *   `sys_attachment` and throws `FILES_DISABLED` (403) when the row's
 *   `parent_object` does not declare `files: true`. No flag → no attachment can
 *   exist against the record, whatever the UI offers.
 * - Client: the console's `RecordDetailView` gates its Attachments panel on
 *   `enable?.files === true`, so an object without the flag has no upload
 *   surface at all.
 *
 * The flag opens the surface; it grants **no** access of its own. Record-level
 * authority stays with the parent record, enforced by `service-storage`'s
 * attachment hooks: attaching requires `canEdit(parent)`, deleting requires
 * being the uploader *or* `canEdit(parent)`, and reads are rewritten by a
 * middleware that intersects every `sys_attachment` query with the parents the
 * caller can actually see (failing closed to a deny-all filter on error). That
 * is why enabling files needs no new permission-set grant here, and why the
 * insert-only `guest_portal` set gains nothing: it can edit no record, so it
 * can attach to none and see none.
 *
 * Leads are deliberately excluded — attachments on unqualified leads invite
 * junk. Revisit on demand.
 *
 * **`enable.feeds` — record comments (`sys_comment`). Opt-OUT, spec default
 * `true`.** Both enforcement points gate on an explicit `false`
 * (`enforceFeedsCapability` throws `FEEDS_DISABLED` only for `feeds === false`;
 * the console renders the feed unless `enable?.feeds === false`), so every
 * HotCRM object already has comments enabled and authoring `feeds: true` would
 * restate a default rather than change behaviour. Do not add it: an inert
 * restatement is the kind of metadata that later reads as load-bearing.
 * If comments ever need to be switched off for an object, author `false`.
 * `test/collaboration-capabilities.test.ts` pins both halves of this rule.
 *
 * Verified in a live console (#602): the Discussion panel renders on the
 * opportunity and account records, a posted comment round-trips
 * (`POST /api/v1/data/sys_comment` → 201) and survives a reload. Comments do
 * NOT, however, inherit record access the way attachments do — any authenticated
 * org member can read and post on any thread. That is a platform gap, filed as
 * objectstack-ai/objectstack#4630; it is not something this app can close by
 * authoring metadata, and it is the reason the docs describe comments as visible
 * to colleagues rather than scoped to the record's audience.
 */
export { Account } from './account.object';
export { ArticleFeedback } from './article_feedback.object';
export { Campaign } from './campaign.object';
export { CampaignMember } from './campaign_member.object';
export { Case } from './case.object';
export { Contact } from './contact.object';
export { Contract } from './contract.object';
export { Event } from './event.object';
export { EventAttendee } from './event_attendee.object';
export { Forecast } from './forecast.object';
export { KnowledgeArticle } from './knowledge_article.object';
export { Lead } from './lead.object';
export { Opportunity } from './opportunity.object';
export { OpportunityLineItem } from './opportunity_line_item.object';
export { Product } from './product.object';
export { Quote } from './quote.object';
export { QuoteLineItem } from './quote_line_item.object';
export { Task } from './task.object';
