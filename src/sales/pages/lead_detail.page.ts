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
            // `breadcrumb` retired from `page:header` in @objectstack/spec 17.6.0
            // (#20785, `page-header-breadcrumb-removed`) — deleted: no renderer
            // ever drew a trail for it; the app shell's own trail is unchanged.
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
        // Duplicate banners — ONE PER VERDICT (#1207 · widened by #1289 ·
        // split by #1628).
        //
        // `lead_duplicate_check` (lead.hook.ts, job 2) already writes
        // `duplicate_status: 'suspected'` and links the record the lead repeats
        // — the flag existed, and this page never read it. A rep opened a
        // flagged lead, saw a page identical to a clean one, and converted it
        // into a second account, contact and opportunity. These banners and the
        // `duplicates` section on the Details tab are the record-page half of
        // that fix — the banner is the alarm, the section is the link to
        // compare against; the conversion screen carries the other half.
        //
        // ## Why there are TWO of them (#1628)
        //
        // #1207 shipped one banner gated on `== "suspected"`, which left the
        // STRONGER state silent. #1289 widened the predicate to every verdict
        // and, being one component, had to pick copy that named NEITHER state:
        // a `record:alert` carries a single `visible` and a single title/body
        // pair, and `pickLocalized` picks by LANGUAGE, not by row — so naming
        // one verdict would have mislabelled every lead in the other.
        //
        // That was correct for one banner, and it is why one banner is not
        // enough. Since #1288 the two verdicts have OPPOSITE next steps:
        //
        //   suspected — the intake hook's guess. Conversion PROCEEDS; the rep
        //               should compare against the linked record first.
        //   confirmed — a reviewer's verdict. Conversion is REFUSED outright
        //               (`lead-conversion.flow.ts`, `refuse_confirmed_duplicate`).
        //
        // One sentence cannot state either without being false for the other,
        // so it stated neither, and the rep had to scroll to the Duplicate
        // Status chip to learn which situation they were in. A banner that
        // announces something is wrong but not what to do is not doing the one
        // job a banner has. Two components, two predicates, two next steps.
        //
        // ⚠️ Two sibling `record:alert` nodes really do BOTH render: a region
        // renders as `components.map((node, i) => <SchemaRenderer key={node?.id
        // || fallback} …>)` — read out of the shipped console bundle at the
        // `.objectui-sha` pin — so each is mounted separately and evaluates its
        // own `visible` against the same row. Their `id`s are their React keys,
        // which is why the two ids differ rather than sharing one.
        //
        // ⚠️ `visible` is the ONE record component whose PROPS carry a real row
        // predicate: `record-alert.tsx` evaluates `properties.visible` through
        // `toPredicateInput` + `useCondition` against the row
        // (`usePredicateRecordContext`), the same pipeline as an action button.
        // A node-level `visibleWhen` is a different gate one tier up,
        // evaluated by `SchemaRenderer`, and the two compose as AND. Measured
        // on the 17.6.0 pin (#1887), that tier binds the page's row as
        // `record` too (objectui#5454): this same predicate, moved there,
        // gated correctly in both directions. `visible` stays because it is
        // the gate `record:alert` declares in its own props.
        //
        // ⚠️ `has()` is load-bearing, and this surface is the WORST of the four
        // this repo measures (cf. `test/view-predicate-dialect.test.ts`): the
        // renderer's call site is FAIL-SOFT — an unevaluable predicate answers
        // SHOWN. So a bare `record.duplicate_status == "suspected"` would abort
        // with `No such key` on every clean lead whose driver omits the column
        // (`driver-memory` / `driver-mongodb`; `driver-sql` returns it as null)
        // and put a duplicate warning on leads that are not duplicates. The
        // guard is what makes the predicate answer `false` instead of faulting.
        // Pinned on the real engine in `test/lead-duplicate-visibility.test.ts`.
        //
        // ⛔ And the guard is NOT the whole predicate — `has()` ALONE is wrong
        // here, in either shape. It is TRUE for a key that is PRESENT AND NULL,
        // which is precisely what `driver-sql` hands back for a clean lead
        // (measured: `has(record.duplicate_status)` against
        // `{ duplicate_status: null }` answers `{ ok: true, value: true }`), so
        // the guard needs a comparison beside it or the banner cries wolf on
        // every clean lead. #1289, covering both verdicts at once, spelled that
        // comparison `&& … != null`. A per-verdict banner spells it with the
        // EQUALITY, which is strictly narrower and subsumes it: measured on
        // this engine, `null == "suspected"` is a clean `false`, not a fault,
        // and the two spellings agree on every record shape a driver can
        // produce. Both halves of the shape #1289 ruled for are intact — the
        // `has()` guard verbatim, and a comparison that makes "set" mean set —
        // and the comparison got STRICTER, which is the point of the split. The
        // same spelling already ships one file over, on this same field: the
        // conversion flow's `e21` / `e25` edges (#1288) read
        // `has(vars.leadRecord.duplicate_status) && … == "suspected"`.
        //
        // ⛔ Neither half may be simplified away. Both are pinned, shape by
        // shape, including the reverse pin that the unguarded tail really does
        // fault.
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
        // per-component copy keys (`PAGE_COMPONENT_COPY_KEYS`, read on 17.6.0)
        // are title/description/label/placeholder/emptyText, so a plain-string
        // `body` would ship English to all four locales. Keeping both halves of one banner's copy in one
        // place beats splitting `title` into the locale packs.
        //
        // ⭐ Each banner's copy NAMES ITS OWN VERDICT, in the vocabulary the
        // `duplicate_status` chip below publishes, and never the other one —
        // pinned against the option labels read out of the locale packs in
        // `test/lead-duplicate-visibility.test.ts`, so renaming an option
        // re-aims the assertion rather than retiring it.
        {
          type: 'record:alert',
          id: 'lead_duplicate_alert_suspected',
          label: 'Suspected Duplicate Alert',
          properties: {
            // `warning`, not `error`: conversion still PROCEEDS on this
            // verdict, and the renderer maps `error` to `role="alert"` /
            // `aria-live="assertive"` — an interruption this state has not
            // earned.
            severity: 'warning',
            visible: P`has(record.duplicate_status) && record.duplicate_status == "suspected"`,
            title: {
              en: 'Suspected duplicate — compare before you convert',
              'zh-CN': '疑似重复——转换前请先比对',
              'ja-JP': '重複の疑い — 変換する前に照合してください',
              'es-ES': 'Duplicado Sospechoso: compare antes de convertir',
            },
            body: {
              en:
                'Intake matched this lead to a record this app already has. Duplicate '
                + 'Management below links that record — open it and compare. You can still '
                + 'convert this lead: this is the match intake guessed at, not a reviewer\'s '
                + 'decision. But if it is the same buyer, disqualify it instead, because '
                + 'converting creates a second account, contact and opportunity for them.',
              'zh-CN':
                '录入时发现该线索与系统中已有记录匹配。下方「重复线索管理」中是它重复的那条记录，'
                + '请先打开比对。该线索仍然可以转换：这是录入时的自动判断，不是审核人的结论。'
                + '但若确属同一客户，请改为取消资格——转换会为同一客户再创建一套客户、联系人和商机。',
              'ja-JP':
                '登録時に、このリードが既存レコードと一致しました。下の「重複管理」に重複先の'
                + 'レコードがあります。まず開いて照合してください。このリードはまだ変換できます。'
                + 'これは登録時の自動判定であり、担当者の結論ではありません。ただし同じ相手で'
                + 'あれば、変換せず不適格にしてください。変換すると同じ相手に取引先・取引先'
                + '責任者・商談がもう一組作成されます。',
              'es-ES':
                'La captura encontró que este prospecto coincide con un registro que ya '
                + 'existe. Gestión de Duplicados, más abajo, enlaza ese registro: ábralo y '
                + 'compárelo. Todavía puede convertir este prospecto, porque se trata de una '
                + 'coincidencia automática de la captura y no del veredicto de una persona. '
                + 'Pero si es el mismo comprador, descalifíquelo en su lugar: convertirlo '
                + 'crea una segunda cuenta, contacto y oportunidad para él.',
            },
          },
        },
        {
          type: 'record:alert',
          id: 'lead_duplicate_alert_confirmed',
          label: 'Confirmed Duplicate Alert',
          properties: {
            // `error`, and the level is the message: this is the state on which
            // the app REFUSES the rep's next click, and the renderer gives
            // `error` `role="alert"` / `aria-live="assertive"` rather than the
            // polite `role="status"` every other level gets. ⛔ The severity is
            // presentation only — what the app refuses was ruled by #1288 and
            // shipped by PR #1555, and nothing here changes it.
            severity: 'error',
            visible: P`has(record.duplicate_status) && record.duplicate_status == "confirmed"`,
            title: {
              en: 'Confirmed duplicate — conversion will be refused',
              'zh-CN': '已确认重复——转换将被拒绝',
              'ja-JP': '重複確定 — 変換は拒否されます',
              'es-ES': 'Duplicado Confirmado: la conversión será rechazada',
            },
            body: {
              // ⭐ The only place a rep learns the Convert button will refuse
              // them BEFORE they press it — until this banner, the refusal
              // dialog was the first they heard of it.
              en:
                'A reviewer checked this lead and recorded that it repeats a record this app '
                + 'already has, so Convert Lead refuses it — this banner is the only warning '
                + 'you get before you press the button. Disqualify this lead instead, naming '
                + 'the surviving record from Duplicate Management below. If the verdict is '
                + 'wrong, a reviewer revises Duplicate Status; there is no override here.',
              'zh-CN':
                '审核人已核实该线索与系统中已有记录重复，因此「转换线索」会拒绝执行——'
                + '本提示是你按下按钮前唯一的预警。请改为取消该线索的资格，并在下方'
                + '「重复线索管理」中注明保留的那条记录。若判定有误，应由审核人修改'
                + '「重复状态」，此处不提供强制转换的入口。',
              'ja-JP':
                '担当者が確認し、このリードは既存レコードの重複であると記録されました。'
                + 'そのため「リード変換」は拒否されます。この通知が、ボタンを押す前に得られる'
                + '唯一の警告です。このリードは不適格にしたうえで、下の「重複管理」で残す'
                + 'レコードを明記してください。判定が誤っている場合は担当者が「重複ステータス」'
                + 'を修正します。ここに強制変換の手段はありません。',
              'es-ES':
                'Una persona verificó que este prospecto repite un registro que ya existe, '
                + 'por lo que Convertir Prospecto lo rechazará: este aviso es la única '
                + 'advertencia antes de pulsar el botón. Descalifique el prospecto e indique '
                + 'el registro que sobrevive desde Gestión de Duplicados, más abajo. Si el '
                + 'veredicto es incorrecto, una persona debe cambiar el Estado del Duplicado; '
                + 'aquí no hay forma de forzar la conversión.',
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
                      // deleted with no successor: its `auto` | `custom`
                      // semantics were never implemented.
                      //
                      // Every section is a GROUP REFERENCE (#806, maintainer
                      // ruling C, decision batch #21, 2026-09-03). `{ group }`
                      // names one of crm_lead's `fieldGroups`, and the renderer
                      // derives that section's members, label, icon and collapse
                      // state from the object (`deriveFieldGroupLayout`,
                      // ADR-0085 §5). Membership has ONE declaration site — the
                      // `group:` on each field in lead.object.ts — and this page
                      // curates only the ORDER, so a field added to a group shows
                      // up here with no edit to this file. ⛔ Do not enumerate
                      // `fields:` again, and do not restate a key the group owns
                      // (`name` / `label` / `icon` / `collapsible` /
                      // `defaultCollapsed`) beside `group`: the spec refuses both.
                      //
                      // ⛔ `sections` stays load-bearing. Omitting it renders an
                      // EMPTY Details tab, not a `fieldGroups` fallback (#806 R28
                      // on 17.2.0, #1521); derivation is per section, through
                      // `group:`, never page-level.
                      //
                      // Measured on @objectstack/console 17.6.0 (#806 R70,
                      // headless Chromium, with a control leg; on 17.4.0 R61
                      // measured this form crashing the component). What a
                      // group section does there is the renderer's, not ours:
                      //   - it lays out its own column count (the page-level
                      //     `columns` above does not reach it);
                      //   - a group whose members are all empty renders nothing
                      //     (`duplicates` on a clean lead), unless the section
                      //     says `hideEmpty: false`;
                      //   - members the highlights strip registered are dropped,
                      //     so `assignment` (only `owner_id`) renders nothing on
                      //     this page — the owner is in the strip;
                      //   - a group declared `collapse: 'collapsed'` starts
                      //     collapsed; changing that is a `fieldGroups` decision
                      //     in lead.object.ts, not a key on this page.
                      //
                      // `hideEmpty: false` (#2003, the #1211 reasoning) sits on
                      // the groups whose every member a rep types and the
                      // create form asks for: `contact_info` (`mobile` and
                      // `website` once the strip takes `email` and `phone`),
                      // `address`, and `additional` (revenue, headcount,
                      // description, notes). Without it all three vanish on a
                      // fresh lead, so a rep cannot see what is left to fill.
                      // Not on `assignment`: its derived list is empty, and the
                      // renderer draws nothing for an empty list whatever
                      // `hideEmpty` says. Not on `duplicates`: the
                      // `lead_duplicate_check` hook writes it.
                      sections: [
                        { group: 'identity' },
                        { group: 'company_info' },
                        { group: 'contact_info', hideEmpty: false },
                        // Do Not Call / Email Opt Out, right under the numbers
                        // a rep is about to dial (#806).
                        { group: 'preferences' },
                        { group: 'qualification' },
                        { group: 'assignment' },
                        { group: 'address', hideEmpty: false },
                        { group: 'conversion' },
                        // The LINK half of the duplicate banners (#1207): the
                        // group carries both survivor lookups, because
                        // `lead_duplicate_check` matches contacts before leads.
                        // On a clean lead every member is empty, so the section
                        // renders nothing. ⚠️ Not the highlights strip:
                        // `record:highlights` caps `fields` at 7 and holds 6.
                        { group: 'duplicates' },
                        // Description and Notes — kept last, where the page's
                        // Description section always sat.
                        { group: 'additional', hideEmpty: false },
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

  // ARIA accessibility
  aria: {
    ariaLabel: 'Lead Detail Page',
    ariaDescribedBy: 'Detailed view of lead information with related records and activity',
  },
};
