// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { StorageServicePlugin } from '@objectstack/service-storage';
import { bootOptions, signUpPerson, type Person } from './helpers/verify-stack';
import artifact from '../objectstack.config';

/**
 * A sales rep reaches the attachments of the quotes they can read, and of no
 * other (#2029), and uploads and deletes only where they can edit the record
 * (#2038).
 *
 * ### What was wrong
 *
 * Measured on a fresh `pnpm dev` box (`@objectstack/*` 17.7.0), signed in as
 * `na.rep` (`sales_rep` + `na_sales_team`): the quote's Attachments tab said
 * "You don't have access to these attachments.", `GET /api/v1/data/sys_attachment`
 * answered 403 `PERMISSION_DENIED`, and an upload to a quote the rep can edit
 * answered the same 403. Every other demo persona got the same answer; only
 * the platform admin saw the panel. `sys_attachment` is an object like any
 * other, the platform's member baseline names it nowhere, and no permission
 * set of this app granted it, although a comment said none had to.
 *
 * ### The two halves this file measures together
 *
 * Whether a person may open the panel at all is this app's: the
 * `sys_attachment` grant on their permission set (canonical note on
 * `enable.files` in `src/sales/objects/index.ts`). Which attachments it then
 * lists is the platform's: `service-storage` intersects every read with the
 * parent records the caller can read. So the fixture puts one attachment on a
 * quote the rep reaches through the territory rule and one on a quote they
 * cannot reach, and asserts both sides.
 *
 * ### Uploads and deletes (#2038)
 *
 * The grant carries upload and delete beside the read. Where they take is the
 * platform's parent gate again: an upload is admitted only where a by-id update
 * of the parent would be, and a delete only from the file's uploader or a
 * person whose update of the parent would be (objectstack-ai/objectstack#24549,
 * in 18.1.0). Until that release the two bits were held back, because the gate
 * did not yet give that answer. So the fixture adds a contract under the
 * reachable account, which the rep reads and may not edit (`sales_rep` holds no
 * edit on `crm_contract`), and the write cases assert both sides: the editable
 * quote takes the rep's upload and their deletes, the contract and the
 * unreachable quote refuse them.
 *
 * ### Why this suite boots its own stack
 *
 * The parent-derived half lives in `@objectstack/service-storage`, which
 * `objectstack serve` mounts in its always-on slate and the handle's lean boot
 * does not. Without it every `sys_attachment` row would be readable by anyone
 * holding the grant, and this file could not tell "the rep's attachments" from
 * "every attachment". So it boots the app's own options plus that plugin, on a
 * throwaway storage root, and stops the stack when it is done.
 */

type AnyRec = Record<string, any>;

const SYS = { isSystem: true } as AnyRec;

let verify: VerifyStack;
let storageRoot: string;
/** The rep under test: the positions `pnpm demo:staff` gives `na.rep`. */
let rep: Person;
/** Fixture ids, by role. */
const id: Record<string, string> = {};

/** Insert as the system (the handle's `seed` door), returning the new row's id. */
const insert = async (object: string, doc: AnyRec): Promise<string> => {
  const [row] = await verify.seed(object, [doc]);
  return String(row?.id);
};

/** A committed attachments-scope file, as the upload door leaves one. */
const fileRow = (name: string) =>
  insert('sys_file', {
    key: `attachments/${name}`, name, mime_type: 'application/pdf', size: 1, scope: 'attachments', status: 'committed',
  });

/** The fields an Attachments-panel upload posts, for a record (a quote unless named). */
const attachmentOn = async (parentId: string, name: string, parentObject = 'crm_quote') => ({
  parent_object: parentObject, parent_id: parentId, file_id: await fileRow(name),
  file_name: name, mime_type: 'application/pdf', size: 1,
});

beforeAll(async () => {
  storageRoot = mkdtempSync(join(tmpdir(), 'hotcrm-attachments-'));
  const base = bootOptions();
  verify = await bootStack(artifact, {
    ...base,
    extraPlugins: [...(base.extraPlugins ?? []), new StorageServicePlugin({ local: { rootDir: storageRoot } })],
  });

  rep = await signUpPerson(verify, 'rep@attachments.test', {
    name: 'Territory Rep', positions: ['sales_rep', 'na_sales_team'],
  });
  id.owner = await insert('sys_user', { name: 'Another Owner', email: 'owner@attachments.test' });

  // Two accounts the rep owns neither of: the US one reaches them through
  // `north_america_territory` (an `edit` share), the JP one does not. The
  // territory is derived from the address by `account_protection`, so it is
  // left unstated here.
  const account = (name: string, country: string) => insert('crm_account', {
    name, type: 'customer', is_active: true, owner_id: id.owner, billing_address: { country },
  });
  id.acct_US = await account('Attachments US Customer', 'US');
  id.acct_JP = await account('Attachments JP Customer', 'JP');

  // `crm_quote` is controlled_by_parent under the account, so each quote
  // follows its account's reach.
  const quote = (accountId: string, name: string) => insert('crm_quote', {
    name, crm_account: accountId, owner_id: id.owner, status: 'draft',
    quote_date: '2026-01-01', expiration_date: '2026-02-01',
  });
  id.quote_US = await quote(id.acct_US, 'Attachments US Quote');
  id.quote_JP = await quote(id.acct_JP, 'Attachments JP Quote');

  // A contract under the reachable account: `crm_contract` is
  // controlled_by_parent too, so the rep reads it, and `sales_rep` holds no
  // edit on the object, so they may not update it (#2038).
  id.contact_US = await insert('crm_contact', {
    first_name: 'Ann', last_name: 'Attachments', email: 'ann@attachments.test', crm_account: id.acct_US, owner_id: id.owner,
  });
  id.contract_US = await insert('crm_contract', {
    crm_account: id.acct_US, crm_contact: id.contact_US, owner_id: id.owner, status: 'draft',
    contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 1000,
  });

  // One attachment on each quote and on the contract, uploaded by the owner,
  // and a second one on the reachable quote for the parent-editor delete.
  const ownerFile = async (parentId: string, name: string, parentObject?: string) =>
    insert('sys_attachment', { ...(await attachmentOn(parentId, name, parentObject)), uploaded_by: id.owner });
  id.att_US = await ownerFile(id.quote_US, 'us-quote.pdf');
  id.att_US_other = await ownerFile(id.quote_US, 'us-quote-redline.pdf');
  id.att_JP = await ownerFile(id.quote_JP, 'jp-quote.pdf');
  id.att_contract_US = await ownerFile(id.contract_US, 'us-contract.pdf', 'crm_contract');

  // The boot backfill ran before this population existed. The sharing service
  // is a kernel service the handle does not front, so it is driven directly.
  const rules: AnyRec = verify.kernel.getService('sharingRules');
  await rules.evaluateRule('north_america_territory', SYS);
}, 120_000);

afterAll(async () => {
  await verify?.stop();
  if (storageRoot) rmSync(storageRoot, { recursive: true, force: true });
});

/** The fixture's own labels for the `sys_attachment` rows a response carries. */
const fixtureLabels = (records: AnyRec[]): string[] => {
  const byId = new Map(Object.entries(id).map(([label, value]) => [value, label]));
  return records
    .map((r) => byId.get(String(r.id)))
    .filter((label): label is string => label !== undefined)
    .sort();
};

describe('the fixture discriminates (controls)', () => {
  it('the rep reads the US quote and not the JP one', async () => {
    // The parent-derived gate can only be seen if the parents differ in reach.
    expect(await verify.rows('crm_quote', { id: id.quote_US }, { as: rep.token })).toHaveLength(1);
    expect(await verify.rows('crm_quote', { id: id.quote_JP }, { as: rep.token })).toHaveLength(0);
  });

  it('the rep reads the US contract and may not update it', async () => {
    // The write cases tell "may edit the record" from "may read it" only if
    // one parent is readable and not editable.
    expect(await verify.rows('crm_contract', { id: id.contract_US }, { as: rep.token })).toHaveLength(1);
    const res = await verify.apiAs(rep.token, 'PATCH', `/data/crm_contract/${id.contract_US}`, { contract_value: 2 });
    expect(res.status, await res.clone().text()).toBe(403);
  });
});

describe('a sales rep and the Attachments panel of a quote (#2029)', () => {
  it('lists the attachments of a quote they can read, and of no other', async () => {
    const res = await verify.apiAs(rep.token, 'GET', '/data/sys_attachment');
    const body = (await res.json()) as AnyRec;
    // Before #2029: 403 PERMISSION_DENIED, the panel's "You don't have access".
    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(fixtureLabels(body.records ?? [])).toEqual(['att_US', 'att_US_other', 'att_contract_US']);
  });
});

/** A call on the data door as the rep: its status and error code. */
const asRep = async (method: string, path: string, payload?: unknown) => {
  const res = await verify.apiAs(rep.token, method, path, payload);
  const body = (await res.json().catch(() => ({}))) as AnyRec;
  return { status: res.status, code: body.code as string | undefined, body };
};

describe('a sales rep uploads and deletes where they can edit the record (#2038)', () => {
  it('uploads to a quote they can edit, and deletes their own file', async () => {
    const posted = await asRep('POST', '/data/sys_attachment', await attachmentOn(id.quote_US, 'rep-upload.pdf'));
    // Before #2038: 403 PERMISSION_DENIED, the grant was read only.
    expect(posted.status, JSON.stringify(posted.body)).toBe(201);
    const [mine] = await verify.rows('sys_attachment', { parent_id: id.quote_US, file_name: 'rep-upload.pdf' });
    expect(mine?.uploaded_by).toBe(rep.id);

    const deleted = await asRep('DELETE', `/data/sys_attachment/${mine!.id}`);
    expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);
    expect(await verify.rows('sys_attachment', { id: mine!.id })).toHaveLength(0);
  });

  it("deletes another person's file on a quote they can edit", async () => {
    // The platform's rule, and the files-and-comments guide's: the uploader
    // and anyone who can edit the record delete a file.
    const res = await asRep('DELETE', `/data/sys_attachment/${id.att_US_other}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await verify.rows('sys_attachment', { id: id.att_US_other })).toHaveLength(0);
  });

  it('is refused an upload to a contract they only read, and to a quote they cannot reach', async () => {
    // The rep holds create on sys_attachment, so the refusal is the platform's
    // parent gate, not the object gate.
    const contract = await asRep('POST', '/data/sys_attachment', await attachmentOn(id.contract_US, 'stray-contract.pdf', 'crm_contract'));
    expect({ status: contract.status, code: contract.code }, JSON.stringify(contract.body)).toEqual({
      status: 403, code: 'ATTACHMENT_PARENT_ACCESS',
    });
    const quote = await asRep('POST', '/data/sys_attachment', await attachmentOn(id.quote_JP, 'stray-quote.pdf'));
    expect({ status: quote.status, code: quote.code }, JSON.stringify(quote.body)).toEqual({
      status: 403, code: 'ATTACHMENT_PARENT_ACCESS',
    });
    expect(fixtureLabels(await verify.rows('sys_attachment', { parent_id: id.contract_US }))).toEqual(['att_contract_US']);
    expect(fixtureLabels(await verify.rows('sys_attachment', { parent_id: id.quote_JP }))).toEqual(['att_JP']);
  });

  it("is refused a delete of another person's file where they cannot edit the record", async () => {
    // On the contract they read: refused by name. On the quote they cannot
    // reach: the file is not there for them at all.
    const contract = await asRep('DELETE', `/data/sys_attachment/${id.att_contract_US}`);
    expect({ status: contract.status, code: contract.code }, JSON.stringify(contract.body)).toEqual({
      status: 403, code: 'ATTACHMENT_DELETE_DENIED',
    });
    const quote = await asRep('DELETE', `/data/sys_attachment/${id.att_JP}`);
    expect({ status: quote.status, code: quote.code }, JSON.stringify(quote.body)).toEqual({
      status: 404, code: 'RECORD_NOT_FOUND',
    });
    expect(fixtureLabels(await verify.rows('sys_attachment', { id: { $in: [id.att_contract_US, id.att_JP] } })))
      .toEqual(['att_JP', 'att_contract_US']);
  });
});
