// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import { Page } from '@objectstack/spec/ui';
import { HIGH_VALUE_DEAL_AMOUNT } from '../objects/_thresholds';

/**
 * Opportunity Detail Record Page
 *
 * Salesforce Lightning-style record page for the `crm_opportunity` object.
 * Mirrors the lead_detail blueprint on the `default` template: a
 * Lightning-style header chip, primary action, key highlights strip and
 * status path, then a tab strip below, with the reference rail in the
 * `aside` slot. Secondary widgets such as the AI assistant live in the
 * floating console chat instead.
 */
export const OpportunityDetailPage: Page = {
  name: 'opportunity_detail_page',
  label: 'Opportunity Detail',
  description: 'Comprehensive opportunity detail page with path, highlights, details, and related lists',

  type: 'record',
  object: 'crm_opportunity',

  template: 'default',
  kind: 'full',
  variables: [
    { name: 'activeTab', type: 'string', defaultValue: 'details' },
  ],

  regions: [
    {
      name: 'header',
      width: 'full',
      components: [
        {
          type: 'page:header',
          id: 'opp_header',
          label: 'Opportunity Information',
          properties: {
            title: '{name}',
            // The lookup field is `crm_account` — `{account}` matched nothing
            // and the subtitle rendered blank.
            subtitle: '{crm_account}',
            // `icon` removed from `page:header` in @objectstack/spec 17.0.0
            // (#6946, ADR-0087 D2) — deleted, not renamed. See the full note on
            // `account_detail.page.ts`; nothing ever drew it.
            // `breadcrumb` retired from `page:header` in @objectstack/spec 17.6.0
            // (#20785, `page-header-breadcrumb-removed`) — deleted: no renderer
            // ever drew a trail for it; the app shell's own trail is unchanged.
            // generate_quote is the CPQ entry point (opportunity → quote); a
            // custom record page replaces the default header, so the action
            // must be listed here explicitly or it is unreachable. The same
            // sentence is why the three activity actions are named here (#592):
            // without them a rep can log a call on the deal only from the list
            // row's ⋮ menu, never from the deal itself.
            //
            // Action IDs, not `ActionDef` objects: `PageHeaderProps.actions` is
            // `z.array(z.string())` ("Action IDs to show in header") in
            // @objectstack/spec 17.3.0, and this repo authors against the
            // protocol (#1653). Each id is the `name` of a
            // crm_opportunity-scoped action — `generate_quote` /
            // `clone_opportunity` in `src/sales/actions/opportunity.actions.ts`, the
            // activity trio in `src/sales/actions/activity-actions.ts`.
            actions: [
              'generate_quote',
              'clone_opportunity',
              'log_call',
              'log_meeting',
              'schedule_meeting',
            ],
          },
        },
        {
          type: 'record:highlights',
          id: 'opp_highlights',
          label: 'Key Information',
          properties: {
            fields: ['amount', 'close_date', 'probability', 'expected_revenue', 'owner_id', 'crm_account'],
          },
        },
        {
          type: 'record:path',
          id: 'opp_stage_path',
          label: 'Opportunity Stage Path',
          properties: {
            statusField: 'stage',
            // Every canonical value of `stage` must appear here, in funnel
            // order — the path is the only place a rep reads "where is this
            // deal". `needs_analysis` was missing, so a deal sitting in that
            // stage lit up NO step at all and the strip read as if the deal
            // had skipped from Qualification to Proposal. The two terminal
            // stages stay last (won before lost), matching lead_detail's
            // converted/unqualified tail.
            stages: [
              { value: 'prospecting', label: 'Prospecting' },
              { value: 'qualification', label: 'Qualification' },
              { value: 'needs_analysis', label: 'Needs Analysis' },
              { value: 'proposal', label: 'Proposal' },
              { value: 'negotiation', label: 'Negotiation' },
              { value: 'closed_won', label: 'Closed Won' },
              { value: 'closed_lost', label: 'Closed Lost' },
            ],
          },
        },
        // ── A deal waiting on approval says so (#2371 row 2) ──
        // The save that sends a deal for approval (`opportunity_approval`,
        // started by the amount reaching the large-deal line) shows only the
        // ordinary save toast, and the page gains Recall / Reply buttons with
        // no word on why. No hook or flow on 18.2.0 can add a message to that
        // save's toast, so the page carries the message for as long as the
        // request waits: who decides, that the deal is locked, and what
        // Recall does. Two banners, because the approver differs with the
        // amount (the tiers in `opportunity-approval.flow.ts`); the copy is
        // inline locale maps for the reason `lead_detail.page.ts` gives.
        // The `has()` guard and the equality are the shape that note pins:
        // this renderer fails soft to SHOWN on an unevaluable predicate.
        {
          type: 'record:alert',
          id: 'opp_approval_pending_manager',
          label: 'Waiting on Sales Manager Approval',
          properties: {
            severity: 'info',
            visible: P`has(record.approval_status) && record.approval_status == "pending"
              && (!has(record.amount) || record.amount == null || record.amount <= ${HIGH_VALUE_DEAL_AMOUNT})`,
            title: {
              en: 'Sent for approval to a Sales Manager',
              'zh-CN': '已提交销售经理审批',
              'ja-JP': '営業マネージャーの承認待ちです',
              'es-ES': 'Enviada a aprobación de un Gerente de Ventas',
            },
            body: {
              en:
                'This deal reached the large-deal amount, so saving it sent it for approval. '
                + 'It is locked until a Sales Manager decides. Recall, above the title, '
                + 'withdraws the request and unlocks the deal; your next save sends it again.',
              'zh-CN':
                '该商机金额达到大额门槛，保存时已自动提交审批。在销售经理做出决定前，商机处于锁定状态。'
                + '点击标题上方的「撤回」可撤回审批请求并解锁商机；下一次保存会重新提交审批。',
              'ja-JP':
                'この商談は大型案件の金額に達したため、保存時に承認へ回されました。営業マネージャーが'
                + '判断するまでロックされます。タイトル上の「取り下げ」で申請を取り下げてロックを解除できます。'
                + '次に保存すると再び承認へ回されます。',
              'es-ES':
                'Esta oportunidad alcanzó el importe de gran operación, así que al guardarla se envió '
                + 'a aprobación. Queda bloqueada hasta que un Gerente de Ventas decida. Retirar, encima '
                + 'del título, retira la solicitud y la desbloquea; el siguiente guardado la vuelve a enviar.',
            },
          },
        },
        {
          type: 'record:alert',
          id: 'opp_approval_pending_director',
          label: 'Waiting on Sales Manager and Sales Director Approval',
          properties: {
            severity: 'info',
            visible: P`has(record.approval_status) && record.approval_status == "pending"
              && has(record.amount) && record.amount != null && record.amount > ${HIGH_VALUE_DEAL_AMOUNT}`,
            title: {
              en: 'Sent for approval to a Sales Manager, then a Sales Director',
              'zh-CN': '已提交审批：先由销售经理审批，再由销售总监审批',
              'ja-JP': '営業マネージャー、続いて営業ディレクターの承認待ちです',
              'es-ES': 'Enviada a aprobación de un Gerente de Ventas y después de un Director de Ventas',
            },
            body: {
              en:
                'This deal is over $500,000, so saving it sent it for two approvals: a Sales '
                + 'Manager first, then a Sales Director. It is locked until both decide. Recall, '
                + 'above the title, withdraws the request and unlocks the deal; your next save '
                + 'sends it again.',
              'zh-CN':
                '该商机金额超过 $500,000，保存时已自动提交两级审批：先由销售经理审批，再由销售总监审批。'
                + '两级都做出决定前，商机处于锁定状态。点击标题上方的「撤回」可撤回审批请求并解锁商机；'
                + '下一次保存会重新提交审批。',
              'ja-JP':
                'この商談は $500,000 を超えるため、保存時に 2 段階の承認へ回されました。まず営業'
                + 'マネージャー、次に営業ディレクターです。両方が判断するまでロックされます。タイトル上の'
                + '「取り下げ」で申請を取り下げてロックを解除できます。次に保存すると再び承認へ回されます。',
              'es-ES':
                'Esta oportunidad supera los $500,000, así que al guardarla se envió a dos aprobaciones: '
                + 'primero un Gerente de Ventas y después un Director de Ventas. Queda bloqueada hasta '
                + 'que ambos decidan. Retirar, encima del título, retira la solicitud y la desbloquea; '
                + 'el siguiente guardado la vuelve a enviar.',
            },
          },
        },
      ],
    },
    {
      name: 'main',
      components: [
        {
          type: 'page:tabs',
          id: 'opp_main_tabs',
          properties: {
            // `type` → `tabStyle` (@objectstack/spec 17.0.0, #6776, ADR-0087
            // D2). Same three values; see the full note on `home.page.ts`.
            tabStyle: 'line',
            position: 'top',
            items: [
              {
                // Tab item `key` → `value` (#1269): `value` is the stable
                // `?tab=` URL token the renderer reads, `key` is read by
                // nothing. See the full note on `case_detail.page.ts`.
                value: 'details',
                label: 'Details',
                children: [
                  {
                    type: 'record:details',
                    id: 'opp_details',
                    label: 'Opportunity Details',
                    properties: {
                      // `columns` is a STRING enum ('1'|'2'|'3'|'4') in
                      // @objectstack/spec 17. `layout` is gone (removed in spec
                      // 17.0.0, #6946 / ADR-0087 D2).
                      columns: '2',
                      // Every section references one of crm_opportunity's
                      // `fieldGroups` (#1452, the #806 class ruling C): the
                      // renderer derives members, label, icon and collapse state
                      // from the object, so this page curates only the order.
                      // The full note — what a group section does on 17.6.0 and
                      // what may not sit beside `group` — is on
                      // `lead_detail.page.ts`.
                      //
                      // The highlights strip still wins (#1211): the renderer
                      // drops every field `record:highlights` registered, and the
                      // record title, from the derived members. So `basic` shows
                      // `primary_contact` only, and `financials` (`amount`,
                      // `expected_revenue`, both in the strip) renders nothing
                      // here — it stays referenced so that a field added to the
                      // group reaches this tab without an edit to this file.
                      //
                      // `hideEmpty: false` keeps an ALL-empty section on screen
                      // (#1211). The platform default (objectui#8603 ruling A)
                      // renders such a section as nothing at all, so on a deal
                      // with only its required fields the deal's type and
                      // source (`classification`), its campaign (`campaign`)
                      // and its description and next step (`notes`) vanished —
                      // the very fields a seller fills in later. Kept, they
                      // show as labelled empty rows to fill. Measured on
                      // 17.6.0 on such a deal: 2 sections render without it, 5
                      // with it. Not on `basic` (its only member outside the
                      // title and the strip is `primary_contact`), nor on
                      // `financials`: both members sit in the strip, the
                      // derived list is empty, and the renderer draws nothing
                      // for an empty list whatever `hideEmpty` says.
                      //
                      // `qualification` and `narrative` (REQ-0006) sit right
                      // after `sales_process`, the order the object declares
                      // them in, and both keep `hideEmpty: false` on the same
                      // reasoning: every member is a judgement or a piece of
                      // prose the seller is expected to write (bid / no-bid,
                      // controllability, priority, deal level, subcontracting;
                      // the four narrative fields), none sits in the strip, and
                      // no deal that predates REQ-0006 carries any of them — so
                      // without the key both sections vanish on every existing
                      // deal, which is exactly where a seller would fill them.
                      sections: [
                        { group: 'basic' },
                        { group: 'financials' },
                        { group: 'classification', hideEmpty: false },
                        { group: 'campaign', hideEmpty: false },
                        { group: 'sales_process' },
                        { group: 'qualification', hideEmpty: false },
                        { group: 'narrative', hideEmpty: false },
                        { group: 'crm_forecast' },
                        { group: 'notes', hideEmpty: false },
                      ],
                    },
                  },
                ],
              },
              {
                value: 'related',
                label: 'Related',
                children: [
                  {
                    type: 'page:accordion',
                    id: 'opp_related_accordion',
                    properties: {
                      allowMultiple: true,
                      items: [
                        {
                          // Accordion item `key` is DELETED, not renamed to
                          // `value` — the opposite verdict to the tab items
                          // above, because this renderer overwrites `value` with
                          // `panel-<index>`. See the full note on
                          // `case_detail.page.ts`.
                          label: 'Quotes',
                          // OPEN on arrival (#1214 item 6). All three panels
                          // used to start shut, so the Related tab opened on
                          // three closed bars whose headers already carried the
                          // counts — the click bought the user nothing the page
                          // had not already told them.
                          //
                          // `collapsed: false` is the whole mechanism, and it is
                          // needed even though the schema DEFAULTS it to false:
                          // the renderer opens the panels it finds by strict
                          // identity — `items.filter(i => i.collapsed === false)`
                          // — so an item that simply omits the key is
                          // `undefined`, not `false`, and stays shut. Measured
                          // on the @objectstack/console 17.3.0 bundle — the pin
                          // at that taking, ⛔ NOT re-taken on 17.4.0
                          // (#1814, #1807) or 17.5.0 —
                          // and the component's own designer text says the same
                          // ("collapsed: false opens a panel by default").
                          //
                          // EVERY panel opens (#2369 row 9), the lead page's
                          // shape: `allowMultiple: true` above mounts the
                          // accordion as `type="multiple"`, so the renderer
                          // opens each item marked `collapsed: false` instead of
                          // only the first. Before, Products and Open Tasks
                          // started shut and closed each other, and a deal's
                          // line items (and their Add) sat behind a click.
                          //
                          // ⛔ Still NOT "open the sections that have rows":
                          // `collapsed` is a static boolean on a strict item
                          // shape (`label` / `icon` / `collapsed` / `children`),
                          // the page is evaluated before any row is read, and
                          // the related lists fetch their own rows after mount.
                          collapsed: false,
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'opp_quotes',
                              properties: {
                                objectName: 'crm_quote',
                                relationshipField: 'crm_opportunity',
                                columns: ['quote_number', 'name', 'status', 'total_price', 'expiration_date'],
                                limit: 10,
                              },
                            },
                          ],
                        },
                        {
                          label: 'Products',
                          collapsed: false,
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'opp_products',
                              properties: {
                                objectName: 'crm_opportunity_line_item',
                                relationshipField: 'crm_opportunity',
                                columns: ['crm_product', 'quantity', 'unit_price', 'total_price'],
                                limit: 10,
                                // The entry point that was missing (#1731). Every
                                // OTHER surface already treated line items as
                                // live — three profiles grant `allowCreate`, the
                                // docs describe the amount rolling up from them,
                                // and `billing-handoff.flow.ts`'s
                                // `load_line_items` reads them on every won deal
                                // — while nothing in the app could create one:
                                // no action, no list view, no navigation entry,
                                // no seed. A rep who wanted to itemise a deal had
                                // to type the Amount by hand. Declared surface and
                                // reachable surface now coincide again.
                                //
                                // What `add` writes is the whole reason a picker
                                // is sufficient here. It creates a row carrying
                                // exactly two authored keys —
                                // `{ [relationshipField]: <opportunityId>,
                                //    [linkField]: <pickedProductId> }` — and
                                // nothing else. On this object that would leave
                                // `quantity` and `unit_price` unset, and both are
                                // `storage.notNull` (`quantity` also `required`),
                                // so the insert would be refused. It is not, because the two
                                // gaps are already filled by machinery that
                                // predates this list:
                                //
                                //   quantity   -> the field's own `defaultValue: 1`
                                //   unit_price -> `_line-item-price-fill.ts`, which
                                //                 on `beforeInsert` stamps
                                //                 `list_price` from the chosen
                                //                 product and defaults the
                                //                 negotiated `unit_price` to it
                                //   discount   -> the field's own `defaultValue: 0`
                                //   total_price-> the formula over the three above
                                //
                                // and `crm_product.list_price` is itself `required`
                                // + `notNull`, so the hook can never fail to find a
                                // source. Measured end-to-end, not reasoned:
                                // `test/opportunity-line-item-add-picker.test.ts`
                                // inserts the picker's exact two-key shape and
                                // asserts the complete priced row, with an ablation
                                // that unbinds the hook and shows the same insert
                                // refused by the `unit_price` NOT NULL column — so
                                // the assertion cannot pass vacuously.
                                //
                                // ⛔ Do not add a `label`. The button falls back to
                                // the platform's own localized "Add"; the
                                // translation bundles reach a page component through
                                // `pages.<page>.components.<id>`, which carries
                                // `label`/`title`/`description` for the COMPONENT
                                // and has no route to a nested `add.label`. A
                                // hand-authored string here would ship English into
                                // the zh-CN / es-ES / ja-JP bundles with no key to
                                // translate it under.
                                //
                                // `valueField` and `labelField` are both omitted on
                                // purpose rather than restated: `valueField`
                                // defaults to `id`, which is what the `crm_product`
                                // lookup stores, and `labelField` defaults to the
                                // picked object's own title field — `crm_product`
                                // declares `nameField: 'display_title'` (ADR-0079),
                                // so the picker labels rows "PRD-0001 - Widget" and
                                // keeps ONE source of truth for a product's title.
                                // That formula title is searchable only because the
                                // object also declares `searchableFields`, which it
                                // already does for exactly this reason.
                                add: {
                                  picker: {
                                    object: 'crm_product',
                                    // A retired product must not be sellable onto a
                                    // new deal. `product.hook.ts`'s `beforeDelete`
                                    // defines retirement as precisely this flag
                                    // ("To retire it instead, turn off Active."
                                    // Active is `is_active`),
                                    // so the catalog's own retirement mechanism is
                                    // what scopes the picker. All 13 seeded
                                    // products carry `is_active: true`, so this
                                    // narrows without emptying.
                                    filter: [{ field: 'is_active', operator: 'equals', value: true }],
                                  },
                                  linkField: 'crm_product',
                                },
                              },
                            },
                          ],
                        },
                        {
                          label: 'Open Tasks',
                          collapsed: false,
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'opp_tasks',
                              properties: {
                                objectName: 'crm_task',
                                relationshipField: 'related_to_opportunity',
                                columns: ['subject', 'status', 'priority', 'due_date', 'owner_id'],
                                filter: [{ field: 'status', operator: 'not_equals', value: 'completed' }],
                                limit: 10,
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
                value: 'activity',
                label: 'Activity',
                children: [
                  {
                    type: 'record:activity',
                    id: 'opp_activity',
                    /**
                     * `filters` is deleted with nothing put in its place, and
                     * that is the whole finding (#1269).
                     *
                     * It used to read `['all', 'tasks', 'meetings', 'calls',
                     * 'emails']` — a vocabulary that exists nowhere in the
                     * contract. `RecordActivityProps` has exactly two filter
                     * channels and neither takes that list:
                     *
                     *   `types`      — an array of FEED ITEM KINDS
                     *                  (`comment` | `field_change` | `task` |
                     *                  `event` | `email` | `call` | …). Not
                     *                  these values: `all` is not a kind and
                     *                  `meetings` is not one either (the kind
                     *                  is `event`), and all five are plural
                     *                  where the enum is singular.
                     *   `filterMode` — ONE default for the panel's dropdown,
                     *                  from `all` | `comments_only` |
                     *                  `changes_only` | `tasks_only`. The
                     *                  dropdown's option list is the renderer's,
                     *                  not authorable.
                     *
                     * So the list was reaching for a third thing — "offer these
                     * filter chips" — that the component does not expose. What
                     * it wanted is already delivered: `showFilterToggle`
                     * defaults on, so the panel renders its filter dropdown, and
                     * `filterMode` defaults to `all`, so it opens unfiltered.
                     * Neither is restated here, because materializing a default
                     * turns "the author said nothing" into "the author asked for
                     * the default" — a different fact, and the one a later
                     * liveness audit reads.
                     *
                     * Mapping it onto `types` instead was considered and
                     * rejected: #1209 corrected exactly that mistake one page
                     * over (the lead timeline's `types: ['crm_task']`), and the
                     * renderer sanitises out-of-enum members then reads the
                     * EMPTY remainder as "no filter authored" — so a bad `types`
                     * is indistinguishable from no `types` on screen while
                     * claiming otherwise in source. A `types` here would also
                     * be a NEW restriction nobody asked for: it would drop
                     * comments and field changes from a timeline that shows them
                     * today.
                     */
                    properties: {
                      limit: 25,
                      // Load-bearing (#2071): a call or meeting logged on the
                      // deal is a `sys_activity` row of type `completed` (the
                      // `task` feed kind), and the renderer drops every such
                      // row unless this is true — so a rep's logged call never
                      // reached this tab. The deal's other `completed` writers
                      // are its own won / lost milestones
                      // (`opportunity.object.ts`), which belong here too.
                      // Completed crm_task rows do NOT arrive: their audit rows
                      // are keyed to the task, and this feed reads only rows
                      // keyed to the deal. Nor is this the `types` restriction
                      // the note above refuses: it adds rows and filters none.
                      showCompleted: true,
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
      name: 'aside',
      width: 'small',
      components: [
        {
          type: 'record:reference_rail',
          id: 'opp_reference_rail',
          properties: {
            /**
             * No entry declares a `title` — deliberately (#972).
             *
             * The rail resolves a card's heading as
             * `entry.title || i18n.objectLabel({ name: objectName, … })`, so a
             * literal `title` does not merely provide a default: it WINS, and
             * the locale bundle is never consulted. The three literals that
             * used to sit here (`Quotes` / `Products` / `Open Tasks`) therefore
             * printed English into every one of the four locales this app
             * ships, on top of `objects.<name>.label` already being translated
             * in all of them. Dropping them hands the heading back to the
             * translation bundle — the single source of truth for what an
             * object is called — so a locale added later is covered for free.
             *
             * A translated literal is not available as an alternative: unlike
             * `record:alert`, whose `title` is run through the inline
             * translation-map resolver, the rail renders `entry.title` as a
             * raw React child. An `{ en, 'zh-CN' }` map here would not be
             * resolved — it would be handed to React as an object.
             *
             * The third card losing the word "Open" is a correction, not a
             * casualty. A rail entry has no filter at all — the rail queries
             * `{ $filter: { [relationshipField]: parentId }, $top: limit }` and
             * reads nothing else — so that card always counted and listed this
             * deal's tasks whatever their status. The heading claimed a filter
             * the component cannot apply. The genuinely filtered view is the
             * `opp_tasks` related list on the *Related* tab above, which does
             * carry `status neq completed`.
             *
             * Pinned by `test/metadata-references.test.ts` (entries resolve,
             * no literal titles) and `test/i18n-references.test.ts` (every
             * rail object has a `label` in every locale, so the fallback
             * lands on a translation rather than on a humanized object name).
             */
            entries: [
              {
                objectName: 'crm_quote',
                relationshipField: 'crm_opportunity',
                limit: 3,
              },
              {
                objectName: 'crm_opportunity_line_item',
                relationshipField: 'crm_opportunity',
                limit: 3,
              },
              {
                objectName: 'crm_task',
                relationshipField: 'related_to_opportunity',
                limit: 3,
              },
            ],
          },
        },
      ],
    },
  ],

  isDefault: true,

  aria: {
    ariaLabel: 'Opportunity Detail Page',
    ariaDescribedBy: 'Detailed view of opportunity information with related records and activity',
  },
};
