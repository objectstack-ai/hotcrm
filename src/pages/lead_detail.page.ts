// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { Page } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Lead Detail Record Page
 *
 * Demonstrates a comprehensive record page layout similar to Salesforce Lightning Record Page.
 *
 * Features:
 * - Template-based layout with named regions
 * - Rich component composition (details, highlights, related lists)
 * - Component visibility rules
 * - Profile-based page assignment
 */
export const LeadDetailPage: Page = {
  name: 'lead_detail_page',
  label: 'Lead Detail',
  description: 'Comprehensive lead detail page with highlights, details, and related information',

  type: 'record',
  object: 'crm_lead',

  // Template defines the overall layout structure. We use `full-width`
  // (single column) because the previous `header-sidebar-main` layout
  // sandwiched the highlights strip into a cramped sidebar with no other
  // meaningful sidebar content — Salesforce Lightning record pages
  // similarly default to a stacked column for medium-density objects.
  template: 'full-width',
  kind: 'full',
  // Page-level state variables
  variables: [
    {
      name: 'showHistory',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'activeTab',
      type: 'string',
      defaultValue: 'details',
    },
  ],

  // Regions correspond to slots in the template
  regions: [
    {
      name: 'header',
      width: 'full',
      components: [
        // Title + subtitle + icon, with record-level actions rendered
        // inline in the header's action slot via the first-class
        // `actions` property (no sibling node, no visual offset hack).
        {
          type: 'page:header',
          id: 'lead_header',
          label: 'Lead Information',
          properties: {
            title: '{first_name} {last_name}',
            subtitle: '{company}',
            // `icon` removed from `page:header` in @objectstack/spec 17.0.0
            // (#6946, ADR-0087 D2) — deleted, not renamed. See the full note on
            // `account_detail.page.ts`; nothing ever drew it.
            breadcrumb: true,
            // Convert is the outcome; scheduling the next touch is the daily
            // act. Both belong in the header — the follow-up used to be four
            // clicks deep in the Related tab.
            //
            // The three activity actions are listed EXPLICITLY (#592): a custom
            // record page replaces the synthesized header, so an object-scoped
            // action that is not named here is unreachable from the record —
            // only the list-row ⋮ menu can fire it. Logging the call you just
            // made is the single most frequent thing a rep does on a lead, and
            // it was two navigations away.
            //
            // Action IDs, not `ActionDef` objects: `PageHeaderProps.actions` is
            // `z.array(z.string())` ("Action IDs to show in header") in
            // @objectstack/spec 17.3.0, and this repo authors against the
            // protocol (#1653). Each id is the `name` of a crm_lead-scoped
            // action — `convert_lead` / `schedule_followup` in
            // `src/actions/lead.actions.ts`, the activity trio in
            // `src/actions/global.actions.ts`.
            actions: [
              'convert_lead',
              'schedule_followup',
              'log_call',
              'log_meeting',
              'schedule_meeting',
            ],
          },
        },
        // Duplicate banner (#1207, widened to every verdict by #1289).
        //
        // `lead_duplicate_check` (lead.hook.ts, job 2) already writes
        // `duplicate_status: 'suspected'` and links the record the lead repeats
        // — the flag existed, and this page never read it. A rep opened a
        // flagged lead, saw a page identical to a clean one, and converted it
        // into a second account, contact and opportunity. This banner and the
        // `duplicates` section on the Details tab are the record-page half of
        // that fix — the banner is the alarm, the section is the link to
        // compare against; the conversion screen carries the other half.
        //
        // ## Why it covers `confirmed` too (#1289)
        //
        // #1207 shipped this gated on `== "suspected"` alone, which left the
        // STRONGER state silent: a `confirmed` duplicate is a person's verdict,
        // and it got no banner at all. That narrowness was a ruling, not an
        // oversight in the code, and #1289 is the ruling being corrected.
        //
        // Since #1288 the gap also changed shape. `confirmed` is now the state
        // on which the conversion flow REFUSES outright
        // (`lead-conversion.flow.ts`, `refuse_confirmed_duplicate`), so a
        // silent banner meant the record page said nothing about the one fact
        // that stops the rep's next click — they pressed Convert and met a
        // refusal dialog with no warning on the record behind it.
        //
        // ⚠️ `visible` is the ONE record component whose PROPS carry a real row
        // predicate: `record-alert.tsx` evaluates `properties.visible` through
        // `toPredicateInput` + `useCondition` against the row
        // (`usePredicateRecordContext`), the same pipeline as an action button.
        // A node-level `visibleWhen` would be a different gate one tier up,
        // evaluated by `SchemaRenderer` on `data` = the data-source ADAPTER,
        // not the row — it cannot see `duplicate_status` at all.
        //
        // ⚠️ `has()` is load-bearing, and this surface is the WORST of the four
        // this repo measures (cf. `test/view-predicate-dialect.test.ts`): the
        // renderer's call site is FAIL-SOFT — an unevaluable predicate answers
        // SHOWN. So a bare `record.duplicate_status != null` would abort with
        // `No such key` on every clean lead whose driver omits the column
        // (`driver-memory` / `driver-mongodb`; `driver-sql` returns it as null)
        // and put a duplicate warning on leads that are not duplicates. The
        // guard is what makes the predicate answer `false` instead of faulting.
        // Pinned on the real engine in `test/lead-duplicate-visibility.test.ts`.
        //
        // ⛔ And the guard is NOT the whole predicate. "Any verdict the record
        // actually carries" reads like a job for `has()` alone, and `has()`
        // alone is wrong here: it is TRUE for a key that is PRESENT AND NULL,
        // which is precisely what `driver-sql` hands back for a clean lead.
        // Measured on this engine — `has(record.duplicate_status)` against
        // `{ duplicate_status: null }` answers `{ ok: true, value: true }` — so
        // dropping the comparison would reach the same cry-wolf banner as
        // dropping the guard, just by the other road. `!= null` is what makes
        // "set" mean set; both halves are pinned, shape by shape.
        //
        // `P` — an explicit `{ dialect: 'cel' }` envelope — is not decoration
        // either: `ExpressionEvaluator.evaluateCondition` routes ONLY the
        // envelope to `@objectstack/formula`'s CEL engine, where `has()` is a
        // real function; a bare string takes the legacy JS path, whose
        // `FormulaFunctions` has no CEL `has()`, so the guard would itself be
        // the fault that fails soft to visible.
        //
        // `title` / `body` carry inline locale maps rather than plain strings:
        // this renderer resolves both through `pickLocalized(…, language)`
        // (the same capability `opportunity_detail.page.ts` records under
        // #972), and `body` has no other channel — the i18n extractor's
        // per-component copy keys are title/description/label/placeholder/
        // emptyText/submitLabel, so a plain-string `body` would ship English to
        // all four locales. Keeping both halves of one banner's copy in one
        // place beats splitting `title` into the locale packs.
        {
          type: 'record:alert',
          id: 'lead_duplicate_alert',
          label: 'Duplicate Flagged',
          properties: {
            severity: 'warning',
            visible: P`has(record.duplicate_status) && record.duplicate_status != null`,
            title: {
              // ⛔ The words are deliberately NOT the locale packs'
              // `duplicate_status` option labels any more (#1289). One banner
              // now covers two states with one title, and `pickLocalized`
              // picks by LANGUAGE, not by row — so naming either verdict here
              // would label the other one wrongly, and calling a reviewer's
              // finished verdict a machine's suspicion is the one sentence
              // this banner must not say. It names the FACT both states share
              // and sends the rep to the chip below for the verdict itself.
              // Pinned against the option labels in
              // `test/lead-duplicate-visibility.test.ts`.
              en: 'Marked as a duplicate',
              'zh-CN': '已标记为重复',
              'ja-JP': '重複としてマークされています',
              'es-ES': 'Marcado como duplicado',
            },
            body: {
              // Same discipline as `title`: says WHAT is true of both states
              // and points at the field that distinguishes them, rather than
              // asserting one. "Intake flagged this lead", the #1207 wording,
              // is a claim only `suspected` supports — `confirmed` is written
              // by a person, not by the hook.
              en:
                'This lead is marked as repeating a record this app already has. '
                + 'Duplicate Status below says whether that is an automatic match from '
                + 'intake or a reviewer\'s verdict, and Duplicate Management links the '
                + 'record it repeats — compare them before you convert, because converting '
                + 'creates a second account, contact and opportunity for the same buyer.',
              'zh-CN':
                '该线索已被标记为与系统中已有记录重复。下方的「重复状态」会说明这是录入时的'
                + '自动匹配还是审核人的判定，「重复线索管理」中是它重复的那条记录'
                + '——转换前请先比对，转换会为同一客户再创建一套客户、联系人和商机。',
              'ja-JP':
                'このリードは既存レコードと重複するものとしてマークされています。'
                + '下の「重複ステータス」が登録時の自動照合か担当者の判定かを示し、'
                + '「重複管理」に重複先のレコードがあります。変換すると同じ相手に'
                + '取引先・取引先責任者・商談がもう一組作成されるため、変換する前に比較してください。',
              'es-ES':
                'Este prospecto está marcado como duplicado de un registro que ya existe. '
                + 'El campo Estado del Duplicado indica si se trata de una coincidencia '
                + 'automática de la captura o del veredicto de una persona, y Gestión de '
                + 'Duplicados enlaza el registro que repite: compárelos antes de convertirlo, '
                + 'porque la conversión crea una segunda cuenta, contacto y oportunidad para '
                + 'el mismo comprador.',
            },
          },
        },
        // Salesforce-style Highlights Panel: a horizontal strip of the
        // most-important key facts directly under the header. Pulled out
        // of the sidebar so it can use the full page width.
        {
          type: 'record:highlights',
          id: 'lead_highlights',
          label: 'Key Information',
          properties: {
            fields: ['status', 'rating', 'lead_source', 'owner_id', 'email', 'phone'],
          },
        },
        {
          type: 'record:path',
          id: 'lead_path',
          label: 'Lead Status Path',
          properties: {
            statusField: 'status',
            // `converted` is the terminal WIN state and must be on the path —
            // without it the strip reads as if "Unqualified" were the goal, and
            // a converted lead had no stage to light up at all.
            stages: [
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'qualified', label: 'Qualified' },
              { value: 'converted', label: 'Converted' },
              { value: 'unqualified', label: 'Unqualified' },
            ],
          },
        },
      ],
    },

    {
      name: 'main',
      width: 'large',
      components: [
        {
          type: 'page:tabs',
          id: 'main_tabs',
          label: 'Lead Information Tabs',
          properties: {
            // `type` → `tabStyle` (@objectstack/spec 17.0.0, #6776, ADR-0087
            // D2). Same three values; see the full note on `home.page.ts`.
            tabStyle: 'line',
            position: 'top',
            items: [
              {
                label: 'Details',
                icon: 'info-circle',
                children: [
                  {
                    type: 'record:details',
                    id: 'lead_details',
                    label: 'Lead Details',
                    properties: {
                      columns: '2',
                      // `layout` was REMOVED from `record:details` in
                      // @objectstack/spec 17.0.0 (#6946, ADR-0087 D2) and is
                      // deleted with no successor: its declared `auto` |
                      // `custom` semantics were never implemented. objectui's
                      // `RecordDetailsRenderer` tests `layout` only against
                      // `inline` | `compact` — two values the enum never
                      // permitted — so both legal values took the same branch
                      // and the key selected nothing. The body is chosen by what
                      // is authored — and on an authored `record:details` the
                      // `sections` below ARE the body, not a preference over
                      // some default one.
                      //
                      // ⛔ There is NO fallback. Omitting `sections` here does
                      // not fall back to the object's `highlightFields`, nor to
                      // its `fieldGroups`, nor to a bare auto-detected header
                      // chip. It renders an EMPTY body.
                      //
                      // ⚠️ Read that twice before editing, because both of the
                      // wrong answers were once written down as fact. THIS
                      // comment used to assert the `highlightFields` fallback;
                      // a `crm_forecast` reading recorded on #1452 asserted the
                      // `fieldGroups` one. Both read as authoritative, they
                      // contradicted each other, and neither had ever been run
                      // against the pinned version — so #806's ruling was
                      // written on a mechanism that does not exist, and that
                      // cost a full round before anybody measured it. #1521 is
                      // the card that replaced both guesses with the numbers
                      // below. ⛔ Do not restore a fallback claim here without
                      // re-measuring it first.
                      //
                      // How it was measured (#806's R28 os-dev report) —
                      // measured, not inferred: headless Chromium driving a
                      // real `objectstack start` against a wiped DB,
                      // `@objectstack/console` 17.2.0, two full runs over the
                      // same records. Run A, unmutated: 6 sections, 20 field
                      // rows. Run B, `properties.sections` deleted: 0 and 0 —
                      // the entire body between the tab strip and the
                      // "Created by" footer simply absent. Negative control in
                      // both runs: `crm_contact`, which authors no record page,
                      // kept rendering its five `fieldGroups`-derived headings
                      // in A and in B alike, so run B's nothing is this page's
                      // nothing and not a dead instrument.
                      //
                      // Why the two wrong answers looked right: `fieldGroups`
                      // derivation is real, but it lives in the console's page
                      // SYNTHESIZER — the path that fabricates a record page
                      // for an object that has none authored (which is exactly
                      // why the `crm_contact` control shows it). The synthesizer
                      // takes authored sections when they are non-empty and
                      // derives from `fieldGroups` otherwise. The
                      // `record:details` RENDERER, which is what draws THIS
                      // page, reads neither `fieldGroups` nor `highlightFields`
                      // at all: it forwards `sections`/`fields`, and the detail
                      // view guards each one with `.length > 0` and no else
                      // branch. An authored page opts out of the synthesizer,
                      // so it opts out of the derivation with it.
                      //
                      // ⚠️ Version caveat: those browser numbers are 17.2.0 and
                      // this repo now pins 17.3.0. #1521 did NOT re-run the
                      // browser measurement. What it did do is read the
                      // installed 17.3.0 console bundle (static, not run), and
                      // the mechanism is unchanged there: both guards are still
                      // `sections.length > 0` and `fields.length > 0` with no
                      // else, the renderer still reads neither of the two
                      // fallback sources, and the synthesizer still hands the
                      // derived `highlightFields` to the details node as
                      // `hideFields` — highlight fields are SUBTRACTED from
                      // this body, never substituted into it, which is the
                      // opposite of what the old sentence claimed. Treat the
                      // 0/0 as a 17.2.0 reading corroborated statically at
                      // 17.3.0; re-measure in a browser before quoting it for
                      // any later version. (`fieldGroups` does reach a section
                      // one way, per the installed spec: a section may name
                      // `group:` to inherit one group's members and
                      // presentation. That is a per-section opt-in, not a
                      // page-level fallback, and this page does not use it.)
                      //
                      // So the sections below are load-bearing, not decorative:
                      // they are the Salesforce-style structured field grid the
                      // Details tab presents, and with them gone the tab draws
                      // nothing at all. ⛔ Whether this page should keep
                      // authoring them is #806's subject and a maintainer
                      // decision — not a drive-by edit from here. Field names
                      // map to lead.object.ts.
                      sections: [
                        {
                          name: 'info',
                          label: 'Lead Information',
                          fields: ['salutation', 'first_name', 'last_name', 'title', 'company', 'industry'],
                        },
                        {
                          name: 'crm_contact',
                          label: 'Contact',
                          fields: ['email', 'phone', 'mobile', 'website'],
                        },
                        {
                          name: 'detail',
                          label: 'Lead Detail',
                          // `disqualification_reason` is mandatory on an
                          // Unqualified lead (see the validation on
                          // crm_lead) — the detail page has to show the
                          // recorded reason, not just the red status chip.
                          fields: ['status', 'disqualification_reason', 'rating', 'lead_source', 'owner_id', 'annual_revenue', 'number_of_employees'],
                        },
                        {
                          name: 'address',
                          label: 'Address',
                          fields: ['address'],
                        },
                        // The LINK half of the duplicate banner (#1207) —
                        // the banner says a record is repeated, this names it
                        // and lets the rep open it to compare.
                        //
                        // ⚠️ NOT the highlights strip, which is where this
                        // card's dispatch suggested it: `record:highlights`
                        // caps `fields` at 7 and the strip already carries 6,
                        // so the three duplicate fields would not fit without
                        // evicting a chip every lead needs to serve a state
                        // most leads are not in (measured: `objectstack
                        // validate` reports `fields: Too big: expected array
                        // to have <=7 items`, and
                        // `test/metadata-references.test.ts` parses the same
                        // props strictly, so it is a hard cap, not advice).
                        //
                        // A section costs nothing on a clean lead either, for
                        // a better reason than the strip's: `record:details`
                        // hides empty fields (`hideEmpty` defaults true in the
                        // renderer) and a section whose fields are ALL empty
                        // renders nothing — no heading, no empty shell (the
                        // measurement is in `test/detail-section-dedup.test.ts`).
                        // So this block appears exactly on the leads that carry
                        // a duplicate claim.
                        //
                        // All four fields, not just `duplicate_of_lead`:
                        // `lead_duplicate_check` matches CONTACTS first and
                        // only then open leads, so a suspected lead's survivor
                        // is a `crm_contact` at least as often as a `crm_lead`
                        // — naming only the lead link would leave the commoner
                        // half of the flagged population with a banner and
                        // nothing to click. `duplicate_status` also covers the
                        // state the banner deliberately does not: a `confirmed`
                        // verdict, and the `erased` tombstone that outlives the
                        // record it named.
                        {
                          name: 'duplicates',
                          label: 'Duplicate Management',
                          fields: [
                            'duplicate_status', 'duplicate_of_type',
                            'duplicate_of_lead', 'duplicate_of_contact',
                          ],
                        },
                        {
                          name: 'description',
                          label: 'Description',
                          fields: ['description'],
                          columns: 1,
                        },
                      ],
                    },
                  },
                ],
              },
              {
                label: 'Related',
                icon: 'link',
                children: [
                  {
                    type: 'page:accordion',
                    id: 'related_accordion',
                    label: 'Related Records',
                    properties: {
                      allowMultiple: true,
                      items: [
                        {
                          label: 'Tasks',
                          icon: 'list-checks',
                          collapsed: false,
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'related_tasks',
                              label: 'Tasks',
                              properties: {
                                objectName: 'crm_task',
                                // crm_task links back through the polymorphic
                                // `related_to_lead` lookup; there is no `lead_id`
                                // column, so the old binding matched nothing and
                                // this list read "0" no matter how many follow-ups
                                // the rep had filed.
                                relationshipField: 'related_to_lead',
                                columns: ['subject', 'status', 'priority', 'due_date', 'owner_id'],
                                sort: [
                                  { field: 'due_date', order: 'asc' }
                                ],
                                limit: 10,
                                title: 'Open Tasks',
                                filter: [{ field: 'status', operator: 'not_equals', value: 'completed' }],
                                showViewAll: true,
                                actions: ['new_task', 'edit', 'complete'],
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
              {
                label: 'Activity',
                icon: 'clock',
                children: [
                  {
                    type: 'record:activity',
                    id: 'lead_activity',
                    label: 'Activity Timeline',
                    properties: {
                      // `types` is keyed on FEED ITEM KIND, never on object name
                      // (#1209). The old `['crm_task']` was not one of the kinds
                      // the prop accepts, and nothing anywhere enforced that: the
                      // page schema's `properties` is an open bag
                      // (`z.record(z.string(), z.unknown())`) so the value was
                      // stored verbatim, and the renderer's own sanitiser drops
                      // members it does not recognise and then reads the EMPTY
                      // remainder as "no filter authored" — measured on the
                      // shipped bundle, `types: ['crm_task']`, `types: []` and
                      // omitting `types` all render the same unfiltered stream.
                      // That is why the tab showed `Created Lead` / `Updated
                      // Lead` audit rows, which the History tab already covers.
                      //
                      // What this component can actually show is `sys_activity`
                      // scoped to the record, through the renderer's own
                      // type map — measured, not inferred:
                      //
                      //   sys_activity.type      feed kind      written by
                      //   created/updated/…      field_change   platform audit
                      //   system                 system         platform
                      //   completed              task           log_call /
                      //                                         log_meeting /
                      //                                         send_email
                      //   scheduled              (dropped)      schedule_meeting
                      //
                      // So `task` is the kind that carries a rep's logged
                      // interactions, and it is the only reachable one worth
                      // filtering to. `event` is NOT added: it is a legal kind
                      // the prop accepts but no `sys_activity.type` maps to it,
                      // so it would be a declared value enforced by nothing.
                      // `scheduled` rows fall out of the map upstream — a
                      // platform gap, not something to work around here.
                      types: ['task'],
                      limit: 20,
                      // Load-bearing, not cosmetic: the renderer strips every
                      // `task` item BEFORE the `types` filter runs unless this is
                      // true, and `task` items are exactly the `completed` rows.
                      // `types: ['task']` with the old `showCompleted: false`
                      // renders an empty tab.
                      showCompleted: true,
                    },
                  },
                ],
              },
              {
                label: 'History',
                icon: 'history',
                children: [
                  {
                    // `record:history` is the platform's own audit feed over the
                    // fields marked `trackHistory` (status / rating). Ownership
                    // moved to the platform's `owner_id` in #548, which carries no
                    // `trackHistory` flag — transfers land in the compliance audit
                    // log, not on this feed.
                    // The hand-rolled version queried an object named
                    // `field_history`, which this app does not define, so the
                    // tab could only ever render empty.
                    type: 'record:history',
                    id: 'lead_history',
                    label: 'Field History',
                    properties: {
                      limit: 25,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],

  // Make this the default page for leads
  isDefault: true,

  // Assign to specific profiles. These must match the profile `name`s declared
  // in src/profiles — `sales_user` / `system_administrator` never existed, so
  // the assignment silently matched nobody.
  assignedProfiles: ['sales_rep', 'sales_manager', 'system_admin'],

  // ARIA accessibility
  aria: {
    ariaLabel: 'Lead Detail Page',
    ariaDescribedBy: 'Detailed view of lead information with related records and activity',
  },
};
