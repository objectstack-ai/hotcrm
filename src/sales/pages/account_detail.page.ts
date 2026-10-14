// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';

/**
 * Account Detail — slotted record page.
 *
 * We use ObjectUI's **slotted page** pattern: the default-page
 * synthesizer owns layout (header, highlights, path, tabs with
 * Details/Related/Activity/History, reference rail). We override
 * two slots:
 *
 *   header   · Custom `page:header` with title and subtitle. It used to
 *              claim an ACCOUNT eyebrow, a building icon and a breadcrumb
 *              back to the list; none of them ever drew anything (#1269 and
 *              the props notes below — `breadcrumb` retired in 17.6.0).
 *
 *   discussion · `record:chatter` is already auto-emitted, but we
 *              re-state it so it ALWAYS appears — even on accounts
 *              with no related lists (the auto-emitter sometimes
 *              skips chatter for lean objects). Discussion is core
 *              to the chat-first vibe, and it is the account's
 *              activity timeline: its one `feed` turns on the
 *              completed rows a logged call or meeting writes
 *              (see the slot's note).
 *
 * Why not embed an inline chat panel? `ai:chat_window` was dropped
 * from objectui (see @object-ui/layout CHANGELOG 5.x). The supported
 * surface is the global floating chatbot mounted by app-shell, which
 * picks up `defaultAgent: 'ask'` from this app and is launched from
 * the FAB at the bottom-right.
 */
export const AccountDetailPage = {
  name: 'account_detail_page',
  label: 'Account Detail',
  description:
    'Slotted account record page — custom header + persistent discussion feed.',

  type: 'record',
  object: 'crm_account',

  kind: 'slotted',
  regions: [],

  slots: {
    header: {
      type: 'page:header',
      id: 'account_header_slotted',
      label: 'Account Header (slotted)',
      properties: {
        title: '{name}',
        subtitle: '{industry} · {type}',
        // `icon` and `eyebrow` are GONE, and for two different reasons — both
        // measured against the contract rather than inferred from the warning
        // text (#1269).
        //
        // `icon` was REMOVED from `page:header` in @objectstack/spec 17.0.0
        // (#6946, ADR-0087 D2). It is deleted rather than renamed because no
        // renderer ever read it: objectui resolves `icon` per header ACTION
        // (`action.icon`) and never off the header's own props bag, and the
        // component registry never published it as an input — which is what put
        // the key in objectui's `UNPUBLISHED_EXEMPTIONS` as a "spec declares it,
        // NO renderer read point" entry. The header's own identity comes from
        // the record chrome (`recordChrome`, on by default).
        //
        // `eyebrow` was never declared by anything. It is not in
        // `PageHeaderProps`, it has no alias or tombstone there, and the string
        // "eyebrow" does not occur anywhere in objectui — no schema, no
        // registry input, no renderer. So the ACCOUNT kicker this page's
        // docblock used to promise has never reached a screen: the props bag is
        // `z.record(z.string(), z.unknown())`, so the key was carried into the
        // artifact and dropped at render. Deleting it changes nothing a user
        // sees; it only stops the source claiming a kicker exists.
        // `breadcrumb` retired from `page:header` in @objectstack/spec 17.6.0
        // (#20785, `page-header-breadcrumb-removed`) — deleted: no renderer
        // ever drew a trail for it; the app shell's own trail is unchanged.
        // Overriding the `header` slot REPLACES the synthesized header, actions
        // and all — so this slot has to re-state every action it wants to keep.
        // Before #592 it named none, which is why an account record showed no
        // activity buttons at all while the list row's ⋮ menu showed three.
        //
        // Action IDs, not `ActionDef` objects: `PageHeaderProps.actions` is
        // `z.array(z.string())` ("Action IDs to show in header") in
        // @objectstack/spec 17.3.0, and this repo authors against the protocol
        // (#1653). Each id is the `name` of a crm_account-scoped action in
        // `src/sales/actions/activity-actions.ts`.
        actions: ['log_call', 'log_meeting', 'schedule_meeting'],
      },
    },

    discussion: {
      type: 'record:chatter',
      id: 'account_chatter',
      label: 'Discussion',
      /**
       * One `feed`, for one reason: `showCompleted` (#2071).
       *
       * This feed IS the account's activity timeline — the slotted page
       * synthesizes no Activity tab, so the panel's "All Activity" stream is
       * where an account's `sys_activity` rows surface. A call or meeting
       * logged on the account is a row of type `completed` (the `task` feed
       * kind), and the timeline drops every such row unless
       * `feed.showCompleted` is true — so Log a Call / Log a Meeting on an
       * account wrote a row that appeared nowhere on the account.
       *
       * Authoring a `feed` costs two more keys, and they are stated rather
       * than left out. `RecordChatterRenderer` builds `{ position: 'bottom',
       * collapsible: false, feed: { enableReactions: true, enableThreading:
       * true, showCommentInput: true }, ...schema }` — one shallow spread — so
       * a `feed` of our own REPLACES that default object wholesale, and
       * `RecordActivityTimeline` reads `enableReactions ?? false` and
       * `enableThreading ?? false` off what is left. Without the two keys
       * below, reactions and threading would silently switch off.
       * `showCommentInput` needs no restating: the timeline reads it as
       * `!== false`.
       *
       * `feed.enableMentions` needs none either: the renderer reads it as
       * `!== false` too. And the older note still holds (#1269):
       * `enableComments` and a top-level `enableReactions` / `enableMentions`
       * are not `record:chatter` keys — `RecordChatterProps` declares
       * `position`, `width`, `collapsible`, `defaultCollapsed`, `feed` and
       * `aria`, nothing else.
       */
      properties: {
        feed: {
          showCompleted: true,
          enableReactions: true,
          enableThreading: true,
        },
      },
    },
  },
} as unknown as Page;
