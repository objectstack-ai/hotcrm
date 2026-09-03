// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import stack from '../objectstack.config';
import { OpportunityLineItem } from '../src/objects/opportunity_line_item.object';
import { QuoteLineItem } from '../src/objects/quote_line_item.object';

/**
 * What a typo costs — measured, per driver (#1200).
 *
 * Every hook, action and flow in this repo writes by NAME (`input.close_date`,
 * `fields: { … }`). #1200 recorded that on `@objectstack/*` 17.0.0 a misspelled
 * key was a silent successful write: the engine stored a field the object never
 * declared and handed it back on read. Nothing failed — not the write, not
 * `objectstack validate` (metadata, not rows), not a later read of the
 * correctly-spelled field, which simply stayed at its old value. And because
 * field-level permissions are declared PER OBJECT, a key the object does not
 * declare cannot be governed by them: the shadow write sat outside `allowEdit`
 * and field-level security by construction.
 *
 * This file is the re-measurement taken on 17.1.0 — the version this repo
 * pinned AT THE TIME, not the current pin (#1460: 17.2.0 since PR #1442; the
 * probe below has not been re-taken on it, though its assertions do run green
 * there) — and it says two different things about two different write paths.
 *
 * ## The caller path is CLOSED, and that is what half 1 pins
 *
 * A key the caller supplies is refused before anything happens —
 * `INVALID_FIELD` / 400, identically on all three drivers. Upstream
 * objectstack#8682 (insert) and objectstack#8738 (update) put that door in,
 * ahead of hooks and ahead of statement construction.
 *
 * That guarantee is now load-bearing for this whole repo, so it is pinned
 * rather than assumed, WITH its controls: `A` inserts the same row without the
 * key (it must succeed, or a red here would only mean the fixture broke), and
 * `D` sends the SAME key to the twin `crm_quote_line_item`, which DOES declare
 * `tax_rate` (it must succeed, or the probe would be measuring a banned name
 * rather than an undeclared one). Without both, this file could pass while
 * measuring nothing. `E` shows the refusal is about declaration, not about one
 * borrowed name: a plain misspelling of a real field is refused the same way.
 *
 * ## The HOOK path is not closed, and half 2 pins the DIVERGENCE
 *
 * The door sits in front of the hooks, so a key a hook itself assigns is never
 * checked against the schema. Whatever the hook wrote then reaches the driver
 * — and the three drivers do three different things with it:
 *
 *   - `memory`      — accepted, stored, and returned on read. #1200's original
 *                     defect, alive on 17.1.0 on this path.
 *   - `sqlite`      — refused by SQLite: `SQLITE_ERROR`, raw bound statement.
 *   - `sqlite-wasm` — refused too, as a bare `Error` with no code at all.
 *
 * Neither refusal is an ADR-0112 envelope, and the two SQL drivers do not even
 * agree on the error's shape. So the same metadata and the same hook code mean
 * different things on different deployments: one silently grows a shadow
 * column, two crash the write with a database error nobody can catch by code.
 * That is the answer #1200 asked for, and the card's own reading of it stands —
 * a behaviour that DIFFERS by driver is worse than either consistent answer.
 *
 * ⚠️ Half 2 pins a KNOWN-BAD state on purpose, so read a red here as good news
 * before treating it as a regression: it means the platform moved, and
 * objectstack-ai/objectstack#13657 — the upstream card carrying these readings
 * — should be re-read and this half rewritten (or deleted) to match whatever it
 * moved to. It is NOT a licence to work around the gap in this
 * repo. Half 1 is the opposite — a red there means a guarantee this repo relies
 * on was withdrawn.
 *
 * ⛔ Nothing here is a fix, and no fix belongs in this repo: the gap is the
 * platform's, and hiding it behind a key allowlist in every hook would put a
 * platform defect inside the exemplar.
 */

type AnyRec = Record<string, any>;

process.env.OS_REGISTRY_LOG ??= 'silent';
const SYS = { isSystem: true } as AnyRec;

/** The undeclared key. Declared on `crm_quote_line_item`, not on its twin. */
const KEY = 'tax_rate';
/** A plain misspelling of a field the probe object really does declare. */
const TYPO = 'unit_pric';
/** Written to a DECLARED field, so the injector hook stays inert otherwise. */
const MARKER = 'INJECT-UNDECLARED';

/** One write attempt, reduced to what an assertion can read. */
interface Outcome {
  ok: boolean;
  code?: string;
  status?: number;
  message: string;
}

async function attempt(fn: () => Promise<unknown>): Promise<Outcome> {
  try {
    await fn();
    return { ok: true, message: '' };
  } catch (e: any) {
    return { ok: false, code: e?.code, status: e?.status, message: String(e?.message ?? e) };
  }
}

/**
 * Test-only stand-in for the repo's real hooks: a `beforeInsert` that assigns a
 * key by name and gets it wrong. Inert unless the row carries {@link MARKER} in
 * `description`, so it cannot colour the caller-path legs measured beside it.
 */
const injectorHook = {
  name: 'probe_undeclared_injector',
  object: 'crm_opportunity_line_item',
  events: ['beforeInsert'],
  priority: 1,
  description: 'Test-only: a hook assigning a key the object does not declare.',
  handler: async (ctx: AnyRec) => {
    if (ctx.input?.description !== MARKER) return;
    ctx.input[KEY] = 10;
  },
};

interface Reading {
  /** Caller supplies no undeclared key — the control that keeps this honest. */
  control: Outcome;
  /** Caller supplies the undeclared key on INSERT. */
  insert: Outcome;
  /** Caller supplies the undeclared key on UPDATE of a clean row. */
  update: Outcome;
  /** The same key on the twin that DECLARES it — the second control. */
  declaredTwin: Outcome;
  /** Stored value on that twin, proving the control really wrote. */
  declaredTwinValue: unknown;
  /** A misspelling of a real field, rather than a borrowed twin's name. */
  typo: Outcome;
  /** A hook assigns the undeclared key after the caller-path door. */
  viaHook: Outcome;
  /** The stored row after the hook write, when there is one. */
  viaHookRow?: AnyRec;
}

async function bootKernel(driver: string, config: AnyRec, withInjector: boolean): Promise<AnyRec> {
  const kernel: AnyRec = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver, config } as never));
  await kernel.use(
    new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_probe' } as never),
  );
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_probe' } as never));
  // Seed data is skipped: the fixture below is the whole population, so a
  // stored value can only have come from the write under measurement.
  const app: AnyRec = withInjector
    ? { ...(stack as AnyRec), hooks: [...((stack as AnyRec).hooks ?? []), injectorHook] }
    : (stack as AnyRec);
  await kernel.use(new AppPlugin(app as never, undefined as never, { skipSeedData: true } as never));
  await kernel.bootstrap();
  return kernel;
}

async function measure(driver: string, config: AnyRec): Promise<{ kernels: AnyRec[]; reading: Reading }> {
  const kernel = await bootKernel(driver, config, false);
  const ql: AnyRec = kernel.getService('objectql');
  const insert = async (object: string, doc: AnyRec): Promise<string> => {
    const row = await ql.insert(object, doc, { context: SYS });
    return String(row?.id ?? row?.record?.id);
  };
  const read = async (q: AnyRec, object: string, rowId: string): Promise<AnyRec | undefined> =>
    ((await q.find(object, { where: { id: rowId } }, { context: SYS })) as AnyRec[])[0];

  const accountId = await insert('crm_account', { name: 'Probe Co', type: 'customer', is_active: true });
  const oppId = await insert('crm_opportunity', {
    name: 'Probe Deal', crm_account: accountId, amount: 1000,
    stage: 'prospecting', close_date: '2026-12-31',
  });
  const productId = await insert('crm_product', { name: 'Probe Widget', list_price: 100 });
  const line = (extra: AnyRec = {}): AnyRec => ({
    crm_opportunity: oppId, crm_product: productId, quantity: 1, unit_price: 100, ...extra,
  });

  let cleanId = '';
  const control = await attempt(async () => { cleanId = await insert('crm_opportunity_line_item', line()); });
  const insertLeg = await attempt(() => ql.insert('crm_opportunity_line_item', line({ [KEY]: 10 }), { context: SYS }));
  const updateLeg = await attempt(
    () => ql.update('crm_opportunity_line_item', { id: cleanId, [KEY]: 42 }, { context: SYS }),
  );

  const quoteId = await insert('crm_quote', {
    name: 'Probe Quote', crm_account: accountId, status: 'draft',
    quote_date: '2026-01-01', expiration_date: '2026-02-01',
  });
  let quoteLineId = '';
  const declaredTwin = await attempt(async () => {
    quoteLineId = await insert('crm_quote_line_item', {
      crm_quote: quoteId, crm_product: productId, quantity: 1, unit_price: 100, [KEY]: 10,
    });
  });
  const twinRow = quoteLineId ? await read(ql, 'crm_quote_line_item', quoteLineId) : undefined;
  const typo = await attempt(() => ql.insert('crm_opportunity_line_item', line({ [TYPO]: 7 }), { context: SYS }));

  // ── the hook seam, on its own kernel so the injector cannot touch the above ──
  const k2 = await bootKernel(driver, config, true);
  const ql2: AnyRec = k2.getService('objectql');
  const ins2 = async (object: string, doc: AnyRec): Promise<string> => {
    const row = await ql2.insert(object, doc, { context: SYS });
    return String(row?.id ?? row?.record?.id);
  };
  const acc2 = await ins2('crm_account', { name: 'Probe Co 2', type: 'customer', is_active: true });
  const opp2 = await ins2('crm_opportunity', {
    name: 'Probe Deal 2', crm_account: acc2, amount: 1000, stage: 'prospecting', close_date: '2026-12-31',
  });
  const prod2 = await ins2('crm_product', { name: 'Probe Widget 2', list_price: 100 });
  let hookRowId = '';
  const viaHook = await attempt(async () => {
    hookRowId = await ins2('crm_opportunity_line_item', {
      crm_opportunity: opp2, crm_product: prod2, quantity: 1, unit_price: 100, description: MARKER,
    });
  });
  const viaHookRow = hookRowId ? await read(ql2, 'crm_opportunity_line_item', hookRowId) : undefined;

  return {
    kernels: [kernel, k2],
    reading: {
      control, insert: insertLeg, update: updateLeg,
      declaredTwin, declaredTwinValue: twinRow?.[KEY], typo, viaHook, viaHookRow,
    },
  };
}

/**
 * `memory` is the sparse, schemaless store; `sqlite` is `@objectstack/driver-sql`
 * on knex/better-sqlite3; `sqlite-wasm` is the WASM build of the same family.
 * All three ship in this repo's dependencies, so all three are deployments a
 * customer can actually run.
 */
const DRIVERS: Array<{ driver: string; config: AnyRec }> = [
  { driver: 'memory', config: {} },
  { driver: 'sqlite', config: { filename: ':memory:' } },
  { driver: 'sqlite-wasm', config: { filename: ':memory:' } },
];

const readings = new Map<string, Reading>();
const kernels: AnyRec[] = [];

beforeAll(async () => {
  for (const { driver, config } of DRIVERS) {
    const { kernels: ks, reading } = await measure(driver, config);
    kernels.push(...ks);
    readings.set(driver, reading);
  }
}, 900000);

afterAll(async () => {
  for (const k of kernels) await k?.shutdown?.();
});

describe('the probe rests on a real asymmetry (#1200)', () => {
  it('crm_opportunity_line_item does not declare tax_rate', () => {
    expect(Object.keys((OpportunityLineItem as AnyRec).fields)).not.toContain(KEY);
  });

  it('its twin crm_quote_line_item does', () => {
    expect(Object.keys((QuoteLineItem as AnyRec).fields)).toContain(KEY);
  });
});

describe.each(DRIVERS.map((d) => d.driver))(
  'half 1 — on %s the CALLER cannot write an undeclared key',
  (driver) => {
    const R = () => readings.get(driver)!;

    it('control: the same row WITHOUT the key is accepted', () => {
      expect(R().control).toMatchObject({ ok: true });
    });

    it('control: the same key on the twin that DECLARES it is accepted and stored', () => {
      expect(R().declaredTwin).toMatchObject({ ok: true });
      expect(R().declaredTwinValue).toBe(10);
    });

    it('insert carrying the undeclared key is refused as INVALID_FIELD / 400', () => {
      const { ok, code, status, message } = R().insert;
      expect({ ok, code, status }).toEqual({ ok: false, code: 'INVALID_FIELD', status: 400 });
      expect(message).toContain(`Unknown field '${KEY}'`);
    });

    it('update carrying the undeclared key is refused the same way', () => {
      const { ok, code, status, message } = R().update;
      expect({ ok, code, status }).toEqual({ ok: false, code: 'INVALID_FIELD', status: 400 });
      expect(message).toContain(`Unknown field '${KEY}'`);
    });

    it('a plain misspelling of a declared field is refused too', () => {
      const { ok, code, status, message } = R().typo;
      expect({ ok, code, status }).toEqual({ ok: false, code: 'INVALID_FIELD', status: 400 });
      expect(message).toContain(`Unknown field '${TYPO}'`);
    });
  },
);

describe('half 2 — a key a HOOK writes has no door, and the drivers disagree (#1200)', () => {
  it('memory accepts it, stores it, and hands it back on read', () => {
    const R = readings.get('memory')!;
    expect(R.viaHook.ok).toBe(true);
    // The value is IN the row — not merely absent from an error.
    expect(R.viaHookRow && Object.hasOwn(R.viaHookRow, KEY)).toBe(true);
    expect(R.viaHookRow?.[KEY]).toBe(10);
    // And the object declares no such field, so no `fieldPermissions` entry can
    // name it: this value is outside field-level security by construction.
    expect(Object.keys((OpportunityLineItem as AnyRec).fields)).not.toContain(KEY);
  });

  it.each(['sqlite', 'sqlite-wasm'])('%s refuses it — but as a raw driver error, not an envelope', (driver) => {
    const R = readings.get(driver)!;
    expect(R.viaHook.ok).toBe(false);
    // The point is not that it fails; it is that the failure carries neither
    // the ADR-0112 code nor a status, so no caller can handle it by shape.
    expect(R.viaHook.code).not.toBe('INVALID_FIELD');
    expect(R.viaHook.status).toBeUndefined();
    expect(R.viaHook.message).toContain(KEY);
    expect(R.viaHookRow).toBeUndefined();
  });

  it('so the three drivers do NOT agree — the divergence itself is the finding', () => {
    const outcomes = DRIVERS.map((d) => readings.get(d.driver)!.viaHook.ok);
    expect(new Set(outcomes).size).toBe(2);
  });
});
