// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { StorageServicePlugin } from '@objectstack/service-storage';
import { bootOptions, signUpPerson, flowRuns, type Person } from './helpers/verify-stack';
import artifact from '../objectstack.config';

type Rec = Record<string, any>;

/**
 * Printing a quote presents it (REQ-0008 phase 1, #2312): `quote_print_presented`
 * moves a draft or in-review quote to `presented` when the print service files
 * the quote's PDF, and does nothing for any other attachment or any other
 * status.
 *
 * The print service is not what this suite drives: it needs a browser. What
 * it leaves behind is one `sys_attachment` row, written AS the printing user,
 * parented on the quote and named `<page>-<recordId>.pdf` — measured with
 * `pnpm dev` and a local Chromium on 18.1.0 with the page as the default, and
 * on 18.3.0 by name (`quote_print_page-<id>.pdf`, written by the user who
 * clicked). The print files that PDF through the platform's server-side
 * attach verb (`attachFileAs` on the `file-attachments` service, which
 * `printRecordToFile` calls), as the user who printed. So each case attaches
 * through that same verb, as the rep, and reads the quote and the run history
 * afterwards.
 *
 * ### Why the verb and not the data door (#2440)
 *
 * This suite used to write the `sys_attachment` row itself, through the
 * handle's data door, naming a `sys_file` seeded for the rep. From 18.4.0 a
 * person's write may name in a lookup only a record they can read
 * (objectstack#29029), and a rep does not read `sys_file`, so that write is
 * refused (`reference_not_found` on the file) while the print itself still
 * works: the attach verb vouches for the one file it has just created. The
 * verb is the door the product uses, so the flow is proven against a real
 * attachment on both sides of that release.
 *
 * ### Why this suite boots its own stack
 *
 * The attach verb is `@objectstack/service-storage`'s, which `objectstack
 * serve` mounts in its always-on slate and the handle's lean boot does not
 * (the same reason `test/record-attachments-access.test.ts` gives). So this
 * file boots the app's own options plus that plugin, on a throwaway storage
 * root, and stops the stack when it is done.
 */

let verify: VerifyStack;
let storageRoot: string;
let rep: Person;
let accountId: string;
let contactId: string;
let k = 0;

beforeAll(async () => {
  storageRoot = mkdtempSync(join(tmpdir(), 'hotcrm-quote-print-'));
  const base = bootOptions();
  verify = await bootStack(artifact, {
    ...base,
    extraPlugins: [...(base.extraPlugins ?? []), new StorageServicePlugin({ local: { rootDir: storageRoot } })],
  });
  rep = await signUpPerson(verify, 'rep@quote-print.test', {
    name: 'Quote Print Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Quote Print Co', owner_id: rep.id }]);
  accountId = String(account!.id);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Paula', last_name: 'Print', email: 'paula@quote-print.test', crm_account: accountId, owner_id: rep.id,
  }]);
  contactId = String(contact!.id);
}, 120_000);

afterAll(async () => {
  await verify?.stop();
  if (storageRoot) rmSync(storageRoot, { recursive: true, force: true });
});

/** A quote of the rep's, seeded straight into `status`. */
const quote = async (status: string, withContact = true): Promise<string> => {
  const [row] = await verify.seed('crm_quote', [{
    name: `Print Quote ${++k}`, crm_account: accountId, owner_id: rep.id, status,
    ...(withContact ? { crm_contact: contactId } : {}),
    quote_date: '2030-01-01', expiration_date: '2030-02-01',
  }]);
  return String(row!.id);
};

/**
 * A file attached to the quote by the rep, through the attach verb the print
 * calls: one `sys_file` the rep owns and one `sys_attachment` row on the
 * quote, written as the rep (every gate on the insert judges them, and the
 * row is stamped `uploaded_by` them). Returns the attachment's id.
 */
const attach = async (quoteId: string, fileName: string): Promise<string> => {
  const context = await verify.contextFor(rep.token);
  const attachments = verify.kernel.getService<Rec>('file-attachments');
  const attached = await attachments.attachFileAs({
    parentObject: 'crm_quote', parentId: quoteId, organizationId: context.tenantId ?? null,
    filename: fileName, mimeType: 'application/pdf', data: Buffer.from('%PDF-1.4\n'),
  }, context) as Rec;
  return String(attached.attachmentId);
};

/** What the print service names the PDF it files for `quoteId`. */
const printArchive = (quoteId: string) => `quote_print_page-${quoteId}.pdf`;

const statusOf = async (quoteId: string): Promise<string> =>
  String((await verify.rows('crm_quote', { id: quoteId }))[0]?.status);

/**
 * The flow's runs for one attachment, once the first history row has landed:
 * the engine writes a finished run's row after the run returns.
 */
const landedRuns = (attachmentId: string) => vi.waitFor(async () => {
  const rows = await flowRuns(verify, 'quote_print_presented', attachmentId);
  expect(rows.length, `no quote_print_presented run recorded for ${attachmentId}`).toBeGreaterThan(0);
  return rows;
}, { timeout: 10_000, interval: 50 });

describe('quote_print_presented — printing presents an unsent quote', () => {
  it.each(['draft', 'in_review'])('moves a %s quote to presented when its PDF is filed', async (from) => {
    const id = await quote(from);
    const attachment = await attach(id, printArchive(id));
    await landedRuns(attachment);
    expect(await statusOf(id)).toBe('presented');
  });

  it('a quote with no contact keeps its status: the contact gate refuses the move (#1017)', async () => {
    // Measured on 18.1.0 with `pnpm dev`: the PDF is filed (the print answers
    // 201) and the move is refused, so the run records the failure and the
    // quote stays where it was. The flow does not restate the gate; the
    // object's `requiredWhen` decides.
    const id = await quote('in_review', false);
    const attachment = await attach(id, printArchive(id));
    const [run] = await landedRuns(attachment);
    expect(run!.status).toBe('failed');
    expect(String(run!.error)).toMatch(/Contact/);
    expect(await statusOf(id)).toBe('in_review');
  });
});

describe('quote_print_presented — and nothing else', () => {
  it('an ordinary attachment on an unsent quote changes nothing', async () => {
    const id = await quote('in_review');
    const attachment = await attach(id, 'customer-redline.pdf');
    // A start condition that does not hold records no run at all.
    expect(await flowRuns(verify, 'quote_print_presented', attachment)).toEqual([]);
    expect(await statusOf(id)).toBe('in_review');
  });

  it('a print archive named for ANOTHER quote changes nothing', async () => {
    const id = await quote('draft');
    const other = await quote('draft');
    await attach(id, printArchive(other));
    expect(await statusOf(id)).toBe('draft');
    expect(await statusOf(other)).toBe('draft');
  });

  it.each(['presented', 'accepted', 'rejected', 'expired'])('a reprint of a %s quote keeps its status', async (status) => {
    const id = await quote(status);
    const attachment = await attach(id, printArchive(id));
    const [run] = await landedRuns(attachment);
    expect(run!.status).toBe('completed');
    expect(await statusOf(id)).toBe(status);
  });
});
