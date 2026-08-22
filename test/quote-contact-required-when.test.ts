// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack from '../objectstack.config';
import { quotes } from '../src/data/revenue.seed';

/**
 * A quote may not be PRESENTED without a recipient (#1017, from #714 / PR #1013).
 *
 * ### What this closes
 *
 * `crm_quote.crm_contact` carried the sentence *"Recipient is nailed down by
 * the time a quote is presented"* for its whole life, and nothing enforced it.
 * `crm_contract.crm_contact` is `required` + `notNull`, so a contact-less quote
 * that reached `accepted` could never draft its contract. Since #1013 that
 * failure is honest (`Primary Contact is required`, and it no longer swallows
 * the close-won leg) — but `quote_on_accepted` is `async: true` +
 * `onError: 'log'`, so the accepting write still answers 200 and the refusal
 * lands in a server log with no human in front of it.
 *
 * The maintainer's ruling on #1017 was Option B: give the sentence a mechanism.
 * `requiredWhen` moves the same refusal forward to the write that turns the
 * quote outward — synchronous, attributed to a field, with the quote still
 * editable.
 *
 * ### Why this file drives a real engine
 *
 * Declaring a rule is not enforcing one: this repo has measured five metadata
 * surfaces that accept a rule and then do not apply it (the table in
 * `win-loss-capture.test.ts`), and `requiredWhen` has its own version of that
 * failure — a predicate that cannot evaluate is SKIPPED with a warning, so an
 * unguarded `record.status == "presented"` would read as enforced and require
 * nothing. So the refusal is driven through a real ObjectQL on both driver
 * shapes: `InMemoryDriver`, whose stored rows OMIT unwritten columns (the shape
 * that makes an unguarded predicate abort), and a real SQLite database, whose
 * rows are column-complete with NULLs.
 *
 * Each refusal is asserted by its SUBSTANCE, not by "it threw": the envelope's
 * `code` (`VALIDATION_FAILED`, which `@objectstack/runtime`'s
 * `validation-failure.ts` answers with HTTP **400** and a `fields[]` payload),
 * the per-field `code` (`required`), and the fact that the record DID NOT MOVE
 * — a rule that reports a problem while the write lands anyway is the
 * flow-condition failure mode (#633), not enforcement.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const quote = objects.find((o) => o.name === 'crm_quote') as AnyRec;

/** `P` compiles to `{ dialect: 'cel', source }`. */
const celSource = (v: unknown): string =>
  typeof v === 'string' ? v : String((v as AnyRec)?.source ?? '');

/**
 * The refusal as the API client sees it.
 *
 * `@objectstack/runtime`'s `src/validation-failure.ts` recognises a failure by
 * `err.code === 'VALIDATION_FAILED' || err.name === 'ValidationError'` and
 * answers it with `VALIDATION_FAILED_STATUS = 400` plus `fields[]`. That module
 * exports neither the constant nor the predicate, so the discriminator is
 * mirrored here — which is precisely what makes the assertions below bite: if
 * the engine ever raised this refusal as some other error shape, the mirror
 * would stop recognising it and `status` would come back 500.
 */
const envelope = (err: unknown) => {
  const e = err as AnyRec;
  const recognised = e?.code === 'VALIDATION_FAILED' || e?.name === 'ValidationError';
  return {
    status: recognised ? 400 : 500,
    code: recognised ? 'VALIDATION_FAILED' : undefined,
    fields: (Array.isArray(e?.fields) ? e.fields : []) as AnyRec[],
    message: String(e?.message ?? ''),
  };
};

/** Run `fn`, expect it to be refused, and hand back the envelope. */
const refusal = async (fn: () => Promise<unknown>) => {
  let caught: unknown;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  expect(caught, 'the write was ADMITTED — no refusal to inspect').toBeDefined();
  return envelope(caught);
};

/** Every refusal in this file must be this exact refusal. */
const expectContactRequired = (env: ReturnType<typeof envelope>) => {
  expect(env.status).toBe(400);
  expect(env.code).toBe('VALIDATION_FAILED');
  expect(env.message).toMatch(/Contact is required/i);
  expect(env.fields.map((f) => f.code)).toContain('required');
};

// ─────────────────────────────────────────── the declared shape of the gate ──

describe('the gate is declared where the platform can act on it', () => {
  it('requires the contact exactly from `presented` onward', () => {
    expect(celSource(quote.fields.crm_contact.requiredWhen)).toBe(
      'has(record.status) && (record.status == "presented" || record.status == "accepted")',
    );
  });

  it('guards the status read with has(...) — the difference between enforced and inert', () => {
    // Without `has()`, strict CEL aborts on any merged record that omits the
    // column and the engine SKIPS the predicate, leaving a rule that reads as
    // enforced and requires nothing. `test/object-validation-predicates.test.ts`
    // sweeps this property across the stack; it is restated here because it is
    // the specific hazard this card had to clear.
    expect(celSource(quote.fields.crm_contact.requiredWhen)).toContain('has(record.status)');
  });

  it('names the two states that are NOT gated, and they are the unsent ones', () => {
    // `expired` is written by the nightly `quote_expiration` sweep on quotes
    // that were never sent, and `rejected` is legal straight out of
    // `in_review`. Gating either would demand a recipient from a quote that,
    // by construction, has none. Read off the state machine rather than
    // asserted from memory.
    const machine = (quote.validations as AnyRec[]).find(
      (v) => v.name === 'quote_status_progression',
    ) as AnyRec;
    expect(machine.transitions.draft).toContain('expired');
    expect(machine.transitions.in_review).toContain('rejected');

    const source = celSource(quote.fields.crm_contact.requiredWhen);
    expect(source).not.toContain('expired');
    expect(source).not.toContain('rejected');
  });

  it('states the requirement in the field description a rep actually reads', () => {
    expect(quote.fields.crm_contact.description).toMatch(/required/i);
    expect(quote.fields.crm_contact.description).toMatch(/presented/i);
  });

  it('leaves the field itself optional — a draft still needs no recipient', () => {
    // The whole reason this is `requiredWhen` and not `required`:
    // `quote_generation` maps the opportunity's optional `primary_contact`, so
    // a flat requirement would stop contact-less opportunities quoting at all.
    expect(quote.fields.crm_contact.required ?? false).toBe(false);
    expect(quote.fields.crm_contact.storage?.notNull ?? false).toBe(false);
  });
});

// ──────────────────────────── enforcement, on a driver with SPARSE records ──

const DRAFT = {
  name: 'Gate Probe',
  crm_account: 'acc_stub',
  status: 'draft',
  quote_date: '2026-01-01',
  expiration_date: '2026-12-31',
  total_price: 1234,
};

describe('the write is REFUSED, not warned about (in-memory driver)', () => {
  let ql: AnyRec;

  beforeAll(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_quote: quote } as never,
    })) as never;
  });
  afterAll(async () => {
    await ql?.close();
  });

  const newDraft = async (name = 'Gate Probe') => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_quote').insert({ ...DRAFT, name });
    return { api, row };
  };

  it('stores no key for a column it was never given — the precondition', async () => {
    const { api, row } = await newDraft('Sparse Precondition');
    const stored = await api.object('crm_quote').findOne({ where: { id: row.id } });
    // Not `toBeNull()`: the key is ABSENT. That is the record shape that makes
    // an unguarded predicate abort, and the reason this driver is the one the
    // enforcement tests run on.
    expect('crm_contact' in (stored ?? {})).toBe(false);
    expect(stored?.status).toBe('draft');
  });

  it('refuses to PRESENT a quote with no contact, and the quote stays draft', async () => {
    const { api, row } = await newDraft('No Recipient');
    const env = await refusal(() =>
      api.object('crm_quote').update({ status: 'presented' }, { where: { id: row.id } }),
    );
    expectContactRequired(env);

    // The other half of the assertion: enforcement means the write did not
    // land. A rule that complains while the record moves anyway is #633.
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('draft');
  });

  it('refuses to ACCEPT a quote with no contact — the state that drafts the contract', async () => {
    const { api, row } = await newDraft('Accept Without Recipient');
    const env = await refusal(() =>
      api.object('crm_quote').update({ status: 'accepted' }, { where: { id: row.id } }),
    );
    expectContactRequired(env);
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('draft');
  });

  it('refuses an INSERT that is born presented', async () => {
    // The path a data import, a seed file or an AI-authored write takes. On
    // insert the engine fills absent fields with null rather than omitting
    // them, so this exercises a different branch of the same rule.
    const api = ql.createContext({ isSystem: true });
    const env = await refusal(() =>
      api.object('crm_quote').insert({ ...DRAFT, name: 'Born Presented', status: 'presented' }),
    );
    expectContactRequired(env);
  });

  it('refuses to blank the contact out of a quote that is already presented', async () => {
    // Otherwise the contract would hold for exactly one write: present with a
    // contact, then clear it.
    const api = ql.createContext({ isSystem: true });
    const row = await api
      .object('crm_quote')
      .insert({ ...DRAFT, name: 'Recipient Eraser', crm_contact: 'con_stub', status: 'presented' });
    const env = await refusal(() =>
      api.object('crm_quote').update({ crm_contact: null }, { where: { id: row.id } }),
    );
    expectContactRequired(env);
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.crm_contact).toBe('con_stub');
  });

  // ── the positive cases: the gate must not fire on anything else ──

  it('presents a quote that HAS a contact', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api
      .object('crm_quote')
      .insert({ ...DRAFT, name: 'Proper Quote', crm_contact: 'con_stub' });
    await api.object('crm_quote').update({ status: 'presented' }, { where: { id: row.id } });
    await api.object('crm_quote').update({ status: 'accepted' }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('accepted');
    expect(after?.crm_contact).toBe('con_stub');
  });

  it('still EXPIRES a never-sent quote that has no contact — the nightly sweep', async () => {
    // `quote_expiration` writes `status: 'expired'` on everything past its
    // expiration_date, drafts included. If the gate covered `expired`, that
    // scheduled system write would fail on precisely the quotes that have no
    // recipient because nobody ever sent them.
    const { api, row } = await newDraft('Never Sent');
    await api.object('crm_quote').update({ status: 'expired' }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('expired');
  });

  it('still REJECTS a quote killed in internal review with no contact', async () => {
    const { api, row } = await newDraft('Killed In Review');
    await api.object('crm_quote').update({ status: 'in_review' }, { where: { id: row.id } });
    await api.object('crm_quote').update({ status: 'rejected' }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('rejected');
  });

  it('leaves edits that do not move the status alone', async () => {
    // A rule that fires on unrelated edits is a rule someone disables.
    const { api, row } = await newDraft('Unrelated Edit');
    await api.object('crm_quote').update({ total_price: 999 }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.total_price).toBe(999);
  });

  it('does not fire on a write that never names the status at all', async () => {
    // The merged shape of an already-presented quote carries `presented`, so
    // the predicate is live on EVERY later write to that record — it must be
    // satisfied by the contact the record already has, not re-demanded.
    const api = ql.createContext({ isSystem: true });
    const row = await api
      .object('crm_quote')
      .insert({ ...DRAFT, name: 'Presented Then Edited', crm_contact: 'con_stub', status: 'presented' });
    await api.object('crm_quote').update({ internal_notes: 'chased' }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.internal_notes).toBe('chased');
    expect(after?.status).toBe('presented');
  });
});

// ────────────────────── the same contract on a real SQL database ──────────

describe('the write is REFUSED on a real SQLite database too', () => {
  // The in-memory driver hands back sparse records; a SQL driver hands back a
  // full row with NULLs. Those are different inputs to the same predicate, and
  // "which driver is underneath" is not something a marketplace app chooses.
  let ql: AnyRec;

  beforeAll(async () => {
    const driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    // The exact call the runtime makes at boot — `ObjectQL.create` wires the
    // datasource but does not emit DDL.
    const materialized = applySystemFields(quote as never, { multiTenant: false }) as AnyRec;
    await driver.initObjects([
      {
        name: 'crm_quote',
        fields: materialized.fields as Record<string, unknown>,
        indexes: materialized.indexes,
      } as never,
    ]);
    ql = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_quote: quote } as never,
    })) as never;
  }, 60_000);
  afterAll(async () => {
    await ql?.close();
  });

  it('refuses the presentation and leaves the row where it was', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_quote').insert({ ...DRAFT, name: 'SQL Probe' });

    const stored = await api.object('crm_quote').findOne({ where: { id: row.id } });
    // The opposite precondition to the in-memory suite: here the key IS
    // present and null. Both shapes must reach the same verdict.
    expect('crm_contact' in (stored ?? {})).toBe(true);
    expect(stored?.crm_contact ?? null).toBeNull();

    const env = await refusal(() =>
      api.object('crm_quote').update({ status: 'presented' }, { where: { id: row.id } }),
    );
    expectContactRequired(env);

    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('draft');
  });

  it('presents the quote once the contact is on it', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api
      .object('crm_quote')
      .insert({ ...DRAFT, name: 'SQL Probe 2', crm_contact: 'con_stub' });
    await api.object('crm_quote').update({ status: 'presented' }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('presented');
  });
});

// ──────────────────────────────── what the gate reaches, and what it doesn't ──

describe('a row that was ALREADY presented when the rule landed', () => {
  /**
   * The stock-data question on #1017, measured instead of assumed.
   *
   * A `requiredWhen` applies on WRITE, so the shape that matters is a row that
   * entered the gated state BEFORE the rule existed. That is built here the way
   * an upgrading deployment gets one: insert through an engine whose schema has
   * no `requiredWhen`, then re-open the SAME store with the shipped schema.
   *
   * Measured verdict: the engine evaluates the requirement on the write that
   * makes the predicate BECOME true, not on every later write while it holds.
   * So a pre-existing `presented`-without-contact quote is NOT bricked — it
   * reads, and ordinary edits still land. The cost of that is the last case
   * here: such a row can still be walked on to `accepted`, where it meets the
   * pre-#1017 behaviour (`quote_on_accepted` cannot draft the contract, and
   * says so in the log). This repo ships no such row — `the stock data clears
   * the new gate` below enumerates the seeds — so the residue is empty here;
   * it is pinned so that the boundary is a recorded measurement rather than
   * something a future reader has to rediscover.
   */
  const ungated = () => {
    const clone = JSON.parse(JSON.stringify(quote)) as AnyRec;
    delete clone.fields.crm_contact.requiredWhen;
    return clone;
  };

  /** A store holding one contact-less `presented` quote, then re-opened gated. */
  const legacyRow = async () => {
    const driver = new InMemoryDriver({ persistence: false });
    const before: AnyRec = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_quote: ungated() } as never,
    })) as never;
    const row = await before
      .createContext({ isSystem: true })
      .object('crm_quote')
      .insert({ ...DRAFT, name: 'Legacy Presented', status: 'presented' });

    const after: AnyRec = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_quote: quote } as never,
    })) as never;
    return { ql: after, api: after.createContext({ isSystem: true }), row };
  };

  it('is still readable and still editable — the gate breaks no stock row', async () => {
    const { ql, api, row } = await legacyRow();
    const stored = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(stored?.status).toBe('presented');
    expect(stored?.crm_contact ?? null).toBeNull();

    await api.object('crm_quote').update({ internal_notes: 'chased' }, { where: { id: row.id } });
    await api.object('crm_quote').update({ total_price: 4321 }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.internal_notes).toBe('chased');
    expect(after?.total_price).toBe(4321);
    await ql.close();
  });

  it('is repaired by the ordinary edit — filling the contact in', async () => {
    const { ql, api, row } = await legacyRow();
    await api.object('crm_quote').update({ crm_contact: 'con_stub' }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.crm_contact).toBe('con_stub');
    expect(after?.status).toBe('presented');
    await ql.close();
  });

  it('can still be walked on to accepted — the boundary of a write-time gate', async () => {
    // NOT an endorsement: this is the residue the gate does not reach, recorded
    // so it is known. It exists only for rows that were already gated when the
    // rule arrived; a quote created under this schema cannot get here, because
    // the draft → presented write is refused (see the enforcement suites above).
    const { ql, api, row } = await legacyRow();
    await api.object('crm_quote').update({ status: 'accepted' }, { where: { id: row.id } });
    const after = await api.object('crm_quote').findOne({ where: { id: row.id } });
    expect(after?.status).toBe('accepted');
    await ql.close();
  });
});

// ───────────────────────────────────────────────── the data already shipped ──

describe('the stock data clears the new gate', () => {
  // The gate applies ON WRITE, so it cannot retroactively break rows that are
  // already stored — but seeds run in `upsert` mode on every boot, which IS a
  // write. A seeded quote at `presented`/`accepted` with no `crm_contact` would
  // therefore fail the seed load, not merely sit there. This asserts the
  // enumeration reported on #1017 rather than trusting it: all five seeded
  // quotes carry a contact, so none of them is gated.
  const GATED = new Set(['presented', 'accepted']);

  it('every seeded quote at presented/accepted names a contact', () => {
    const records = (quotes as AnyRec).records as AnyRec[];
    const offenders = records.filter(
      (r) => GATED.has(String(r.status)) && !r.crm_contact,
    );
    expect(offenders.map((r) => r.name)).toEqual([]);
  });

  it('covers both gated states in the seed, so the check above is not vacuous', () => {
    const records = (quotes as AnyRec).records as AnyRec[];
    const statuses = new Set(records.map((r) => String(r.status)));
    expect(statuses.has('presented')).toBe(true);
    expect(statuses.has('accepted')).toBe(true);
  });
});
