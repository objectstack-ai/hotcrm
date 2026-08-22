// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { SelectOption } from '@objectstack/spec/data';

/**
 * Canonical picklist value sets shared across objects, flows, and actions.
 *
 * Several fields carry the same business vocabulary on more than one object
 * (`lead_source` on Lead/Contact/Opportunity, `industry` on Lead/Account,
 * `salutation` on Lead/Contact, `payment_terms` on Quote/Contract), and a few
 * flows/actions re-declare an object's own options inline (Task `type` in the
 * schedule_followup screen, Opportunity `stage` in mass_update_stage). Each
 * copy drifted independently (#490): the lead_conversion flow copies
 * `leadRecord.industry` / `leadRecord.lead_source` verbatim onto the created
 * Account/Opportunity, so any Lead-only value (`logistics`, `webinar`, …)
 * became an illegal enum value on the target object.
 *
 * Declaring the set ONCE here and spreading it into every declaration keeps
 * the vocabularies identical by construction. Cross-object copies (flows,
 * conversion mappings) are then always legal.
 *
 * NOTE: spread (`[...X]`) at every use site so each ObjectSchema gets its own
 * array instance — schemas must not alias one another's metadata.
 */

/** Salutation — Lead + Contact. Superset (incl. `prof`, formerly Contact-only). */
export const SALUTATION_OPTIONS: SelectOption[] = [
  { label: 'Mr.', value: 'mr' },
  { label: 'Ms.', value: 'ms' },
  { label: 'Mrs.', value: 'mrs' },
  { label: 'Dr.', value: 'dr' },
  { label: 'Prof.', value: 'prof' },
];

/**
 * Industry — Lead + Account. Superset (formerly 15 on Lead, 6 on Account);
 * lead_conversion copies `leadRecord.industry` onto the created Account, so
 * Account MUST accept every Lead value.
 */
export const INDUSTRY_OPTIONS: SelectOption[] = [
  { label: 'Technology',          value: 'technology' },
  { label: 'Software / SaaS',     value: 'software' },
  { label: 'Finance',             value: 'finance' },
  { label: 'Healthcare',          value: 'healthcare' },
  { label: 'Retail',              value: 'retail' },
  { label: 'Manufacturing',       value: 'manufacturing' },
  { label: 'Education',           value: 'education' },
  { label: 'Real Estate',         value: 'real_estate' },
  { label: 'Media & Entertainment', value: 'media' },
  { label: 'Logistics',           value: 'logistics' },
  { label: 'Hospitality',         value: 'hospitality' },
  { label: 'Energy & Utilities',  value: 'energy' },
  { label: 'Government',          value: 'government' },
  { label: 'Non-profit',          value: 'nonprofit' },
  { label: 'Other',               value: 'other' },
];

/**
 * Lead Source — Lead + Contact + Opportunity. Superset (formerly 12/5/6);
 * lead_conversion copies `leadRecord.lead_source` onto the created
 * Opportunity, so Opportunity MUST accept every Lead value.
 */
export const LEAD_SOURCE_OPTIONS: SelectOption[] = [
  { label: 'Web',             value: 'web' },
  { label: 'Referral',        value: 'referral' },
  { label: 'Event / Trade Show', value: 'event' },
  { label: 'Webinar',         value: 'webinar' },
  { label: 'Partner',         value: 'partner' },
  { label: 'Advertisement',   value: 'advertisement' },
  { label: 'Paid Search',     value: 'paid_search' },
  { label: 'Social Media',    value: 'social' },
  { label: 'Content / Blog',  value: 'content' },
  { label: 'Cold Call',       value: 'cold_call' },
  { label: 'Email Campaign',  value: 'email_campaign' },
  { label: 'Other',           value: 'other' },
];

/**
 * Payment Terms — Quote + Contract. Superset (incl. `due_on_receipt`,
 * formerly Quote-only): an accepted quote's terms carry over to the contract,
 * so the contract vocabulary must cover every quote value.
 *
 * The carry-over is `quote_on_accepted` in `src/objects/quote.hook.ts`, named
 * here because this rationale spent its first months unenforced (#873): the
 * hook drafted the contract without `payment_terms`, so every accepted quote
 * produced a contract on the `net_30` option default below regardless of what
 * was negotiated — a shared vocabulary justified by a copy that did not exist.
 * A comment that names its enforcer can be checked; this one could not be.
 */
export const PAYMENT_TERMS_OPTIONS: SelectOption[] = [
  { label: 'Net 15', value: 'net_15' },
  { label: 'Net 30', value: 'net_30', default: true },
  { label: 'Net 60', value: 'net_60' },
  { label: 'Net 90', value: 'net_90' },
  { label: 'Due on Receipt', value: 'due_on_receipt' },
];

/**
 * Task Type — crm_task.type, also re-rendered as the `activityType` select in
 * the schedule_followup screen flow (which had drifted to a 5-value copy
 * missing `other`).
 */
export const TASK_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Follow-up', value: 'follow_up' },
  { label: 'Demo', value: 'demo' },
  { label: 'Other', value: 'other' },
];

/**
 * Opportunity Stage — crm_opportunity.stage, also re-rendered as the `stage`
 * param of the mass_update_stage action. Colors/default only matter on the
 * object schema; use {@link plainOptions} where a screen/param select wants
 * bare label/value pairs.
 */
export const OPPORTUNITY_STAGE_OPTIONS: SelectOption[] = [
  { label: 'Prospecting', value: 'prospecting', color: '#808080', default: true },
  { label: 'Qualification', value: 'qualification', color: '#FFA500' },
  { label: 'Needs Analysis', value: 'needs_analysis', color: '#FFD700' },
  { label: 'Proposal', value: 'proposal', color: '#4169E1' },
  { label: 'Negotiation', value: 'negotiation', color: '#9370DB' },
  { label: 'Closed Won', value: 'closed_won', color: '#00AA00' },
  { label: 'Closed Lost', value: 'closed_lost', color: '#FF0000' },
];

/**
 * Event Type — crm_event.type, and the `kind` discriminator the per-object
 * activity actions stamp on the `crm_event` row they insert (#592).
 *
 * Distinct from {@link TASK_TYPE_OPTIONS} on purpose: a Task is something a rep
 * still owes someone, an Event is an interaction that occupies a slot on the
 * calendar. `email` is therefore absent here (an email is not a meeting slot;
 * it stays a `sys_email` + `sys_activity` pair) and `webinar` / `onsite_visit`
 * are present, because those are the meeting shapes a rep books.
 */
export const EVENT_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Meeting',      value: 'meeting',       color: '#4169E1', default: true },
  { label: 'Call',         value: 'call',          color: '#00AA00' },
  { label: 'Demo',         value: 'demo',          color: '#9370DB' },
  { label: 'Webinar',      value: 'webinar',       color: '#FFA500' },
  { label: 'Onsite Visit', value: 'onsite_visit',  color: '#0EA5E9' },
  { label: 'Other',        value: 'other',         color: '#808080' },
];

/**
 * Event Status — crm_event.status.
 *
 * The `planned` → `held` transition is what separates "a meeting is booked"
 * from "an interaction happened", and only the second one bumps
 * `crm_account.last_activity_date` (see `event.hook.ts`). Without that split a
 * meeting booked for next quarter would reset the churn clock today.
 */
export const EVENT_STATUS_OPTIONS: SelectOption[] = [
  { label: 'Planned',   value: 'planned',   color: '#4169E1', default: true },
  { label: 'Held',      value: 'held',      color: '#00AA00' },
  { label: 'Cancelled', value: 'cancelled', color: '#999999' },
  { label: 'No Show',   value: 'no_show',   color: '#FF4500' },
];

/**
 * Attendee Response — crm_event_attendee.response.
 *
 * The reason attendees are RECORDS rather than a JSON string on the activity
 * (#592 acceptance): a per-attendee response only exists if the attendee does.
 */
export const ATTENDEE_RESPONSE_OPTIONS: SelectOption[] = [
  { label: 'No Response', value: 'no_response', color: '#808080', default: true },
  { label: 'Accepted',    value: 'accepted',    color: '#00AA00' },
  { label: 'Declined',    value: 'declined',    color: '#FF0000' },
  { label: 'Tentative',   value: 'tentative',   color: '#FFA500' },
];

/**
 * Polymorphic "Related To" type — crm_task.related_to_type and
 * crm_event.related_to_type.
 *
 * Both activity objects carry the same five `related_to_*` lookups, and both
 * hooks bubble recency through the same `related_to_type → lookup field` map.
 * Declared once so the vocabulary of the discriminator cannot drift from the
 * set of lookups that back it — a drift that reads as "the bubble silently
 * stopped firing for one object type".
 */
export const RELATED_TO_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Account',     value: 'crm_account' },
  { label: 'Contact',     value: 'crm_contact' },
  { label: 'Opportunity', value: 'crm_opportunity' },
  { label: 'Lead',        value: 'crm_lead' },
  { label: 'Case',        value: 'crm_case' },
];

/**
 * Duplicate Of — crm_lead.duplicate_of_type, the discriminator half of the
 * `duplicate_of_lead` / `duplicate_of_contact` pair (#598).
 *
 * Two vocabularies, deliberately, and the split is the enforcement:
 *
 *   - {@link DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS} is what a human may pick. Each
 *     value names an object, and `lead.object.ts` pairs it with that object's
 *     lookup through `requiredWhen`, so choosing one demands a record.
 *   - {@link DUPLICATE_OF_TYPE_OPTIONS} is what the COLUMN may hold. It is the
 *     authorable set plus {@link DUPLICATE_OF_TYPE_ERASED}, a tombstone no
 *     author writes.
 *
 * The form spreads the authorable set (`src/views/lead.view.ts`) and the object
 * spreads the full one, so the tombstone is unpickable BY CONSTRUCTION rather
 * than by a hand-maintained exclusion list: a fourth authorable object type
 * added below reaches the form automatically, and the tombstone never does.
 */
export const DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS: SelectOption[] = [
  { label: 'Lead',    value: 'crm_lead' },
  { label: 'Contact', value: 'crm_contact' },
];

/**
 * The tombstone (#1164): "this lead was confirmed a duplicate of a record that
 * has since been erased."
 *
 * It exists because on the record — which is all a validation can see, being
 * evaluated against `{...previous, ...data}` — "the pointer was erased" and
 * "this claim never named anyone" were the SAME state. Every way of teaching a
 * rule to tolerate the first also admitted the second, which is why the erasure
 * path could not be cleared by relaxing anything (measured in full on #1164).
 * Giving the two states different values makes them different facts, and then
 * no rule has to be loosened at all: the `requiredWhen` pairing fires only on
 * `crm_lead` / `crm_contact` so it never sees this value, and
 * `duplicate_disqualification_requires_survivor` asks for a NON-BLANK type,
 * which this is.
 *
 * Deliberately not an object name: it is the answer to "which object holds the
 * survivor" when the answer is "none, any more".
 *
 * ⚠️ `lead_duplicate_check` (`lead.hook.ts`, job 1c) is the ONLY writer, and it
 * spells the value as an inline literal — L2 hook bodies run body-only in the
 * QuickJS sandbox, so a module constant resolves at authoring time and arrives
 * as `undefined` (same constraint as the SLA matrix in `case.hook.ts`). The two
 * spellings are pinned together, and the writer pinned to that one site, by
 * `test/lead-duplicate-management.test.ts`.
 */
export const DUPLICATE_OF_TYPE_ERASED = 'erased';

/** The full column vocabulary: what an author may pick, plus the tombstone. */
export const DUPLICATE_OF_TYPE_OPTIONS: SelectOption[] = [
  ...DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS,
  { label: 'Erased Record', value: DUPLICATE_OF_TYPE_ERASED },
];

/** Project a canonical set down to bare `{ label, value }` pairs for flow
 * screens and action params, which don't understand color/default keys. */
export const plainOptions = (options: SelectOption[]): { label: string; value: string }[] =>
  options.map(({ label, value }) => ({ label, value }));
