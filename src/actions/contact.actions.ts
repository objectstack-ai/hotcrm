// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Mark Contact as Primary.
 *
 * Demonstrates the L2 metadata-body action shape. The `body.source` runs
 * in the QuickJS sandbox via `actionBodyRunnerFactory`. The script receives
 * `(input, ctx)` where `ctx.recordId` is the contact id from the action
 * URL and `ctx.api.object('contact').update(...)` is gated by `api.write`.
 */
export const MarkPrimaryContactAction: Action = {
  name: 'mark_primary',
  label: 'Mark as Primary Contact',
  objectName: 'contact',
  icon: 'star',
  type: 'script',
  body: {
    language: 'js',
    source: `
      const id = ctx.recordId;
      if (!id) throw new Error('mark_primary requires a recordId');
      await ctx.api.object('contact').update({ id, is_primary: true }, { where: { id } });
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
 * Modal-typed action: collects subject + body, then logs an `activity`
 * record via the metadata body. Runs sandboxed under `api.write`.
 */
export const SendEmailAction: Action = {
  name: 'send_email',
  label: 'Send Email',
  objectName: 'contact',
  icon: 'mail',
  type: 'modal',
  target: 'send_email',
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
        related_object: 'contact',
        related_id: recipientId,
        sent_by: ctx.user?.id ?? null,
      });
      return { emailId: email?.id };
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
