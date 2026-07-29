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
  visible: P`record.is_primary == false`,
  confirmText: 'Mark this contact as the primary contact for the account?',
  successMessage: 'Contact marked as primary!',
  refreshAfter: true,
};

/**
 * Send Email to Contact.
 *
 * Script-typed action: collects subject + body, then logs an `activity`
 * record via the metadata body. Runs sandboxed under `api.write`.
 */
export const SendEmailAction: Action = {
  name: 'send_email',
  label: 'Send Email',
  objectName: 'crm_contact',
  icon: 'mail',
  type: 'script',
  body: {
    language: 'js',
    source: `
      const record = ctx.record ?? {};
      const recipientId = ctx.recordId ?? record.id ?? null;
      const to = record.email ? String(record.email) : '';
      const from = ctx.user?.email ?? 'noreply@hotcrm.local';
      const subject = input.subject ? String(input.subject) : ('Email to ' + to);
      const body = input.body ? String(input.body) : '';
      const email = await ctx.api.object('sys_email').insert({
        from_address: from,
        to_addresses: to,
        subject,
        body_text: body,
        status: 'queued',
        related_object: 'crm_contact',
        related_id: recipientId,
        sent_by: ctx.user?.id ?? null,
      });
      // Surface the email on the contact's unified activity timeline
      // (the audit writer only logs generic CRUD; this is the semantic event).
      const activity = await ctx.api.object('sys_activity').insert({
        type: 'completed',
        summary: 'Email: ' + subject,
        actor_id: ctx.user?.id ?? null,
        actor_name: ctx.user?.name ?? null,
        object_name: 'crm_contact',
        record_id: recipientId,
        record_label: record.full_name ?? record.name ?? to,
        // ADR-0052 ActivityPointer: structured pointer to the rich source entity
        // (the sys_email row) so the timeline renders a "View source →" drill to
        // the full email — the queryable replacement for stashing the id in metadata.
        source_object: 'sys_email',
        source_id: email?.id ?? null,
        metadata: JSON.stringify({ kind: 'email', to, subject }),
      });
      return { emailId: email?.id, activityId: activity?.id };
    `,
    capabilities: ['api.write'],
    timeoutMs: 5000,
  },
  locations: ['record_header', 'list_item'],
  visible: P`record.email_opt_out == false`,
  params: [
    { name: 'subject', label: 'Subject', type: 'text', required: true },
    { name: 'body', label: 'Body', type: 'textarea', required: true },
  ],
  refreshAfter: false,
};
