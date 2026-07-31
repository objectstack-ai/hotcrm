// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSkill } from '@objectstack/spec';

/**
 * Email Drafting — write the copy, then send it through the real Action.
 *
 * ADR-0109: writing a subject line and personalising a body is what the
 * model does; it is not a tool call. Sending is HotCRM's `send_email`
 * Action, which carries no `ai` block — ADR-0011 exposure is opt-in and
 * default off, so no `action_send_email` tool is materialised and the
 * skill has nothing to call. The agent therefore drafts and hands over; a
 * human reviews the copy and presses Send. For outbound email that review
 * step is a feature, not a limitation.
 */
export const EmailDraftingSkill = defineSkill({
  name: 'email_drafting',
  label: 'Email Drafting',
  description: 'Drafts personalised outbound emails grounded in live contact data, ready for a human to review and send.',

  instructions: `When the user asks to draft, write, or optimise an email:

1. Ground it in real data before writing a word: \`get_record\` the
   contact (and the related account or opportunity when the request
   references one) so names, titles and recent activity are accurate.
   Use \`query_records\` when you need the recent history.
2. Write the copy yourself — subject and body. You do not have, and do
   not need, a copy-generation tool. Aim for: a subject under 60
   characters naming the concrete value, a first line referencing
   something specific to THIS recipient rather than a generic
   pleasantry, one clear ask, and no more than 150 words.
3. Offer two subject-line variants, say which you recommend and why,
   so the user can A/B them.
4. Show the draft and stop. You cannot send — say so plainly rather
   than implying a send is queued.
5. Point the user at **Send Email** on the contact record, where the
   subject and body you drafted can be pasted, reviewed and sent.`,

  tools: ['get_record', 'query_records'],

  triggerPhrases: [
    'draft an email',
    'write a follow-up',
    'compose email',
    'optimise subject line',
    'email template',
  ],
});
