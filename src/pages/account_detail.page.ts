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
 *   header   · Custom `page:header` with an ACCOUNT eyebrow,
 *              building icon, and breadcrumb back to the list.
 *
 *   discussion · `record:chatter` is already auto-emitted, but we
 *              re-state it so it ALWAYS appears — even on accounts
 *              with no related lists (the auto-emitter sometimes
 *              skips chatter for lean objects). Discussion is core
 *              to the chat-first vibe.
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
        eyebrow: 'ACCOUNT',
        // `icon` was REMOVED from `page:header` in @objectstack/spec 17.0.0
        // (#6946, ADR-0087 D2). It is deleted rather than renamed because no
        // renderer ever read it: objectui resolves `icon` per header ACTION
        // (`action.icon`) and never off the header's own props bag, and the
        // component registry never published it as an input — which is what put
        // the key in objectui's `UNPUBLISHED_EXEMPTIONS` as a "spec declares it,
        // NO renderer read point" entry. The header's own identity comes from
        // the record chrome (`recordChrome`, on by default).
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
      properties: {
        enableComments: true,
        enableReactions: true,
        enableMentions: true,
      },
    },
  },
} as unknown as Page;
