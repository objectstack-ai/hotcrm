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
 * other (#2029).
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
 * The grant is READ only. On 17.7.0 the platform's attach / delete gate admits
 * every `controlled_by_parent` parent, quotes included, so a write grant would
 * let the rep place a file on the quote they cannot reach (measured, #2029;
 * reported upstream). The last case pins that the rep cannot.
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

/** The fields an Attachments-panel upload posts, for a quote. */
const attachmentOn = async (quoteId: string, name: string) => ({
  parent_object: 'crm_quote', parent_id: quoteId, file_id: await fileRow(name),
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

  // One attachment on each quote, uploaded by the owner.
  id.att_US = await insert('sys_attachment', { ...(await attachmentOn(id.quote_US, 'us-quote.pdf')), uploaded_by: id.owner });
  id.att_JP = await insert('sys_attachment', { ...(await attachmentOn(id.quote_JP, 'jp-quote.pdf')), uploaded_by: id.owner });

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
});

describe('a sales rep and the Attachments panel of a quote (#2029)', () => {
  it('lists the attachments of a quote they can read, and of no other', async () => {
    const res = await verify.apiAs(rep.token, 'GET', '/data/sys_attachment');
    const body = (await res.json()) as AnyRec;
    // Before #2029: 403 PERMISSION_DENIED, the panel's "You don't have access".
    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(fixtureLabels(body.records ?? [])).toEqual(['att_US']);
  });

  it('cannot place a file on a quote they cannot reach', async () => {
    // Refused by the object gate, because the grant is read only (see the
    // header). The day the write bits are granted, the refusal has to come from
    // the platform's parent gate instead, and this case is where that shows.
    const res = await verify.apiAs(rep.token, 'POST', '/data/sys_attachment', await attachmentOn(id.quote_JP, 'stray.pdf'));
    const body = (await res.json()) as AnyRec;
    expect({ status: res.status, code: body.code }, JSON.stringify(body)).toEqual({
      status: 403, code: 'PERMISSION_DENIED',
    });
    expect(fixtureLabels(await verify.rows('sys_attachment', { parent_id: id.quote_JP }))).toEqual(['att_JP']);
  });
});
