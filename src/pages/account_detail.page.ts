// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';
import {
  AccountLogCallAction,
  AccountLogMeetingAction,
  AccountScheduleMeetingAction,
} from '../actions/global.actions';

/**
 * Account Detail — slotted record page.
 *
 * We use ObjectUI's **slotted page** pattern: the default-page
 * synthesizer owns layout (header, highlights, path, tabs with
 * Details/Related/Activity/History, reference rail). We override
 * two slots:
 *
 *   header   · Custom `page:header` with title, subtitle and a breadcrumb
 *              back to the list. It used to claim an ACCOUNT eyebrow and a
 *              building icon; neither key exists on `page:header`, so neither
 *              ever drew anything (#1269 — the props note below).
 *
 *   discussion · `record:chatter` is already auto-emitted, but we
 *              re-state it so it ALWAYS appears — even on accounts
 *              with no related lists (the auto-emitter sometimes
 *              skips chatter for lean objects). Discussion is core
 *              to the chat-first vibe. It carries no props: the
 *              renderer's own defaults already deliver comments,
 *              reactions and threading (see the slot's note).
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
        breadcrumb: true,
        // Overriding the `header` slot REPLACES the synthesized header, actions
        // and all — so this slot has to re-state every action it wants to keep.
        // Before #592 it named none, which is why an account record showed no
        // activity buttons at all while the list row's ⋮ menu showed three.
        actions: [AccountLogCallAction, AccountLogMeetingAction, AccountScheduleMeetingAction],
      },
    },

    discussion: {
      type: 'record:chatter',
      id: 'account_chatter',
      label: 'Discussion',
      /**
       * No props — and that is the fix, not an omission (#1269).
       *
       * This slot used to author `enableComments` / `enableReactions` /
       * `enableMentions`. None of the three is a `record:chatter` key:
       * `RecordChatterProps` declares `position`, `width`, `collapsible`,
       * `defaultCollapsed`, `feed` and `aria`, and nothing else, so all three
       * were stripped by the props schema and dropped at render.
       *
       * Every behaviour they asked for is already on, from the renderer's own
       * defaults — measured, not assumed. `RecordChatterRenderer` builds
       * `{ position: 'bottom', collapsible: false, feed: { enableReactions:
       * true, enableThreading: true, showCommentInput: true }, ...schema }` and
       * hands `config.feed` to `RecordActivityTimeline`, which reads
       * `showCommentInput !== false`, `enableReactions ?? false` and
       * `enableThreading ?? false` off it. Comments, reactions and threading
       * are therefore already delivered; deleting these keys costs the page
       * nothing.
       *
       * The two spellings that DO land are deliberately not authored here:
       *
       *   - Re-authoring them under `feed` would REPLACE that default object
       *     wholesale — the merge above is one shallow spread, so a `feed` of
       *     our own silently turns `enableThreading` OFF unless every key is
       *     restated. Materializing a renderer default also rewrites "the
       *     author said nothing" into "the author asked for the default",
       *     which is the distinction @objectstack/spec's own `maxVisible` and
       *     `inlineEdit` docblocks refuse to blur.
       *   - `enableMentions` has no read point on THIS surface at all: the
       *     mentions branch lives in the `record:activity` renderer, and
       *     `record:chatter` mounts `RecordActivityTimeline` directly, past it.
       *     Authoring it under `feed` would parse and still do nothing.
       */
      properties: {},
    },
  },
} as unknown as Page;
