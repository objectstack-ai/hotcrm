// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { makeHarness } from './helpers/hook-harness';

/**
 * The predicate key on `ctx.api` reads is `where`. This file is the proof.
 *
 * Every other hook test in this repo runs against `test/helpers/hook-harness.ts`
 * — a hand-written stand-in. A stand-in can only disprove what it models, and
 * this one used to accept `filter` as a synonym for `where`, so a whole class
 * of "reads the wrong record" bugs was invisible: the suite was green while
 * eight hooks queried by a key that kernel dropped on the floor.
 *
 * So these tests do NOT use the harness for the kernel claims. They stand up a
 * real ObjectQL engine on the in-memory driver and query it through a real
 * `ScopedContext` — which is literally the object the kernel injects as
 * `ctx.api` (see `ObjectQL.buildHookApi`). What passes here is what happens in
 * production.
 *
 * ⚠️ Read the two paragraphs above as HISTORY, and every claim below as a
 * measurement of the CURRENTLY PINNED engine. That distinction is the whole
 * point of #1229: the kernel that dropped `filter` on the floor is not the one
 * this repo pins, and prose written against the old one survived, confident and
 * specific, into three places that then disagreed with each other. A behaviour
 * claim about the engine belongs here, as an executing assertion, and anywhere
 * it is restated in prose it is restated as "measured, and pinned there".
 */

// Persistence off: the memory driver defaults to writing
// `.objectstack/data/memory-driver.json` and would otherwise carry rows over
// between runs, so "the first row" would mean a different row each time.
//
// The schema is deliberately minimal — this exercises the query layer, not the
// field system. `ServiceObject`'s field type demands every resolved property
// (`required`, `searchable`, …) that the registry fills in at runtime, so the
// literal is cast rather than padded with a dozen irrelevant defaults.
const makeEngine = () =>
  ObjectQL.create({
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: {
      crm_account: {
        name: 'crm_account',
        fields: {
          id: { type: 'text' },
          name: { type: 'text' },
          annual_revenue: { type: 'number' },
        },
      },
    } as never,
  });

describe('ctx.api query predicate — against the real kernel', () => {
  let ql: Awaited<ReturnType<typeof makeEngine>>;
  let api: ReturnType<typeof ql.createContext>;
  let first: Record<string, any>;
  let second: Record<string, any>;
  let third: Record<string, any>;

  beforeAll(async () => {
    ql = await makeEngine();
    api = ql.createContext({ isSystem: true });
    // THREE rows, deliberately in insertion order, and the probes below always
    // target the THIRD. That is what makes the three possible answers tell
    // themselves apart: "predicate applied" (Third Row / n=1), "predicate
    // dropped, degrades to the first row" (First Row), and "predicate dropped,
    // matches everything" (n=3). With two rows the last two collapse together,
    // and with the target first, all three can look alike.
    first = await api.object('crm_account').insert({ name: 'First Row', annual_revenue: 100 });
    second = await api.object('crm_account').insert({ name: 'Second Row', annual_revenue: 200 });
    third = await api.object('crm_account').insert({ name: 'Third Row', annual_revenue: 300 });
  });

  afterAll(async () => {
    await ql?.close();
  });

  describe('where: — the supported spelling', () => {
    it('findOne returns the record actually asked for', async () => {
      const hit = await api.object('crm_account').findOne({ where: { id: second.id } });
      expect(hit?.id).toBe(second.id);
      expect(hit?.name).toBe('Second Row');
    });

    it('findOne returns null when nothing matches', async () => {
      const hit = await api.object('crm_account').findOne({ where: { id: 'no_such_id' } });
      expect(hit).toBeNull();
    });

    it('count counts only the matching rows', async () => {
      expect(await api.object('crm_account').count({ where: { annual_revenue: 100 } })).toBe(1);
    });

    it('find returns only the matching rows', async () => {
      const rows = await api.object('crm_account').find({ where: { annual_revenue: 200 } });
      expect(rows.map((r: any) => r.name)).toEqual(['Second Row']);
    });
  });

  /**
   * APPARATUS CONTROL. Every `filter:` result below is read against these two
   * numbers, so they are asserted rather than assumed: an engine that ignored
   * predicates entirely would return 3 for the scoped read too, and then every
   * green in this file would be worthless. Nothing here is about `filter`.
   */
  describe('apparatus control — the engine actually discriminates', () => {
    it('an unfiltered read returns all three rows', async () => {
      const rows = await api.object('crm_account').find({});
      expect(rows).toHaveLength(3);
    });

    it('a scoped read returns exactly one, and it is the one asked for', async () => {
      const rows = await api.object('crm_account').find({ where: { id: third.id } });
      expect(rows.map((r: any) => r.name)).toEqual(['Third Row']);
    });
  });

  /**
   * THE MEASUREMENT (#1229). Three sources in this repo carried two
   * incompatible answers about `filter`, and the wrong one was agent-facing
   * instruction whose two error directions have opposite safety consequences
   * ("silently dropped" implies an unscoped read; "aliased" implies a correct
   * one). So this block IS the measurement — one executing assertion per cell,
   * not a summary of a measurement taken elsewhere:
   *
   *   method     `filter:` on the pinned engine
   *   ---------  ----------------------------------------------
   *   find       ALIASED to `where` — the predicate is applied
   *   findOne    ALIASED to `where` — the predicate is applied
   *   count      ALIASED to `where` — the predicate is applied
   *
   * The NO-MATCH probes carry the weight. A dropped predicate and an applied
   * one are indistinguishable when the probe matches — both can hand back the
   * right-looking row. They separate only on a predicate that matches nothing:
   * applied gives the empty answer, dropped gives the unfiltered one (n=3, or
   * `findOne`'s "first row of the object"). Both alternatives are asserted
   * against by name, so a future silent drop fails here loudly.
   *
   * ⚠️ None of this licenses `filter:` in hook code — see the repo-wide guard
   * below, whose reason is now consistency rather than data loss.
   */
  describe('filter: — measured, a live alias of `where` on this engine', () => {
    it('find applies the predicate', async () => {
      const rows = await api.object('crm_account').find({ filter: { id: third.id } } as any);
      expect(rows.map((r: any) => r.name)).toEqual(['Third Row']);
    });

    it('find returns nothing — not everything — when the predicate matches nothing', async () => {
      const rows = await api.object('crm_account').find({ filter: { id: 'no_such_id' } } as any);
      expect(rows).toEqual([]);
    });

    it('findOne applies the predicate', async () => {
      const hit = await api.object('crm_account').findOne({ filter: { id: third.id } } as any);
      expect(hit?.id).toBe(third.id);
      // The stale claim was that a dropped `filter` degrades to the object's
      // first row. Name that row, so this test fails if it ever comes back.
      expect(hit?.id).not.toBe(first.id);
    });

    it('findOne returns null — not the first row — when the predicate matches nothing', async () => {
      const hit = await api.object('crm_account').findOne({ filter: { id: 'no_such_id' } } as any);
      expect(hit).toBeNull();
    });

    it('count applies the predicate', async () => {
      const n = await api.object('crm_account').count({ filter: { annual_revenue: 300 } } as any);
      expect(n).toBe(1);
    });

    it('count returns 0 — not the whole object — when the predicate matches nothing', async () => {
      const n = await api.object('crm_account').count({ filter: { annual_revenue: 999999 } } as any);
      expect(n).toBe(0);
    });

    it('an explicitly undefined `where` alongside `filter` still applies the predicate', async () => {
      const hit = await api
        .object('crm_account')
        .findOne({ where: undefined, filter: { id: third.id } } as any);
      expect(hit?.id).toBe(third.id);
    });
  });

  /**
   * NEGATIVE CONTROLS. Without these the block above proves nothing: "the
   * predicate was honoured" is only evidence of *aliasing* if a key this engine
   * does NOT know behaves differently. It does — it throws. If these ever go
   * green-by-passing-silently, the engine has lost its unknown-option guard and
   * the alias greens above stop being evidence of anything.
   */
  describe('negative controls — what a key this engine does not know does', () => {
    it.each(['find', 'findOne', 'count'] as const)(
      '%s throws on an unrecognised option rather than ignoring it',
      async (method) => {
        await expect(
          (api.object('crm_account') as any)[method]({ wibble: { id: third.id } }),
        ).rejects.toThrow(/does not recognise option 'wibble'/);
      },
    );

    it('`filters` (plural) is NOT an alias — it throws like any unknown key', async () => {
      await expect(
        api.object('crm_account').findOne({ filters: { id: third.id } } as any),
      ).rejects.toThrow(/does not recognise option 'filters'/);
    });

    it('findOne with no predicate at all throws rather than returning an arbitrary row', async () => {
      await expect(api.object('crm_account').findOne({})).rejects.toThrow(
        /selects no particular record/,
      );
    });
  });

  /**
   * WHY ONE SPELLING, now that the silent-drop argument is gone. Mixing them is
   * the live hazard: a query assembled in two places — a base predicate plus a
   * caller override — that ends up carrying both keys is a RUNTIME THROW, not a
   * merge, and an empty `where: {}` counts as a different value rather than as
   * "no opinion". A repo that writes only `where` cannot reach either.
   */
  describe('mixing the two spellings is the actual hazard', () => {
    it('both keys with different values throws', async () => {
      await expect(
        api
          .object('crm_account')
          .findOne({ where: { id: first.id }, filter: { id: third.id } } as any),
      ).rejects.toThrow(/spellings of the same parameter/);
    });

    it('an empty `where` counts as a different value, not as "unset"', async () => {
      await expect(
        api.object('crm_account').findOne({ where: {}, filter: { id: third.id } } as any),
      ).rejects.toThrow(/spellings of the same parameter/);
    });

    it('both keys with the SAME value is accepted (so the throw is about disagreement)', async () => {
      const hit = await api
        .object('crm_account')
        .findOne({ where: { id: third.id }, filter: { id: third.id } } as any);
      expect(hit?.id).toBe(third.id);
    });
  });
});

/**
 * The write half of the same measurement. `HookQuery` governs reads, but
 * `HookUpdateOptions` and `HookDeleteOptions` are predicate bags on the same
 * engine and go through the same alias fold, and the prose in
 * `src/objects/_hook-api.ts` and `AGENTS.md` now states that — so it is pinned
 * here rather than left as an inference from the read paths.
 *
 * Its own engine: these mutate, and the read suite above depends on its three
 * rows staying as seeded.
 */
describe('write paths — `filter` folds there too', () => {
  let ql: Awaited<ReturnType<typeof makeEngine>>;
  let api: ReturnType<typeof ql.createContext>;
  let first: Record<string, any>;
  let third: Record<string, any>;

  beforeEach(async () => {
    ql = await makeEngine();
    api = ql.createContext({ isSystem: true });
    first = await api.object('crm_account').insert({ name: 'First Row', annual_revenue: 100 });
    await api.object('crm_account').insert({ name: 'Second Row', annual_revenue: 200 });
    third = await api.object('crm_account').insert({ name: 'Third Row', annual_revenue: 300 });
  });

  afterEach(async () => {
    await ql?.close();
  });

  it('update scopes to the row the `filter` names, and only that row', async () => {
    await api
      .object('crm_account')
      .update({ id: third.id, annual_revenue: 999 }, { filter: { id: third.id } } as any);
    const rows = await api.object('crm_account').find({});
    // The stale reading would have left `third` untouched and/or hit `first`.
    expect(rows.find((r: any) => r.id === third.id)?.annual_revenue).toBe(999);
    expect(rows.find((r: any) => r.id === first.id)?.annual_revenue).toBe(100);
  });

  it('delete scopes to the row the `filter` names, and does not empty the object', async () => {
    await api.object('crm_account').delete({ filter: { id: third.id } } as any);
    const rows = await api.object('crm_account').find({});
    expect(rows.map((r: any) => r.name)).toEqual(['First Row', 'Second Row']);
  });

  it('NEGATIVE CONTROL: delete throws on an option it does not recognise', async () => {
    await expect(
      api.object('crm_account').delete({ wibble: { id: third.id } } as any),
    ).rejects.toThrow(/does not recognise option 'wibble'/);
    expect(await api.object('crm_account').count({})).toBe(3);
  });
});

/**
 * Scans EVERY `.ts` under `src/objects/`, not just `*.hook.ts`.
 *
 * The narrower scan would have missed the real thing. Hook bodies get factored
 * into shared modules — `_line-item-price-fill.ts` is the price fill both
 * line-item objects now build from — and a `filter:` riding along in one of
 * those is exactly as broken while matching no `*.hook.ts` glob. Scope the
 * guard to the directory the hook code lives in, not to a filename convention
 * the code is free to outgrow.
 */
describe('no hook-side code may query by `filter`', () => {
  const hookDir = join(process.cwd(), 'src', 'objects');
  const hookFiles = readdirSync(hookDir).filter((f) => f.endsWith('.ts'));

  it('finds files to check (guards against a silently empty scan)', () => {
    expect(hookFiles.length).toBeGreaterThan(10);
    // The shared modules are the ones a `*.hook.ts` glob would have skipped.
    expect(hookFiles).toContain('_line-item-price-fill.ts');
  });

  it.each(hookFiles)('%s uses `where:`, never `filter:`', (file) => {
    const src = readFileSync(join(hookDir, file), 'utf8');
    // `.filter(` (the array method) is fine; `filter:` as an object key is not.
    const offenders = src
      .split('\n')
      .map((line, i) => ({ line: line.trim(), no: i + 1 }))
      .filter(({ line }) => /(^|[{,\s])filter\s*:/.test(line));
    expect(
      offenders,
      `${file} passes a \`filter:\` query key. On the pinned engine that is an ALIAS of ` +
        `\`where\` and the predicate IS applied (measured above) — this guard is not about ` +
        `data loss. It is about one spelling: a query that ends up carrying both keys with ` +
        `different values throws \`Conflicting options\` at runtime, and \`where: {}\` counts ` +
        `as a different value. Use \`where:\`.`,
    ).toEqual([]);
  });
});

/**
 * The harness is STRICTER than the kernel on this key, and that is deliberate,
 * not drift (#1229). The kernel aliases `filter`; the harness throws on it.
 * Keeping the throw means a `filter:` that somehow got past the compile error
 * `HookQuery` raises and past the repo-wide guard above still fails loudly in
 * every harness-based suite, instead of passing and teaching the second
 * spelling by example.
 *
 * The direction that WOULD be a bug is the opposite one — a harness accepting a
 * shape the kernel refuses. That is what it used to do, and it hid eight broken
 * hooks behind a green suite.
 */
describe('the hook harness is stricter than the kernel about `filter`', () => {
  it('rejects `filter` even though the kernel now aliases it', async () => {
    const h = makeHarness({ crm_account: [{ id: 'a1' }, { id: 'a2' }] });
    await expect(
      h.api.object('crm_account').findOne({ filter: { id: 'a2' } } as any),
    ).rejects.toThrow(/filter/);
  });

  it('still honours `where`', async () => {
    const h = makeHarness({ crm_account: [{ id: 'a1' }, { id: 'a2' }] });
    const hit = await h.api.object('crm_account').findOne({ where: { id: 'a2' } });
    expect(hit?.id).toBe('a2');
  });
});
