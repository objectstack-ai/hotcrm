// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import { fieldHasColumn, expectedIndexes } from '@objectstack/driver-sql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { applySystemFields } from '@objectstack/objectql';
import stack from '../objectstack.config';
import accountHooks from '../src/objects/account.hook';
import leadHooks from '../src/objects/lead.hook';
import { LeadConversionFlow } from '../src/flows/lead-conversion.flow';
import { makeCtx, hookNamed, type Rec } from './helpers/hook-harness';
import { makeFlowHarness, silentLogger } from './helpers/flow-harness';
import { runHookBody } from './helpers/action-sandbox';

/**
 * Case-insensitive account matching in lead conversion (#626).
 *
 * Converting a lead whose company is `"ACME  Corp"` used to create a SECOND
 * account next to the `"Acme Corp"` one, because `lead_conversion` matched on
 * the raw `crm_account.name`. The fix is a pair of stored, hook-maintained
 * match keys — `crm_account.name_normalized` and `crm_lead.company_normalized`
 * — that the flow compares with a plain equality filter.
 *
 * That shape is FORCED, not preferred, and the first three describes below
 * measure the three constraints that force it instead of restating them from a
 * comment. If any of them ever stops holding, these fail and the design should
 * be reconsidered — which is the only way a design premise stays honest across
 * a platform upgrade.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const account = objects.find((o) => o.name === 'crm_account') as AnyRec;
const lead = objects.find((o) => o.name === 'crm_lead') as AnyRec;

// ══════════════════════════════════ premise 1: a flow cannot normalize ══

/**
 * `service-automation`'s `resolveToken` recognises exactly ONE function form,
 * `NOW()` / `TODAY()`. Everything else falls through to an expression
 * evaluator that substitutes every bare identifier with its value BEFORE
 * evaluating, so a string method is never reachable — `{x.toLowerCase()}`
 * resolves the whole dotted path `x.company.toLowerCase` to `undefined` and
 * then tries to call `null`.
 *
 * Run through the REAL engine, because the interesting failure is silent: an
 * unrecognised token does not raise, it interpolates to `""` or to itself.
 */
describe('premise: a flow template cannot fold a string', () => {
  const CANDIDATES: Record<string, string> = {
    unwrapped_lower: 'LOWER({leadRecord.company})',
    fn_lower: '{LOWER(leadRecord.company)}',
    fn_trim: '{TRIM(leadRecord.company)}',
    method_lower: '{leadRecord.company.toLowerCase()}',
    parenthesised_method: '{(leadRecord.company).toLowerCase()}',
    passthrough: '{leadRecord.company}',
  };

  let out: Rec = {};

  beforeAll(async () => {
    const store: Record<string, Rec[]> = { crm_lead: [{ id: 'lead_1', company: 'ACME  Corp' }] };
    const data: AnyRec = {
      async findOne(object: string, opts: AnyRec = {}) {
        const where = opts.where ?? opts.filter ?? {};
        return (
          store[object]?.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null
        );
      },
      async find(object: string) {
        return store[object] ?? [];
      },
      async insert(object: string, doc: Rec) {
        const rec = { id: `${object}_1`, ...doc };
        (store[object] ??= []).push(rec);
        return rec;
      },
      async update() {
        return { modified: 0 };
      },
    };

    const engine = new AutomationEngine(silentLogger);
    installBuiltinNodes(engine, {
      logger: silentLogger,
      getService: (n: string) => (n === 'data' || n === 'objectql' ? data : undefined),
    } as never);
    engine.registerFlow('probe_normalize', {
      name: 'probe_normalize',
      label: 'probe',
      type: 'autolaunched',
      status: 'active',
      variables: [{ name: 'recordId', type: 'text', isInput: true, isOutput: false }],
      nodes: [
        { id: 'start', type: 'start', label: 'Start', config: {} },
        {
          id: 'get_lead',
          type: 'get_record',
          label: 'Get Lead',
          config: {
            objectName: 'crm_lead',
            filter: { id: '{recordId}' },
            outputVariable: 'leadRecord',
          },
        },
        {
          id: 'probe',
          type: 'create_record',
          label: 'Probe',
          config: { objectName: 'probe_out', fields: CANDIDATES, outputVariable: 'probeOut' },
        },
        { id: 'end', type: 'end', label: 'End' },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'get_lead', type: 'default' },
        { id: 'e2', source: 'get_lead', target: 'probe', type: 'default' },
        { id: 'e3', source: 'probe', target: 'end', type: 'default' },
      ],
    } as never);

    await engine.execute('probe_normalize', {
      params: { recordId: 'lead_1' },
      userId: 'user_1',
      event: 'manual',
    } as never);
    out = store.probe_out?.[0] ?? {};
  });

  it('passes the raw value through unchanged — the only thing that works', () => {
    expect(out.passthrough).toBe('ACME  Corp');
  });

  it.each(['fn_lower', 'fn_trim', 'method_lower', 'parenthesised_method'])(
    'resolves %s to undefined — no LOWER/TRIM/string method exists',
    (key) => {
      expect(out[key]).toBeUndefined();
    },
  );

  it('interpolates an unwrapped LOWER(...) literally, silently', () => {
    // The worst shape of all: it looks like it worked and would be written to
    // the database as the literal text.
    expect(out.unwrapped_lower).toBe('LOWER(ACME  Corp)');
  });
});

// ═════════════════════════ premise 2: a formula field has no column ══

describe('premise: a formula field cannot be the match key', () => {
  it('driver-sql materializes no column for type: formula', () => {
    expect(fieldHasColumn({ type: 'formula' } as never)).toBe(false);
    expect(fieldHasColumn({ type: 'text' } as never)).toBe(true);
  });

  it('so the stored match key is a text field, not a formula', () => {
    expect(account.fields.name_normalized.type).toBe('text');
    expect(lead.fields.company_normalized.type).toBe('text');
  });
});

// ═══════════════════════════════ premise 3: `$regex` is not an answer ══

/**
 * The measurement is sharper than "unindexed". It used to be that on
 * `driver-sql`, `$regex` was not evaluated as a regular expression at all — it
 * compiled to `LIKE '%value%'`, a LIKE-escaped SUBSTRING match, so it matched
 * strings the caller did not mean and a real pattern matched nothing.
 *
 * ObjectStack 17.0.0-rc.6 finished the argument: `$regex` was never declared by
 * the Filter Protocol and is now RETIRED (upstream #4706) — the driver rejects
 * it outright rather than compiling it to something that means a different
 * thing on each backend. The declared replacement, `$icontains`, is exactly the
 * case-insensitive substring match the old compilation already was, so the
 * premise this block exists to establish is unchanged and now stronger: no
 * filter operator expresses normalize-then-exact, which is why the match key
 * below is a stored, normalized column.
 */
describe('premise: no filter operator expresses normalize-then-exact on SQL', () => {
  let driver: SqliteWasmDriver;

  beforeAll(async () => {
    driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    await driver.initObjects([
      { name: 'probe_account', fields: { name: { type: 'text' } }, indexes: [] } as never,
    ]);
    await driver.create('probe_account', { name: 'Acme Corp' });
    await driver.create('probe_account', { name: 'Not Acme Corp Ltd' });
    await driver.create('probe_account', { name: 'ACME  Corp' });
  }, 60_000);

  afterAll(async () => {
    await driver?.disconnect();
  });

  const names = async (where: Rec): Promise<string[]> => {
    const rows = (await driver.find('probe_account', {
      object: 'probe_account',
      where,
    } as never)) as AnyRec[];
    return rows.map((r) => String(r.name)).sort();
  };

  it('`$regex` is retired — the driver refuses it instead of guessing', async () => {
    await expect(names({ name: { $regex: 'Acme Corp' } })).rejects.toThrow(
      /\$regex.*RETIRED|RETIRED.*\$regex/is,
    );
  });

  it('`$icontains`, the declared replacement, matches a SUPERSTRING — not an exact match', async () => {
    expect(await names({ name: { $icontains: 'Acme Corp' } })).toEqual([
      'Acme Corp',
      'Not Acme Corp Ltd',
    ]);
  });

  it('and it cannot collapse internal whitespace — the comparand is literal', async () => {
    // 'ACME  Corp' (two spaces) is the row a normalize-then-exact match must
    // find for the input 'Acme Corp'. A substring predicate cannot: the
    // comparand is matched literally, so the single space never lines up.
    expect(await names({ name: { $icontains: 'Acme Corp' } })).not.toContain('ACME  Corp');
    // Nor is a real pattern an escape hatch any more — it is just a literal.
    expect(await names({ name: { $icontains: '^acme\\s+corp$' } })).toEqual([]);
  });
});

// ══════════════════════════════════════════ the columns the fix adds ══

describe('crm_account.name_normalized is a machine-owned match key', () => {
  const field = () => account.fields.name_normalized as AnyRec;

  it('is stored, readonly and hidden', () => {
    expect(field().readonly).toBe(true);
    // Hidden keeps a derived column out of forms and pickers — the pairing
    // `crm_forecast.seed_key` established. It is also why the field needs no
    // locale entry: nothing renders its label.
    expect(field().hidden).toBe(true);
  });

  it('is indexed — every conversion filters on it', () => {
    const declared = ((account.indexes ?? []) as AnyRec[]).map((i) => (i.fields ?? []).join(','));
    expect(declared).toContain('name_normalized');
  });

  it('does NOT carry a unique index, and leaves #625 exactly one', () => {
    // The decision recorded in `account.object.ts`: uniqueness of account names
    // already lives, per tenant, on `name`. A unique `name_normalized` subsumes
    // it and would re-open the constraint #625 landed; `create_index` also
    // FAILS on any deployment already holding both spellings. This assertion is
    // what makes that a decision rather than an omission.
    const orgScoped = applySystemFields(account as never, { multiTenant: true }) as AnyRec;
    const physicalColumns = new Set<string>([
      'id',
      ...Object.entries(orgScoped.fields as Record<string, AnyRec>)
        .filter(([, f]) => (f?.type ?? 'string') !== 'formula')
        .map(([name]) => name),
    ]);
    const indexes = expectedIndexes({
      table: 'crm_account',
      fields: orgScoped.fields as Record<string, unknown>,
      tenantField: 'organization_id',
      declaredIndexes: (orgScoped.indexes ?? []) as AnyRec[],
      physicalColumns,
    });
    expect(indexes.filter((i) => i.unique).map((i) => i.columns)).toEqual([
      ['organization_id', 'name'],
    ]);
    expect(indexes.some((i) => i.columns.includes('name_normalized'))).toBe(true);
  });
});

describe('crm_lead.company_normalized is the other half of the pair', () => {
  it('is stored, readonly and hidden', () => {
    expect(lead.fields.company_normalized.readonly).toBe(true);
    expect(lead.fields.company_normalized.hidden).toBe(true);
  });

  it('leaves `company` itself untouched — it is the display value', () => {
    // Folding `company` in place (the way `email` is folded) would ship
    // "acme corp" as the name of the account conversion creates.
    expect(lead.fields.company.readonly).not.toBe(true);
    expect(lead.fields.company.hidden).not.toBe(true);
    expect(lead.fields.company.required).toBe(true);
  });
});

// ═══════════════════════════════════════ the producers, as real handlers ══

const FOLDING_CASES: Array<[string, unknown, unknown]> = [
  ['a mixed-case name', 'Acme Corp', 'acme corp'],
  ['the shout-case double-space spelling', 'ACME  Corp', 'acme corp'],
  ['leading and trailing space', '  Acme Corp  ', 'acme corp'],
  ['a tab between words', 'Acme\tCorp', 'acme corp'],
  ['a newline between words', 'Acme\nCorp', 'acme corp'],
  ['an already-canonical value', 'acme corp', 'acme corp'],
  ['a whitespace-only value', '   ', null],
  ['a non-string value', 42, null],
];

describe('account_protection folds name into name_normalized', () => {
  const hook = hookNamed(accountHooks, 'account_protection');

  it.each(FOLDING_CASES)('folds %s', async (_label, name, expected) => {
    const input: Rec = { name };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: { id: 'user_1' } }));
    expect(input.name_normalized).toBe(expected);
  });

  it('re-folds on an update that rewrites the name', async () => {
    const input: Rec = { name: 'ACME   Corporation' };
    await hook.handler(
      makeCtx({
        event: 'beforeUpdate',
        input,
        previous: { name: 'Acme Corp', name_normalized: 'acme corp' },
        user: { id: 'user_1' },
      }),
    );
    expect(input.name_normalized).toBe('acme corporation');
  });

  it('leaves the key alone when the write does not carry the name', async () => {
    // An unrelated partial edit must not blank the match key — that would evict
    // the account from every future conversion lookup.
    const input: Rec = { phone: '+1-512-555-0100' };
    await hook.handler(
      makeCtx({
        event: 'beforeUpdate',
        input,
        previous: { name: 'Acme Corp', name_normalized: 'acme corp' },
        user: { id: 'user_1' },
      }),
    );
    expect('name_normalized' in input).toBe(false);
  });

  it('still projects billing_country in the same write — #621 is untouched', async () => {
    // Both derivations live in one handler, so a regression in either is easy
    // to introduce while editing the other. One write, both columns.
    const input: Rec = { name: 'ACME  Corp', billing_address: { city: 'Munich', country: ' de ' } };
    await hook.handler(makeCtx({ event: 'beforeInsert', input, user: { id: 'user_1' } }));
    expect(input.name_normalized).toBe('acme corp');
    expect(input.billing_country).toBe('DE');
  });
});

describe('lead_duplicate_check folds company into company_normalized', () => {
  const hook = hookNamed(leadHooks, 'lead_duplicate_check');

  it.each(FOLDING_CASES)('folds %s', async (_label, company, expected) => {
    const input: Rec = { company };
    await hook.handler(makeCtx({ event: 'beforeInsert', input }));
    expect(input.company_normalized).toBe(expected);
  });

  it('folds on update too, before the insert-only dedupe returns', async () => {
    const input: Rec = { company: 'ACME  Corp' };
    await hook.handler(
      makeCtx({ event: 'beforeUpdate', input, previous: { company: 'Globex' } }),
    );
    expect(input.company_normalized).toBe('acme corp');
  });

  it('leaves the key alone when the write does not carry the company', async () => {
    const input: Rec = { phone: '555' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input, previous: { company: 'Acme' } }));
    expect('company_normalized' in input).toBe(false);
  });

  it('does not disturb the email fold it shares the handler with', async () => {
    const input: Rec = { company: 'ACME  Corp', email: '  Joe@Example.COM ' };
    await hook.handler(makeCtx({ event: 'beforeUpdate', input }));
    expect(input.email).toBe('joe@example.com');
    expect(input.company_normalized).toBe('acme corp');
  });
});

// ═══════════════════════════════ the producers, inside the real sandbox ══

/**
 * Both folds are written INLINE, with no module-scope helper, so the handlers
 * still lower to a metadata-only body — which is what the runtime evaluates.
 * `action-sandbox.test.ts` proves they lower; only running them in QuickJS
 * proves the inlined code uses nothing the sandbox lacks (a `replace` with a
 * regex literal, here).
 */
describe('both folds run inside the QuickJS sandbox', () => {
  it('account_protection folds name in the VM', async () => {
    const hook = hookNamed(accountHooks, 'account_protection');
    const { input } = await runHookBody(hook, {
      event: 'beforeInsert',
      input: { name: '  ACME   Corp ' },
    });
    expect(input.name_normalized).toBe('acme corp');
  });

  it('lead_duplicate_check folds company in the VM', async () => {
    const hook = hookNamed(leadHooks, 'lead_duplicate_check');
    const { input } = await runHookBody(hook, {
      event: 'beforeInsert',
      input: { company: '  ACME   Corp ', email: 'joe@example.com' },
    });
    expect(input.company_normalized).toBe('acme corp');
  });
});

// ════════════════════════════════════════════ the acceptance criteria ══

/**
 * End-to-end through the REAL flow and the REAL hooks: records are written via
 * the hooked data engine, never hand-stamped, so the test proves the producer
 * chain (hook → column → flow filter) rather than its own fixtures.
 */
const CONVERSION_HOOKS = [
  hookNamed(leadHooks, 'lead_automation'),
  hookNamed(leadHooks, 'lead_duplicate_check'),
  hookNamed(accountHooks, 'account_protection'),
] as never[];

const makeConversion = () =>
  makeFlowHarness({ lead_conversion: LeadConversionFlow }, {}, { hooks: CONVERSION_HOOKS });

async function convert(harness: ReturnType<typeof makeConversion>, leadId: string) {
  const runId = await harness.run('lead_conversion', { recordId: leadId });
  await harness.resume(runId!, { createOpportunity: false });
}

const leadPayload = (id: string, company: string): Rec => ({
  id,
  company,
  email: `${id}@example.com`,
  first_name: 'Joe',
  last_name: 'Green',
  status: 'qualified',
  is_converted: false,
});

describe('acceptance: a case/whitespace variant reuses the same account', () => {
  it('converting "ACME  Corp" reuses the account created from "Acme Corp"', async () => {
    const h = makeConversion();
    await h.data.insert('crm_lead', leadPayload('lead_1', 'Acme Corp'));
    await h.data.insert('crm_lead', leadPayload('lead_2', 'ACME  Corp'));

    await convert(h, 'lead_1');
    expect(h.store.crm_account).toHaveLength(1);
    const created = h.store.crm_account[0];
    expect(created.name, 'the display name is the lead value, verbatim').toBe('Acme Corp');
    expect(created.name_normalized, 'the hook derived the match key').toBe('acme corp');

    await convert(h, 'lead_2');
    expect(h.store.crm_account, 'no duplicate account').toHaveLength(1);
    expect(h.store.crm_lead.find((l) => l.id === 'lead_2')!.converted_account).toBe(created.id);
  });

  it('filters on the normalized column with the folded value', async () => {
    // The outcome above could also be produced by matching on something else.
    // This pins WHICH query the flow issues.
    const h = makeConversion();
    await h.data.insert('crm_lead', leadPayload('lead_1', 'ACME  Corp'));
    await convert(h, 'lead_1');

    const lookup = h.queries.find((q) => q.object === 'crm_account');
    expect(lookup?.where).toEqual({ name_normalized: 'acme corp' });
  });

  it('still creates an account when nothing matches', async () => {
    const h = makeConversion();
    await h.data.insert('crm_account', { id: 'acc_1', name: 'Globex Industries' });
    await h.data.insert('crm_lead', leadPayload('lead_1', 'Initech'));
    await convert(h, 'lead_1');

    expect(h.store.crm_account).toHaveLength(2);
    expect(h.store.crm_account[1].name).toBe('Initech');
    expect(h.store.crm_account[1].name_normalized).toBe('initech');
  });

  it('a lead with no match key stops the conversion instead of guessing', async () => {
    // The un-backfilled LEAD case (docs/MAINTENANCE.md §3.3). The filter value
    // resolves to nothing and `get_record` refuses to run rather than widen the
    // query to every account — measured here rather than assumed, because the
    // alternative (a silent match-all) would attach the conversion to an
    // arbitrary account, which is far worse than failing.
    const h = makeConversion();
    h.store.crm_lead = [{ ...leadPayload('lead_legacy', 'Acme Corp'), company_normalized: undefined }];
    const runId = await h.run('lead_conversion', { recordId: 'lead_legacy' });
    const done = (await h.resume(runId!, { createOpportunity: false })) as AnyRec;

    expect(String(done?.error ?? '')).toMatch(/resolved to nothing|refusing to run/);
    expect(h.store.crm_account ?? [], 'no account was invented').toHaveLength(0);
    expect(h.store.crm_lead[0].is_converted, 'the lead is untouched').not.toBe(true);
  });

  it('an account with no match key is invisible — the reason the backfill is not optional', async () => {
    // The un-backfilled ACCOUNT case: this one is SILENT, which is exactly why
    // it is documented as the failure that makes the backfill mandatory.
    const h = makeConversion();
    h.store.crm_account = [{ id: 'acc_legacy', name: 'Acme Corp', is_active: true }];
    await h.data.insert('crm_lead', leadPayload('lead_1', 'Acme Corp'));
    await convert(h, 'lead_1');

    expect(h.store.crm_account, 'a duplicate account, as documented').toHaveLength(2);
  });

  it('a fresh install and a backfilled install behave identically', async () => {
    // "Fresh": the account was created by a conversion, so the hook stamped the
    // key on insert. "Backfilled": the account predates the column and the
    // operator re-saved it (docs/MAINTENANCE.md §3.3) — modelled as an UPDATE
    // carrying `name`, which is exactly what the backfill issues. Both must
    // then be found by the same variant-spelling lead.
    const fresh = makeConversion();
    await fresh.data.insert('crm_lead', leadPayload('lead_seed', 'Acme Corp'));
    await convert(fresh, 'lead_seed');

    const backfilled = makeConversion();
    // A row written before the column existed: no match key at all.
    backfilled.store.crm_account = [{ id: 'acc_legacy', name: 'Acme Corp', is_active: true }];
    await backfilled.data.update('crm_account', { name: 'Acme Corp' }, { where: { id: 'acc_legacy' } });

    expect(backfilled.store.crm_account[0].name_normalized).toBe(
      fresh.store.crm_account[0].name_normalized,
    );

    for (const h of [fresh, backfilled]) {
      await h.data.insert('crm_lead', leadPayload('lead_variant', 'ACME  Corp'));
      await convert(h, 'lead_variant');
      expect(h.store.crm_account, 'reused the existing account').toHaveLength(1);
    }
  });
});
