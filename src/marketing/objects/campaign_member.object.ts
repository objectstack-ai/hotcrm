// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P, cel } from '@objectstack/spec';

/**
 * Campaign Member Object
 *
 * Links a Lead OR Contact to a Campaign and tracks the response
 * lifecycle `sent → responded / converted / unsubscribed`.
 * Used by the campaign-enrollment flow and by ROI dashboards.
 *
 * ⚠️ The lifecycle stops where the platform's writers stop (#597). It used to
 * read `Sent → Opened → Clicked → Responded → Converted` with `bounced` beside
 * it, plus `first_opened_date` / `first_clicked_date` stamps — six values and
 * two columns that NOTHING in this app or on the platform could ever write.
 * `@objectstack/plugin-email` is "transport-pluggable OUTBOUND delivery with
 * sys_email persistence": its `sys_email.status` vocabulary is
 * `queued | sent | failed`, there is no open/click webhook, no bounce
 * ingestion, and no tracking pixel anywhere in the installed platform
 * (measured on 17.0.0-rc.6). So an author reading this object was promised
 * engagement tracking the product cannot deliver, and every one of those
 * values would have stayed at its default forever.
 *
 * Removed rather than wired, per ADR-0049's enforce-or-remove spirit: they
 * come back the day a real tracking integration exists to write them, and not
 * before. What survives is the part with a real writer — see the writer table
 * beside each field below.
 */
export const CampaignMember = ObjectSchema.create({
  name: 'crm_campaign_member',
  label: 'Campaign Member',
  pluralLabel: 'Campaign Members',
  icon: 'user-plus',
  description: 'Membership and response tracking for marketing campaigns',

  // ADR-0090 D1/D7: OWD is an authored decision. Membership is an attribute of
  // the campaign, so record access DERIVES from it (ADR-0055). The parent is
  // `crm_campaign`, the object's ONE required `master_detail`: since
  // @objectstack/spec 18.0.0-next.1 that is the only shape a controlled-by-parent
  // object derives its master from (ADR-0055 §1). It was a required LOOKUP
  // through 18.0.0-next.0, which next.1 refuses at parse (#2105).
  //
  // The derivation delivers exactly "members whose `crm_campaign` the caller
  // can read". ⚠️ Master accessibility resolves through the same paths a direct
  // read of the campaign takes — ownership and `sys_record_share` grants folded
  // in ALONGSIDE the master's row-level security policies, not the policies
  // alone. `test/parent-derived-reach.test.ts` pins that, and was written to go
  // red the day the platform changes it: an earlier version consulted master
  // RLS ONLY, under a SYSTEM context, so with no policy narrowing a SELECT on
  // `crm_campaign` a member row was readable by every holder of object-level
  // read on this object.
  //
  // ⚠️ The write side reaches further than reads: the platform's
  // `member_default` set carries an owner-only-writes RLS policy on updates,
  // and because the derivation folds master RLS in, that policy reaches through
  // to member writes — see the `marketing_campaign_updates` note in
  // `src/sales/profiles/marketing-user.profile.ts`.
  //
  // ⛔ Not `private`: with no owner field on the junction row that resolves to
  // "whoever inserted it", which is nobody's idea of campaign membership and
  // hides rows written by the enrollment flow.
  sharingModel: 'controlled_by_parent',

  // Per-field history is opt-in via `Field.trackHistory` (ADR-0052), set on
  // `status` below — there is no object-level history flag.

  // ADR-0079: junction rows have no derivable text title; point the canonical
  // nameField at the stored autonumber explicitly (autonumber is not in the
  // auto-derivation whitelist).
  nameField: 'member_number',

  // Load-bearing on TWO surfaces, and the second one is why this list is not
  // the side that gave way to fix `field-group-shadowed` below (#715). Besides the
  // detail highlight strip, it is what curates the members panel on a
  // campaign's detail page: a related list takes its columns from the child's
  // `highlightFields` minus the lookup it is scoped by, and this object ships
  // no view at all, so dropping `crm_lead`/`crm_contact` here would leave that
  // panel showing Status / Response Date and no person — measured and pinned in
  // `test/view-references.test.ts` (#944).
  highlightFields: ['crm_campaign', 'crm_lead', 'crm_contact', 'status', 'response_date'],

  // Both groups render on detail pages as well as on forms, and keeping them
  // that way is a constraint on the two lists above, not a free choice (#715).
  // A synthesized detail page hoists the record title plus the first four
  // highlightFields out of the body, so a group whose every field is hoisted
  // keeps its heading on forms and silently disappears from detail pages
  // (`field-group-shadowed`).
  // `basic` was exactly that: member_number is the title, and campaign/lead/
  // contact are the first three of the strip. `added_date` — the enrollment
  // stamp, which describes the MEMBERSHIP rather than the person's response —
  // sits here rather than under `response` so the group has something of its
  // own to show. Same resolution as `crm_task`'s shadowed `assignment` group
  // (#582): move the field to the group it reads under, leave the strip alone.
  fieldGroups: [
    { key: 'basic',    label: 'Basic Information', icon: 'info' },
    { key: 'response', label: 'Response Tracking', icon: 'activity' },
  ],

  fields: {
    member_number: Field.autonumber({
      label: 'Member Number',
      format: 'CM-{00000}',
      group: 'basic',
    }),

    // The master (see `sharingModel` above). `deleteBehavior: 'restrict'` keeps
    // what the required lookup did: a campaign that still has members cannot
    // be deleted. A `master_detail` left on its default would cascade instead
    // and delete the campaign's membership history with it.
    crm_campaign: Field.masterDetail('crm_campaign', {
      label: 'Campaign',
      required: true,
      deleteBehavior: 'restrict',
      storage: { notNull: true },
      group: 'basic',

      // Curates the members panel on a campaign — and it is the ONE mechanism
      // that actually reaches that panel. Measured in #944 and restated in
      // `test/view-references.test.ts`: a detail-page related list reads
      // `relatedListColumns` on the CHILD's lookup first, and only without it
      // falls back to the child's `highlightFields` minus this lookup. The
      // child's `list` view is never consulted, which is why authoring one
      // here would not have shown anything.
      //
      // It is a SUPERSET of the fallback it replaces — Lead / Contact /
      // Status / Response Date, in that order — plus the one column the panel
      // was missing. `added_date` is the enrollment stamp: `readonly: true`
      // (#1667) and stamped on every insert by the field's own default (see
      // the field below), so a marketer could see WHEN a member responded
      // but not when they were added, on a register whose whole subject is
      // the enrollment. It sits after the person and before the response
      // lifecycle, which is the order the row happens in.
      //
      // ⛔ Deliberately NOT solved by adding `added_date` to
      // `highlightFields`: that strip is hoisted out of the detail body, and
      // `added_date` is the only field in the `basic` group that is neither
      // the record title nor already in the strip — hoisting it would leave
      // the group with nothing of its own and silently vanish its heading
      // from every detail page (`field-group-shadowed`, the trap the note
      // above this object's `fieldGroups` records being rescued from).
      relatedListColumns: ['crm_lead', 'crm_contact', 'added_date', 'status', 'response_date'],

      // The picker offers only the campaigns that take members, the open set
      // the two enroll flows admit (#2336). It lives on the FIELD because the
      // Add to Campaign actions' campaign param is field-backed on this field,
      // and `ActionParamSchema` has no filter key of its own: the row-menu
      // dialog resolves the param from this field and keeps `lookupFilters`.
      // The member form's picker narrows the same way. The selection bar's
      // dialog drops it (the 18.2.0 spec's `bulk-action.zod.ts` note), so
      // there the flow's refusal is what stops a closed campaign.
      lookupFilters: [{ field: 'status', operator: 'in', value: ['planning', 'in_progress'] }],
    }),

    // `deleteBehavior: 'cascade'` on BOTH party lookups (#696). A lookup
    // defaults to `set_null`, and that default made every enrolled person
    // permanently undeletable: deleting the lead cleared this column, the
    // cleared row instantly violated `lead_or_contact_required` below, and the
    // whole delete rolled back with a 400 naming an object the caller never
    // touched ("A campaign member must reference either a Lead or a Contact",
    // `"object":"crm_lead"`). A GDPR "delete this person" request could not be
    // served through the API or the UI.
    //
    // Cascade rather than `restrict`: this is a JUNCTION row whose entire
    // meaning is "this person is enrolled in this campaign". Once the person is
    // gone the row denotes nothing, so keeping it (restrict) would only trade
    // one undeletable person for a manual un-enrol chore, and the impact this
    // fixes is undeletable people, not a confusing message. Cascade also makes
    // the object's own rule unfalsifiable by construction: there is no longer a
    // reachable state in which a stored member row breaks it.
    crm_lead: Field.lookup('crm_lead', {
      label: 'Lead',
      group: 'basic',
      deleteBehavior: 'cascade',
      description: 'Set when the member was a Lead at enrollment time',
    }),

    crm_contact: Field.lookup('crm_contact', {
      label: 'Contact',
      group: 'basic',
      deleteBehavior: 'cascade',
      description: 'Set when the member is an existing Contact',
    }),

    // ⭐ ONE writer: this field's own `defaultValue`, a write-moment stamp
    // (#2142). No caller writes `added_date` — not a flow, not an action, not a
    // hook — and none has to remember to.
    //
    // Why it is declared here rather than written by the callers: a member is
    // created through four doors — the console's **New** on a members list (a
    // user-context `POST /api/v1/data/crm_campaign_member`), the
    // `create_campaign` / `add_contact_to_campaign` list actions, the two
    // `campaign_enrollment` sub-flows, and the seed. Until #2142 the stamp was
    // written by the sub-flows and the seed alone, so the first two doors
    // stored a blank Added Date (measured on 18.0.0-next.3: `201` with
    // `added_date: null`). A declared default is the one rule the engine
    // applies to every insert, and unlike a `beforeInsert` stamp no early
    // `return` in a handler can skip it.
    //
    // How it meets `readonly: true` (measured on 18.0.0-next.3 and pinned in
    // `test/campaign-member-lifecycle.test.ts`):
    //   • a user-context insert that OMITS the column gets the default;
    //   • one that SUPPLIES a value has it stripped (a non-system create may
    //     not seed a readonly column, objectql 17.4.0 on) and the engine
    //     re-derives the default for the stripped key, so the stamp still
    //     lands and a caller cannot back-date a membership;
    //   • a SYSTEM insert that supplies a value keeps it, because a default
    //     fills only a missing value: the marketing seed's authored
    //     `daysAgo(n)` dates land as written.
    // An expression, `now()`, not the `'NOW()'` token: `@objectstack/spec`
    // documents the token as the one a SQL driver also turns into a physical
    // column DEFAULT, while an expression default is evaluated by the engine
    // alone, so an existing database needs no schema change for this.
    //
    // The `readonly` half stands as ruled in #1667 (director seat, decision
    // batch #74, 2026-09-07): an enrollment stamp nobody is meant to hand-edit
    // gets the declaration that says so. Nothing updates it, and a
    // user-context UPDATE is stripped — pinned in
    // `test/audit-stamp-readonly.test.ts`. ⛔ The 16.x claim this note used to
    // carry ("every member landed with a null Added Date while the flag was
    // on") described an engine this repo no longer runs; ⛔ do not resurrect it
    // as a reason to open the column back up.
    //
    // Grouped under `basic`, not `response` (#715): it records when the
    // membership was created, which is a fact about the enrollment, not a step
    // in the response lifecycle the other stamps track.
    added_date: Field.datetime({
      label: 'Added Date',
      group: 'basic',
      readonly: true,
      defaultValue: cel`now()`,
    }),

    // Writers, one per surviving value (#597):
    //   sent         — campaign_enrollment flow, `create_campaign` (leads) and
    //                  `add_contact_to_campaign` (contacts) stamp it on insert.
    //   responded    — the `mark_responded` action (src/marketing/actions/campaign.actions.ts).
    //   converted    — the member's lead converting; `campaign_lead_conversion_refresh`
    //                  (src/sales/objects/lead.campaign-metrics.hook.ts) promotes
    //                  the row when `crm_lead.is_converted` flips.
    //   unsubscribed — set on the member row by a user who may edit campaign
    //                  members (Marketing User and the administrators), usually
    //                  when the person asks to stop hearing from you; nothing
    //                  sets it on its own. `campaign_member_optout_sync`
    //                  round-trips it to the lead/contact's `email_opt_out`,
    //                  which is what makes the enrollment flow's opt-out filter
    //                  honour it next run.
    //
    // `opened` / `clicked` / `bounced` were removed here — see the object
    // docblock. Nothing on the platform can produce them.
    status: Field.select({
      label: 'Status',
      required: true,
      storage: { notNull: true },
      group: 'response',
      trackHistory: true,
      options: [
        { label: 'Sent',      value: 'sent',      default: true, color: '#A0A0A0' },
        { label: 'Responded', value: 'responded', color: '#00AA00' },
        { label: 'Converted', value: 'converted', color: '#7C3AED' },
        { label: 'Unsubscribed', value: 'unsubscribed', color: '#FF0000' },
      ],
    }),

    // Written by the `mark_responded` action, and by
    // `campaign_member_lifecycle` when it back-fills a member whose response
    // was recorded by flipping `status` directly.
    response_date: Field.datetime({
      label: 'Response Date',
      group: 'response',
    }),

    // Kept in lockstep with `status == "responded"` by
    // `campaign_member_lifecycle` (beforeInsert/beforeUpdate) — a boolean that
    // disagrees with the status it summarises is the shape the response
    // surfaces cannot render, and it is what `test/seed-consistency.test.ts`
    // already pins on the seed side.
    has_responded: Field.boolean({
      label: 'Has Responded',
      defaultValue: false,
      group: 'response',
    }),
  },

  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'lead_or_contact_required',
      type: 'script',
      severity: 'error',
      message: 'A campaign member must reference either a Lead or a Contact',
      condition: P`(!has(record.crm_lead) || isBlank(record.crm_lead)) && (!has(record.crm_contact) || isBlank(record.crm_contact))`,
    },
    {
      // The other half of "a Lead OR a Contact" (#2336): a membership is one
      // person's, and the enrollment dedupe, the seed keys and the campaign
      // metrics all read the two sides as different memberships. Until #2336
      // an edit could add a Lead to a contact member and store both.
      //
      // Lead conversion does not trip it: `campaign_lead_conversion_refresh`
      // promotes a converting lead's members by writing `status` alone, so
      // the member keeps its Lead and gains no Contact.
      name: 'lead_and_contact_exclusive',
      type: 'script',
      severity: 'error',
      message: 'A campaign member references a Lead or a Contact, not both',
      condition: P`has(record.crm_lead) && !isBlank(record.crm_lead) && has(record.crm_contact) && !isBlank(record.crm_contact)`,
    },
  ],
});
