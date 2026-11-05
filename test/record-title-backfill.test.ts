// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { extractHookBody } from '@objectstack/cli/hook-body';
import { hookNamed } from './helpers/composed-stack';
import { hotcrmStack, flowRuns, recordEngineWrites, runShippedHook } from './helpers/verify-stack';

/**
 * An untitled record, read, is titled (#2414).
 *
 * 6.1.0 made four record titles stored fields (#2230): the engine computes
 * them on every insert and every update by id, and on nothing else. A hosted
 * environment upgraded from 6.0.0 kept every existing contact, lead, case and
 * forecast untitled (staging os-05ayzz: 9/9, 21/21, 68/68, 7/10), so an
 * opportunity's Primary Contact showed the contact's job title instead of the
 * name, and `scripts/backfill-record-titles.ts` could not run there (password
 * sign-in; hosted sign-in is SSO only).
 *
 * `createRecordTitleBackfill` (`src/sales/objects/_record-title-backfill.ts`)
 * titles each untitled row a person's read returns, by re-sending one of the
 * row's own fields — the script's write. Pinned here against the booted app:
 *
 * - each object's hook, its shape, and that it lowers body-only;
 * - the fill stores the same wording the write path computes, on an open row
 *   and on a frozen one (closed case, converted lead);
 * - the lookup that showed the defect (an opportunity read expanding its
 *   Primary Contact) is itself a trigger;
 * - what it leaves alone: a read that does not show the title, a titled row,
 *   a row whose re-sent field is empty, a read the system makes for itself;
 * - one write per row, at most ten rows per read;
 * - the shipped path: the lowered body, in QuickJS, titles the row;
 * - an untitled Critical case that was never escalated is titled and NOT
 *   escalated by the fill (`case_escalation` sits out the write that first
 *   stores a case's title), and its next write escalates it as before; the
 *   other after-update automations change nothing on the row.
 */

type Rec = Record<string, any>;

const OBJECTS = [
  { object: 'crm_contact', hook: 'contact_title_backfill', title: 'full_name' },
  { object: 'crm_lead', hook: 'lead_title_backfill', title: 'display_title' },
  { object: 'crm_forecast', hook: 'forecast_title_backfill', title: 'display_title' },
  { object: 'crm_case', hook: 'case_title_backfill', title: 'display_title' },
] as const;
const TITLE: Record<string, string> = Object.fromEntries(OBJECTS.map((o) => [o.object, o.title]));

let verify: VerifyStack;
let admin: string;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
}, 180_000);

const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const settle = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

/** A list read through REST, as a person makes it, of the rows `ids`, showing `fields`. */
const listRead = async (object: string, ids: string[], fields: string[]): Promise<Rec[]> => {
  const filter = encodeURIComponent(JSON.stringify({ id: { $in: ids } }));
  const res = await verify.apiAs(admin, 'GET', `/data/${object}?select=${fields.join(',')}&filter=${filter}&top=200`);
  expect(res.status).toBe(200);
  return ((await res.json()) as Rec).records as Rec[];
};

/**
 * Put a row back in the state the 6.0.0 → 6.1.0 upgrade left it in: the title
 * column empty. Written through the datasource driver, beneath the engine,
 * because no engine write can store anything but the computed value.
 */
const untitle = async (object: string, id: string, extra: Rec = {}): Promise<void> => {
  const ql = verify.kernel.getService<Rec>('objectql');
  await ql.getDriverForObject(object).update(object, id, { [TITLE[object]!]: null, ...extra });
  expect((await stored(object, id))[TITLE[object]!] ?? null, `${object} ${id} is untitled`).toBeNull();
};

/** The engine updates of one row since it was made, as its audit log records them. */
const updatesOf = async (object: string, id: string): Promise<number> =>
  (await verify.rows('sys_audit_log', { object_name: object, record_id: id, action: 'update' })).length;

const titled = (object: string, id: string, expected: string) =>
  vi.waitFor(async () => expect((await stored(object, id))[TITLE[object]!]).toBe(expected), { timeout: 10_000, interval: 50 });

/** One row of each object, written through the engine so the write path titles it. */
let accountId = '';
const make = async (object: string, over: Rec = {}): Promise<Rec> => {
  const n = ++k;
  if (!accountId) {
    const [account] = await verify.seed('crm_account', [{ name: 'Record Title Backfill Co', type: 'customer' }]);
    accountId = String(account!.id);
  }
  const doc: Record<string, Rec> = {
    crm_contact: { first_name: 'Ethan', last_name: `Brooks ${n}`, email: `ethan${n}@record-title-backfill.test`, title: 'Chief Revenue Officer', crm_account: accountId },
    crm_lead: { first_name: 'Lena', last_name: `Ward ${n}`, company: `Ward Freight ${n}`, email: `lena${n}@record-title-backfill.test`, status: 'new' },
    crm_forecast: { period: 'quarter', snapshot_date: '2026-08-15', quota: 1000 * n },
    crm_case: { subject: `Printer jam ${n}`, description: 'It jams.', status: 'new', priority: 'medium', origin: 'web' },
  };
  const [row] = await verify.seed(object, [{ ...doc[object], ...over }]);
  return stored(object, String(row!.id));
};

describe('one hook per object, beside its object', () => {
  it.each(OBJECTS)('$hook fills $object.$title on a read, elevated, off the response path, body-only', ({ object, hook }) => {
    const h = hookNamed(hook);
    expect(h).toMatchObject({ object, events: ['afterFind'], runAs: 'system', async: true, onError: 'log' });
    expect(() => extractHookBody(h.handler, `hook '${hook}'`)).not.toThrow();
  });
});

describe('a read titles an untitled row with the wording the write path stores', () => {
  it.each(OBJECTS)('$object', async ({ object, title }) => {
    const row = await make(object);
    const expected = String(row[title]);
    expect(expected, 'the write path titled it').not.toBe('');
    await untitle(object, row.id);

    const [first] = await listRead(object, [row.id], ['id', title]);
    // A hosted hook body hands only `input` back to the engine, so the read
    // that starts the fill cannot be counted on to show it.
    expect(first!.id).toBe(row.id);
    await titled(object, row.id, expected);
    const [second] = await listRead(object, [row.id], ['id', title]);
    expect(second![title]).toBe(expected);
  });

  it('a closed case, which its freeze holds', async () => {
    const row = await make('crm_case');
    const ql = verify.kernel.getService<Rec>('objectql');
    await ql.getDriverForObject('crm_case').update('crm_case', row.id, { status: 'closed', resolution: 'Cleared the tray.' });
    await untitle('crm_case', row.id);
    await listRead('crm_case', [row.id], ['id', 'display_title']);
    await titled('crm_case', row.id, String(row.display_title));
    expect((await stored('crm_case', row.id)).status).toBe('closed');
  });

  it('a converted lead, which its freeze holds', async () => {
    const row = await make('crm_lead');
    const ql = verify.kernel.getService<Rec>('objectql');
    await ql.getDriverForObject('crm_lead').update('crm_lead', row.id, { status: 'converted', is_converted: true });
    await untitle('crm_lead', row.id);
    await listRead('crm_lead', [row.id], ['id', 'display_title']);
    await titled('crm_lead', row.id, String(row.display_title));
  });
});

describe('the read that showed the defect is a trigger', () => {
  it("an opportunity read expanding its Primary Contact titles the contact", async () => {
    const contact = await make('crm_contact');
    const [account] = await verify.seed('crm_account', [{ name: `Vertex ${++k}`, type: 'customer' }]);
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Vertex Enterprise Rollout ${k}`, crm_account: account!.id, primary_contact: contact.id,
      stage: 'prospecting', amount: 1000, close_date: '2030-01-01',
    }]);
    await untitle('crm_contact', contact.id);
    const res = await verify.apiAs(admin, 'GET', `/data/crm_opportunity/${deal!.id}?expand=primary_contact`);
    expect(res.status).toBe(200);
    await titled('crm_contact', contact.id, String(contact.full_name));
  });
});

describe('what it leaves alone', () => {
  it('a read that does not show the title, and a titled row, cost no write', async () => {
    const untitledRow = await make('crm_contact');
    const titledRow = await make('crm_contact');
    await untitle('crm_contact', untitledRow.id);
    const writes = recordEngineWrites(verify);
    try {
      await listRead('crm_contact', [untitledRow.id], ['id', 'email']);
      await listRead('crm_contact', [titledRow.id], ['id', 'full_name']);
      await settle();
      expect(writes.of('crm_contact', 'update')).toHaveLength(0);
    } finally {
      writes.restore();
    }
    expect((await stored('crm_contact', untitledRow.id)).full_name ?? null).toBeNull();
  });

  it('a row whose re-sent field is empty is not written on every read (the #2171 trap)', async () => {
    const row = await make('crm_forecast');
    await untitle('crm_forecast', row.id, { period_label: null });
    const writes = recordEngineWrites(verify);
    try {
      await listRead('crm_forecast', [row.id], ['id', 'display_title']);
      await listRead('crm_forecast', [row.id], ['id', 'display_title']);
      await settle();
      expect(writes.of('crm_forecast', 'update')).toHaveLength(0);
    } finally {
      writes.restore();
    }
  });

  it('a read the system makes for itself starts no pass', async () => {
    const row = await make('crm_case');
    await untitle('crm_case', row.id);
    const ql = verify.kernel.getService<Rec>('objectql');
    const writes = recordEngineWrites(verify);
    try {
      await ql.find('crm_case', { where: { id: row.id }, fields: ['id', 'display_title'], context: { isSystem: true } });
      await settle();
      expect(writes.of('crm_case', 'update')).toHaveLength(0);
    } finally {
      writes.restore();
    }
  });
});

describe('bounded', () => {
  it('one write per row: the re-send reads its row back as a system read, which starts no second pass', async () => {
    const row = await make('crm_contact');
    await untitle('crm_contact', row.id);
    await listRead('crm_contact', [row.id], ['id', 'full_name']);
    await titled('crm_contact', row.id, String(row.full_name));
    await settle();
    // The audit log records each engine write once (a spy on \`update\` sees
    // the engine's by-id write twice, its own delegation included).
    expect(await updatesOf('crm_contact', row.id)).toBe(1);
  });

  it('at most ten rows per read; the next read takes the rest', { timeout: 60_000 }, async () => {
    const rows: Rec[] = [];
    for (let i = 0; i < 12; i++) rows.push(await make('crm_lead'));
    for (const row of rows) await untitle('crm_lead', row.id);
    const ids = rows.map((r) => r.id as string);
    const titledCount = async () => (await Promise.all(rows.map(async (r) => (await stored('crm_lead', r.id)).display_title ?? null))).filter((t) => t !== null).length;
    await listRead('crm_lead', ids, ['id', 'display_title']);
    await vi.waitFor(async () => expect(await titledCount()).toBe(10), { timeout: 20_000, interval: 100 });
    await settle();
    expect(await titledCount()).toBe(10);
    await listRead('crm_lead', ids, ['id', 'display_title']);
    for (const row of rows) await titled('crm_lead', row.id, String(row.display_title));
    for (const row of rows) expect(await updatesOf('crm_lead', row.id), `lead ${row.id} written once`).toBe(1);
  });
});

describe('the shipped path: the lowered body, in QuickJS', () => {
  it.each(OBJECTS)('$hook titles the row its read returned', async ({ object, hook, title }) => {
    const row = await make(object);
    await untitle(object, row.id);
    await runShippedHook(verify, hookNamed(hook), {
      event: 'afterFind', object, as: admin, result: [{ id: row.id, [title]: null }] as unknown as Rec,
    });
    await titled(object, row.id, String(row[title]));
  });
});

describe('side effect: the fill escalates nothing', () => {
  it('an untitled Critical case that was never escalated is titled and stays unescalated', async () => {
    const row = await make('crm_case');
    // Critical, open, never escalated: the state `case_escalation` acts on.
    // Raised beneath the engine, as a 6.0.0 row bypassed at creation would be.
    await untitle('crm_case', row.id, { priority: 'critical' });
    await listRead('crm_case', [row.id], ['id', 'display_title']);
    await titled('crm_case', row.id, String(row.display_title));
    await settle(800);
    const after = await stored('crm_case', row.id);
    expect(after.status).toBe('new');
    expect(Boolean(after.is_escalated)).toBe(false);
    expect(after.escalated_date ?? null).toBeNull();
    expect(await flowRuns(verify, 'case_escalation', row.id)).toHaveLength(0);

    // The fill only sits out its own write: the case's next write escalates
    // it, as any edit of an unescalated open Critical case always has.
    const edit = await verify.apiAs(admin, 'PATCH', `/data/crm_case/${row.id}`, { description: 'Still jammed.' });
    expect(edit.status).toBe(200);
    await vi.waitFor(async () => expect((await stored('crm_case', row.id)).status).toBe('escalated'), { timeout: 10_000, interval: 50 });
    expect(await flowRuns(verify, 'case_escalation', row.id)).toHaveLength(1);
  });

  it('the other after-update automations of the four objects are transition-gated and leave the row as it was', async () => {
    const kase = await make('crm_case');
    await untitle('crm_case', kase.id);
    const before = await stored('crm_case', kase.id);
    const tasksBefore = (await verify.rows('crm_task', { related_to_case: kase.id })).length;
    await listRead('crm_case', [kase.id], ['id', 'display_title']);
    await titled('crm_case', kase.id, String(kase.display_title));
    await settle(800);
    const after = await stored('crm_case', kase.id);
    for (const field of ['status', 'priority', 'priority_rank', 'owner_id', 'sla_due_date', 'is_closed', 'is_escalated', 'subject']) {
      expect(after[field], `crm_case.${field}`).toEqual(before[field]);
    }
    expect((await verify.rows('crm_task', { related_to_case: kase.id })).length, 'a task was written').toBe(tasksBefore);
  });
});
