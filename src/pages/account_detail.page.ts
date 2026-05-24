// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';

/**
 * Account Detail — AI-rich slotted record page.
 *
 * v1 launch story Wow #3: the account page presents AI as a
 * first-class structural element, not a bolted-on widget.
 *
 * We use ObjectUI's **slotted page** pattern: the default-page
 * synthesizer owns layout (header, highlights, path, tabs with
 * Details/Related/Activity/History, reference rail). We override
 * three slots:
 *
 *   header   · Custom `page:header` with an ACCOUNT eyebrow,
 *              building icon, and breadcrumb back to the list.
 *
 *   rightRail· "Ask Copilot about this account" card. Sits next to
 *              the auto-emitted `record:reference_rail` so a rep
 *              has three things in their peripheral vision:
 *                1. quick prompts to throw at the floating chatbot
 *                2. open opportunities (auto)
 *                3. open cases (auto)
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
 * picks up `defaultAgent: 'sales_copilot'` from this app. Users
 * launch it from the FAB at the bottom-right; this card teaches
 * them what to ask.
 */
export const AccountDetailPage = {
  name: 'account_detail_page',
  label: 'Account Detail',
  description:
    'Slotted account record page — custom header + AI Briefing rail + persistent discussion feed.',

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
        icon: 'building-2',
        breadcrumb: true,
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
