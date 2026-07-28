// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSkill } from '@objectstack/spec';

/**
 * Email Drafting — write the copy, then send it through the real Action.
 *
 * ADR-0109: writing a subject line and personalising a body is what the
 * model does; it is not a tool call. The one step that leaves the
 * system — sending — is HotCRM's own `send_email` Action, reached via
 * the materialised `action_send_email` tool, so recipient resolution,
 * permissions and audit are identical to the UI path.
 */
export const EmailDraftingSkill = defineSkill({
  name: 'email_drafting',
  label: 'Email Drafting',
  description: 'Drafts personalised outbound emails and sends them through the contact email Action.',

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
4. Show the draft and WAIT. Never send unprompted.
5. When the user approves, call \`action_send_email\` with the contact
   and the final \`subject\` / \`body\`. Report the outcome, citing the
   contact ID.`,

  tools: ['get_record', 'query_records', 'action_send_email'],

  triggerPhrases: [
    'draft an email',
    'write a follow-up',
    'compose email',
    'optimise subject line',
    'email template',
  ],
});
