// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Mark Contact as Primary.
 *
 * Demonstrates the L2 metadata-body action shape. The `body.source` runs
 * in the QuickJS sandbox via `actionBodyRunnerFactory`. The script receives
 * `(input, ctx)` where `ctx.recordId` is the contact id from the action
 * URL and `ctx.api.object('crm_contact').update(...)` is gated by `api.write`.
 *
 * It writes the clicked contact only. Clearing the account's previous primary
 * is the object's rule (`contact_primary_per_account` in `contact.hook.ts`),
 * which every writer of the flag reaches; ⛔ do not repeat it here.
 */
export const MarkPrimaryContactAction: Action = {
  name: 'mark_primary',
  label: 'Mark as Primary Contact',
  objectName: 'crm_contact',
  icon: 'star',
  type: 'script',
  body: {
    language: 'js',
    source: `
      const id = ctx.recordId;
      if (!id) throw new Error('mark_primary requires a recordId');
      await ctx.api.object('crm_contact').update({ id, is_primary: true }, { where: { id } });
      return { ok: true, id, is_primary: true };
    `,
    capabilities: ['api.write'],
    timeoutMs: 2000,
  },
  locations: ['record_header', 'list_item'],
  visible: P`has(record.is_primary) && record.is_primary == false`,
  confirmText: 'Mark this contact as the primary contact for the account?',
  successMessage: 'Contact marked as primary!',
  refreshAfter: true,
};

/**
 * Add selected contacts to a Campaign.
 *
 * The contact-side mirror of `create_campaign` on `crm_lead`, and with Enroll
 * Members one of the two writers of `crm_campaign_member.crm_contact` — the
 * lookup that lets a campaign reach existing customers and not only leads.
 * Every design decision below is copied deliberately from the lead action
 * rather than re-derived, so the two paths cannot drift:
 *
 *   - A flow action over the side's one enroll-one-person flow,
 *     `campaign_contact_member_enroll`, run AS THE CALLER (#2167): the
 *     member object's own `allowCreate` is the gate, a profile without it is
 *     refused with 400 `FLOW_FAILED`, and `visible` stops offering it there.
 *     The flow skips a contact the campaign already has.
 *   - PER-RECORD dispatch. `src/sales/views/contact.view.ts` wires this as the
 *     BARE-STRING form (`bulkActions: ['add_contact_to_campaign']`), which the
 *     renderer fans out once per selected row with that row's `recordId` and NO
 *     selection array; the door seeds it into the flow's `contactId`
 *     (`recordIdParam`). ⛔ Never declare a `selectedIds` param: only the
 *     aggregate contract injects the underscore-prefixed builtin, and a flow
 *     takes one contact.
 *   - The campaign param is FIELD-BACKED (`field` + `objectOverride`) so the
 *     console resolves a record picker from
 *     `crm_campaign_member.crm_campaign`, and is sent as the flow's
 *     `campaignId`. A bare `{ type: 'lookup' }` cannot resolve a target object
 *     and degrades to a paste-the-ID textbox.
 *
 * One deliberate difference, kept in the flow: the dedupe scopes on
 * `crm_contact`, so a person enrolled as a LEAD and again as a CONTACT is not
 * treated as a duplicate. Those are two different records of two different
 * relationships, and `crm_campaign_member` keys them separately (see the two
 * seed datasets in `src/marketing/data/marketing.seed.ts`).
 */
export const AddContactToCampaignAction: Action = {
  name: 'add_contact_to_campaign',
  label: 'Add to Campaign',
  objectName: 'crm_contact',
  icon: 'send',
  type: 'flow',
  target: 'campaign_contact_member_enroll',
  recordIdParam: 'contactId',
  // The same two doors as `create_campaign` on `crm_lead` (#2073 items 5 and
  // 5b): `list_item`, every row's menu, and the SELECTION BAR a view opens by
  // naming the action in its `bulkActions` (All Contacts does), which takes no
  // location here.
  // ⛔ Do not add `list_toolbar` back. A header button is drawn with nothing
  // selected, and this action runs on exactly one contact: launched from the
  // header, the lead side's twin opened the whole Campaign dialog, then refused
  // in English ("This action runs on a single record — select a row first.")
  // and sent nothing. Here the header button happens to draw nowhere, only
  // because `visible` below reads `record.email_opt_out` and a list header
  // binds no record (measured on the three contact views, as marketing and
  // as the admin, on 18.0.0-next.5). Relaxing that predicate would bring the
  // defect back on contacts, so the placement is not left to depend on it.
  locations: ['list_item'],
  params: [
    {
      name: 'campaignId',
      field: 'crm_campaign',
      objectOverride: 'crm_campaign_member',
      label: 'Campaign',
      required: true,
    },
  ],
  // An opted-out contact must not be added to a campaign by hand either — the
  // enrollment flow already filters them out, and a manual add-to-campaign is
  // the obvious way around a filter nobody remembers is there. Same predicate
  // the `send_email` action uses. And only for a caller who may create the
  // member (see the header).
  visible: P`has(record.email_opt_out) && record.email_opt_out == false && current_user.can("crm_campaign_member", "create")`,
  // Says what the run did (#2371 row 1): the campaign, how many were added
  // and how many were already on it. It read "Contacts added to campaign!" on a run
  // that found the person already a member. The counts are the enrollment
  // flow's outputs (`campaign-member-enroll.flow.ts`).
  successMessage: '{{ result.output.campaignName }}: {{ result.output.addedCount }} added, {{ result.output.alreadyCount }} already a member.',
  refreshAfter: true,
};

/**
 * Send Email to Contact.
 *
 * Script action: collects subject + body, hands the message to the platform's
 * mail door and adds the send to the contact's activity timeline.
 *
 * Both writes go through the platform's doors, never a raw insert into the
 * ledgers: `ctx.email.send` (capability `email.send`) for the message and
 * `ctx.activity.append` (capability `activity.append`) for the timeline entry.
 * The mail log (`sys_email`) and the activity feed (`sys_activity`) are
 * append-only objects their platform services write; the doors stamp what the
 * platform says about the write: the sender is the deployment's configured
 * address, with the rep named in its display name, the message is recorded as
 * sent by the rep under the rep's organization, and the entry's actor and
 * origin are the platform's. `replyTo` is the rep's own address, so a reply
 * still reaches the rep.
 *
 * The timeline entry names the contact and carries the mail log row's id in
 * its `metadata` (`email_id`), not as its `source`: the door reads a `source`
 * in the caller's scope, and a sales rep cannot read the mail log, so an entry
 * pointing there would be refused after the message had already gone.
 */
export const SendEmailAction: Action = {
  name: 'send_email',
  label: 'Send Email',
  // The line under the dialog's title (#2369 row 3), which read the platform's
  // generic "Please provide the required information to continue.": where the
  // email goes and what happens to it. It names no address: on 18.2.0 the
  // dialog gets no row from the record header or the list row menu, so a
  // `{{ record.email }}` hole prints raw and a `defaultFromRow` param stays
  // empty (measured; platform finding).
  description: "Goes to this contact's email address. It is queued, then logged on the contact's timeline.",
  objectName: 'crm_contact',
  icon: 'mail',
  // script, not modal: modal submits die on GET /api/v1/meta/object/<target>
  // → 400 in 16.1.0; script actions POST /api/v1/actions/... and execute.
  type: 'script',
  body: {
    language: 'js',
    source: `
      const record = ctx.record ?? {};
      const recipientId = ctx.recordId ?? record.id ?? null;
      const to = record.email ? String(record.email) : '';
      const replyTo = ctx.user?.email ? String(ctx.user.email) : '';
      const subject = input.subject ? String(input.subject) : ('Email to ' + to);
      const body = input.body ? String(input.body) : '';
      const message = { to, subject, text: body };
      if (replyTo) message.replyTo = replyTo;
      if (recipientId) message.related = { object: 'crm_contact', id: String(recipientId) };
      const email = await ctx.email.send(message);

      // Surface the email on the contact's unified activity timeline
      // (the audit writer only logs generic CRUD; this is the semantic event).
      // The door stamps the actor (the rep, with the platform's display name)
      // and the origin; the summary and the label are held to the timeline's
      // column bounds (500 and 255 characters).
      let activity = null;
      if (recipientId) {
        const label = record.full_name ?? record.name ?? to;
        const entry = {
          object: 'crm_contact',
          recordId: String(recipientId),
          type: 'completed',
          summary: ('Email: ' + subject).slice(0, 500),
          metadata: { kind: 'email', to, subject, email_id: email?.id ?? null },
        };
        if (label) entry.recordLabel = String(label).slice(0, 255);
        activity = await ctx.activity.append(entry);
      }
      // #592 scope item 3: every activity writer bumps interaction recency.
      // An email is an interaction but NOT a calendar slot, so it writes no
      // \`crm_event\` — which means it cannot ride the event hook's bubble and
      // has to stamp the two timestamps itself. Both columns are deliberately
      // non-readonly (see crm_account.last_activity_date's note): a readonly
      // field is stripped from any non-system write whose caller supplied the
      // key (#2948), and an action body runs under the sending rep's context.
      if (recipientId) {
        const nowIso = new Date().toISOString();
        try {
          await ctx.api.object('crm_contact').update(
            { id: recipientId, last_contacted_date: nowIso },
            { where: { id: recipientId } },
          );
        } catch (e) { /* best-effort recency; never fail the send */ }
        const accountId = record.crm_account ? String(record.crm_account) : null;
        if (accountId) {
          try {
            await ctx.api.object('crm_account').update(
              { id: accountId, last_activity_date: nowIso.slice(0, 10) },
              { where: { id: accountId } },
            );
          } catch (e) { /* best-effort recency; never fail the send */ }
        }
      }
      return { emailId: email?.id, activityId: activity?.id };
    `,
    capabilities: ['api.write', 'email.send', 'activity.append'],
    timeoutMs: 5000,
  },
  locations: ['record_header', 'list_item'],
  visible: P`has(record.email_opt_out) && record.email_opt_out == false`,
  params: [
    { name: 'subject', label: 'Subject', type: 'text', required: true },
    { name: 'body', label: 'Body', type: 'textarea', required: true },
  ],
  // "queued", not "sent": the mail door writes the `sys_email` row with
  // `status: 'queued'` and delivery happens after the action returns (#2246).
  successMessage: 'Email queued to this contact.',
  refreshAfter: false,
};
