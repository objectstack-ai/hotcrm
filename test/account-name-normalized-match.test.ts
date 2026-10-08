// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { fieldHasColumn, expectedIndexes, withheldFilterDiagnosticOf } from '@objectstack/driver-sql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { applySystemFields } from '@objectstack/objectql';
import stack from './helpers/composed-stack';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, conditionHolds, type Person } from './helpers/verify-stack';
import { LeadConversionFlow } from '../src/sales/flows/lead-conversion.flow';

type Rec = Record<string, any>;

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

/**
 * The shipped app booted by `@objectstack/verify`, for every block below that
 * runs something: a probe flow registered through the platform's own
 * flow-authoring door, the folds on real writes, and lead conversion end to
 * end. The converter is a sales MANAGER: a sales rep's conversion of a lead
 * into a NEW account is refused on 17.7.0 (the flow writes `annual_revenue`,
 * which `sales_rep` may not edit) — see `test/flow-conversion.test.ts`.
 */
let verify: VerifyStack;
let admin: string;
let rep: Person;
let manager: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@account-name-normalized-match.test', {
    name: 'Fold Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  manager = await signUpPerson(verify, 'manager@account-name-normalized-match.test', {
    name: 'Converting Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

// ══════════════════════════════════ premise 1: a flow cannot normalize ══

/**
 * `service-automation`'s value expressions support a small closed vocabulary —
 * `round`, `floor`, `ceil`, `abs`, `min`, `max` (1:1 with the CEL stdlib) plus
 * the whole-token date macros `NOW()` / `TODAY()`. There is no `LOWER`, no
 * `TRIM`, and no string method.
 *
 * Run on the real engine: each candidate spelling is the value of a
 * `create_record` field in a probe flow of its own, registered through the
 * platform's flow-authoring door (`POST /automation`, as the admin) and run
 * through the trigger door against a real lead. Since 17.3.0
 * (objectstack#11060) a function INSIDE a template hole that the vocabulary
 * does not declare REFUSES the run and names itself — nothing is written. A
 * function written OUTSIDE the braces is not an expression at all: it is
 * template text around a hole, and lands verbatim (measured on 17.7.0 —
 * `LOWER({x})` writes the literal `LOWER(ACME  Corp)`). Neither folds; the one
 * form that does anything is the bare pass-through.
 */
describe('premise: a flow template cannot fold a string', () => {
  const REFUSED: Record<string, [string, RegExp]> = {
    fn_lower: ['{LOWER(leadRecord.company)}', /LOWER/],
    fn_trim: ['{TRIM(leadRecord.company)}', /TRIM/],
    method_lower: ['{leadRecord.company.toLowerCase()}', /toLowerCase/],
    parenthesised_method: ['{(leadRecord.company).toLowerCase()}', /toLowerCase/],
  };
  const UNWRAPPED = 'LOWER({leadRecord.company})';
  const PASSTHROUGH = '{leadRecord.company}';

  let leadId: string;
  /** Run a probe writing `value` into a task's subject; the run's refusal (or null) and what it wrote. */
  const probe = async (key: string, value: string) => {
    const name = `probe_fold_${key}`;
    const flow = {
      name, label: 'probe', type: 'autolaunched', status: 'active', runAs: 'system',
      variables: [{ name: 'recordId', type: 'text', isInput: true, isOutput: false }],
      nodes: [
        { id: 'start', type: 'start', label: 'Start', config: {} },
        { id: 'get_lead', type: 'get_record', label: 'Get Lead', config: { objectName: 'crm_lead', filter: { id: '{recordId}' }, outputVariable: 'leadRecord' } },
        {
          id: 'probe', type: 'create_record', label: 'Probe',
          config: { objectName: 'crm_task', fields: { subject: value, description: `probe ${key}`, type: 'follow_up', priority: 'normal', status: 'not_started' } },
        },
        { id: 'end', type: 'end', label: 'End' },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'get_lead', type: 'default' },
        { id: 'e2', source: 'get_lead', target: 'probe', type: 'default' },
        { id: 'e3', source: 'probe', target: 'end', type: 'default' },
      ],
    };
    const registered = await verify.apiAs(admin, 'POST', '/automation', flow);
    expect(registered.status, await registered.clone().text()).toBe(200);
    let refusal: string | null = null;
    try {
      await verify.flows.run(name, { recordId: leadId }, { as: admin });
    } catch (e: unknown) {
      refusal = String((e as Rec).message ?? e);
    } finally {
      expect((await verify.apiAs(admin, 'DELETE', `/automation/${name}`)).status).toBe(200);
    }
    const written = (await verify.rows('crm_task', { description: `probe ${key}` })).map((t) => t.subject);
    return { refusal, written };
  };

  beforeAll(async () => {
    const [probeLead] = await verify.seed('crm_lead', [{
      first_name: 'Joe', last_name: 'Probe', company: 'ACME  Corp', email: 'joe.probe@account-name-normalized-match.test',
    }]);
    leadId = String(probeLead!.id);
  });

  it('passes the raw value through unchanged — the only thing that works', async () => {
    expect((await probe('passthrough', PASSTHROUGH)).written).toEqual(['ACME  Corp']);
  });

  it.each(Object.entries(REFUSED))('refuses the run on an unknown function, naming it — %s', async (key, [value, named]) => {
    // Through 17.2.0 this run SUCCEEDED and wrote a row of silent wrong answers.
    const { refusal } = await probe(key, value);
    expect(refusal).toMatch(/unknown function/i);
    expect(refusal).toMatch(named);
  });

  it.each(Object.entries(REFUSED))('writes NOTHING when it refuses — no row of wrong answers — %s', async (key, [value]) => {
    expect((await probe(`${key}_nothing`, value)).written).toEqual([]);
  });

  it('a function OUTSIDE the braces is template text — it lands verbatim, unfolded', async () => {
    // The worst-looking shape, and still no fold: `LOWER(` is literal text
    // around the `{leadRecord.company}` hole. Pinned as measured, so nobody
    // mistakes it for a working spelling.
    const { refusal, written } = await probe('unwrapped_lower', UNWRAPPED);
    expect(refusal).toBeNull();
    expect(written).toEqual(['LOWER(ACME  Corp)']);
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
    // Since 17.5 the thrown message withholds the operator and field (they are
    // caller-controlled text); the full diagnostic rides on the error and is
    // read back with `withheldFilterDiagnosticOf`. Pin both halves.
    const err = await names({ name: { $regex: 'Acme Corp' } }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/RETIRED/);
    expect((err as Error).message).not.toMatch(/\$regex/);
    expect(withheldFilterDiagnosticOf(err)).toMatch(/\$regex.*RETIRED|RETIRED.*\$regex/is);
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
    // `(organization_id, account_number)` leads the set from platform 17.3.0:
    // an `autonumber` field omitting `unique` now parses to
    // `unique: 'organization'` (spec #13894, ruled on hotcrm#1301). It is a
    // platform default, not an authoring change in this repo. What this
    // assertion still guards is the #625 constraint: `name_normalized` must NOT
    // acquire one.
    expect(indexes.filter((i) => i.unique).map((i) => i.columns)).toEqual([
      ['organization_id', 'account_number'],
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

/**
 * The folds run on real writes — the shipped app's `account_protection` and
 * `lead_duplicate_check` hooks inside the engine's write path — and the
 * stamped key is read off the stored row. Each account is removed again after
 * its case (by the admin — a rep may not delete one): account names are unique
 * per tenant, and several cases fold to the same key from spellings a tenant
 * may hold only one of.
 */
const accountWith = async (doc: Rec): Promise<Rec> => verify.hooks.run('crm_account', 'insert', doc, { as: rep.token });
const removeAccount = (id: string) => verify.hooks.run('crm_account', 'delete', { id }, { as: admin });
const leadWith = async (doc: Rec): Promise<Rec> => verify.hooks.run('crm_lead', 'insert', {
  first_name: 'Joe', last_name: `Fold ${++k}`, email: `fold${k}@account-name-normalized-match.test`, ...doc,
}, { as: rep.token });

/**
 * A whitespace-only name is refused by the engine (`name` / `company` are
 * required, and blank is not a value) before any hook could fold it — so that
 * case pins the refusal. A non-string one is NOT refused: the hook sees the
 * number and folds it to `null`, and the engine then stores the text `42` —
 * measured, both columns, so the `null` branch is reachable through a write.
 */
const UNWRITABLE = new Set(['a whitespace-only value']);
const WRITABLE_FOLDS = FOLDING_CASES.filter(([label]) => !UNWRITABLE.has(label));
const UNWRITABLE_FOLDS = FOLDING_CASES.filter(([label]) => UNWRITABLE.has(label));

describe('account_protection folds name into name_normalized', () => {
  it.each(WRITABLE_FOLDS)('folds %s', async (_label, name, expected) => {
    const stored = await accountWith({ name });
    try {
      expect(stored.name_normalized).toBe(expected);
    } finally {
      await removeAccount(stored.id);
    }
  });

  it.each(UNWRITABLE_FOLDS)('refuses %s before any fold — the name is required', async (_label, name) => {
    await expect(accountWith({ name })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('re-folds on an update that rewrites the name', async () => {
    const stored = await accountWith({ name: 'Acme Corp' });
    try {
      const updated = await verify.hooks.run('crm_account', 'update', { id: stored.id, name: 'ACME   Corporation' }, { as: rep.token });
      expect(updated.name_normalized).toBe('acme corporation');
    } finally {
      await removeAccount(stored.id);
    }
  });

  it('leaves the key alone when the write does not carry the name', async () => {
    // An unrelated partial edit must not blank the match key — that would evict
    // the account from every future conversion lookup.
    const stored = await accountWith({ name: 'Acme Corp' });
    try {
      const updated = await verify.hooks.run('crm_account', 'update', { id: stored.id, phone: '+1-512-555-0100' }, { as: rep.token });
      expect(updated.name_normalized).toBe('acme corp');
    } finally {
      await removeAccount(stored.id);
    }
  });

  it('still projects billing_country in the same write — #621 is untouched', async () => {
    // Both derivations live in one handler, so a regression in either is easy
    // to introduce while editing the other. One write, both columns.
    const stored = await accountWith({ name: 'ACME  Corp', billing_address: { city: 'Munich', country: ' de ' } });
    try {
      expect(stored.name_normalized).toBe('acme corp');
      expect(stored.billing_country).toBe('DE');
    } finally {
      await removeAccount(stored.id);
    }
  });
});

describe('lead_duplicate_check folds company into company_normalized', () => {
  it.each(WRITABLE_FOLDS)('folds %s', async (_label, company, expected) => {
    expect((await leadWith({ company })).company_normalized).toBe(expected);
  });

  it.each(UNWRITABLE_FOLDS)('refuses %s before any fold — the company is required', async (_label, company) => {
    await expect(leadWith({ company })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('folds on update too, before the insert-only dedupe returns', async () => {
    const stored = await leadWith({ company: 'Globex' });
    const updated = await verify.hooks.run('crm_lead', 'update', { id: stored.id, company: 'ACME  Corp' }, { as: rep.token });
    expect(updated.company_normalized).toBe('acme corp');
  });

  it('leaves the key alone when the write does not carry the company', async () => {
    const stored = await leadWith({ company: 'Acme' });
    const updated = await verify.hooks.run('crm_lead', 'update', { id: stored.id, phone: '555' }, { as: rep.token });
    expect(updated.company_normalized).toBe('acme');
  });

  it('does not disturb the email fold it shares the handler with', async () => {
    const stored = await leadWith({ company: 'Globex' });
    const updated = await verify.hooks.run('crm_lead', 'update', {
      id: stored.id, company: 'ACME  Corp', email: `  Joe.${k}@Example.COM `,
    }, { as: rep.token });
    expect(updated.email).toBe(`joe.${k}@example.com`);
    expect(updated.company_normalized).toBe('acme corp');
  });
});

// ═══════════════════════════════════ the producers, on a real write ══

/**
 * Both folds are written INLINE, with no module-scope helper, so the handlers
 * still lower to a metadata-only body (`objectstack build` lowers every
 * registered hook through the platform's `extractHookBody`, and `os lint`
 * applies the same function). These two drive the folds through the real
 * engine — a sales rep creating the records — and read the stamped key off the
 * stored row.
 */
describe('both folds land on a real write', () => {
  it('account_protection folds name', async () => {
    const stored = await verify.hooks.run('crm_account', 'insert', { name: '  ACME   Corp ' }, { as: rep.token });
    try {
      expect(stored.name_normalized).toBe('acme corp');
    } finally {
      await removeAccount(stored.id);
    }
  });

  it('lead_duplicate_check folds company', async () => {
    const stored = await verify.hooks.run(
      'crm_lead', 'insert',
      { first_name: 'Joe', last_name: 'Fold', company: '  ACME   Corp ', email: 'joe.fold@example.com' },
      { as: rep.token },
    );
    expect(stored.company_normalized).toBe('acme corp');
  });
});

// ════════════════════════════════════════════ the acceptance criteria ══

/**
 * End-to-end through the REAL flow and the REAL hooks: the manager's leads are
 * real writes, the conversion is the screen flow run through the trigger door
 * and resumed with its screen, and every row is read back off the engine — so
 * the test proves the producer chain (hook → column → flow filter) rather than
 * its own fixtures. Each case spells its own company (`… <n>`), so the
 * accounts it counts are the ones its conversions found or made.
 */
const company = (stem: string, n: number) => `${stem} ${n}`;

const leadFor = async (companyName: string): Promise<Rec> => verify.hooks.run('crm_lead', 'insert', {
  company: companyName, email: `lead${++k}@account-name-normalized-match.test`,
  first_name: 'Joe', last_name: 'Green', status: 'qualified',
}, { as: manager.token });

/** Convert `leadId` as the manager, without an opportunity; the resumed run. */
async function convert(leadId: string): Promise<Rec> {
  const started = await verify.flows.run('lead_conversion', { recordId: leadId }, { as: manager.token });
  return verify.flows.resume(started, { createOpportunity: false }, { as: manager.token }).catch((e: Rec) => e);
}

/** The accounts whose match key is `folded`. */
const accountsKeyed = (folded: string) => verify.rows('crm_account', { name_normalized: folded });

describe('acceptance: a case/whitespace variant reuses the same account', () => {
  it('converting "ACME  Corp" reuses the account created from "Acme Corp"', async () => {
    const n = ++k;
    const first = await leadFor(company('Acme Corp', n));
    const second = await leadFor(company('ACME  Corp', n));

    await convert(first.id);
    const created = await accountsKeyed(`acme corp ${n}`);
    expect(created).toHaveLength(1);
    expect(created[0]!.name, 'the display name is the lead value, verbatim').toBe(company('Acme Corp', n));
    expect(created[0]!.name_normalized, 'the hook derived the match key').toBe(`acme corp ${n}`);

    await convert(second.id);
    expect(await accountsKeyed(`acme corp ${n}`), 'no duplicate account').toHaveLength(1);
    const [converted] = await verify.rows('crm_lead', { id: second.id });
    expect(converted!.converted_account).toBe(created[0]!.id);
  });

  it('filters on the normalized column with the folded value', async () => {
    // The outcome above could also be produced by matching on something else.
    // This pins WHICH query the flow issues — read off the engine's own reads
    // while the conversion runs.
    const n = ++k;
    const variant = await leadFor(company('ACME  Corp', n));
    const ql = verify.kernel.getService<Rec>('objectql');
    const lookups: Rec[] = [];
    const spies = (['find', 'findOne'] as const).map((op) => {
      const real = ql[op].bind(ql);
      return vi.spyOn(ql, op).mockImplementation(((object: string, query: Rec = {}) => {
        if (object === 'crm_account') lookups.push(query.where ?? query.filter ?? {});
        return real(object, query);
      }) as never);
    });
    try {
      await convert(variant.id);
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
    expect(lookups, 'the conversion never looked an account up by its match key')
      .toContainEqual({ name_normalized: `acme corp ${n}` });
  });

  it('still creates an account when nothing matches', async () => {
    const n = ++k;
    await verify.hooks.run('crm_account', 'insert', { name: company('Globex Industries', n) }, { as: manager.token });
    const lead = await leadFor(company('Initech', n));
    await convert(lead.id);

    const created = await accountsKeyed(`initech ${n}`);
    expect(created).toHaveLength(1);
    expect(created[0]!.name).toBe(company('Initech', n));
    expect(await accountsKeyed(`globex industries ${n}`), 'the unrelated account was touched').toHaveLength(1);
  });

  /**
   * The un-backfilled LEAD case (docs/MAINTENANCE.md §3.3), and the business
   * fact #2017 restores: a lead with no match key STOPS the conversion rather
   * than widen the account lookup — "a silent match-all would attach the
   * conversion to an arbitrary account, which is far worse than failing".
   *
   * On the real engine a key-less lead is usually a NULL key (SQL, and the
   * sparse datasource once the column is written empty), and a bare `null` in
   * the `find_account` filter is the platform's documented has-no-value
   * predicate: it MATCHES every account whose key is also null. Measured on
   * 17.7.0 before the fix, both datasources: the lead converted onto the
   * UNRELATED key-less account written below. Such keys arise from ordinary
   * writes too (a non-string name or company folds to `null`, above), not
   * only from an un-backfilled install.
   *
   * So the flow refuses ahead of its form (`refuse_no_match_key`), and the
   * pin reads the outcome off the engine after the rep submits that dialog:
   * the lead is not converted, the unrelated account gained no contact, and
   * no account was created for the lead's company.
   */
  it('a lead with no match key is refused, and attaches to no account (#2017)', async () => {
    const n = ++k;
    const unrelated = await verify.hooks.run('crm_account', 'insert', { name: company('Unrelated Legacy Co', n) }, { as: manager.token });
    await systemUpdate(verify, 'crm_account', { id: unrelated.id, name_normalized: null });
    const legacy = await leadFor(company('Acme Corp', n));
    await systemUpdate(verify, 'crm_lead', { id: legacy.id, company_normalized: null });

    const started = await verify.flows.run('lead_conversion', { recordId: legacy.id }, { as: manager.token });
    const screen = (started.screen ?? null) as Rec | null;
    expect(started.status, 'the conversion did not stop on a dialog').toBe('paused');
    expect(screen?.nodeId, 'a key-less lead reached the conversion form').toBe('refuse_no_match_key');
    // Submitting the refusal is the rep's next click, and the state after it
    // is the claim: the branch reaches `end` without one create or update.
    const done = await verify.flows.resume(started, { createOpportunity: false }, { as: manager.token });
    expect(done.success, 'submitting the refusal failed the run').toBe(true);

    const [after] = await verify.rows('crm_lead', { id: legacy.id });
    expect(Boolean(after!.is_converted), 'the key-less lead was converted').toBe(false);
    expect(after!.converted_account ?? null, 'the key-less lead was attached to an account').toBeNull();
    expect(await verify.rows('crm_contact', { crm_account: unrelated.id }), 'the unrelated account gained a contact').toHaveLength(0);
    expect(await verify.rows('crm_account', { name: company('Acme Corp', n) }), 'an account was created for the lead').toHaveLength(0);
  });

  /**
   * The guard's two edges PARTITION every shape `get_lead` can bind, measured
   * on the real evaluator — the pairing `e28`/`e29` and `e21`/`e22`/`e25` are
   * pinned with, for the same reason: a decision that declares no
   * `config.conditions` takes every out-edge whose condition holds, so an
   * overlap would refuse the lead AND convert it in one run.
   */
  it.each<[string, Rec, string]>([
    ['a lead the fetch never bound', {}, 'e32'],
    ['a null row (the fetch missed)', { leadRecord: null }, 'e32'],
    ['the column absent (sparse datasource)', { leadRecord: { id: 'l1' } }, 'e32'],
    ['the column null (SQL)', { leadRecord: { id: 'l1', company_normalized: null } }, 'e32'],
    ['the column empty', { leadRecord: { id: 'l1', company_normalized: '' } }, 'e32'],
    ['a key', { leadRecord: { id: 'l1', company_normalized: 'acme corp' } }, 'e31'],
  ])('the match-key guard takes exactly one edge for %s', (_label, vars, expected) => {
    const out = (LeadConversionFlow.edges as Rec[]).filter((e) => e.source === 'decision_match_key');
    expect(out.map((e) => e.id).sort()).toEqual(['e31', 'e32']);
    expect(out.filter((e) => conditionHolds(verify, e.condition, vars)).map((e) => e.id)).toEqual([expected]);
  });

  it('an account with no match key is invisible — the reason the backfill is not optional', async () => {
    // The un-backfilled ACCOUNT case: this one is SILENT, which is exactly why
    // it is documented as the failure that makes the backfill mandatory. The
    // conversion's account carries the lead's company verbatim, so the legacy
    // account is spelled differently ("ACME  Corp") to stay clear of the
    // per-tenant unique name.
    const n = ++k;
    const legacy = await verify.hooks.run('crm_account', 'insert', { name: company('ACME  Corp', n) }, { as: manager.token });
    await systemUpdate(verify, 'crm_account', { id: legacy.id, name_normalized: null });
    const lead = await leadFor(company('Acme Corp', n));
    await convert(lead.id);

    const [after] = await verify.rows('crm_lead', { id: lead.id });
    expect(after!.converted_account, 'the conversion found the key-less account').not.toBe(legacy.id);
    expect(await accountsKeyed(`acme corp ${n}`), 'a duplicate account, as documented').toHaveLength(1);
  });

  it('a fresh install and a backfilled install behave identically', async () => {
    // "Fresh": the account was created by a conversion, so the hook stamped the
    // key on insert. "Backfilled": the account predates the column and the
    // operator re-saved it (docs/MAINTENANCE.md §3.3) — modelled as an UPDATE
    // carrying `name`, which is exactly what the backfill issues. Both must
    // then be found by the same variant-spelling lead.
    const nFresh = ++k;
    await convert((await leadFor(company('Acme Corp', nFresh))).id);
    const [fresh] = await accountsKeyed(`acme corp ${nFresh}`);

    const nBack = ++k;
    const legacy = await verify.hooks.run('crm_account', 'insert', { name: company('Acme Corp', nBack) }, { as: manager.token });
    // A row written before the column existed: no match key at all.
    await systemUpdate(verify, 'crm_account', { id: legacy.id, name_normalized: null });
    await systemUpdate(verify, 'crm_account', { id: legacy.id, name: company('Acme Corp', nBack) });
    const [backfilled] = await verify.rows('crm_account', { id: legacy.id });

    expect(backfilled!.name_normalized.replace(String(nBack), '#')).toBe(
      fresh!.name_normalized.replace(String(nFresh), '#'),
    );

    for (const n of [nFresh, nBack]) {
      await convert((await leadFor(company('ACME  Corp', n))).id);
      expect(await accountsKeyed(`acme corp ${n}`), 'reused the existing account').toHaveLength(1);
    }
  });
});
