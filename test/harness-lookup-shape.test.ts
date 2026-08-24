// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { REFERENCE_VALUE_TYPES } from '@objectstack/spec/data';
import * as appObjects from '../src/objects/index';
import { makeHarness, referenceValueShapeError, type Rec } from './helpers/hook-harness';
import { makeSandboxEngine, runActionBody } from './helpers/action-sandbox';

/**
 * The instrument that certifies this app must not be more permissive than the
 * engine that runs it (#1016).
 *
 * Both harnesses used to store a write verbatim. A hook or action body could
 * therefore put `false`, `42` or `{}` into a lookup column and every test built
 * on them stayed green — the discount #714 was shipped under, where
 * `quote_on_accepted` wrote a boolean into `crm_contract.crm_contact` for a
 * long time while its own test case (the "quote with no contact" path) passed
 * throughout. The real refusal only surfaced in a release-candidate acceptance
 * run, as a 400 that aborted the whole handler.
 *
 * This file pins the repaired instrument the only way that cannot rot: every
 * verdict is compared against a REAL `ObjectQL`, field definition by field
 * definition, using the app's own metadata. If the platform moves its ADR-0104
 * boundary, this test goes red — instead of the harness quietly resuming its
 * career as a liar.
 *
 * ### Timeout budget (the default 5000ms is not enough and not inherited)
 *
 * Booting an `ObjectQL` over `InMemoryDriver` and registering the probe object
 * dominates: measured at ~2s for the boot in `beforeAll`, so it gets 60s, the
 * same allowance `test/quote-accepted-lookups.test.ts` uses. The differential
 * case drives ~7 inserts against each of the app's reference fields (56 of them
 * at the time of writing) through the full validate path; measured at ~2-3s, so
 * it gets 30s. Everything else is pure in-process harness work and keeps the
 * default.
 */

type AnyRec = Record<string, any>;

const ENGINE_BOOT_TIMEOUT = 60_000;
const DIFFERENTIAL_TIMEOUT = 30_000;

/** Strict value shapes — `os migrate value-shapes --apply` records this on a real deployment. */
const STRICT = 'OS_DATA_VALUE_SHAPE_STRICT_ENABLED';

/**
 * Every reference-valued field the app declares, read off the real metadata.
 *
 * Not a hand-maintained list: the issue's own objection to one was that a list
 * rots. `REFERENCE_VALUE_TYPES` is the platform's own classification, so a new
 * lookup column — or a new reference-valued field TYPE on the platform — joins
 * this sweep the day it lands.
 */
const REFERENCE_FIELDS: Array<{ object: string; field: string; def: AnyRec }> = [];
for (const candidate of Object.values(appObjects as Record<string, unknown>)) {
  const def = candidate as { name?: unknown; fields?: Record<string, AnyRec> };
  if (!def || typeof def.name !== 'string' || !def.fields) continue;
  for (const [field, fieldDef] of Object.entries(def.fields)) {
    if (fieldDef && typeof fieldDef.type === 'string' && REFERENCE_VALUE_TYPES.has(fieldDef.type)) {
      REFERENCE_FIELDS.push({ object: def.name, field, def: fieldDef });
    }
  }
}

/**
 * The values that decide this. Each is labelled with what it proves — the
 * refusals are the point, and the four ACCEPTED rows are the control without
 * which "refuse everything" would satisfy the refusal cases perfectly.
 */
const PROBE_VALUES: Array<[label: string, value: unknown]> = [
  ['false — the #714 value', false],
  ['a number', 42],
  ['an object', { id: 'acc_1' }],
  ['a record id (CONTROL — must pass)', 'acc_1'],
  ['an empty string (CONTROL — the engine accepts it)', ''],
  ['null (CONTROL — clearing a link is legal)', null],
  ['undefined (CONTROL — an absent link)', undefined],
];

/** Did this engine error come from the ADR-0104 value-shape gate? */
const isValueShapeRefusal = (message: string): boolean =>
  /has an invalid \w+ value:|must be an array of values/.test(message);

describe('the harness refuses a junk lookup value the way the engine does', () => {
  const CONTRACT = 'crm_contract';

  it('hook-harness: insert() rejects the boolean that #714 shipped', async () => {
    const h = makeHarness({ [CONTRACT]: [] });
    await expect(
      h.api.object(CONTRACT).insert({ crm_account: 'acc_1', crm_contact: false }),
    ).rejects.toThrow(/invalid lookup value: Invalid input: expected string, received boolean/);
    expect(h.rows(CONTRACT), 'the junk write was stored anyway').toHaveLength(0);
  });

  it('hook-harness: update() rejects it too — a derived write is a write', async () => {
    const h = makeHarness({ [CONTRACT]: [{ id: 'ctr_1', crm_contact: 'con_1' }] });
    await expect(
      h.api.object(CONTRACT).update({ id: 'ctr_1', crm_contact: 42 }, { where: { id: 'ctr_1' } }),
    ).rejects.toThrow(/invalid lookup value: Invalid input: expected string, received number/);
    expect(h.rows(CONTRACT)[0]!.crm_contact, 'the row was mutated by a refused write').toBe('con_1');
  });

  it.each([
    ['insert', (e: AnyRec) => e.insert(CONTRACT, { crm_contact: false })],
    ['update', (e: AnyRec) => e.update(CONTRACT, { id: 'ctr_1', crm_contact: false }, { where: { id: 'ctr_1' } })],
    ['upsert', (e: AnyRec) => e.upsert(CONTRACT, { id: 'ctr_1', crm_contact: false }, { where: { id: 'ctr_1' } })],
  ])('action-sandbox: %s() rejects it', async (_op, call) => {
    const sandbox = makeSandboxEngine({ [CONTRACT]: [{ id: 'ctr_1', crm_contact: 'con_1' }] });
    await expect(call(sandbox.engine)).rejects.toThrow(
      /invalid lookup value: Invalid input: expected string, received boolean/,
    );
  });

  it('action-sandbox: it fires on the SHIPPED path, through QuickJS', async () => {
    // Not a direct stub call: the body crosses the VM boundary and reaches the
    // engine through the runtime's own repo facade, which is the path a real
    // action takes. A refusal that only works when called directly would miss
    // every actual action body.
    const engine = makeSandboxEngine({ [CONTRACT]: [] });
    const action: AnyRec = {
      name: 'sandbox_lookup_probe',
      objectName: CONTRACT,
      type: 'script',
      body: {
        language: 'js',
        source: `await ctx.api.object('${CONTRACT}').insert({ crm_account: 'acc_1', crm_contact: false });`,
        capabilities: ['api.write'],
        timeoutMs: 2000,
      },
    };
    await expect(runActionBody(action, { engine })).rejects.toThrow(/invalid lookup value/);
    expect(engine.rows(CONTRACT)).toHaveLength(0);
  });
});

describe('the control — a valid lookup value still passes', () => {
  it('accepts a record id, and stores it', async () => {
    const h = makeHarness({ crm_contract: [] });
    const row = (await h.api.object('crm_contract').insert({
      crm_account: 'acc_1',
      crm_contact: 'con_1',
    })) as AnyRec;
    expect(row.crm_contact).toBe('con_1');
    expect(h.rows('crm_contract')).toHaveLength(1);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
  ])('accepts %s — the engine does, so the harness must not be stricter', async (_label, value) => {
    const h = makeHarness({ crm_contract: [] });
    await expect(
      h.api.object('crm_contract').insert({ crm_account: 'acc_1', crm_contact: value }),
    ).resolves.toBeTruthy();
  });

  it('leaves non-reference columns entirely alone', async () => {
    // `contract_value` is a number column; a number there is correct. A harness
    // that policed every column would break far more than it fixed.
    const h = makeHarness({ crm_contract: [] });
    const row = (await h.api.object('crm_contract').insert({
      crm_account: 'acc_1',
      contract_value: 1_000,
    })) as AnyRec;
    expect(row.contract_value).toBe(1_000);
  });

  it('skips objects it holds no metadata for, rather than guessing', async () => {
    const h = makeHarness({ sys_user: [] });
    await expect(h.api.object('sys_user').insert({ manager: false })).resolves.toBeTruthy();
  });

  it('leaves `system` columns alone — the engine does not validate them either', async () => {
    // `owner_id` is `system: true` on nearly every object here, and the engine's
    // validateRecord skips system/readonly fields outright. Policing it would
    // have turned a large part of this suite red over values production
    // accepts — the differential below is what caught that in the first draft.
    const owner = REFERENCE_FIELDS.find((f) => f.object === 'crm_contract' && f.field === 'owner_id');
    expect(owner?.def.system, 'owner_id is no longer a system column — re-check the skip').toBe(true);
    const h = makeHarness({ crm_contract: [] });
    await expect(
      h.api.object('crm_contract').insert({ crm_account: 'acc_1', owner_id: false }),
    ).resolves.toBeTruthy();
  });
});

// ───────────────────────── the harness verdict IS the engine verdict ──

describe("the harness verdict is pinned to the engine's own", () => {
  /**
   * The anti-drift mechanism. Every reference field the app declares is
   * registered on a real `ObjectQL` and driven with every probe value; the
   * engine's verdict and the harness's verdict must agree on all of them.
   *
   * `required` / `notNull` are stripped from the probe copies on purpose: the
   * property under test is value SHAPE, and leaving them on would answer every
   * insert with "X is required" before the shape gate is ever reached.
   */
  let ql: AnyRec;
  let api: AnyRec;
  let previousStrict: string | undefined;

  /** Probe field name → the app field it stands for. Names are unique per index. */
  const probeName = (i: number) => `p${i}`;

  beforeAll(async () => {
    previousStrict = process.env[STRICT];
    process.env[STRICT] = '1';

    const fields: AnyRec = { id: { type: 'text' }, name: { type: 'text' } };
    REFERENCE_FIELDS.forEach((entry, i) => {
      const { required, notNull, ...shapeOnly } = entry.def;
      fields[probeName(i)] = shapeOnly;
    });

    ql = await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { probe_target: { name: 'probe_target', fields } as never } as never,
    });
    api = ql.createContext({ isSystem: true });
  }, ENGINE_BOOT_TIMEOUT);

  afterAll(async () => {
    if (previousStrict === undefined) delete process.env[STRICT];
    else process.env[STRICT] = previousStrict;
    await ql?.close();
  });

  it('covers every reference-valued field the app declares', () => {
    expect(REFERENCE_FIELDS.length, 'no reference fields were discovered — the sweep is empty').toBeGreaterThan(0);
    // The check is only as live as its index. A silent drop to zero here would
    // make every assertion in this file vacuously true.
    const objects = new Set(REFERENCE_FIELDS.map((f) => f.object));
    expect(objects.size).toBeGreaterThan(1);
  });

  it('agrees with the engine on every field × every value', async () => {
    const disagreements: string[] = [];

    for (const [i, entry] of REFERENCE_FIELDS.entries()) {
      for (const [label, value] of PROBE_VALUES) {
        const doc: Rec = { name: 'probe' };
        doc[probeName(i)] = value;

        let engineRefused = false;
        let engineMessage = '';
        try {
          await api.object('probe_target').insert(doc);
        } catch (e) {
          engineMessage = (e as Error).message;
          engineRefused = isValueShapeRefusal(engineMessage);
          if (!engineRefused) {
            disagreements.push(
              `${entry.object}.${entry.field} with ${label}: engine failed for an UNRELATED reason — ${engineMessage}`,
            );
            continue;
          }
        }

        const harnessRefused = referenceValueShapeError(entry.field, entry.def, value) !== null;
        if (harnessRefused !== engineRefused) {
          disagreements.push(
            `${entry.object}.${entry.field} (${entry.def.type}${entry.def.multiple ? ', multiple' : ''}) with ${label}: ` +
              `engine ${engineRefused ? 'REFUSED' : 'accepted'} but harness ${harnessRefused ? 'REFUSED' : 'accepted'}` +
              (engineMessage ? ` — engine said: ${engineMessage}` : ''),
          );
        }
      }
    }

    expect(disagreements, `the harness no longer mirrors the engine:\n${disagreements.join('\n')}`).toEqual([]);
  }, DIFFERENTIAL_TIMEOUT);

  it('reproduces the exact #714 diagnostic wording', async () => {
    // The harness message quotes the engine's sentence so a failure here is
    // greppable against a real production log.
    const contact = REFERENCE_FIELDS.find((f) => f.object === 'crm_contract' && f.field === 'crm_contact');
    expect(contact, 'crm_contract.crm_contact is no longer a reference field').toBeTruthy();
    expect(referenceValueShapeError(contact!.field, contact!.def, false)).toMatch(
      /has an invalid lookup value: Invalid input: expected string, received boolean/,
    );
  });
});

describe('the warn-first default is why the harness refuses rather than warns', () => {
  /**
   * Measured, because it is the whole justification for making the harness
   * throw: with the ADR-0104 gate NOT yet enforced (the default posture on an
   * un-migrated deployment), the engine does not refuse the boolean — it KEEPS
   * it. So the two production outcomes are "the write is rejected" and "a
   * boolean is now sitting in a reference column"; neither is a thing a green
   * test should have promised.
   */
  let ql: AnyRec;
  let previousStrict: string | undefined;

  beforeAll(async () => {
    previousStrict = process.env[STRICT];
    delete process.env[STRICT];
    ql = await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        probe_target: {
          name: 'probe_target',
          fields: { id: { type: 'text' }, name: { type: 'text' }, link: { type: 'lookup', reference: 'probe_target', label: 'Link' } },
        } as never,
      } as never,
    });
  }, ENGINE_BOOT_TIMEOUT);

  afterAll(async () => {
    if (previousStrict === undefined) delete process.env[STRICT];
    else process.env[STRICT] = previousStrict;
    await ql?.close();
  });

  it('persists the boolean instead of rejecting it', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('probe_target').insert({ name: 'a', link: false });
    expect(row.link, 'warn-first no longer stores the junk — re-read the harness rationale').toBe(false);
  });
});
