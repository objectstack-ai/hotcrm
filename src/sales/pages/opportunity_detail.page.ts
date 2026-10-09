// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { Page } from '@objectstack/spec/ui';

/**
 * Opportunity Detail Record Page
 *
 * Salesforce Lightning-style record page for the `crm_opportunity` object.
 * Mirrors the lead_detail blueprint: single-column full-width layout with
 * a Lightning-style header chip, primary action, key highlights strip and
 * status path, then a tab strip below. No sidebar — secondary widgets such
 * as the AI assistant live in the floating console chat instead.
 */
export const OpportunityDetailPage: Page = {
  name: 'opportunity_detail_page',
  label: 'Opportunity Detail',
  description: 'Comprehensive opportunity detail page with path, highlights, details, and related lists',

  type: 'record',
  object: 'crm_opportunity',

  template: 'full-width',
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
      ],
    },
    {
      name: 'main',
      width: 'large',
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
                          // ⚠️ ONLY the first panel, and that is the renderer's
                          // choice rather than a preference: with `allowMultiple`
                          // absent (it defaults false) the accordion mounts as
                          // `type="single"` and takes `defaultValue={open[0]}` —
                          // one panel, the first in declaration order. Marking
                          // Products or Open Tasks too would change nothing on
                          // screen. Opening more than one means declaring
                          // `allowMultiple: true`, which changes the interaction
                          // model (panels stop closing each other) and is not
                          // this card's ask.
                          //
                          // ⛔ NOT "default-open the sections that have rows",
                          // which the card asked for first: that is not
                          // expressible here. `collapsed` is a static boolean on
                          // a strict item shape (`label` / `icon` / `collapsed` /
                          // `children` — nothing else parses), the page is
                          // authored metadata evaluated before any row is read,
                          // and the related lists below fetch their own rows
                          // after mount. Reported rather than worked around; ⛔
                          // the component is not this repo's to change.
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
                                // `required` + `storage.notNull`, so the insert
                                // would be refused. It is not, because the two
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
                                // rejected as "Sales Price is required" — so the
                                // assertion cannot pass vacuously.
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
                                    // ("Set is_active=false to retire instead"),
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
