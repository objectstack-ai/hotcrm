// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, flowRuns, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Printing a quote presents it (REQ-0008 phase 1, #2312): `quote_print_presented`
 * moves a draft or in-review quote to `presented` when the print service files
 * the quote's PDF, and does nothing for any other attachment or any other
 * status.
 *
 * The print service is not what this suite drives: it needs a browser, and on
 * the pinned release it refuses to print a page that is not the object's
 * default record page (objectstack#26583). What it leaves behind is one
 * `sys_attachment` row, written AS the printing user, parented on the quote and
 * named `<page>-<recordId>.pdf` — measured on 18.1.0 with `pnpm dev`, a local
 * Chromium and the page as the default (`quote_print_page-<id>.pdf`, written by
 * the rep who clicked). So each case makes that write, as the rep, through the
 * handle's write door, and reads the quote and the run history afterwards.
 */

let verify: VerifyStack;
let rep: Person;
let accountId: string;
let contactId: string;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@quote-print.test', {
    name: 'Quote Print Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Quote Print Co', owner_id: rep.id }]);
  accountId = String(account!.id);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Paula', last_name: 'Print', email: 'paula@quote-print.test', crm_account: accountId, owner_id: rep.id,
  }]);
  contactId = String(contact!.id);
}, 120_000);

/** A quote of the rep's, seeded straight into `status`. */
const quote = async (status: string, withContact = true): Promise<string> => {
  const [row] = await verify.seed('crm_quote', [{
    name: `Print Quote ${++k}`, crm_account: accountId, owner_id: rep.id, status,
    ...(withContact ? { crm_contact: contactId } : {}),
    quote_date: '2030-01-01', expiration_date: '2030-02-01',
  }]);
  return String(row!.id);
};

/** The `sys_attachment` row a file write leaves on the quote, written as the rep. */
const attach = async (quoteId: string, fileName: string): Promise<string> => {
  const [file] = await verify.seed('sys_file', [{
    key: `attachments/${fileName}`, name: fileName, mime_type: 'application/pdf', size: 1,
    scope: 'attachments', status: 'committed',
  }]);
  const row = await verify.hooks.run('sys_attachment', 'insert', {
    parent_object: 'crm_quote', parent_id: quoteId, file_id: String(file!.id),
    file_name: fileName, mime_type: 'application/pdf', size: 1, uploaded_by: rep.id,
  }, { as: rep.token }) as Rec;
  return String(row?.id ?? row?.record?.id);
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
